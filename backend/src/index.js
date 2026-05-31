const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB } = require('./config/db');
const { connectRedis } = require('./config/redis');
const { initSocketServer } = require('./socket');
const { startCronJobs } = require('./jobs');
const { startPricePoller } = require('./jobs/pricePoller');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const stockRoutes = require('./routes/stocks');
const tradeRoutes = require('./routes/trades');
const portfolioRoutes = require('./routes/portfolio');
const alertRoutes = require('./routes/alerts');
const leaderboardRoutes = require('./routes/leaderboard');
const analyticsRoutes = require('./routes/analytics');
const newsRoutes = require('./routes/news');

const app = express();
const httpServer = http.createServer(app);
let isShuttingDown = false;

const defaultClientOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

const envClientOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultClientOrigins, ...envClientOrigins])];

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*') || process.env.CLIENT_URL === '*') {
    return true;
  }
  // Allow all Vercel domains containing stock-trading-simulator
  if (origin.startsWith('https://') && origin.endsWith('.vercel.app')) {
    if (origin.includes('stock-trading-simulator')) {
      return true;
    }
  }
  // Allow all localhost origins during development
  if (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
    return true;
  }
  return false;
};

// ── Socket.io ──
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
});
module.exports.io = io;

const initSocketServer_local = initSocketServer(io);

// ── Middleware ──
app.use(helmet());
app.use(compression());

// configure CORS to accept configured client origins (supports comma-separated list)
logger.info(`Allowed CORS origins: ${allowedOrigins.join(',')}`);

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Fallback: ensure CORS headers are present for all responses (helps debug browsers)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize());

// Global rate limit
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  message: 'Too many requests, please slow down.',
}));

// Auth-specific rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 15,
  message: 'Too many authentication attempts, please try again after 15 minutes.'
});
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/login', authLimiter);

// ── Routes ──
app.use('/api/auth',        authRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/stocks',      stockRoutes);
app.use('/api/trades',      tradeRoutes);
app.use('/api/portfolio',   portfolioRoutes);
app.use('/api/alerts',      alertRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/analytics',   analyticsRoutes);
app.use('/api/news',        newsRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

// ── Error handler (must be last) ──
app.use(errorHandler);

// ── Boot ──
const PORT = process.env.PORT || 5000;
const shutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`Received ${signal}, shutting down server`);
  httpServer.close(() => process.exit(0));
};

const listenServer = () => {
  httpServer.once('error', (error) => {
    logger.error('Server listen failed', error);
    process.exit(1);
  });

  httpServer.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGUSR2', () => shutdown('SIGUSR2'));

(async () => {
  await connectDB();
  await connectRedis();
  startCronJobs();
  startPricePoller();
  listenServer();
})();
