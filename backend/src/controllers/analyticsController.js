const Trade = require('../models/Trade');
const Holding = require('../models/Holding');
const Stock = require('../models/Stock');

const getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const tradeSummary = await Trade.aggregate([
      { $match: { user: userId, type: 'SELL' } },
      { $group: {
        _id: null,
        totalSells: { $sum: 1 },
        wins: { $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] } },
        totalPnL: { $sum: '$pnl' },
        avgPnL: { $avg: '$pnl' },
        bestTrade: { $max: '$pnl' },
        worstTrade: { $min: '$pnl' },
      }},
      { $addFields: {
        winRate: { $multiply: [{ $divide: ['$wins', '$totalSells'] }, 100] },
      }},
    ]);

    const pnlByMonth = await Trade.aggregate([
      { $match: { user: userId, type: 'SELL' } },
      { $group: {
        _id: { year: { $year: '$executedAt' }, month: { $month: '$executedAt' } },
        pnl: { $sum: '$pnl' },
        trades: { $sum: 1 },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        pnl: 1,
        trades: 1,
      }},
    ]);

    const holdings = await Holding.find({ user: userId }).lean();
    const symbols = holdings.map(h => h.symbol);
    const stocks = await Stock.find({ symbol: { $in: symbols } }).lean();
    const stockMap = Object.fromEntries(stocks.map(s => [s.symbol, s]));

    const sectorMap = {};
    let totalValue = 0;
    for (const h of holdings) {
      const stock = stockMap[h.symbol];
      if (!stock) continue;
      const val = h.quantity * stock.currentPrice;
      totalValue += val;
      sectorMap[stock.sector] = (sectorMap[stock.sector] || 0) + val;
    }
    const sectorExposure = Object.entries(sectorMap).map(([sector, value]) => ({
      sector,
      value,
      percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }));

    const mostTraded = await Trade.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$symbol', count: { $sum: 1 }, volume: { $sum: '$total' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      summary: tradeSummary[0] || { totalSells: 0, wins: 0, winRate: 0, totalPnL: 0 },
      pnlByMonth,
      sectorExposure,
      mostTraded,
    });
  } catch (err) { next(err); }
};

module.exports = {
  getAnalytics,
};
