const { Router } = require('express');
const { protect } = require('../middleware/auth');
const { buyStock, sellStock, getTradeHistory } = require('../controllers/tradeController');
const rateLimit = require('express-rate-limit');

const tradeLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: 'Too many trades' });
const router = Router();

router.post('/buy', protect, tradeLimiter, buyStock);
router.post('/sell', protect, tradeLimiter, sellStock);
router.get('/history', protect, getTradeHistory);

module.exports = router;
