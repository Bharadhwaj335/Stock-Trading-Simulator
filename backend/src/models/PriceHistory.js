const mongoose = require('mongoose');

/**
 * @typedef {Object} IPriceHistory
 * @property {string} symbol
 * @property {Array} data - Array of price data points with time, open, high, low, close, volume
 */

const PriceHistorySchema = new mongoose.Schema({
  symbol: { type: String, required: true, index: true },
  data: [{ time: Date, open: Number, high: Number, low: Number, close: Number, volume: Number }],
});

module.exports = mongoose.models.PriceHistory || mongoose.model('PriceHistory', PriceHistorySchema);
