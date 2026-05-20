const { executeTrade } = require('../services/tradeService');
const { success } = require('../utils/ApiResponse');
const Trade = require('../models/Trade');

exports.buyStock = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { symbol, quantity } = req.body;
    const { trade } = await executeTrade({ userId, symbol, type: 'buy', qty: Number(quantity) });
    return success(res, { trade }, 'Bought');
  } catch (err) { next(err); }
};

exports.sellStock = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { symbol, quantity } = req.body;
    const { trade, pnl } = await executeTrade({ userId, symbol, type: 'sell', qty: Number(quantity) });
    return success(res, { trade, pnl }, 'Sold');
  } catch (err) { next(err); }
};

exports.getTradeHistory = async (req, res, next) => {
  try {
    const trades = await Trade.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(100);
    return success(res, trades);
  } catch (err) { next(err); }
};

