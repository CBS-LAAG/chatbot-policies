const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Middleware to parse JSON bodies
router.use(express.json());

router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
