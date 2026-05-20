const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const signAccess = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });

const signRefresh = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) throw new ApiError(409, 'Email or username already taken');

    const user = await User.create({
      username,
      email,
      password,
      walletBalance: Number(process.env.DEFAULT_WALLET_BALANCE) || 100000,
    });

    const accessToken = signAccess(user._id.toString());
    const refreshToken = signRefresh(user._id.toString());
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user._id, username: user.username, email: user.email, walletBalance: user.walletBalance },
    });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user || !(await user.comparePassword(password)))
      throw new ApiError(401, 'Invalid credentials');

    const accessToken = signAccess(user._id.toString());
    const refreshToken = signRefresh(user._id.toString());
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({
      accessToken,
      refreshToken,
      user: { id: user._id, username: user.username, email: user.email, walletBalance: user.walletBalance },
    });
  } catch (err) { next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new ApiError(400, 'Refresh token required');

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken)
      throw new ApiError(401, 'Invalid refresh token');

    const accessToken = signAccess(user._id.toString());
    const newRefreshToken = signRefresh(user._id.toString());
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) { next(err); }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await User.findOneAndUpdate({ refreshToken }, { refreshToken: undefined });
    }
    res.json({ message: 'Logged out' });
  } catch (err) { next(err); }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
};
