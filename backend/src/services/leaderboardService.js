const User = require('../models/User');
const Holding = require('../models/Holding');
const Stock = require('../models/Stock');
const { cache } = require('../config/redis');
const { logger } = require('../utils/logger');

const recalcLeaderboard = async () => {
  const users = await User.find({ isPublic: true }).select('_id walletBalance').lean();

  for (const user of users) {
    const holdings = await Holding.find({ user: user._id }).lean();
    const symbols = holdings.map(h => h.symbol);
    const stocks = await Stock.find({ symbol: { $in: symbols } }).lean();
    const priceMap = Object.fromEntries(stocks.map(s => [s.symbol, s.currentPrice]));

    let portfolioValue = 0;
    let totalInvested = 0;
    for (const h of holdings) {
      const price = priceMap[h.symbol] || h.avgBuyPrice;
      portfolioValue += price * h.quantity;
      totalInvested += h.totalInvested;
    }

    const totalPnL = portfolioValue - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    await User.findByIdAndUpdate(user._id, {
      portfolioValue,
      totalPnL,
      totalPnLPercent,
    });
  }

  for (let p = 1; p <= 10; p++) await cache.del(`leaderboard:${p}:20`);
  logger.debug('Leaderboard recalculated');
};

module.exports = {
  recalcLeaderboard,
};
