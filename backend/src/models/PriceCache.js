const mongoose = require('mongoose');

const PriceCacheSchema = new mongoose.Schema({
  symbol: { type: String, unique: true },
  price: Number,
  open: Number,
  high: Number,
  low: Number,
  volume: Number,
  change: Number,
  changePercent: Number,
  updatedAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.models.PriceCache || mongoose.model('PriceCache', PriceCacheSchema);
