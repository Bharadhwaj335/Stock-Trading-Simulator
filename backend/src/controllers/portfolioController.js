const Portfolio = require('../models/Portfolio');
const Wallet = require('../models/Wallet');
const PriceCache = require('../models/PriceCache');
const { success } = require('../utils/ApiResponse');

const getPortfolio = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const portfolio = await Portfolio.findOne({ userId }).lean();
    const wallet = await Wallet.findOne({ userId }).lean();
    const holdings = portfolio?.holdings || [];

    const enriched = await Promise.all(holdings.map(async (h) => {
      const pc = await PriceCache.findOne({ symbol: h.symbol }).lean();
      const currentPrice = pc?.price ?? h.avgBuyPrice ?? 0;
      const quantity = h.qty ?? h.quantity ?? 0;
      const totalInvested = h.totalInvested ?? (h.avgBuyPrice || 0) * quantity;
      const currentValue = currentPrice * quantity;
      const pnl = Number((currentValue - totalInvested).toFixed(2));
      const pnlPercent = totalInvested ? Number(((pnl / totalInvested) * 100).toFixed(2)) : 0;

      return {
        ...h,
        qty: quantity,
        quantity,
        currentPrice,
        currentValue,
        pnl,
        pnlPercent,
      };
    }));

    const portfolioValue = enriched.reduce((sum, item) => sum + item.currentValue, 0);
    const totalPnL = enriched.reduce((sum, item) => sum + item.pnl, 0);
    const walletBalance = wallet?.balance || 0;
    const netWorth = walletBalance + portfolioValue;
    const totalCost = enriched.reduce((sum, item) => sum + (item.totalInvested || 0), 0);

    return success(res, {
      holdings: enriched,
      summary: {
        walletBalance,
        portfolioValue,
        netWorth,
        totalPnL,
        totalPnLPercent: totalCost > 0 ? Number(((totalPnL / totalCost) * 100).toFixed(2)) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

const resetPortfolio = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const STARTING_BALANCE = Number(process.env.STARTING_BALANCE) || 30000;
    const User = require('../models/User');
    const Trade = require('../models/Trade');
    const { cache } = require('../config/redis');

    // 1. Delete all holdings in Portfolio for userId
    await Portfolio.findOneAndUpdate(
      { userId },
      { $set: { holdings: [] } },
      { new: true, upsert: true }
    );

    // 2. Reset Wallet balance to STARTING_BALANCE
    await Wallet.findOneAndUpdate(
      { userId },
      { $set: { balance: STARTING_BALANCE } },
      { new: true, upsert: true }
    );

    // 3. Reset User stats
    await User.findByIdAndUpdate(userId, {
      $set: {
        walletBalance: STARTING_BALANCE,
        totalPnL: 0,
        totalPnLPercent: 0,
        portfolioValue: 0,
      }
    });

    // 4. Delete all Trade records for userId
    await Trade.deleteMany({ userId });

    // 5. Invalidate leaderboard cache
    for (let i = 1; i <= 5; i++) {
      await cache.del(`leaderboard:${i}:20`);
    }

    return res.json({
      success: true,
      message: 'Portfolio reset successfully',
      newBalance: STARTING_BALANCE
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPortfolio, resetPortfolio };
