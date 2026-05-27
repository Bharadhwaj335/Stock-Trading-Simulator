const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const PriceCache = require('../models/PriceCache');
const { cache } = require('../config/redis');
const { logger } = require('../utils/logger');

/**
 * Full leaderboard recalculation — runs on cron every 5 minutes.
 * For each user:
 *  1. Loads their Portfolio holdings
 *  2. Fetches live prices from PriceCache
 *  3. Calculates portfolioValue, totalPnL, totalPnLPercent, netWorth
 *  4. Persists results back to User document
 *  5. Assigns rank to all public users, sorted by totalPnL desc
 */
const recalcLeaderboard = async () => {
  try {
    const users = await User.find({}).select('_id walletBalance isPublic').lean();
    if (users.length === 0) {
      logger.debug('recalcLeaderboard: No users found, skipping');
      return;
    }

    // Load all prices at once (single query)
    const allPrices = await PriceCache.find({}).lean();
    const priceMap = Object.fromEntries(allPrices.map(p => [p.symbol, p.price || 0]));

    const STARTING_BALANCE = Number(process.env.DEFAULT_WALLET_BALANCE) || 100000;

    const userPnLs = [];

    for (const user of users) {
      try {
        const portfolio = await Portfolio.findOne({ userId: user._id }).lean();
        const holdings = portfolio?.holdings || [];

        let portfolioValue = 0;
        let totalInvested = 0;

        for (const h of holdings) {
          const livePrice = priceMap[h.symbol] || h.avgBuyPrice || 0;
          const qty = h.qty ?? 0;
          portfolioValue += livePrice * qty;
          totalInvested += h.totalInvested ?? (h.avgBuyPrice * qty) ?? 0;
        }

        const walletBalance = user.walletBalance || 0;
        const netWorth = walletBalance + portfolioValue;
        const totalPnL = netWorth - STARTING_BALANCE;
        const totalPnLPercent = (totalPnL / STARTING_BALANCE) * 100;

        await User.findByIdAndUpdate(user._id, {
          portfolioValue: Number(portfolioValue.toFixed(2)),
          totalPnL: Number(totalPnL.toFixed(2)),
          totalPnLPercent: Number(totalPnLPercent.toFixed(4)),
        });

        userPnLs.push({
          _id: user._id,
          isPublic: user.isPublic !== false,
          totalPnL: Number(totalPnL.toFixed(2)),
        });
      } catch (userErr) {
        logger.warn(`recalcLeaderboard: Failed to process user ${user._id}: ${userErr.message}`);
      }
    }

    // Rank public users descending by totalPnL
    const publicUsers = userPnLs.filter(u => u.isPublic);
    publicUsers.sort((a, b) => b.totalPnL - a.totalPnL);

    const rankUpdates = publicUsers.map((u, i) =>
      User.findByIdAndUpdate(u._id, { rank: i + 1 })
    );
    const privateRankUpdates = userPnLs
      .filter(u => !u.isPublic)
      .map(u => User.findByIdAndUpdate(u._id, { rank: 0 }));

    await Promise.all([...rankUpdates, ...privateRankUpdates]);

    // Invalidate leaderboard caches
    for (let p = 1; p <= 15; p++) {
      await cache.del(`leaderboard:v2:${p}:20`);
    }

    logger.debug(`[leaderboardService] Recalculated ${users.length} users, ${publicUsers.length} ranked`);
  } catch (err) {
    logger.error('[leaderboardService] recalcLeaderboard error:', err.message);
  }
};

module.exports = { recalcLeaderboard };
