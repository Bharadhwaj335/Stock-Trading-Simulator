import { api } from './api';

export const marketAPI = {
  // GET all stocks with optional filters
  getStocks: (params) =>
    api.get('/stocks', { params }).then((r) => r.data.data),

  // GET top movers
  getMovers: () =>
    api.get('/stocks/movers').then((r) => r.data.data),

  // GET single stock details
  getStock: (symbol) =>
    api.get(`/stocks/${symbol}`).then((r) => r.data.data),

  // GET historical OHLC bars for chart
  getHistory: (symbol, range = '1M') =>
    api.get(`/stocks/${symbol}/history`, { params: { range } }).then((r) => r.data.data),

  // GET news for a stock
  getNews: (symbol) =>
    api.get(`/stocks/${symbol}/news`).then((r) => r.data.data),
};

export const tradesAPI = {
  // POST execute a trade
  executeTrade: (payload) =>
    api.post('/trades', payload).then((r) => r.data),

  // GET trade history
  getTrades: (params) =>
    api.get('/trades', { params }).then((r) => r.data.data),
};
