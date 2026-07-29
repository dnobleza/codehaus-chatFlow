const http = require('http');
const { Server } = require('socket.io');
const app = require('./app'); // Import the app from app.js
const logger = require('./src/utils/logger'); // Import the logger
const pool = require('./src/configs/database'); // Import the database pool
const { errorHandler } = require('./src/middlewares/errorHandler'); // Import the error handler
const registerSocketHandlers = require('./src/configs/socket');
const { port } = require('./src/configs/env');
const TAG = '[SERVER]';

app.use(errorHandler); // Use the error handler middleware

const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
registerSocketHandlers(io);

const startServer = async () => {
  try {
    const client = await pool.connect();
    logger.info(`${TAG} Connected to the database successfully.`);
    client.release();

    httpServer.listen(port, () => {
      logger.info(`${TAG} Server is running on port ${port}`);
    });
  } catch (error) {
    logger.error(`${TAG} Error connecting to the database: ${error.message}`);
    process.exit(1);
  }
};

startServer();

module.exports = startServer;
