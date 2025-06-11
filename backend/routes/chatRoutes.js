const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

// Apply authentication middleware to all chat routes
router.use(authenticateToken);

// POST /api/chats/:chatId/assign - Admin assigns an agent to a chat
router.post('/:chatId/assign', authorizeRole(['Admin']), chatController.assignChat);

// POST /api/chats/:chatId/close - Agent or Admin closes a chat
router.post('/:chatId/close', authorizeRole(['Admin', 'Agent']), chatController.closeChat);

// GET /api/chats/:chatId/messages - Agent or Admin gets messages for a chat
router.get('/:chatId/messages', authorizeRole(['Admin', 'Agent']), chatController.getChatMessages);

// GET /api/chats - Agent or Admin lists chats (filtered by role/assignment)
router.get('/', authorizeRole(['Admin', 'Agent']), chatController.listChats);

// POST /api/chats/:chatId/messages - Agent or Admin sends a message in a chat
router.post('/:chatId/messages', authorizeRole(['Admin', 'Agent']), chatController.sendMessage);

module.exports = router;
