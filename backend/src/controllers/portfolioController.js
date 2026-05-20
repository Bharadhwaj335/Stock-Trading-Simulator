const Portfolio = require('../models/Portfolio');
const PriceCache = require('../models/PriceCache');
const { success } = require('../utils/ApiResponse');

exports.getPortfolio = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const p = await Portfolio.findOne({ userId });
    const holdings = p?.holdings || [];
    // enrich with live price
    const enriched = await Promise.all(holdings.map(async (h) => {
      const pc = await PriceCache.findOne({ symbol: h.symbol });
      const price = pc ? pc.price : null;
      const currentValue = price ? price * h.qty : h.totalInvested;
      const pnl = Number((currentValue - h.totalInvested).toFixed(2));
      const pnlPercent = h.totalInvested ? Number(((currentValue - h.totalInvested) / h.totalInvested * 100).toFixed(2)) : 0;
      return { ...h._doc, currentPrice: price, currentValue, pnl, pnlPercent };
    }));

    const summary = {
      walletBalance: 0,
      portfolioValue: enriched.reduce((s, x) => s + x.currentValue, 0),
      netWorth: enriched.reduce((s, x) => s + x.currentValue, 0),
      totalPnL: enriched.reduce((s, x) => s + x.pnl, 0),
      totalPnLPercent: 0,
    };

    return success(res, { holdings: enriched, summary });
  } catch (err) { next(err); }
};
const Holding = require('../models/Holding');
const User = require('../models/User');
const Stock = require('../models/Stock');

const getPortfolio = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const holdings = await Holding.find({ user: userId }).lean();

    const symbols = holdings.map(h => h.symbol);
    const stocks = await Stock.find({ symbol: { $in: symbols } }).lean();
    const priceMap = Object.fromEntries(stocks.map(s => [s.symbol, s.currentPrice]));

    let totalValue = 0;
    let totalCost = 0;
    const enriched = holdings.map(h => {
      const price = priceMap[h.symbol] || h.avgBuyPrice;
      const current = price * h.quantity;
      const pnl = current - h.totalInvested;
      totalValue += current;
      totalCost += h.totalInvested;
      return { ...h, currentPrice: price, currentValue: current, pnl, pnlPercent: (pnl / h.totalInvested) * 100 };
    });

    const user = await User.findById(userId).select('walletBalance').lean();
    const totalPnL = totalValue - totalCost;
    const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
    const netWorth = (user?.walletBalance || 0) + totalValue;

    res.json({
      holdings: enriched,
      summary: {
        walletBalance: user?.walletBalance || 0,
        portfolioValue: totalValue,
        netWorth,
        totalPnL,
        totalPnLPercent: totalPnLPct,
      },
    });
  } catch (err) { next(err); }
};

module.exports = {
  getPortfolio,
};
