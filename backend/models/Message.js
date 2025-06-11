const db = require('../config/db');

const Message = {
  createMessage: async (chat_id, sender_id, sender_type, content, timestamp) => {
    // If timestamp is from WhatsApp, it's likely a Unix timestamp (seconds or ms)
    // MySQL TIMESTAMP field expects 'YYYY-MM-DD HH:MM:SS' or a Unix timestamp directly if column type supports it.
    // Assuming 'timestamp' is a JS Date object or a string that MySQL can parse.
    // If it's a Unix timestamp number from WhatsApp, convert: new Date(timestamp * 1000)

    let messageTimestamp = timestamp;
    if (typeof timestamp === 'number') {
        messageTimestamp = new Date(timestamp * 1000); // Assuming seconds, multiply by 1000 for ms if needed
    } else if (timestamp instanceof Date) {
        messageTimestamp = timestamp;
    } else {
        messageTimestamp = new Date(); // Fallback to current time if format is unexpected
    }


    const [result] = await db.execute(
      'INSERT INTO Messages (chat_id, sender_id, sender_type, content, timestamp, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [chat_id, sender_id, sender_type, content, messageTimestamp]
    );
    // Return the full message object by fetching it, as auto-increment ID is useful
    const [messageRows] = await db.execute('SELECT * FROM Messages WHERE id = ?', [result.insertId]);
    return messageRows[0];
  },

  getMessagesByChatId: async (chatId) => {
    const [rows] = await db.execute(
      'SELECT * FROM Messages WHERE chat_id = ? ORDER BY timestamp ASC',
      [chatId]
    );
    return rows;
  }
};

module.exports = Message;
