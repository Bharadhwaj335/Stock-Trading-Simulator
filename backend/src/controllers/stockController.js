const PriceCache = require('../models/PriceCache');
const { getCachedPrice, fetchLivePrice } = require('../services/priceService');
const { success } = require('../utils/ApiResponse');

exports.getAllStocks = async (req, res, next) => {
  try {
    // simple listing from PriceCache
    const stocks = await PriceCache.find({}).limit(200);
    return success(res, stocks);
  } catch (err) { next(err); }
};

exports.getStockBySymbol = async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    let p = await getCachedPrice(symbol);
    if (!p) p = await fetchLivePrice(symbol);
    return success(res, p);
  } catch (err) { next(err); }
};

exports.getStockHistory = async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    // stub: return last 30 days with minor variations
    const arr = [];
    for (let i = 30; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const base = 100 + Math.random() * 200;
      arr.push({ date: d.toISOString(), open: base - 1, high: base + 2, low: base - 3, close: base + 0.5, volume: Math.floor(Math.random() * 1e6) });
    }
    return success(res, arr);
  } catch (err) { next(err); }
};

