const express = require('express');
const { register, login } = require('../controllers/auth.controller');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { validateRegister, validateLogin } = require('../middlewares/validation');
const {
  loginRateLimiter,
  registerRateLimiter,
} = require('../middlewares/rateLimiter');
const router = express.Router();

router.post(
  '/register',
  registerRateLimiter,
  validateRegister,
  asyncHandler(register),
);
router.post('/login', loginRateLimiter, validateLogin, asyncHandler(login));

module.exports = router;
