const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

// All routes in this file are protected and require Admin role
router.use(authenticateToken);
router.use(authorizeRole(['Admin'])); // Ensures only users with 'Admin' role can access

// POST /api/users - Admin creates a new user
router.post('/', userController.createUserAdmin);

// GET /api/users - Admin gets all users
router.get('/', userController.getAllUsers);

// GET /api/users/:id - Admin gets a single user by ID
router.get('/:id', userController.getUserById);

// PUT /api/users/:id - Admin updates a user's details
router.put('/:id', userController.updateUser);

// DELETE /api/users/:id - Admin deletes a user
router.delete('/:id', userController.deleteUser);

module.exports = router;
