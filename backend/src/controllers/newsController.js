const axios = require('axios');
const { cache } = require('../config/redis');

const FINNHUB_KEY  = process.env.FINNHUB_API_KEY;
const MARKETAUX_KEY = process.env.MARKETAUX_API_KEY;
const NEWSDATA_KEY  = process.env.NEWSDATA_API_KEY;

// ─── Simulated fallback articles ─────────────────────────────────────────────

const GENERAL_SIMULATED_NEWS = [
  {
    id: 101,
    headline: 'Markets Hit Record Highs Amid Tech Surge and Strong Earnings',
    summary: 'Wall Street rallied today as major indices reached fresh record highs, propelled by a surge in mega-cap technology stocks and a series of better-than-expected corporate earnings reports.',
    source: 'Bloomberg',
    url: 'https://www.bloomberg.com/markets',
    datetime: Math.floor(Date.now() / 1000) - 1800,
    image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80',
    related: '',
  },
  {
    id: 102,
    headline: 'Federal Reserve Signals Potential Interest Rate Stabilization',
    summary: 'In its latest meeting, the Federal Reserve hinted that interest rates may have peaked, signaling a period of stabilization before potential cuts later this year.',
    source: 'Reuters',
    url: 'https://www.reuters.com/markets/',
    datetime: Math.floor(Date.now() / 1000) - 7200,
    image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80',
    related: '',
  },
  {
    id: 103,
    headline: 'Inflation Rates Cooling Faster Than Forecast, Consumer Spending Resilient',
    summary: 'The latest Consumer Price Index (CPI) report reveals that inflation is cooling at a swifter pace than economists anticipated. Consumer retail spending remains resilient.',
    source: 'Wall Street Journal',
    url: 'https://www.wsj.com/market-data',
    datetime: Math.floor(Date.now() / 1000) - 14400,
    image: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?auto=format&fit=crop&w=600&q=80',
    related: '',
  },
  {
    id: 104,
    headline: 'Global Supply Chain Congestion Fully Eases to Pre-Pandemic Levels',
    summary: 'A comprehensive industry report shows shipping costs and port congestion have returned to pre-pandemic baselines, lowering manufacturing costs significantly.',
    source: 'Financial Times',
    url: 'https://www.ft.com/markets',
    datetime: Math.floor(Date.now() / 1000) - 21600,
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
    related: '',
  },
  {
    id: 105,
    headline: 'Renewable Energy Sector Secures Record Capital Inflow in Q1',
    summary: 'Venture capital and institutional investments in solar, wind, and battery storage startups hit a new milestone, despite tighter monetary conditions.',
    source: 'MarketWatch',
    url: 'https://www.marketwatch.com',
    datetime: Math.floor(Date.now() / 1000) - 43200,
    image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=600&q=80',
    related: '',
  },
  {
    id: 106,
    headline: 'AI Chip Demand Continues to Outpace Supply as Data Centers Expand',
    summary: 'Major technology companies are accelerating investments in AI infrastructure, fueling unprecedented demand for high-performance computing chips.',
    source: 'TechCrunch',
    url: 'https://techcrunch.com',
    datetime: Math.floor(Date.now() / 1000) - 86400,
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
    related: '',
  },
];

const generateSimulatedStockNews = (symbol) => {
  const sym = symbol.toUpperCase();
  return [
    {
      id: `${sym}-1`,
      headline: `${sym} Launches Groundbreaking Next-Generation Platform Driven by AI`,
      summary: `In a surprise press event, ${sym} unveiled its brand-new core system featuring advanced AI integrations. The CEO announced this product rollout represents the most significant strategic shift in a decade.`,
      source: 'TechCrunch',
      url: 'https://techcrunch.com',
      datetime: Math.floor(Date.now() / 1000) - 3600,
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
      related: sym,
    },
    {
      id: `${sym}-2`,
      headline: `Analysts Upgrade ${sym} Rating to Strong Buy, Raising Price Targets`,
      summary: `A consortium of major investment banks upgraded ${sym} today, citing robust cash flows, expanding operating margins, and clear leadership in its market segment.`,
      source: 'MarketWatch',
      url: 'https://www.marketwatch.com',
      datetime: Math.floor(Date.now() / 1000) - 18000,
      image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80',
      related: sym,
    },
    {
      id: `${sym}-3`,
      headline: `Why ${sym} Stock is Outperforming its Peer Group This Session`,
      summary: `Shares of ${sym} advanced notably today, comfortably outpacing the broader index. Traders point to heavy call option activity and retail accumulation.`,
      source: "Investor's Business Daily",
      url: 'https://finance.yahoo.com',
      datetime: Math.floor(Date.now() / 1000) - 86400,
      image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
      related: sym,
    },
  ];
};

// ─── Normalize news from various APIs ────────────────────────────────────────

const normalizeFinnhubArticle = (item, idx) => ({
  id: item.id || `fh-${idx}`,
  headline: item.headline || '',
  summary: item.summary || '',
  source: item.source || 'Finnhub',
  url: item.url || '',
  datetime: item.datetime || Math.floor(Date.now() / 1000),
  image: item.image || '',
  related: item.related || '',
});

const normalizeMarketauxArticle = (item, idx) => ({
  id: item.uuid || `mx-${idx}`,
  headline: item.title || '',
  summary: item.description || item.snippet || '',
  source: item.source || 'Marketaux',
  url: item.url || '',
  datetime: item.published_at
    ? Math.floor(new Date(item.published_at).getTime() / 1000)
    : Math.floor(Date.now() / 1000),
  image: item.image_url || '',
  related: (item.entities || []).map(e => e.symbol).filter(Boolean).join(','),
  sentiment: item.sentiment || null,
});

const normalizeNewsdataArticle = (item, idx) => ({
  id: item.article_id || `nd-${idx}`,
  headline: item.title || '',
  summary: item.description || item.content?.substring(0, 250) || '',
  source: item.source_id || 'NewsData',
  url: item.link || '',
  datetime: item.pubDate
    ? Math.floor(new Date(item.pubDate).getTime() / 1000)
    : Math.floor(Date.now() / 1000),
  image: item.image_url || '',
  related: '',
});

// ─── Market News: Finnhub → Marketaux → NewsData → Simulated ─────────────────

const getMarketNews = async (req, res, next) => {
  try {
    const cacheKey = 'news:market:v3';
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const tasks = [];

    // 1. Finnhub
    if (FINNHUB_KEY) {
      tasks.push(
        axios.get(
          `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`,
          { timeout: 3000 }
        ).then(r => {
          if (Array.isArray(r.data) && r.data.length > 0) {
            return r.data.slice(0, 15).map(normalizeFinnhubArticle);
          }
          throw new Error('Empty data');
        }).catch(err => {
          console.warn('[newsController] Finnhub market news failed:', err.message);
          return null;
        })
      );
    }

    // 2. Marketaux
    if (MARKETAUX_KEY) {
      tasks.push(
        axios.get(
          `https://api.marketaux.com/v1/news/all?api_token=${MARKETAUX_KEY}&language=en&filter_entities=true&limit=15`,
          { timeout: 3000 }
        ).then(r => {
          if (r.data?.data && r.data.data.length > 0) {
            return r.data.data.map(normalizeMarketauxArticle);
          }
          throw new Error('Empty data');
        }).catch(err => {
          console.warn('[newsController] Marketaux market news failed:', err.message);
          return null;
        })
      );
    }

    // 3. NewsData.io
    if (NEWSDATA_KEY) {
      tasks.push(
        axios.get(
          `https://newsdata.io/api/1/news?apikey=${NEWSDATA_KEY}&category=business,top&language=en&size=15`,
          { timeout: 3000 }
        ).then(r => {
          if (r.data?.results && r.data.results.length > 0) {
            return r.data.results.map(normalizeNewsdataArticle);
          }
          throw new Error('Empty data');
        }).catch(err => {
          console.warn('[newsController] NewsData market news failed:', err.message);
          return null;
        })
      );
    }

    if (tasks.length > 0) {
      const results = await Promise.all(tasks);
      const validNews = results.find(n => n && n.length > 0);
      if (validNews) {
        await cache.set(cacheKey, validNews, 1800); // 30 min
        return res.json(validNews);
      }
    }

    console.warn('[newsController] All news APIs failed or timed out — using simulated news');
    return res.json(GENERAL_SIMULATED_NEWS);
  } catch (err) {
    next(err);
  }
};

// ─── Stock News: Finnhub → Marketaux → Simulated ─────────────────────────────

const getStockNews = async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const cacheKey = `news:stock:${symbol}:v3`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const tasks = [];

    // 1. Finnhub company-specific news
    if (FINNHUB_KEY) {
      const toDate = new Date().toISOString().split('T')[0];
      const fromDateObj = new Date();
      fromDateObj.setDate(fromDateObj.getDate() - 30);
      const fromDate = fromDateObj.toISOString().split('T')[0];

      tasks.push(
        axios.get(
          `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${FINNHUB_KEY}`,
          { timeout: 3000 }
        ).then(r => {
          if (Array.isArray(r.data) && r.data.length > 0) {
            return r.data.slice(0, 8).map((item, idx) => ({
              ...normalizeFinnhubArticle(item, idx),
              related: symbol,
            }));
          }
          throw new Error('Empty data');
        }).catch(err => {
          console.warn(`[newsController] Finnhub stock news failed for ${symbol}:`, err.message);
          return null;
        })
      );
    }

    // 2. Marketaux with entity symbol filter
    if (MARKETAUX_KEY) {
      tasks.push(
        axios.get(
          `https://api.marketaux.com/v1/news/all?api_token=${MARKETAUX_KEY}&symbols=${symbol}&language=en&limit=8`,
          { timeout: 3000 }
        ).then(r => {
          if (r.data?.data && r.data.data.length > 0) {
            return r.data.data.map(normalizeMarketauxArticle);
          }
          throw new Error('Empty data');
        }).catch(err => {
          console.warn(`[newsController] Marketaux stock news failed for ${symbol}:`, err.message);
          return null;
        })
      );
    }

    if (tasks.length > 0) {
      const results = await Promise.all(tasks);
      const validNews = results.find(n => n && n.length > 0);
      if (validNews) {
        await cache.set(cacheKey, validNews, 1800);
        return res.json(validNews);
      }
    }

    const news = generateSimulatedStockNews(symbol);
    return res.json(news);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMarketNews,
  getStockNews,
};
