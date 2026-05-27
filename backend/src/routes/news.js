const { Router } = require('express');
const { getMarketNews, getStockNews } = require('../controllers/newsController');

const router = Router();

router.get('/', getMarketNews);
router.get('/:symbol', getStockNews);

module.exports = router;
