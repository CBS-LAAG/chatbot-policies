const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // To access JWT_SECRET

const authController = {
  register: async (req, res) => {
    const { username, password, role_name = 'User' } = req.body; // Default role to 'User'

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
      const existingUser = await User.findUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: 'Username already exists.' });
      }

      const role_id = await User.findRoleIdByName(role_name);
      if (!role_id) {
        return res.status(400).json({ message: `Role '${role_name}' not found.` });
      }

      const userId = await User.createUser(username, password, role_id);
      res.status(201).json({ message: 'User registered successfully.', userId });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Error registering user.', error: error.message });
    }
  },

  login: async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
      const user = await User.findUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials. User not found.' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials. Password incorrect.' });
      }

      const tokenPayload = {
        userId: user.id,
        username: user.username,
        role: user.role_name // role_name is fetched by findUserByUsername
      };

      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.status(200).json({ message: 'Login successful.', token });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Error logging in.', error: error.message });
    }
  }
};

module.exports = authController;
