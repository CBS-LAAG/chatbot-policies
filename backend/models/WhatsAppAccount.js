const db = require('../config/db');

const WhatsAppAccount = {
  createAccount: async (phoneNumber, userId) => {
    const [result] = await db.execute(
      'INSERT INTO WhatsAppAccounts (phone_number, user_id, status) VALUES (?, ?, ?)',
      [phoneNumber, userId, 'pending_qr_scan'] // Initial status
    );
    return result.insertId;
  },

  getAccountById: async (id) => {
    const [rows] = await db.execute('SELECT * FROM WhatsAppAccounts WHERE id = ?', [id]);
    return rows[0];
  },

  getAccountByPhoneNumber: async (phoneNumber) => {
    const [rows] = await db.execute('SELECT * FROM WhatsAppAccounts WHERE phone_number = ?', [phoneNumber]);
    return rows[0];
  },

  // LocalAuth handles session data on disk, so this might not be needed for session string.
  // However, we can use it to store other metadata if necessary, or confirm session is locally stored.
  // For now, this method is a placeholder or could be removed if LocalAuth is sufficient.
  updateSessionData: async (accountId, sessionData) => {
    // With LocalAuth, actual session data is not stored in DB.
    // This could update a field like `has_local_session = true` or similar.
    // For now, let's assume it's for future use or if we switch auth strategy.
    // Or, simply log that LocalAuth is being used.
    console.log(`updateSessionData called for account ${accountId}. With LocalAuth, sessions are stored on disk.`);
    // Example: Update a last_seen or status field if needed.
    // const [result] = await db.execute(
    //   'UPDATE WhatsAppAccounts SET session_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    //   [sessionData, accountId]
    // );
    // return result.affectedRows > 0;
    return true; // Placeholder
  },

  updateAccountStatus: async (accountId, status) => {
    const [result] = await db.execute(
        'UPDATE WhatsAppAccounts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, accountId]
    );
    return result.affectedRows > 0;
  },

  getAllAccounts: async () => {
    const [rows] = await db.execute('SELECT id, phone_number, user_id, status, created_at, updated_at FROM WhatsAppAccounts');
    return rows;
  },

  // This method is used by whatsappService.loadAndInitializeAllAccounts
  // It should fetch accounts that are expected to have a session (e.g., not in 'auth_failure' or 'disconnected' by choice)
  getAllAccountsWithSessions: async () => {
    // With LocalAuth, we don't store the session in the DB.
    // We retrieve all accounts that *should* have a session folder locally.
    // This could be all accounts, or accounts with a status like 'connected', 'pending_qr_scan', or 'ready'.
    // For simplicity, let's fetch all that are not explicitly 'disconnected' or in 'auth_failure'.
    const [rows] = await db.execute("SELECT id, phone_number, user_id, status FROM WhatsAppAccounts WHERE status NOT IN ('auth_failure', 'permanently_disconnected')");
    return rows;
  },

  deleteAccount: async (accountId) => {
    // Before deleting from DB, ensure LocalAuth session files are cleaned up.
    // This should be handled by whatsappService.disconnectClient -> client.destroy()
    // which clears the session folder for that clientId.
    const [result] = await db.execute('DELETE FROM WhatsAppAccounts WHERE id = ?', [accountId]);
    return result.affectedRows > 0;
  }
};

// Make sure whatsappService can be loaded by this model for certain operations if needed,
// or use events to decouple. For now, direct calls are in whatsappService.
// const whatsappService = require('../services/whatsappService'); // Careful with circular dependencies

module.exports = WhatsAppAccount;
