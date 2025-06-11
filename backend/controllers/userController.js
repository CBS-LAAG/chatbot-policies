const User = require('../models/User');

const userController = {
  // Admin creates user with a specific role
  createUserAdmin: async (req, res) => {
    const { username, password, role_name } = req.body;
    if (!username || !password || !role_name) {
      return res.status(400).json({ message: 'Username, password, and role_name are required.' });
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
      res.status(201).json({ message: `User '${username}' created successfully with role '${role_name}'.`, userId });
    } catch (error) {
      console.error('Admin createUser error:', error);
      res.status(500).json({ message: 'Error creating user.', error: error.message });
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const users = await User.getAll();
      res.status(200).json(users);
    } catch (error) {
      console.error('GetAllUsers error:', error);
      res.status(500).json({ message: 'Error retrieving users.', error: error.message });
    }
  },

  getUserById: async (req, res) => {
    const { id } = req.params;
    try {
      const user = await User.findUserById(id); // findUserById from User model already joins with roles
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
      res.status(200).json(user);
    } catch (error) {
      console.error('GetUserById error:', error);
      res.status(500).json({ message: 'Error retrieving user.', error: error.message });
    }
  },

  updateUser: async (req, res) => {
    const { id } = req.params;
    const { username, role_name } = req.body; // Only allow username and role updates by admin

    if (!username && !role_name) {
      return res.status(400).json({ message: 'Nothing to update. Provide username or role_name.' });
    }

    try {
      const userToUpdate = await User.findUserById(id);
      if (!userToUpdate) {
        return res.status(404).json({ message: 'User not found.' });
      }

      let role_id = userToUpdate.role_id;
      if (role_name) {
        const found_role_id = await User.findRoleIdByName(role_name);
        if (!found_role_id) {
          return res.status(400).json({ message: `Role '${role_name}' not found.` });
        }
        role_id = found_role_id;
      }

      // Check if username is being changed and if it's already taken by another user
      if (username && username !== userToUpdate.username) {
        const existingUserWithNewUsername = await User.findUserByUsername(username);
        if (existingUserWithNewUsername && existingUserWithNewUsername.id !== parseInt(id)) {
            return res.status(409).json({ message: 'Username already taken by another user.' });
        }
      }

      const updateData = {
        username: username || userToUpdate.username,
        role_id: role_id
      };

      await User.updateById(id, updateData);
      res.status(200).json({ message: 'User updated successfully.' });
    } catch (error) {
      console.error('UpdateUser error:', error);
      res.status(500).json({ message: 'Error updating user.', error: error.message });
    }
  },

  deleteUser: async (req, res) => {
    const { id } = req.params;
    try {
      const user = await User.findUserById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
      // Optional: Add check if admin tries to delete themselves, prevent if necessary
      // if (req.user.userId === parseInt(id)) {
      //   return res.status(400).json({ message: "Admin cannot delete themselves." });
      // }
      await User.deleteById(id);
      res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
      console.error('DeleteUser error:', error);
      // Check for foreign key constraint errors if user is referenced elsewhere
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({ message: 'Cannot delete user. User is referenced in other records (e.g., WhatsAppAccounts, Chats). Please reassign or delete those records first.'})
      }
      res.status(500).json({ message: 'Error deleting user.', error: error.message });
    }
  }
};

module.exports = userController;
