const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

const { startPriceEmitter } = require('./priceEmitter');

let socketIo = null;

const initSocketServer = (io) => {
  socketIo = io;

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
      } catch {}
    }
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    logger.info(`Socket connected: ${socket.id} user=${userId || 'anon'}`);

    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on('subscribe:stock', (symbol) => {
      socket.join(`stock:${symbol.toUpperCase()}`);
    });

    socket.on('unsubscribe:stock', (symbol) => {
      socket.leave(`stock:${symbol.toUpperCase()}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  // Start the background price broadcaster
  startPriceEmitter(io);
};

const broadcastPriceUpdate = (symbol, data) => {
  if (!socketIo) {
    return;
  }

  socketIo.to(`stock:${symbol}`).emit('priceUpdate', data);
  socketIo.emit('marketTick', data);
};

module.exports = {
  initSocketServer,
  broadcastPriceUpdate,
};
