const express = require('express');
const router = express.Router();
const { getAnalytics, getEquityCurve, getPnLByMonth, getTopSymbols } = require('../controllers/analytics.controller');
const { protect } = require('../middleware/auth');

// GET /api/analytics routes (protected)
router.get('/', protect, getAnalytics);
router.get('/equity-curve', protect, getEquityCurve);
router.get('/monthly', protect, getPnLByMonth);
router.get('/symbols', protect, getTopSymbols);

module.exports = router;
