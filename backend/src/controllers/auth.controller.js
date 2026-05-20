const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { success } = require('../utils/ApiResponse');

function signAccess(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'devsecret', { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
}

function signRefresh(id) {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET || 'devsecret'), { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) throw new ApiError(400, 'Missing fields');
    const exists = await User.findOne({ email });
    if (exists) throw new ApiError(400, 'Email already registered');
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });
    const accessToken = signAccess(user._id.toString());
    const refreshToken = signRefresh(user._id.toString());
    return success(res, { user, accessToken, refreshToken }, 'Registered', 201);
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw new ApiError(401, 'Invalid credentials');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new ApiError(401, 'Invalid credentials');
    const accessToken = signAccess(user._id.toString());
    const refreshToken = signRefresh(user._id.toString());
    return success(res, { user, accessToken, refreshToken }, 'Logged in');
  } catch (err) { next(err); }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    return success(res, user);
  } catch (err) { next(err); }
};
