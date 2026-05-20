const { Router } = require('express');
const { protect } = require('../middleware/auth');
const { getPortfolio } = require('../controllers/portfolioController');

const router = Router();

router.get('/', protect, getPortfolio);

module.exports = router;
