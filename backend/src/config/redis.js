const { createClient } = require('redis');
const { logger } = require('../utils/logger');

const redisClient = createClient({ url: process.env.REDIS_URL });

const connectRedis = async () => {
  try {
    await redisClient.connect();
    logger.info('Redis connected');
  } catch (err) {
    logger.warn('Redis not available, caching disabled', err);
  }
};

/** Cache helper: get or set with TTL (seconds) */
const cache = {
  async get(key) {
    try {
      const val = await redisClient.get(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  },
  async set(key, value, ttl = 60) {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch { /* ignore */ }
  },
  async del(key) {
    try { await redisClient.del(key); } catch { /* ignore */ }
  },
};

module.exports = { redisClient, connectRedis, cache };
