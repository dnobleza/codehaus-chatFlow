const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../configs/database');
const logger = require('../utils/logger');
const { jwtSecret, jwtExpiresIn } = require('../configs/env');
const TAG = '[AUTH CONTROLLER]';

exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields',
    });
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [
    email,
  ]);
  if (existing.rows.length > 0) {
    logger.warn(`${TAG} User already exists with email: ${email}`);
    return res.status(400).json({
      success: false,
      message: 'User already exists',
    });
  }

  //create a new user
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await pool.query(
    'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
    [username, email, hashedPassword],
  );

  const resultUser = result.rows[0];
  logger.info(`${TAG} User registered successfully with email: ${email}`);
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: resultUser,
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    'SELECT id, username, email, password FROM users WHERE email = $1',
    [email],
  );

  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  // Generate token
  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );

  logger.info(`${TAG} User logged in successfully with email: ${email}`);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    token,

    data: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
  });
  console.log('JWT Secret:', token);
};
