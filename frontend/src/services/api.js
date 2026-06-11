import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { getApiBaseUrl } from '../utils/config';

const readPersistedAccessToken = () => {
  try {
    const raw = window.localStorage.getItem('auth-storage');
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed?.state?.accessToken || null;
  } catch {
    return null;
  }
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

// Attach token dynamically using a request interceptor to break circular dependency
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken || readPersistedAccessToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ── Refresh token interceptor ──
let isRefreshing = false;
let queue = [];

const processQueue = (err, token = null) => {
  queue.forEach(p => (err ? p.reject(err) : p.resolve(token)));
  queue = [];
};

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then(token => {
          original.headers['Authorization'] = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const { setAuth, user } = useAuthStore.getState();
      try {
        const { data } = await axios.post(
          `${getApiBaseUrl()}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = data.accessToken;
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setAuth(user, newToken, null);
        processQueue(null, newToken);
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        processQueue(e);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

// ── Service calls ──
export const authService = {
  register: (data) =>
    api.post('/auth/register', data),
  login: (data) =>
    api.post('/auth/login', data),
};

export const stockService = {
  getAll:      (params) => api.get('/stocks', { params }),
  getOne:      (symbol) => api.get(`/stocks/${symbol}`),
  getHistory:  (symbol, range) => api.get(`/stocks/${symbol}/history`, { params: { range } }),
};

export const tradeService = {
  buy:         (data) => api.post('/trades/buy', data),
  sell:        (data) => api.post('/trades/sell', data),
  getHistory:  (params) => api.get('/trades/history', { params }).then(r => r.data),
};

export const portfolioService = {
  get: () => api.get('/portfolio').then(r => r.data.data),
  reset: () => api.post('/portfolio/reset').then(r => r.data),
};

export const analyticsService = {
  get: () => api.get('/analytics').then(r => r.data),
  getEquityCurve: () => api.get('/analytics/equity-curve').then(r => r.data),
  getMonthly: (year) => api.get('/analytics/monthly', { params: { year } }).then(r => r.data),
  getSymbols: () => api.get('/analytics/symbols').then(r => r.data),
};

export const leaderboardService = {
  get:    (page = 1) => api.get('/leaderboard', { params: { page } }).then(r => r.data),
  follow: (userId) => api.post(`/leaderboard/${userId}/follow`).then(r => r.data),
  getFeed: () => api.get('/leaderboard/feed').then(r => r.data),
  getWeekly: () => api.get('/leaderboard/weekly').then(r => r.data),
};

export const watchlistService = {
  get: () => api.get('/users/watchlist').then(r => r.data),
  add: (symbol) => api.post(`/users/watchlist/${symbol}`).then(r => r.data),
  remove: (symbol) => api.delete(`/users/watchlist/${symbol}`).then(r => r.data),
};

export const newsService = {
  getMarket: () => api.get('/news').then(r => r.data),
  getStock: (symbol) => api.get(`/news/${symbol}`).then(r => r.data),
};

export const alertService = {
  create: (data) =>
    api.post('/alerts', data),
  getAll:  (status) => api.get('/alerts', { params: { status } }),
  update:  (id, data) => api.patch(`/alerts/${id}`, data),
  delete:  (id) => api.delete(`/alerts/${id}`),
};

export const userService = {
  getMe:   () => api.get('/users/me'),
  updateMe: (data) =>
    api.patch('/users/me', data),
  changePassword: (currentPassword, newPassword) =>
    api.post('/users/change-password', { currentPassword, newPassword }).then(r => r.data),
};
