const User = require('../models/User');
const Trade = require('../models/Trade');
const Portfolio = require('../models/Portfolio');
const PriceCache = require('../models/PriceCache');
const { cache } = require('../config/redis');

// ─── Helper: Calculate live metrics for a set of users ───────────────────────

/**
 * Given an array of lean User documents, looks up each user's Portfolio and
 * PriceCache to compute a real portfolioValue + totalPnL, then persists the
 * result back to the User document so subsequent queries see the right data.
 */
const recalcAndPersistUserMetrics = async (users) => {
  // Load all price data in one query
  const allPrices = await PriceCache.find({}).lean();
  const priceMap = Object.fromEntries(allPrices.map(p => [p.symbol, p.price || 0]));

  const results = await Promise.all(
    users.map(async (u) => {
      try {
        const portfolio = await Portfolio.findOne({ userId: u._id }).lean();
        const holdings = portfolio?.holdings || [];

        let portfolioValue = 0;
        let totalInvested = 0;

        for (const h of holdings) {
          const livePrice = priceMap[h.symbol] || h.avgBuyPrice || 0;
          const qty = h.qty ?? 0;
          portfolioValue += livePrice * qty;
          totalInvested += h.totalInvested ?? (h.avgBuyPrice * qty) ?? 0;
        }

        const walletBalance = u.walletBalance || 0;
        const netWorth = walletBalance + portfolioValue;
        const startingBalance = 100000; // default
        const totalPnL = netWorth - startingBalance;
        const totalPnLPercent = ((totalPnL / startingBalance) * 100);

        // Persist to DB
        await User.findByIdAndUpdate(u._id, {
          portfolioValue: Number(portfolioValue.toFixed(2)),
          totalPnL: Number(totalPnL.toFixed(2)),
          totalPnLPercent: Number(totalPnLPercent.toFixed(4)),
        });

        return {
          ...u,
          portfolioValue: Number(portfolioValue.toFixed(2)),
          totalPnL: Number(totalPnL.toFixed(2)),
          totalPnLPercent: Number(totalPnLPercent.toFixed(4)),
          netWorth: Number(netWorth.toFixed(2)),
        };
      } catch {
        return { ...u };
      }
    })
  );

  return results;
};

// ─── GET /api/leaderboard ─────────────────────────────────────────────────────

const getLeaderboard = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const cacheKey = `leaderboard:v2:${page}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const [usersRes, total] = await Promise.all([
      User.find({ isPublic: { $ne: false } })
        .sort({ totalPnL: -1 })
        .skip(skip)
        .limit(limit)
        .select('username avatar walletBalance portfolioValue totalPnL totalPnLPercent rank createdAt')
        .lean(),
      User.countDocuments({ isPublic: { $ne: false } }),
    ]);

    // If all users show 0 totalPnL, recalculate on-the-fly
    const allZero = usersRes.every(u => !u.totalPnL || u.totalPnL === 0);
    let users = usersRes;

    if (allZero && usersRes.length > 0) {
      console.log('[leaderboard] All users show 0 PnL — recalculating on-the-fly...');
      users = await recalcAndPersistUserMetrics(usersRes);
      // Re-sort after recalculation
      users.sort((a, b) => (b.totalPnL || 0) - (a.totalPnL || 0));
    }

    const ranked = users.map((u, i) => ({
      ...u,
      rank: skip + i + 1,
      netWorth: (u.walletBalance || 0) + (u.portfolioValue || 0),
    }));

    const result = { users: ranked, total, page, pages: Math.ceil(total / limit) };

    await cache.set(cacheKey, result, 120); // 2 min cache
    res.json(result);
  } catch (err) { next(err); }
};

// ─── POST /api/leaderboard/:userId/follow ────────────────────────────────────

const followUser = async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    const myId = req.user.id;
    if (targetId === myId) return res.status(400).json({ message: "Can't follow yourself" });

    const [me, target] = await Promise.all([
      User.findById(myId),
      User.findById(targetId),
    ]);
    if (!me || !target) return res.status(404).json({ message: 'User not found' });

    const alreadyFollowing = me.following.map(String).includes(targetId);
    if (alreadyFollowing) {
      me.following = me.following.filter(id => id.toString() !== targetId);
      target.followers = target.followers.filter(id => id.toString() !== myId);
    } else {
      me.following.push(target._id);
      target.followers.push(me._id);
    }
    await Promise.all([me.save(), target.save()]);

    res.json({ following: !alreadyFollowing, followersCount: target.followers.length });
  } catch (err) { next(err); }
};

// ─── GET /api/leaderboard/feed ───────────────────────────────────────────────

const getFeed = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('following').lean();
    if (!user || !user.following || user.following.length === 0) {
      return res.json([]);
    }

    const trades = await Trade.find({ userId: { $in: user.following } })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('userId', 'username avatar')
      .lean();

    const formattedTrades = trades.map(t => ({
      _id: t._id,
      userId: t.userId?._id,
      username: t.userId?.username || 'Unknown',
      avatar: t.userId?.avatar,
      symbol: t.symbol,
      type: t.type,
      qty: t.qty,
      priceAtTrade: t.priceAtTrade,
      totalValue: t.totalValue,
      pnl: t.pnl,
      createdAt: t.createdAt,
    }));

    res.json(formattedTrades);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/leaderboard/weekly ─────────────────────────────────────────────

const getWeekly = async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let results = await Trade.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          type: 'sell',
          pnl: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$userId',
          weeklyPnL: { $sum: '$pnl' },
          tradesCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $match: { 'user.isPublic': { $ne: false } },
      },
      {
        $project: {
          _id: 1,
          weeklyPnL: 1,
          tradesCount: 1,
          username: '$user.username',
          avatar: '$user.avatar',
          totalPnL: '$user.totalPnL',
          walletBalance: '$user.walletBalance',
          portfolioValue: '$user.portfolioValue',
          totalPnLPercent: '$user.totalPnLPercent',
        },
      },
      { $sort: { weeklyPnL: -1 } },
      { $limit: 10 },
    ]);

    // Fallback: return top users if no trades this week
    if (results.length === 0) {
      const topUsers = await User.find({ isPublic: { $ne: false } })
        .sort({ totalPnL: -1 })
        .limit(10)
        .select('username avatar walletBalance portfolioValue totalPnL totalPnLPercent')
        .lean();

      // Recalculate if all zero
      let finalUsers = topUsers;
      const allZero = topUsers.every(u => !u.totalPnL || u.totalPnL === 0);
      if (allZero && topUsers.length > 0) {
        finalUsers = await recalcAndPersistUserMetrics(topUsers);
        finalUsers.sort((a, b) => (b.totalPnL || 0) - (a.totalPnL || 0));
      }

      results = finalUsers.map(u => ({
        _id: u._id,
        weeklyPnL: 0,
        tradesCount: 0,
        username: u.username,
        avatar: u.avatar,
        totalPnL: u.totalPnL,
        walletBalance: u.walletBalance,
        portfolioValue: u.portfolioValue,
        totalPnLPercent: u.totalPnLPercent,
      }));
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getLeaderboard,
  followUser,
  getFeed,
  getWeekly,
};
