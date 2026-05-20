import { create } from 'zustand';
import { marketAPI, tradesAPI } from '../services/marketAPI';
import { useAuthStore } from './authStore';

export const useMarketStore = create((set, get) => ({
  stocks:       [],
  currentStock: null,
  history:      [],
  movers:       { gainers: [], losers: [] },
  livePrices:   {},     // { AAPL: { price, change, changePercent } }
  pagination:   { total: 0, page: 1, pages: 1 },
  loading:      false,
  stockLoading: false,
  tradeLoading: false,
  tradeSuccess: null,   // last successful trade message
  error:        null,

  fetchStocks: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await marketAPI.getStocks(params);
      set({
        loading: false,
        stocks: data.stocks,
        pagination: data.pagination,
      });
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || err.message });
    }
  },

  fetchMovers: async () => {
    try {
      const data = await marketAPI.getMovers();
      set({ movers: data });
    } catch (err) {
      console.error('Failed to fetch movers:', err);
    }
  },

  fetchStock: async (symbol) => {
    set({ stockLoading: true, error: null });
    try {
      const data = await marketAPI.getStock(symbol);
      set({ stockLoading: false, currentStock: data });
    } catch (err) {
      set({ stockLoading: false, error: err.response?.data?.message || err.message });
    }
  },

  fetchHistory: async (symbol, range) => {
    try {
      const data = await marketAPI.getHistory(symbol, range);
      set({ history: data.bars });
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  },

  executeTrade: async (payload) => {
    set({ tradeLoading: true, error: null, tradeSuccess: null });
    try {
      const data = await tradesAPI.executeTrade(payload);
      set({
        tradeLoading: false,
        tradeSuccess: data.message,
      });
      // Update wallet balance dynamically in authStore
      if (data.data && data.data.newBalance !== undefined) {
        useAuthStore.getState().updateWallet(data.data.newBalance);
      }
    } catch (err) {
      set({ tradeLoading: false, error: err.response?.data?.message || err.message });
    }
  },

  updateLivePrice: (data) => {
    const { symbol, price, change, changePercent } = data;
    set((state) => {
      const livePrices = { ...state.livePrices, [symbol]: { price, change, changePercent } };
      
      // Also update in stocks list so Market table shows live data
      const stocks = state.stocks.map((s) => {
        if (s.symbol === symbol) {
          return { ...s, price, change, changePercent };
        }
        return s;
      });

      return { livePrices, stocks };
    });
  },

  clearTradeSuccess: () => set({ tradeSuccess: null }),
  clearError:        () => set({ error: null }),
}));
