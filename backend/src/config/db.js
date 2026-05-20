const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

async function connectDB() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/tradeflow';
  try {
    await mongoose.connect(uri, { autoIndex: true });
    logger.info('MongoDB connected: ' + uri.split('/').pop());
  } catch (err) {
    logger.error('MongoDB connection error', err);
    throw err;
  }
}

module.exports = { connectDB };

