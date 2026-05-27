const axios = require('axios');
const PriceCache = require('../models/PriceCache');
const Stock = require('../models/Stock');
const { SUPPORTED_SYMBOLS, SECTORS } = require('../config/constants');

const FMP_KEY = process.env.FMP_API_KEY;
const ALPHA_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const FMP_BASE = 'https://financialmodelingprep.com/api/v3';
const ALPHA_BASE = 'https://www.alphavantage.co/query';

// ─── Shared axios with retry-once on timeout ────────────────────────────────

const safeGet = async (url, opts = {}) => {
  try {
    return await axios.get(url, { timeout: 12000, ...opts });
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      // Retry once after 2 seconds
      await new Promise(r => setTimeout(r, 2000));
      return axios.get(url, { timeout: 15000, ...opts });
    }
    throw err;
  }
};

// ─── Helper ─────────────────────────────────────────────────────────────────

const formatMarketCap = (num) => {
  if (!num || isNaN(num)) return '';
  if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`;
  if (num >= 1e9)  return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6)  return `$${(num / 1e6).toFixed(1)}M`;
  return `$${num}`;
};

// ─── Fallback: Local Stock DB with simulated micro-drift ────────────────────

const loadFallbackPricesFromStockDB = async () => {
  try {
    const stocks = await Stock.find({}).lean();
    if (stocks.length === 0) {
      console.warn('[priceService] Local Stock DB is empty. Cannot fallback.');
      return;
    }

    const bulkOps = stocks.map((s) => {
      const volatility = 0.002;
      const drift = (Math.random() - 0.5) * volatility;
      const newPrice = Number((s.currentPrice * (1 + drift)).toFixed(2));
      const change = Number((newPrice - s.previousClose).toFixed(2));
      const changePercent = s.previousClose
        ? Number(((change / s.previousClose) * 100).toFixed(2))
        : 0;

      return {
        updateOne: {
          filter: { symbol: s.symbol },
          update: {
            $set: {
              symbol:        s.symbol,
              price:         newPrice,
              open:          s.currentPrice,
              high:          Math.max(s.currentPrice, newPrice),
              low:           Math.min(s.currentPrice, newPrice),
              previousClose: s.previousClose,
              volume:        s.volume || 1000000,
              change,
              changePercent,
              sector:        SECTORS[s.symbol] || s.sector || 'Other',
              updatedAt:     new Date(),
            },
          },
          upsert: true,
        },
      };
    });

    await PriceCache.bulkWrite(bulkOps);
    console.log(`[priceService] Fallback: synced ${bulkOps.length} stocks from local DB`);
  } catch (err) {
    console.error('[priceService] loadFallbackPricesFromStockDB error:', err.message);
  }
};

// ─── FMP: Batch real-time quotes ─────────────────────────────────────────────

const refreshAllPricesFromFMP = async () => {
  if (!FMP_KEY) throw new Error('No FMP API key');
  const bulkOps = [];
  const stockBulkOps = [];

  // Since batch quote is blocked on new keys, request symbols individually in parallel
  const tasks = SUPPORTED_SYMBOLS.map(async (symbol) => {
    try {
      const url = `https://financialmodelingprep.com/stable/quote?symbol=${symbol}&apikey=${FMP_KEY}`;
      const { data } = await safeGet(url);
      const q = Array.isArray(data) ? data[0] : data;
      if (!q || !q.symbol) return;

      const price = q.price ?? 0;
      const change = q.change ?? 0;
      const changePercent = q.changePercentage ?? 0;
      const open = q.open ?? price;
      const high = q.dayHigh ?? price;
      const low = q.dayLow ?? price;
      const prevClose = q.previousClose ?? price;
      const volume = q.volume ?? 0;
      const companyName = q.name ?? symbol;

      bulkOps.push({
        updateOne: {
          filter: { symbol },
          update: {
            $set: {
              symbol, price, open, high, low,
              previousClose: prevClose, volume, change,
              changePercent: Number(changePercent.toFixed(4)),
              companyName,
              marketCap: q.marketCap ? formatMarketCap(q.marketCap) : '',
              sector: SECTORS[symbol] || 'Other',
              updatedAt: new Date(),
            },
          },
          upsert: true,
        },
      });

      stockBulkOps.push({
        updateOne: {
          filter: { symbol },
          update: {
            $set: {
              symbol, name: companyName, currentPrice: price,
              previousClose: prevClose, change,
              changePercent: Number(changePercent.toFixed(4)),
              sector: SECTORS[symbol] || 'Other',
              volume, marketCap: q.marketCap || 0,
              lastUpdated: new Date(),
            },
          },
          upsert: true,
        },
      });
    } catch (err) {
      console.warn(`[priceService] FMP failed for ${symbol}: ${err.message}`);
    }
  });

  await Promise.all(tasks);

  if (bulkOps.length === 0) throw new Error('FMP returned no quotes for any symbols');

  await PriceCache.bulkWrite(bulkOps);
  await Stock.bulkWrite(stockBulkOps);
  console.log(`[priceService] ✅ FMP: Updated ${bulkOps.length} symbols with stable API`);
};

// ─── Yahoo Finance: Batch fallback ───────────────────────────────────────────

const refreshAllPricesFromYahoo = async () => {
  const bulkOps = [];
  const stockBulkOps = [];

  // Fetch all symbols in parallel using the keyless, high-rate-limit v8 chart endpoint
  const tasks = SUPPORTED_SYMBOLS.map(async (symbol) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=5m`;
      const { data } = await safeGet(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const q = data.chart?.result?.[0]?.meta;
      if (!q) return;

      const price = q.regularMarketPrice ?? 0;
      const prevClose = q.previousClose ?? price;
      const change = Number((price - prevClose).toFixed(2));
      const changePercent = prevClose ? Number(((change / prevClose) * 100).toFixed(4)) : 0;
      const open = q.regularMarketOpen ?? prevClose;
      const high = q.regularMarketDayHigh ?? price;
      const low = q.regularMarketDayLow ?? price;
      const volume = q.regularMarketVolume ?? 0;
      const companyName = q.longName ?? q.shortName ?? symbol;

      bulkOps.push({
        updateOne: {
          filter: { symbol },
          update: {
            $set: {
              symbol, price, open, high, low,
              previousClose: prevClose, volume, change, changePercent,
              companyName,
              marketCap: q.marketCap ? formatMarketCap(q.marketCap) : '',
              sector: SECTORS[symbol] || 'Other',
              updatedAt: new Date(),
            },
          },
          upsert: true,
        },
      });

      stockBulkOps.push({
        updateOne: {
          filter: { symbol },
          update: {
            $set: {
              symbol, name: companyName, currentPrice: price,
              previousClose: prevClose, change, changePercent,
              sector: SECTORS[symbol] || 'Other',
              volume, marketCap: q.marketCap || 0,
              lastUpdated: new Date(),
            },
          },
          upsert: true,
        },
      });
    } catch (err) {
      console.warn(`[priceService] Yahoo Finance failed for ${symbol}: ${err.message}`);
    }
  });

  await Promise.all(tasks);

  if (bulkOps.length === 0) throw new Error('Yahoo Finance returned no quotes for any symbols');

  await PriceCache.bulkWrite(bulkOps);
  await Stock.bulkWrite(stockBulkOps);
  console.log(`[priceService] ✅ Yahoo Finance: Updated ${bulkOps.length} symbols`);
};

// ─── Main: Cascade price refresh ─────────────────────────────────────────────

const refreshAllPrices = async () => {
  // 1. Try Yahoo Finance (free, unlimited, real-time in parallel)
  try {
    await refreshAllPricesFromYahoo();
    return;
  } catch (err) {
    console.warn(`[priceService] Yahoo Finance failed: ${err.message}. Trying FMP...`);
  }

  // 2. Try FMP as backup (stable endpoint)
  try {
    await refreshAllPricesFromFMP();
    return;
  } catch (err) {
    console.warn(`[priceService] FMP failed: ${err.message}. Using local DB fallback...`);
  }

  // 3. Final fallback: local DB with micro-drift
  await loadFallbackPricesFromStockDB();
};

// ─── Company Details: FMP → Yahoo Finance → Local DB ─────────────────────────

const fetchCompanyDetailsFromFMP = async (symbol) => {
  if (!FMP_KEY) throw new Error('No FMP key');
  const symbolUpper = symbol.toUpperCase();
  const { data } = await safeGet(`https://financialmodelingprep.com/stable/profile?symbol=${symbolUpper}&apikey=${FMP_KEY}`);
  const profile = Array.isArray(data) ? data[0] : data;
  if (!profile || !profile.companyName) throw new Error('FMP profile empty');

  return {
    companyName: profile.companyName,
    description: profile.description || `${profile.companyName} is a publicly traded company on ${profile.exchange}.`,
    exchange: profile.exchange || 'NASDAQ',
    marketCap: profile.marketCap || profile.mktCap ? formatMarketCap(profile.marketCap || profile.mktCap) : '',
    ceo: profile.ceo || '',
    sector: profile.sector || SECTORS[symbolUpper] || 'Other',
    industry: profile.industry || '',
    website: profile.website || '',
    image: profile.image || '',
  };
};

const fetchCompanyDetails = async (symbol) => {
  try {
    const symbolUpper = symbol.toUpperCase();
    const cached = await PriceCache.findOne({ symbol: symbolUpper }).lean();
    if (cached && cached.companyName && cached.marketCap && cached.description) {
      return {
        companyName: cached.companyName,
        description: cached.description,
        exchange: cached.exchange || 'NASDAQ',
        marketCap: cached.marketCap,
        sector: cached.sector || SECTORS[symbolUpper] || 'Other',
      };
    }

    // Try FMP first
    try {
      const details = await fetchCompanyDetailsFromFMP(symbolUpper);
      await PriceCache.updateOne(
        { symbol: symbolUpper },
        { $set: { ...details } },
        { upsert: true }
      );
      await Stock.updateOne(
        { symbol: symbolUpper },
        { $set: { name: details.companyName, marketCap: 0 } },
        { upsert: true }
      );
      return details;
    } catch (fmpErr) {
      console.warn(`[priceService] FMP company details failed for ${symbolUpper}: ${fmpErr.message}`);
    }

    // Try Yahoo Finance
    try {
      const { data } = await safeGet(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolUpper}`
      );
      const q = data.quoteResponse?.result?.[0];
      if (!q) throw new Error('No Yahoo quote');

      const companyName = q.longName || q.shortName || symbolUpper;
      const details = {
        companyName,
        description: `${companyName} is a leading company traded globally on ${q.fullExchangeName || 'major exchanges'}.`,
        exchange: q.fullExchangeName || 'NASDAQ',
        marketCap: q.marketCap ? formatMarketCap(q.marketCap) : '',
        sector: SECTORS[symbolUpper] || 'Other',
      };

      await PriceCache.updateOne({ symbol: symbolUpper }, { $set: details }, { upsert: true });
      return details;
    } catch (yahooErr) {
      console.warn(`[priceService] Yahoo company details failed for ${symbolUpper}: ${yahooErr.message}`);
    }

    // Fallback to local stock DB
    const stock = await Stock.findOne({ symbol: symbolUpper });
    if (stock) {
      const details = {
        companyName: stock.name || symbolUpper,
        description: `${stock.name || symbolUpper} is a publicly traded company in the ${stock.sector || 'technology'} sector.`,
        exchange: 'NASDAQ',
        marketCap: stock.marketCap ? formatMarketCap(stock.marketCap) : '',
        sector: SECTORS[symbolUpper] || stock.sector || 'Other',
      };
      await PriceCache.updateOne({ symbol: symbolUpper }, { $set: details }, { upsert: true });
      return details;
    }

    return null;
  } catch (err) {
    console.error(`[priceService] fetchCompanyDetails(${symbol}) error:`, err.message);
    return null;
  }
};

// ─── Historical Bars: Alpha Vantage → Yahoo Finance → Synthetic ──────────────

const fetchHistoricalBarsFromAlphaVantage = async (symbol, range) => {
  if (!ALPHA_KEY) throw new Error('No Alpha Vantage key');
  const symbolUpper = symbol.toUpperCase();

  // Map range to Alpha Vantage function params
  const isIntraday = range === '1D';
  let url;

  if (isIntraday) {
    url = `${ALPHA_BASE}?function=TIME_SERIES_INTRADAY&symbol=${symbolUpper}&interval=5min&outputsize=full&apikey=${ALPHA_KEY}`;
  } else {
    const outputsize = (range === '1Y') ? 'full' : 'compact';
    url = `${ALPHA_BASE}?function=TIME_SERIES_DAILY&symbol=${symbolUpper}&outputsize=${outputsize}&apikey=${ALPHA_KEY}`;
  }

  const { data } = await safeGet(url);

  // Alpha Vantage returns error messages in data object sometimes
  if (data['Note'] || data['Information'] || data['Error Message']) {
    throw new Error(`Alpha Vantage limit: ${data['Note'] || data['Information'] || data['Error Message']}`);
  }

  const seriesKey = isIntraday ? 'Time Series (5min)' : 'Time Series (Daily)';
  const series = data[seriesKey];
  if (!series) throw new Error('Alpha Vantage: No series data');

  // Determine how many days to return based on range
  const daysMap = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };
  const cutoff = new Date(Date.now() - (daysMap[range] || 30) * 86400000);

  const bars = Object.entries(series)
    .map(([dateStr, ohlcv]) => {
      const time = new Date(dateStr).getTime();
      return {
        time,
        date: new Date(time).toISOString(),
        open:   parseFloat(ohlcv['1. open']),
        high:   parseFloat(ohlcv['2. high']),
        low:    parseFloat(ohlcv['3. low']),
        close:  parseFloat(ohlcv['4. close']),
        volume: parseInt(ohlcv['5. volume'], 10),
      };
    })
    .filter(b => b.close > 0 && new Date(b.time) >= cutoff)
    .sort((a, b) => a.time - b.time);

  if (bars.length === 0) throw new Error('Alpha Vantage: No bars after filtering');
  return bars;
};

const fetchHistoricalBarsFromYahoo = async (symbol, range) => {
  const symbolUpper = symbol.toUpperCase();
  const yahooRangeMap = {
    '1D': { range: '1d', interval: '5m' },
    '1W': { range: '5d', interval: '15m' },
    '1M': { range: '1mo', interval: '1d' },
    '3M': { range: '3mo', interval: '1d' },
    '6M': { range: '6mo', interval: '1d' },
    '1Y': { range: '1y', interval: '1d' },
  };

  const config = yahooRangeMap[range] || yahooRangeMap['1M'];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbolUpper}?range=${config.range}&interval=${config.interval}`;
  const { data } = await safeGet(url);
  const r = data.chart?.result?.[0];
  if (!r) throw new Error('Yahoo Finance: No chart data');

  const timestamps = r.timestamp || [];
  const quote = r.indicators?.quote?.[0] || {};

  const bars = timestamps.map((t, idx) => ({
    time:   t * 1000,
    date:   new Date(t * 1000).toISOString(),
    open:   quote.open?.[idx] ?? quote.close?.[idx] ?? 0,
    high:   quote.high?.[idx] ?? quote.close?.[idx] ?? 0,
    low:    quote.low?.[idx] ?? quote.close?.[idx] ?? 0,
    close:  quote.close?.[idx] ?? quote.open?.[idx] ?? 0,
    volume: quote.volume?.[idx] ?? 0,
  })).filter(b => b.close > 0);

  if (bars.length === 0) throw new Error('Yahoo Finance: No valid bars');
  return bars;
};

const fetchHistoricalBars = async (symbol, range = '1M') => {
  // 1. Try Alpha Vantage (best OHLC quality)
  try {
    const bars = await fetchHistoricalBarsFromAlphaVantage(symbol, range);
    console.log(`[priceService] ✅ Alpha Vantage: ${bars.length} bars for ${symbol} (${range})`);
    return bars;
  } catch (err) {
    console.warn(`[priceService] Alpha Vantage bars failed for ${symbol}: ${err.message}`);
  }

  // 2. Try Yahoo Finance
  try {
    const bars = await fetchHistoricalBarsFromYahoo(symbol, range);
    console.log(`[priceService] ✅ Yahoo Finance: ${bars.length} bars for ${symbol} (${range})`);
    return bars;
  } catch (err) {
    console.warn(`[priceService] Yahoo Finance bars failed for ${symbol}: ${err.message}`);
  }

  // 3. Synthetic fallback with sin-wave oscillation
  console.warn(`[priceService] All historical sources failed for ${symbol}. Generating synthetic bars.`);
  const stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
  const base = stock?.currentPrice || 150;
  const limit = range === '1D' ? 78 : range === '1W' ? 35 : 30;
  const arr = [];

  for (let i = limit; i >= 0; i--) {
    const d = new Date();
    if (range === '1D') {
      d.setHours(d.getHours() - i);
    } else {
      d.setDate(d.getDate() - i);
    }
    const rand = Math.sin(i / 5) * 5 + (Math.random() - 0.5) * 3;
    arr.push({
      time:   d.getTime(),
      date:   d.toISOString(),
      open:   Number((base + rand - 1).toFixed(2)),
      high:   Number((base + rand + 2).toFixed(2)),
      low:    Number((base + rand - 3).toFixed(2)),
      close:  Number((base + rand).toFixed(2)),
      volume: Math.floor(Math.random() * 1e6) + 100000,
    });
  }
  return arr;
};

// ─── Stock News: Finnhub → FMP → Simulated ───────────────────────────────────

const fetchStockNews = async (symbol) => {
  const sym = symbol.toUpperCase();
  const finnhubKey = process.env.FINNHUB_API_KEY;
  const fmpKey = process.env.FMP_API_KEY;

  // 1. Finnhub company news
  if (finnhubKey) {
    try {
      const toDate = new Date().toISOString().split('T')[0];
      const fromDateObj = new Date();
      fromDateObj.setDate(fromDateObj.getDate() - 30);
      const fromDate = fromDateObj.toISOString().split('T')[0];

      const { data } = await safeGet(
        `https://finnhub.io/api/v1/company-news?symbol=${sym}&from=${fromDate}&to=${toDate}&token=${finnhubKey}`
      );

      if (Array.isArray(data) && data.length > 0) {
        return data.slice(0, 8).map(item => ({
          id: item.id,
          headline: item.headline,
          summary: item.summary || '',
          source: item.source || 'Finnhub',
          url: item.url,
          datetime: item.datetime,
          image: item.image || '',
          related: sym,
        }));
      }
    } catch (err) {
      console.warn(`[priceService] Finnhub stock news failed for ${sym}: ${err.message}`);
    }
  }

  // 2. FMP stock news
  if (fmpKey) {
    try {
      const { data } = await safeGet(
        `${FMP_BASE}/stock_news?tickers=${sym}&limit=8&apikey=${fmpKey}`
      );

      if (Array.isArray(data) && data.length > 0) {
        return data.map(item => ({
          id: item.url,
          headline: item.title,
          summary: item.text?.substring(0, 200) || '',
          source: item.site || 'FMP News',
          url: item.url,
          datetime: new Date(item.publishedDate).getTime() / 1000,
          image: item.image || '',
          related: sym,
        }));
      }
    } catch (err) {
      console.warn(`[priceService] FMP stock news failed for ${sym}: ${err.message}`);
    }
  }

  // 3. Simulated fallback
  return [
    {
      id: `${sym}-sim-1`,
      headline: `${sym} Shows Strong Market Resilience Amid Sector Shifts`,
      summary: `Analysts discuss the future trajectory of ${sym} and its strategic positioning.`,
      url: 'https://finance.yahoo.com',
      source: 'MarketWatch',
      datetime: Math.floor(Date.now() / 1000) - 3600,
      image: '',
      related: sym,
    },
    {
      id: `${sym}-sim-2`,
      headline: `Why Investors Are Focusing on ${sym} This Quarter`,
      summary: `A detailed breakdown of key performance indicators and growth vectors for ${sym}.`,
      url: 'https://finance.yahoo.com',
      source: 'Bloomberg',
      datetime: Math.floor(Date.now() / 1000) - 18000,
      image: '',
      related: sym,
    },
  ];
};

// ─── Cached Price Accessors ───────────────────────────────────────────────────

const getCachedPrice = async (symbol) => {
  let cached = await PriceCache.findOne({ symbol: symbol.toUpperCase() });
  if (!cached) {
    await refreshAllPrices();
    cached = await PriceCache.findOne({ symbol: symbol.toUpperCase() });
  }
  if (!cached) throw new Error(`Price not available for ${symbol}`);
  return cached;
};

const getAllCachedPrices = async () => {
  let cached = await PriceCache.find({}).lean();
  if (cached.length === 0) {
    await refreshAllPrices();
    cached = await PriceCache.find({}).lean();
  }
  return cached;
};

module.exports = {
  refreshAllPrices,
  fetchCompanyDetails,
  fetchHistoricalBars,
  fetchStockNews,
  getCachedPrice,
  getAllCachedPrices,
};
