const mongoose = require('mongoose');
const Trade = require('../models/Trade');
const Portfolio = require('../models/Portfolio');
const Wallet = require('../models/Wallet');
const PriceCache = require('../models/PriceCache');

const buildDateFilter = (from, to) => {
  const filter = {};
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }
  return filter;
};

const getSummaryStats = async (userId, from, to) => {
  const dateFilter = buildDateFilter(from, to);

  const [summary] = await Trade.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), ...dateFilter } },
    {
      $facet: {
        all: [{ $count: 'count' }],
        buys: [{ $match: { type: 'buy' } }, { $count: 'count' }],
        sells: [
          { $match: { type: 'sell' } },
          {
            $group: {
              _id: null,
              count:       { $sum: 1 },
              totalPnL:    { $sum: '$pnl' },
              avgHoldDays: { $avg: '$holdingDays' },
              wins:        { $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] } },
              losses:      { $sum: { $cond: [{ $lt: ['$pnl', 0] }, 1, 0] } },
              totalGains:  { $sum: { $cond: [{ $gt: ['$pnl', 0] }, '$pnl', 0] } },
              totalLosses: { $sum: { $cond: [{ $lt: ['$pnl', 0] }, '$pnl', 0] } },
            },
          },
        ],
        bestTrade: [
          { $match: { type: 'sell', pnl: { $ne: null } } },
          { $sort: { pnl: -1 } },
          { $limit: 1 },
          { $project: { symbol: 1, pnl: 1, qty: 1, priceAtTrade: 1, createdAt: 1 } },
        ],
        worstTrade: [
          { $match: { type: 'sell', pnl: { $ne: null } } },
          { $sort: { pnl: 1 } },
          { $limit: 1 },
          { $project: { symbol: 1, pnl: 1, qty: 1, priceAtTrade: 1, createdAt: 1 } },
        ],
      },
    },
  ]);

  const sellData = (summary && summary.sells && summary.sells[0]) || {};
  const totalTrades = summary?.all?.[0]?.count || 0;
  const sellCount = sellData.count || 0;
  const winCount = sellData.wins || 0;
  const lossCount = sellData.losses || 0;
  const totalGains = sellData.totalGains || 0;
  const totalLosses = Math.abs(sellData.totalLosses || 0);

  return {
    totalTrades,
    buyCount: summary?.buys?.[0]?.count || 0,
    sellCount,
    winCount,
    lossCount,
    winRate: sellCount > 0 ? parseFloat(((winCount / sellCount) * 100).toFixed(1)) : 0,
    totalRealizedPnL: parseFloat((sellData.totalPnL || 0).toFixed(2)),
    avgHoldingDays: parseFloat((sellData.avgHoldDays || 0).toFixed(1)),
    profitFactor: totalLosses > 0 ? parseFloat((totalGains / totalLosses).toFixed(2)) : null,
    avgWin: winCount > 0 ? parseFloat((totalGains / winCount).toFixed(2)) : 0,
    avgLoss: lossCount > 0 ? parseFloat((-totalLosses / lossCount).toFixed(2)) : 0,
    bestTrade: summary?.bestTrade?.[0] || null,
    worstTrade: summary?.worstTrade?.[0] || null,
  };
};

const getPnLByMonth = async (userId, year) => {
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

  const results = await Trade.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: 'sell',
        pnl: { $ne: null },
        createdAt: { $gte: startOfYear, $lte: endOfYear },
      },
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        pnl: { $sum: '$pnl' },
        trades: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return monthNames.map((name, i) => {
    const found = results.find((r) => r._id === i + 1);
    return {
      month: name,
      monthNum: i + 1,
      pnl: found ? parseFloat(found.pnl.toFixed(2)) : 0,
      trades: found?.trades || 0,
      year,
    };
  });
};

const getSectorExposure = async (userId) => {
  const portfolio = await Portfolio.findOne({ userId }).lean();
  if (!portfolio || !portfolio.holdings || portfolio.holdings.length === 0) return [];

  const symbols = portfolio.holdings.map(h => h.symbol);
  const priceCache = await PriceCache.find({ symbol: { $in: symbols } }).lean();
  const priceMap = Object.fromEntries(priceCache.map(p => [p.symbol, p]));

  const sectorMap = {};
  for (const h of portfolio.holdings) {
    const cached = priceMap[h.symbol];
    const sector = cached?.sector || 'Other';
    const value = (cached?.price || h.avgBuyPrice) * h.qty;
    if (!sectorMap[sector]) sectorMap[sector] = { value: 0, symbols: [] };
    sectorMap[sector].value += value;
    if (!sectorMap[sector].symbols.includes(h.symbol)) sectorMap[sector].symbols.push(h.symbol);
  }

  const total = Object.values(sectorMap).reduce((s, x) => s + x.value, 0) || 1;
  return Object.entries(sectorMap).map(([sector, data]) => ({
    sector,
    value: parseFloat(data.value.toFixed(2)),
    percent: parseFloat(((data.value / total) * 100).toFixed(1)),
    symbols: data.symbols,
  })).sort((a, b) => b.value - a.value);
};

const getEquityCurve = async (userId) => {
  const wallet = await Wallet.findOne({ userId }).lean();
  if (!wallet) return [];

  const trades = await Trade.find({ userId }).sort({ createdAt: 1 }).lean();
  if (trades.length === 0) return [];

  // Calculate the starting balance by working backward from current balance
  let startingBalance = wallet.balance;
  for (const trade of trades) {
    if (trade.type === 'buy') {
      startingBalance += trade.totalValue; // Reverse buy: add back cash spent
    } else {
      startingBalance -= trade.totalValue; // Reverse sell: subtract cash gained
    }
  }

  const curve = [];

  // Add starting point (1 day before the first trade was executed)
  const firstTradeTime = new Date(trades[0].createdAt);
  const startingTime = new Date(firstTradeTime.getTime() - 24 * 60 * 60 * 1000);
  curve.push({
    date: startingTime.toISOString().split('T')[0],
    cashBalance: parseFloat(startingBalance.toFixed(2)),
    tradeSymbol: 'START',
    tradeType: 'deposit',
  });

  // Roll forward through trades to record cash balance trajectory
  let cash = startingBalance;
  for (const trade of trades) {
    if (trade.type === 'buy') {
      cash -= trade.totalValue;
    } else {
      cash += trade.totalValue;
    }
    curve.push({
      date: trade.createdAt.toISOString().split('T')[0],
      cashBalance: parseFloat(cash.toFixed(2)),
      tradeSymbol: trade.symbol,
      tradeType: trade.type,
    });
  }

  return curve;
};

const getTopSymbols = async (userId) => {
  const [mostTraded, mostProfitable] = await Promise.all([
    Trade.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$symbol', count: { $sum: 1 }, volume: { $sum: '$totalValue' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Trade.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'sell', pnl: { $ne: null } } },
      { $group: { _id: '$symbol', totalPnL: { $sum: '$pnl' }, trades: { $sum: 1 } } },
      { $sort: { totalPnL: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return {
    mostTraded: mostTraded.map(m => ({ symbol: m._id, count: m.count, volume: m.volume })),
    mostProfitable: mostProfitable.map(m => ({ symbol: m._id, totalPnL: m.totalPnL, trades: m.trades })),
  };
};

module.exports = {
  getSummaryStats,
  getPnLByMonth,
  getSectorExposure,
  getEquityCurve,
  getTopSymbols,
};
