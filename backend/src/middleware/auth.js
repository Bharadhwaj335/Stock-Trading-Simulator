const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * @typedef {Object} AuthRequest
 * @property {Object} [user] - { id: string; username: string }
 */

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id username');
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = { id: user._id.toString(), username: user.username };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { protect, AuthRequest: {} };
