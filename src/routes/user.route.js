const express = require('express');
const userController = require('../controllers/user.controller');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { verifyToken } = require('../middlewares/verifyToken');

const router = express.Router();

router.use(verifyToken);

router.get('/', asyncHandler(userController.getUsers));

module.exports = router;
