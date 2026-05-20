const cron = require('node-cron');
const { logger } = require('../utils/logger');
const { updateStockPrices } = require('../services/marketService');
const { checkAndFireAlerts } = require('../services/alertService');
const { recalcLeaderboard } = require('../services/leaderboardService');

const startCronJobs = () => {
  cron.schedule('*/30 * * * * *', async () => {
    try {
      await updateStockPrices();
    } catch (err) {
      logger.error('Price update job failed', err);
    }
  });

  cron.schedule('* * * * *', async () => {
    try {
      await checkAndFireAlerts();
    } catch (err) {
      logger.error('Alert check job failed', err);
    }
  });

  cron.schedule('*/5 * * * *', async () => {
    try {
      await recalcLeaderboard();
    } catch (err) {
      logger.error('Leaderboard job failed', err);
    }
  });

  logger.info('Cron jobs started');
};

module.exports = {
  startCronJobs,
};
