const express = require('express');
const router  = express.Router();
const { createTrade, getTrades } = require('../controllers/trades.controller');
const { protect } = require('../middleware/auth');

router.use(protect);

// New unified endpoints
router.post('/', createTrade);   // POST /api/trades
router.get('/',  getTrades);     // GET  /api/trades

// Legacy compatibility endpoints
router.post('/buy', createTrade);   // POST /api/trades/buy
router.post('/sell', createTrade);  // POST /api/trades/sell
router.get('/history', getTrades);  // GET  /api/trades/history

module.exports = router;
