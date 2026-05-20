import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

// Attach token dynamically using a request interceptor to break circular dependency
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
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

      const { refreshToken, setAuth, user } = useAuthStore.getState();
      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          { refreshToken }
        );
        const newToken = data.accessToken;
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setAuth(user, newToken, data.refreshToken);
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
  getHistory:  (params) => api.get('/trades/history', { params }),
};

export const portfolioService = {
  get: () => api.get('/portfolio').then(r => r.data.data),
};

export const analyticsService = {
  get: () => api.get('/analytics'),
};

export const leaderboardService = {
  get:    (page = 1) => api.get('/leaderboard', { params: { page } }),
  follow: (userId) => api.post(`/leaderboard/${userId}/follow`),
};

export const alertService = {
  create: (data) =>
    api.post('/alerts', data),
  getAll:  (status) => api.get('/alerts', { params: { status } }),
  delete:  (id) => api.delete(`/alerts/${id}`),
};

export const userService = {
  getMe:   () => api.get('/users/me'),
  updateMe: (data) =>
    api.patch('/users/me', data),
};
