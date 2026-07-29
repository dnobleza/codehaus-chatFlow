const jwt = require('jsonwebtoken');
const pool = require('../configs/database');
const logger = require('../utils/logger');
const { jwtSecret } = require('./env');

const TAG = '[SOCKET-CONFIG]';

module.exports = (io) => {
  const onlineUsers = {};

  io.use((socket, next) => {
    const authHeader = socket.handshake.headers?.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const token = socket.handshake.auth?.token || socket.handshake.query?.token || headerToken;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      socket.user = jwt.verify(token, jwtSecret);
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(`user_${userId}`);
    onlineUsers[userId] = socket.id;

    io.emit('user_online', { userId, status: 'online' });
    logger.info(`${TAG} User ${userId} connected: ${socket.id}`);

    socket.on('send_message', async (data) => {
      try {
        const { receiver_id, content } = data;
        const sender_id = userId;

        const result = await pool.query(
          'INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *',
          [sender_id, receiver_id, content],
        );

        const message = result.rows[0];
        io.to(`user_${receiver_id}`).emit('receiver_message', message);
        socket.emit('message_sent', message);

        logger.info(`${TAG} Message sent from ${sender_id} to ${receiver_id}`);
      } catch (error) {
        socket.emit('message_error', { error: error.message });
      }
    });

    socket.on('get_online_user', () => {
      socket.emit('online_user', Object.keys(onlineUsers));
    });

    socket.on('disconnect', () => {
      delete onlineUsers[userId];
      io.emit('user_offline', { userId, status: 'offline' });
      logger.info(`${TAG} User ${userId} disconnected`);
    });
  });
};
