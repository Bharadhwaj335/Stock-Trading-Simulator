const ApiError = require('../utils/ApiError');
const { logger } = require('../utils/logger');

function errorHandler(err, req, res, next) { // eslint-disable-line
  if (err instanceof ApiError) {
    logger.warn(err.message, { details: err.details });
    return res.status(err.statusCode).json({ success: false, message: err.message, details: err.details });
  }
  logger.error(err.message || 'Unhandled error', { stack: err.stack });
  return res.status(500).json({ success: false, message: 'Internal server error' });
}

module.exports = { errorHandler };
