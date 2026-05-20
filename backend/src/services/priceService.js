const PriceCache = require('../models/PriceCache');

async function getCachedPrice(symbol) {
  const entry = await PriceCache.findOne({ symbol });
  if (!entry) return null;
  return { symbol: entry.symbol, price: entry.price, change: entry.change, changePercent: entry.changePercent };
}

// Simple stub for fetching live price (could be extended to call external APIs)
async function fetchLivePrice(symbol) {
  // For now, randomize small movements if no cache exists
  const base = 100 + Math.random() * 200;
  const change = (Math.random() - 0.5) * 2;
  const pct = (change / base) * 100;
  const obj = { symbol, price: Number((base + change).toFixed(2)), change: Number(change.toFixed(2)), changePercent: Number(pct.toFixed(2)) };
  await PriceCache.updateOne({ symbol }, { $set: { ...obj, updatedAt: new Date() } }, { upsert: true });
  return obj;
}

module.exports = { getCachedPrice, fetchLivePrice };
