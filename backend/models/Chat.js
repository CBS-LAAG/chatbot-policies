const db = require('../config/db');

const Chat = {
  createChat: async (whatsapp_account_id, customer_contact_id) => {
    const [result] = await db.execute(
      'INSERT INTO Chats (whatsapp_account_id, customer_contact_id, status, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [whatsapp_account_id, customer_contact_id, 'open']
    );
    return result.insertId;
  },

  findChatByCustomerAndAccount: async (whatsapp_account_id, customer_contact_id) => {
    // Find an active chat (open or assigned)
    const [rows] = await db.execute(
      "SELECT * FROM Chats WHERE whatsapp_account_id = ? AND customer_contact_id = ? AND status IN ('open', 'assigned') ORDER BY created_at DESC LIMIT 1",
      [whatsapp_account_id, customer_contact_id]
    );
    return rows[0];
  },

  getChatById: async (chatId) => {
    const [rows] = await db.execute('SELECT * FROM Chats WHERE id = ?', [chatId]);
    return rows[0];
  },

  assignAgentToChat: async (chatId, agentId) => {
    const [result] = await db.execute(
      "UPDATE Chats SET agent_id = ?, status = 'assigned', updated_at = NOW() WHERE id = ?",
      [agentId, chatId]
    );
    return result.affectedRows > 0;
  },

  closeChat: async (chatId, closure_type) => {
    const [result] = await db.execute(
      "UPDATE Chats SET status = 'closed', closure_type = ?, closed_at = NOW(), updated_at = NOW() WHERE id = ?",
      [closure_type, chatId]
    );
    return result.affectedRows > 0;
  },

  getAllChats: async (filters = {}) => {
    let query = 'SELECT c.*, u.username as agent_username, wa.phone_number as whatsapp_account_phone FROM Chats c ' +
                'LEFT JOIN Users u ON c.agent_id = u.id ' +
                'LEFT JOIN WhatsAppAccounts wa ON c.whatsapp_account_id = wa.id';
    const params = [];
    const conditions = [];

    if (filters.agentId) {
      conditions.push('c.agent_id = ?');
      params.push(filters.agentId);
    }
    if (filters.status) {
      conditions.push('c.status = ?');
      params.push(filters.status);
    }
    // Add more filters as needed (e.g., by whatsapp_account_id)

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY c.updated_at DESC';

    const [rows] = await db.execute(query, params);
    return rows;
  }
};

module.exports = Chat;
