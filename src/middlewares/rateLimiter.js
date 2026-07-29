const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const TAG = '[RATE-LIMITER]';

// Shared handler so every limiter in this app returns the same
// success/message JSON shape used across the rest of the API.
const buildHandler = (message) => (req, res) => {
  logger.warn(`${TAG} ${message} - IP: ${req.ip}, path: ${req.originalUrl}`);

  res.status(429).json({
    success: false,
    message,
  });
};

// Login is the primary brute-force / credential-stuffing target, so it gets
// the stricter window: 10 attempts per 15 minutes per IP.
exports.loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true, // return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  handler: buildHandler(
    'Too many login attempts from this IP. Please try again in 15 minutes.',
  ),
});

// Registration abuse is lower risk (no account to brute-force), but still
// needs a limit to block automated signup/spam: 5 requests per hour per IP.
exports.registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildHandler(
    'Too many accounts created from this IP. Please try again in 1 hour.',
  ),
});
