require('dotenv').config();
require('./config/env');
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const { logger } = require('./utils/logger');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  const server = http.createServer(app);

  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server', err);
  process.exit(1);
});
