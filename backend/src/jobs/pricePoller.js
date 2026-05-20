const cron        = require('node-cron');
const priceService = require('../services/priceService');

/**
 * Runs every 2 minutes.
 * Fetches fresh prices for all 30 supported stocks from Polygon
 * and updates PriceCache. This is ONE Polygon API call — well within free tier.
 *
 * Free tier limit: 5 calls/minute.
 * We use 1 call every 2 minutes — extremely safe.
 */
const startPricePoller = () => {
  // Run immediately on startup so cache is populated before first request
  priceService.refreshAllPrices();

  // Then run every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    console.log('[pricePoller] Refreshing stock prices...');
    await priceService.refreshAllPrices();
  });

  console.log('[pricePoller] Price poller started — refreshing every 2 minutes');
};

module.exports = { startPricePoller };
