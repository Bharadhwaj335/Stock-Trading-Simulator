const PriceCache = require('../models/PriceCache');

/**
 * Called from socket/index.js after io is set up.
 * Emits current cached prices to all connected clients every 5 seconds.
 * No additional Polygon API calls — just reads from MongoDB cache.
 */
const startPriceEmitter = (io) => {
  setInterval(async () => {
    try {
      const prices = await PriceCache.find({}).lean();
      prices.forEach((p) => {
        const payload = {
          symbol:       p.symbol,
          currentPrice: p.price,
          change:       p.change,
          changePercent: p.changePercent,
        };
        // Emit to specific stock rooms (for StockPage detail live feeds)
        io.to(`stock:${p.symbol}`).emit('priceUpdate', payload);
        // Emit globally for MarketPage live tickers
        io.emit('marketTick', payload);
      });
    } catch (err) {
      console.error('[priceEmitter] error:', err.message);
    }
  }, 5000);
};

module.exports = { startPriceEmitter };
