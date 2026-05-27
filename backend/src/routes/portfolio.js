const { Router } = require('express');
const { protect } = require('../middleware/auth');
const { getPortfolio, resetPortfolio } = require('../controllers/portfolioController');

const router = Router();

router.get('/', protect, getPortfolio);
router.post('/reset', protect, resetPortfolio);

module.exports = router;
