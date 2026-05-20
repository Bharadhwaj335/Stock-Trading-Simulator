const mongoose = require('mongoose');

/**
 * @typedef {Object} IStock
 * @property {string} symbol
 * @property {string} [name]
 * @property {number} currentPrice
 * @property {number} previousClose
 * @property {number} [change]
 * @property {number} [changePercent]
 * @property {Date} [lastUpdated]
 * @property {string} [sector]
 * @property {number} [marketCap]
 * @property {number} [volume]
 */

const StockSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true },
  name: String,
  currentPrice: { type: Number, default: 0 },
  previousClose: { type: Number, default: 0 },
  change: Number,
  changePercent: Number,
  lastUpdated: Date,
  sector: String,
  marketCap: Number,
  volume: Number,
});

module.exports = mongoose.models.Stock || mongoose.model('Stock', StockSchema);
