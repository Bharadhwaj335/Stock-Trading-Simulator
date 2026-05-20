const User = require('../models/User');
const { cache } = require('../config/redis');

const getLeaderboard = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const cacheKey = `leaderboard:${page}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const [usersRes, total] = await Promise.all([
      User.find({ isPublic: true })
        .sort({ totalPnL: -1 })
        .skip(skip)
        .limit(limit)
        .select('username avatar walletBalance portfolioValue totalPnL totalPnLPercent rank createdAt')
        .lean(),
      User.countDocuments({ isPublic: true }),
    ]);
    const users = usersRes;

    const ranked = users.map((u, i) => ({ ...u, rank: skip + i + 1 }));
    const result = { users: ranked, total, page, pages: Math.ceil(total / limit) };

    await cache.set(cacheKey, result, 60);
    res.json(result);
  } catch (err) { next(err); }
};

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

module.exports = {
  getLeaderboard,
  followUser,
};
