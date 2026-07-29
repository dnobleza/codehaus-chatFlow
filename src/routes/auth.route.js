const express = require('express');
const { register, login } = require('../controllers/auth.controller');
const { asyncHandler } = require('../middlewares/asyncHandler');
const router = express.Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));

module.exports = router;
