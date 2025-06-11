const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

// All statistics routes are protected and require Admin role
router.use(authenticateToken);
router.use(authorizeRole(['Admin']));

// GET /api/statistics/chat-volume
router.get('/chat-volume', statisticsController.getChatVolumeStats);

// GET /api/statistics/closure-types
router.get('/closure-types', statisticsController.getClosureTypeStats);

// GET /api/statistics/agent-performance
router.get('/agent-performance', statisticsController.getAgentPerformanceStats);

module.exports = router;
