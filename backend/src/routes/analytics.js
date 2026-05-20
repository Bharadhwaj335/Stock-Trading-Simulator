const { Router } = require('express');
const { protect } = require('../middleware/auth');
const { getAnalytics } = require('../controllers/analyticsController');

const router = Router();

router.use(protect);
router.get('/', getAnalytics);

module.exports = router;
