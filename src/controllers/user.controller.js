const pool = require('../configs/database');
const logger = require('../utils/logger');

const TAG = '[USER-CONTROLLER]';

exports.getUsers = async (req, res) => {
  const requesterId = req.user.id;

  const result = await pool.query(
    'SELECT id, username, email FROM users WHERE id != $1 ORDER BY username ASC',
    [requesterId],
  );

  logger.info(
    `${TAG} Retrieved ${result.rows.length} user(s) for requester ${requesterId}`,
  );

  res.status(200).json({
    success: true,
    message: 'Users retrieved successfully',
    data: result.rows,
  });
};
