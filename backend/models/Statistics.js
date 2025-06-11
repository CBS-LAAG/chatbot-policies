const db = require('../config/db');

const Statistics = {
  getChatVolume: async (filters) => {
    let query = `SELECT DATE(created_at) as date, COUNT(id) as count FROM Chats`;
    const params = [];
    const conditions = [];

    if (filters.startDate) {
      conditions.push('created_at >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      // Add 1 day to endDate to include the whole day
      const endDate = new Date(filters.endDate);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push('created_at < ?');
      params.push(endDate.toISOString().split('T')[0]); // Format as YYYY-MM-DD
    }
    if (filters.agentId) {
      conditions.push('agent_id = ?');
      params.push(filters.agentId);
    }
    if (filters.whatsappAccountId) {
      conditions.push('whatsapp_account_id = ?');
      params.push(filters.whatsappAccountId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Group by date, or by month if the range is large (e.g. > 60 days)
    // For simplicity, always group by date for now.
    // Could add logic: YEAR(created_at), MONTH(created_at) for monthly grouping.
    query += ' GROUP BY DATE(created_at) ORDER BY date ASC';

    const [rows] = await db.execute(query, params);
    // Format date to YYYY-MM-DD string if it's not already
    return rows.map(row => ({
        date: new Date(row.date).toISOString().split('T')[0],
        count: row.count
    }));
  },

  getClosureTypes: async (filters) => {
    let query = `SELECT closure_type, COUNT(id) as count FROM Chats`;
    const params = [];
    // Ensure we only count chats that are actually closed and have a closure_type
    const conditions = ["status = 'closed'", "closure_type IS NOT NULL"];

    if (filters.startDate) {
      conditions.push('closed_at >= ?'); // Assuming closed_at is the relevant timestamp
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push('closed_at < ?');
      params.push(endDate.toISOString().split('T')[0]);
    }
    if (filters.agentId) {
      conditions.push('agent_id = ?');
      params.push(filters.agentId);
    }
    if (filters.whatsappAccountId) {
      conditions.push('whatsapp_account_id = ?');
      params.push(filters.whatsappAccountId);
    }

    query += ' WHERE ' + conditions.join(' AND ');
    query += ' GROUP BY closure_type';

    const [rows] = await db.execute(query, params);
    return rows;
  },

  getAgentPerformance: async (filters) => {
    let query = `
      SELECT
        u.id as agentId,
        u.username as agentName,
        COUNT(c.id) as chatsHandled,
        SUM(CASE WHEN c.closure_type = 'quotation' THEN 1 ELSE 0 END) as quotations,
        SUM(CASE WHEN c.closure_type = 'billing' THEN 1 ELSE 0 END) as billings
      FROM Users u
      JOIN Chats c ON u.id = c.agent_id
    `;
    const params = [];
    // We are interested in chats handled by agents, so agent_id must not be NULL.
    // Also, usually performance is measured on closed chats or chats that reached a certain state.
    // For this example, let's count all chats assigned to an agent within the period.
    const conditions = ["u.role_id = (SELECT id FROM Roles WHERE name = 'Agent')"]; // Only 'Agent' role

    if (filters.startDate) {
      // Date filter could apply to when chat was created, assigned, or closed.
      // Let's use chat creation date for "handled within period".
      conditions.push('c.created_at >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push('c.created_at < ?');
      params.push(endDate.toISOString().split('T')[0]);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY u.id, u.username ORDER BY chatsHandled DESC';

    const [rows] = await db.execute(query, params);
    return rows;
  }
};

module.exports = Statistics;
