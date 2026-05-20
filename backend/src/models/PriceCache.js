const mongoose = require('mongoose');

const priceCacheSchema = new mongoose.Schema({
  symbol:        { type: String, required: true, unique: true, uppercase: true },
  companyName:   { type: String, default: '' },
  price:         { type: Number, required: true },
  open:          { type: Number, default: 0 },
  high:          { type: Number, default: 0 },
  low:           { type: Number, default: 0 },
  previousClose: { type: Number, default: 0 },
  volume:        { type: Number, default: 0 },
  change:        { type: Number, default: 0 },
  changePercent: { type: Number, default: 0 },
  sector:        { type: String, default: '' },
  marketCap:     { type: String, default: '' },
  peRatio:       { type: Number, default: 0 },
  week52High:    { type: Number, default: 0 },
  week52Low:     { type: Number, default: 0 },
  avgVolume:     { type: String, default: '' },
  description:   { type: String, default: '' },
  exchange:      { type: String, default: 'NASDAQ' },
  updatedAt:     { type: Date, default: Date.now },
});

// TTL index — MongoDB auto-deletes documents older than 10 minutes
// so stale prices never get served
priceCacheSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 600 });

module.exports = mongoose.models.PriceCache || mongoose.model('PriceCache', priceCacheSchema);
