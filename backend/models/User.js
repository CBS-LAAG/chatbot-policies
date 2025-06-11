const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  createUser: async (username, password, role_id) => {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const [result] = await db.execute(
      'INSERT INTO Users (username, password_hash, role_id) VALUES (?, ?, ?)',
      [username, password_hash, role_id]
    );
    return result.insertId;
  },

  findUserByUsername: async (username) => {
    const [rows] = await db.execute(
      'SELECT u.id, u.username, u.password_hash, u.role_id, u.created_at, u.updated_at, r.name as role_name FROM Users u JOIN Roles r ON u.role_id = r.id WHERE u.username = ?',
      [username]
    );
    return rows[0];
  },

  findUserById: async (id) => {
    const [rows] = await db.execute(
      'SELECT u.id, u.username, u.password_hash, u.role_id, u.created_at, u.updated_at, r.name as role_name FROM Users u JOIN Roles r ON u.role_id = r.id WHERE u.id = ?',
      [id]
    );
    return rows[0];
  },

  // Helper to find role ID by name, will be used by AuthController and UserController
  findRoleIdByName: async (roleName) => {
    const [rows] = await db.execute('SELECT id FROM Roles WHERE name = ?', [roleName]);
    if (rows.length > 0) {
      return rows[0].id;
    }
    return null; // Or throw an error if role not found
  },

  getAll: async () => {
    const [rows] = await db.execute(
      'SELECT u.id, u.username, u.role_id, u.created_at, u.updated_at, r.name as role_name FROM Users u JOIN Roles r ON u.role_id = r.id'
    );
    return rows;
  },

  updateById: async (id, { username, role_id }) => {
    // Construct parts of the query dynamically based on what's provided
    let query = 'UPDATE Users SET ';
    const params = [];

    if (username) {
      query += 'username = ?';
      params.push(username);
    }

    if (role_id) {
      if (params.length > 0) query += ', ';
      query += 'role_id = ?';
      params.push(role_id);
    }

    query += ' WHERE id = ?';
    params.push(id);

    if (params.length === 1) { // Only ID was passed, nothing to update
        return { affectedRows: 0 };
    }

    const [result] = await db.execute(query, params);
    return result;
  },

  deleteById: async (id) => {
    const [result] = await db.execute('DELETE FROM Users WHERE id = ?', [id]);
    return result;
  }
};

module.exports = User;
