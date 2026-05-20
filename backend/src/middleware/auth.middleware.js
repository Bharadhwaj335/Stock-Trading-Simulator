const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

exports.verifyJWT = (req, res, next) => {
  const hdr = req.headers.authorization || '';
  const parts = hdr.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return next(new ApiError(401, 'No token'));
  const token = parts[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    req.user = { id: payload.id };
    return next();
  } catch (err) {
    return next(new ApiError(401, 'Invalid token'));
  }
};
