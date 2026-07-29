const express = require('express');
const messageController = require('../controllers/message.controller');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { verifyToken } = require('../middlewares/verifyToken');

const router = express.Router();

router.use(verifyToken);

router.get(
  '/conversation/:receiver_id',
  asyncHandler(messageController.getMessages),
);
router.delete('/:id', asyncHandler(messageController.deleteMessage));

module.exports = router;
