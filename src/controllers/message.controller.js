const pool = require('../configs/database');
const logger = require('../utils/logger');

const TAG = '[MESSAGE-CONTROLLER]';

exports.getMessages = async (req, res) => {
  const { receiver_id } = req.params;
  const sender_id = req.user.id;

  const result = await pool.query(
    'SELECT * FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at ASC',
    [sender_id, receiver_id],
  );

  res.status(200).json({
    success: true,
    message: 'Messages retrieved successfully',
    data: result.rows,
  });
};

exports.deleteMessage = async (req, res) => {
  const { id } = req.params;
  const sender_id = req.user.id;

  const result = await pool.query(
    'DELETE FROM messages WHERE id = $1 AND sender_id = $2 RETURNING *',
    [id, sender_id],
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      success: false,
      message:
        'Message not found or you are not authorized to delete this message',
    });
  }

  const deletedMessage = result.rows[0];

  logger.info(
    `${TAG} Message with id ${id} deleted successfully by user ${sender_id}`,
  );

  // Notify the recipient in real time so an open conversation view can
  // remove the message immediately instead of only on next reload.
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${deletedMessage.receiver_id}`).emit('message_deleted', {
      id: deletedMessage.id,
      receiver_id: deletedMessage.receiver_id,
      sender_id: deletedMessage.sender_id,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Message deleted successfully',
  });
};
