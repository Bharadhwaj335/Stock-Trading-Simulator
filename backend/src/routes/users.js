const { Router } = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

const router = Router();

router.use(protect);

router.get('/me', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-refreshToken')
      .populate('following', 'username avatar')
      .populate('followers', 'username avatar')
      .lean();
    res.json(user);
  } catch (err) { next(err); }
});

router.patch('/me', async (req, res, next) => {
  try {
    const allowed = ['username', 'avatar', 'isPublic'];
    const updates = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true })
      .select('-refreshToken');
    res.json(user);
  } catch (err) { next(err); }
});

router.get('/:username', async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username, isPublic: true })
      .select('username avatar totalPnL totalPnLPercent rank createdAt followers following')
      .lean();
    if (!user) return res.status(404).json({ message: 'User not found or private' });
    res.json(user);
  } catch (err) { next(err); }
});

module.exports = router;
