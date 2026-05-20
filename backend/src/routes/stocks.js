const { Router } = require('express');
const { getAllStocks, getStockBySymbol, getStockHistory } = require('../controllers/stockController');

const router = Router();

router.get('/', getAllStocks);
router.get('/:symbol', getStockBySymbol);
router.get('/:symbol/history', getStockHistory);

module.exports = router;
