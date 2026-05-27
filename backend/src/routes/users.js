const { Router } = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Stock = require('../models/Stock');
const Wallet = require('../models/Wallet');
const Portfolio = require('../models/Portfolio');

const router = Router();

router.use(protect);

router.get('/me', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [user, wallet, portfolio] = await Promise.all([
      User.findById(userId)
        .select('-refreshToken')
        .populate('following', 'username avatar')
        .populate('followers', 'username avatar')
        .lean(),
      Wallet.findOne({ userId }).lean(),
      Portfolio.findOne({ userId }).lean()
    ]);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const walletBalance = wallet?.balance ?? user.walletBalance ?? 30000;
    const holdings = portfolio?.holdings || [];
    
    const PriceCache = require('../models/PriceCache');
    const enriched = await Promise.all(holdings.map(async (h) => {
      const pc = await PriceCache.findOne({ symbol: h.symbol }).lean();
      const currentPrice = pc?.price ?? h.avgBuyPrice ?? 0;
      const quantity = h.qty ?? h.quantity ?? 0;
      const currentValue = currentPrice * quantity;
      const totalInvested = h.totalInvested ?? (h.avgBuyPrice || 0) * quantity;
      const pnl = currentValue - totalInvested;
      return { currentValue, pnl, totalInvested };
    }));

    const portfolioValue = enriched.reduce((sum, item) => sum + item.currentValue, 0);
    const totalCost = enriched.reduce((sum, item) => sum + item.totalInvested, 0);
    const totalPnL = enriched.reduce((sum, item) => sum + item.pnl, 0);
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    await User.findByIdAndUpdate(userId, {
      walletBalance,
      portfolioValue,
      totalPnL,
      totalPnLPercent
    });

    const updatedUser = {
      ...user,
      walletBalance,
      portfolioValue,
      totalPnL,
      totalPnLPercent
    };

    res.json(updatedUser);
  } catch (err) { next(err); }
});

router.patch('/me', async (req, res, next) => {
  try {
    const allowed = ['username', 'avatar', 'isPublic', 'bio', 'theme', 'notifyEmail', 'notifyInApp'];
    const updates = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true })
      .select('-refreshToken');
    res.json(user);
  } catch (err) { next(err); }
});

router.post('/change-password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { next(err); }
});

router.get('/watchlist', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('watchlist').lean();
    if (!user || !user.watchlist || user.watchlist.length === 0) {
      return res.json([]);
    }
    const stocks = await Stock.find({ symbol: { $in: user.watchlist } }).lean();
    res.json(stocks);
  } catch (err) { next(err); }
});

router.post('/watchlist/:symbol', async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { watchlist: symbol } },
      { new: true }
    ).select('watchlist').lean();
    res.json({ success: true, watchlist: user.watchlist });
  } catch (err) { next(err); }
});

router.delete('/watchlist/:symbol', async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { watchlist: symbol } },
      { new: true }
    ).select('watchlist').lean();
    res.json({ success: true, watchlist: user.watchlist });
  } catch (err) { next(err); }
});

router.get('/:username', async (req, res, next) => {
  try {
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${req.params.username}$`, 'i') }, 
      isPublic: { $ne: false } 
    })
      .select('-refreshToken')
      .lean();
    
    if (!user) return res.status(404).json({ message: 'User not found or private' });

    const [wallet, portfolio] = await Promise.all([
      Wallet.findOne({ userId: user._id }).lean(),
      Portfolio.findOne({ userId: user._id }).lean()
    ]);

    const walletBalance = wallet?.balance ?? user.walletBalance ?? 30000;
    const holdings = portfolio?.holdings || [];
    
    const PriceCache = require('../models/PriceCache');
    const enriched = await Promise.all(holdings.map(async (h) => {
      const pc = await PriceCache.findOne({ symbol: h.symbol }).lean();
      const currentPrice = pc?.price ?? h.avgBuyPrice ?? 0;
      const quantity = h.qty ?? h.quantity ?? 0;
      const currentValue = currentPrice * quantity;
      const totalInvested = h.totalInvested ?? (h.avgBuyPrice || 0) * quantity;
      const pnl = currentValue - totalInvested;
      return { currentValue, pnl, totalInvested };
    }));

    const portfolioValue = enriched.reduce((sum, item) => sum + item.currentValue, 0);
    const totalCost = enriched.reduce((sum, item) => sum + item.totalInvested, 0);
    const totalPnL = enriched.reduce((sum, item) => sum + item.pnl, 0);
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    await User.findByIdAndUpdate(user._id, {
      walletBalance,
      portfolioValue,
      totalPnL,
      totalPnLPercent
    });

    const updatedUser = {
      _id: user._id,
      username: user.username,
      avatar: user.avatar,
      walletBalance,
      portfolioValue,
      totalPnL,
      totalPnLPercent,
      rank: user.rank,
      createdAt: user.createdAt,
      followers: user.followers,
      following: user.following,
      bio: user.bio,
      badges: user.badges
    };

    res.json(updatedUser);
  } catch (err) { next(err); }
});

module.exports = router;
