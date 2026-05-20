const express = require('express');
const router  = express.Router();
const {
  getAllStocks,
  getMovers,
  getStockBySymbol,
  getStockHistory,
  getStockNews,
} = require('../controllers/stocks.controller');
const { verifyJWT } = require('../middleware/auth.middleware');

// All stock routes require authentication
router.use(verifyJWT);

router.get('/',              getAllStocks);       // GET /api/stocks
router.get('/movers',        getMovers);          // GET /api/stocks/movers
router.get('/:symbol',       getStockBySymbol);   // GET /api/stocks/AAPL
router.get('/:symbol/history', getStockHistory);  // GET /api/stocks/AAPL/history?range=1M
router.get('/:symbol/news',  getStockNews);       // GET /api/stocks/AAPL/news

module.exports = router;
