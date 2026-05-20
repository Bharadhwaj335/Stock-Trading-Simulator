const Stock = require('../models/Stock');
const { io } = require('../index');
const { broadcastPriceUpdate } = require('../socket');
const { cache } = require('../config/redis');
const { logger } = require('../utils/logger');

const simulatePriceChange = (current) => {
  const volatility = 0.002;
  const drift = (Math.random() - 0.495) * volatility;
  return Math.max(0.01, parseFloat((current * (1 + drift)).toFixed(2)));
};

const updateStockPrices = async () => {
  const stocks = await Stock.find({}).lean();

  const bulkOps = stocks.map(stock => {
    const newPrice = simulatePriceChange(stock.currentPrice);
    const change = parseFloat((newPrice - stock.previousClose).toFixed(2));
    const changePercent = parseFloat(((change / stock.previousClose) * 100).toFixed(2));

    broadcastPriceUpdate(io, stock.symbol, {
      symbol: stock.symbol,
      currentPrice: newPrice,
      change,
      changePercent,
    });

    cache.del(`stock:${stock.symbol}`);

    return {
      updateOne: {
        filter: { symbol: stock.symbol },
        update: { $set: { currentPrice: newPrice, change, changePercent, lastUpdated: new Date() } },
      },
    };
  });

  await Stock.bulkWrite(bulkOps);
  logger.debug(`Updated prices for ${stocks.length} stocks`);
};

module.exports = {
  updateStockPrices,
};
