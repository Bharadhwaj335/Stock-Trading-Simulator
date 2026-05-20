const tradeService = require('../services/tradeService');
const Trade        = require('../models/Trade');
const { SUPPORTED_SYMBOLS } = require('../config/constants');

/**
 * POST /api/trades
 * Body: { symbol, type, qty/quantity }
 */
const createTrade = async (req, res) => {
  try {
    let { symbol, type, qty, quantity } = req.body;
    const finalQty = Number(qty || quantity);
    
    // Auto-detect type if routing via /buy or /sell
    let finalType = type;
    if (!finalType) {
      if (req.path.includes('buy')) finalType = 'buy';
      else if (req.path.includes('sell')) finalType = 'sell';
    }

    const userId = req.user.id; // use req.user.id instead of req.user._id

    // Validate inputs
    if (!symbol || !finalType || !finalQty) {
      return res.status(400).json({ success: false, message: 'symbol, type, and qty are required' });
    }
    if (!['buy', 'sell'].includes(finalType.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'type must be buy or sell' });
    }
    if (!Number.isInteger(finalQty) || finalQty < 1) {
      return res.status(400).json({ success: false, message: 'qty must be a positive integer' });
    }
    if (!SUPPORTED_SYMBOLS.includes(symbol.toUpperCase())) {
      return res.status(400).json({ success: false, message: `${symbol} is not a supported stock` });
    }

    const result = await tradeService.executeTrade(userId, symbol.toUpperCase(), finalType.toLowerCase(), finalQty);

    res.status(201).json({
      success: true,
      message: `${finalType.toLowerCase() === 'buy' ? 'Bought' : 'Sold'} ${finalQty} share${finalQty > 1 ? 's' : ''} of ${symbol.toUpperCase()}`,
      data:    result,
    });
  } catch (err) {
    console.error('[trades.controller] createTrade:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/trades
 * Query params: ?page=1&limit=20&symbol=AAPL&type=buy&from=2024-01-01&to=2024-12-31
 */
const getTrades = async (req, res) => {
  try {
    const { page = 1, limit = 20, symbol, type, from, to } = req.query;
    const userId = req.user.id; // use req.user.id instead of req.user._id

    const filter = { userId };
    if (symbol) filter.symbol = symbol.toUpperCase();
    if (type)   filter.type   = type;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }

    const [trades, total] = await Promise.all([
      Trade.find(filter)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      Trade.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        trades,
        pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch trades' });
  }
};

module.exports = { createTrade, getTrades };
