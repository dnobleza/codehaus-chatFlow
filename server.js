const http = require('http');
const { Server } = require('socket.io');
const app = require('./app'); // Import the app from app.js
const logger = require('./src/utils/logger'); // Import the logger
const pool = require('./src/configs/database'); // Import the database pool
const { errorHandler } = require('./src/middlewares/errorHandler'); // Import the error handler
const registerSocketHandlers = require('./src/configs/socket');
const { port, frontendUrl } = require('./src/configs/env');
const TAG = '[SERVER]';

app.use(errorHandler); // Use the error handler middleware

const httpServer = http.createServer(app);
// Socket.io CORS is locked down to the same FRONTEND_URL used by the REST
// API's CORS config (see app.js), instead of a wildcard, since the socket
// connection carries a JWT and shouldn't be open to any origin in production.
const io = new Server(httpServer, {
  cors: { origin: frontendUrl, credentials: true },
});
registerSocketHandlers(io);

// Make the socket.io instance available to REST controllers (e.g. so
// deleteMessage can emit a real-time event to the recipient) via
// req.app.get('io').
app.set('io', io);

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
