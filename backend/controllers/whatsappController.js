const WhatsAppAccount = require('../models/WhatsAppAccount');
const User = require('../models/User'); // To get user_id if needed, or use req.user
const whatsappService = require('../services/whatsappService');

const whatsappController = {
  linkNewAccount: async (req, res) => {
    const { phoneNumber } = req.body;
    const adminUserId = req.user.userId; // Assuming authenticateToken middleware adds req.user

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    try {
      let account = await WhatsAppAccount.getAccountByPhoneNumber(phoneNumber);
      if (account) {
        // If account exists and is associated with another admin, perhaps deny?
        // For now, if it exists, try to re-initialize, might be in a bad state.
        // Or, strictly prevent linking if already exists, forcing a delete first.
        // Let's assume for now that if it exists, we inform the user.
        // A more robust approach might be to check its status.
        // If status is 'disconnected' or 'auth_failure', admin could re-trigger linking.
        return res.status(409).json({ message: `Account with phone number ${phoneNumber} already exists with ID ${account.id}. Please remove it first if you want to re-link.` });
      }

      const newAccountId = await WhatsAppAccount.createAccount(phoneNumber, adminUserId);
      const accountDetails = { id: newAccountId, phone_number: phoneNumber, user_id: adminUserId };

      // Initialize client - this will trigger QR event if needed
      await whatsappService.initializeClient(accountDetails);

      // The QR code will be generated asynchronously.
      // The frontend will need to poll for it or use WebSockets.
      // For this iteration, we'll have an endpoint to fetch the QR.
      // Or, try to wait a bit for QR generation. This is tricky with HTTP request/response.

      // Attempt to get QR immediately if available (might not be, race condition)
      const qr = whatsappService.getQrCodeForAccount(newAccountId);
      if (qr) {
        // QR was available very quickly (e.g. client already had one pending)
        return res.status(200).json({
          message: 'Account linking process initiated. Scan QR code.',
          accountId: newAccountId,
          phoneNumber: phoneNumber,
          qrCode: qr // Sending QR directly if available
        });
      } else {
        // QR not immediately available, client needs to poll another endpoint
        // This response indicates success in starting the process.
        // Frontend should then call GET /api/whatsapp/qr/:accountId
        return res.status(202).json({ // 202 Accepted: request accepted, processing continues
          message: 'Account linking process initiated. QR code is being generated.',
          accountId: newAccountId,
          phoneNumber: phoneNumber,
          qrPollUrl: `/api/whatsapp/qr/${newAccountId}` // Inform frontend where to poll
        });
      }

    } catch (error) {
      console.error('Error linking new WhatsApp account:', error);
      res.status(500).json({ message: 'Failed to link new WhatsApp account.', error: error.message });
    }
  },

  // New endpoint to fetch QR code for a given accountId during linking
  getQrForAccount: async (req, res) => {
    const { accountId } = req.params;
    const qr = whatsappService.getQrCodeForAccount(accountId);
    if (qr) {
      // Optional: Could also fetch account status from DB to give more context
      // const account = await WhatsAppAccount.getAccountById(accountId);
      // if (account && account.status === 'connected') {
      //   return res.status(200).json({ message: 'Account already connected.', status: account.status });
      // }
      return res.status(200).json({ accountId, qrCode: qr });
    } else {
      // If QR is not found, it might mean it's already authenticated or failed.
      // Check DB status
      const account = await WhatsAppAccount.getAccountById(accountId);
      if (account) {
        if (account.status === 'connected' || account.status === 'ready') {
           return res.status(200).json({ accountId, message: 'Account already connected.', status: account.status });
        }
        if (account.status === 'auth_failure') {
            return res.status(404).json({ accountId, message: 'Authentication failed. Please try linking again.', status: account.status });
        }
      }
      return res.status(404).json({ accountId, message: 'QR code not available or already scanned.' });
    }
  },

  listAccounts: async (req, res) => {
    try {
      const accounts = await WhatsAppAccount.getAllAccounts();
      // For each account, we could also check live status from whatsappService if needed
      // For now, just return DB records.
      res.status(200).json(accounts);
    } catch (error) {
      console.error('Error listing WhatsApp accounts:', error);
      res.status(500).json({ message: 'Failed to list WhatsApp accounts.', error: error.message });
    }
  },

  removeAccount: async (req, res) => {
    const { accountId } = req.params;
    try {
      const account = await WhatsAppAccount.getAccountById(accountId);
      if (!account) {
        return res.status(404).json({ message: 'WhatsApp account not found.' });
      }

      // Disconnect and clean up client instance in whatsappService
      await whatsappService.disconnectClient(accountId);
      // This should also handle clearing LocalAuth session data if client.destroy() is used or called by logout.

      // Delete from database
      await WhatsAppAccount.deleteAccount(accountId);

      res.status(200).json({ message: `WhatsApp account ${account.phone_number} (ID: ${accountId}) removed successfully.` });
    } catch (error) {
      console.error(`Error removing WhatsApp account ${accountId}:`, error);
      res.status(500).json({ message: 'Failed to remove WhatsApp account.', error: error.message });
    }
  }
};

module.exports = whatsappController;
