const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../configs/env');

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};
