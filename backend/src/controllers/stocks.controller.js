const priceService  = require('../services/priceService');
const { SUPPORTED_SYMBOLS, SECTORS } = require('../config/constants');

/**
 * GET /api/v1/stocks
 * Returns all supported stocks with their cached prices.
 * Supports query params: ?sector=Technology&search=apple&sort=changePercent&page=1&limit=20
 */
const getAllStocks = async (req, res) => {
  try {
    const { sector, search, sort = 'symbol', page = 1, limit = 30 } = req.query;

    let stocks = await priceService.getAllCachedPrices();

    // If cache is empty (first run or TTL expired), refresh from Polygon
    if (stocks.length === 0) {
      await priceService.refreshAllPrices();
      stocks = await priceService.getAllCachedPrices();
    }

    // Filter by sector
    if (sector && sector !== 'All') {
      stocks = stocks.filter((s) => s.sector === sector);
    }

    // Filter by search (symbol or company name)
    if (search) {
      const q = search.toLowerCase();
      stocks = stocks.filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) ||
          (s.companyName || '').toLowerCase().includes(q)
      );
    }

    // Sort
    const sortMap = {
      symbol:        (a, b) => a.symbol.localeCompare(b.symbol),
      price:         (a, b) => b.price - a.price,
      changePercent: (a, b) => b.changePercent - a.changePercent,
      losers:        (a, b) => a.changePercent - b.changePercent,
      volume:        (a, b) => b.volume - a.volume,
    };
    if (sortMap[sort]) stocks.sort(sortMap[sort]);

    // Pagination
    const total      = stocks.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginated  = stocks.slice(startIndex, startIndex + Number(limit));

    // Enrich with currentPrice and name for frontend schema compatibility
    const enriched = paginated.map((s) => ({
      ...s,
      name: s.companyName,
      currentPrice: s.price,
    }));

    res.json({
      success: true,
      data: {
        stocks: enriched,
        pagination: {
          total,
          page:  Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    console.error('[stocks.controller] getAllStocks:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch stocks' });
  }
};

/**
 * GET /api/v1/stocks/movers
 * Returns top 5 gainers and top 5 losers from PriceCache.
 */
const getMovers = async (req, res) => {
  try {
    let stocks = await priceService.getAllCachedPrices();
    if (stocks.length === 0) {
      await priceService.refreshAllPrices();
      stocks = await priceService.getAllCachedPrices();
    }

    const sorted  = [...stocks].sort((a, b) => b.changePercent - a.changePercent);
    const gainers = sorted.slice(0, 5);
    const losers  = sorted.slice(-5).reverse();

    const enrich = (s) => ({ ...s, currentPrice: s.price });

    res.json({ 
      success: true, 
      data: { 
        gainers: gainers.map(enrich), 
        losers: losers.map(enrich) 
      } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch movers' });
  }
};

/**
 * GET /api/v1/stocks/:symbol
 * Returns full detail for one stock — price data + company info + analyst placeholder.
 * Also triggers fetching company details from Polygon if not yet cached.
 */
const getStockBySymbol = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    if (!SUPPORTED_SYMBOLS.includes(symbol)) {
      return res.status(404).json({ success: false, message: `${symbol} is not supported` });
    }

    // Get cached price (will refresh all if cache miss)
    const priceData = await priceService.getCachedPrice(symbol);

    // Fetch company details from Polygon if description is missing
    let companyDetails = {};
    if (!priceData.description) {
      companyDetails = await priceService.fetchCompanyDetails(symbol) || {};
    }

    res.json({
      success: true,
      data: {
        symbol,
        companyName:   priceData.companyName   || companyDetails.companyName || symbol,
        description:   priceData.description   || companyDetails.description || '',
        exchange:      priceData.exchange       || companyDetails.exchange    || 'NASDAQ',
        marketCap:     priceData.marketCap      || companyDetails.marketCap   || 'N/A',
        sector:        priceData.sector         || SECTORS[symbol]            || 'Other',
        price:         priceData.price,
        currentPrice:  priceData.price, // Map price to currentPrice for frontend compatibility
        open:          priceData.open,
        high:          priceData.high,
        low:           priceData.low,
        previousClose: priceData.previousClose,
        volume:        priceData.volume,
        change:        priceData.change,
        changePercent: priceData.changePercent,
        week52High:    priceData.week52High     || 0,
        week52Low:     priceData.week52Low      || 0,
        updatedAt:     priceData.updatedAt,
      },
    });
  } catch (err) {
    console.error('[stocks.controller] getStockBySymbol:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch stock details' });
  }
};

/**
 * GET /api/v1/stocks/:symbol/history?range=1M
 * Returns historical OHLC bars for charting.
 * range options: 1D | 1W | 1M | 3M | 6M | 1Y
 */
const getStockHistory = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const range  = req.query.range || '1M';

    if (!SUPPORTED_SYMBOLS.includes(symbol)) {
      return res.status(404).json({ success: false, message: `${symbol} is not supported` });
    }

    const bars = await priceService.fetchHistoricalBars(symbol, range);
    res.json({ success: true, data: bars }); // Return bars directly to perfectly match frontend StockChart
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch historical data' });
  }
};

/**
 * GET /api/v1/stocks/:symbol/news
 * Returns latest news articles for a stock.
 */
const getStockNews = async (req, res) => {
  try {
    const symbol   = req.params.symbol.toUpperCase();
    const articles = await priceService.fetchStockNews(symbol);
    res.json({ success: true, data: articles }); // Return articles array directly to match frontend perfectly
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch news' });
  }
};

module.exports = { getAllStocks, getMovers, getStockBySymbol, getStockHistory, getStockNews };
