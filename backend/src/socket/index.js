const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

const initSocketServer = (io) => {
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
};

const broadcastPriceUpdate = (io, symbol, data) => {
  io.to(`stock:${symbol}`).emit('priceUpdate', data);
  io.emit('marketTick', data);
};

module.exports = {
  initSocketServer,
  broadcastPriceUpdate,
};
