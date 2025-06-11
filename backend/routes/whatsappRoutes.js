const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

// All routes in this file are protected and require Admin role
router.use(authenticateToken);
router.use(authorizeRole(['Admin']));

// POST /api/whatsapp/link - Admin links a new WhatsApp account
router.post('/link', whatsappController.linkNewAccount);

// GET /api/whatsapp/qr/:accountId - Admin (or user initiating linking) polls for QR code
// This might need slightly different authorization if a non-admin user can initiate linking for themselves
// For now, keeping it Admin-only as part of the account management flow.
router.get('/qr/:accountId', whatsappController.getQrForAccount);

// GET /api/whatsapp/accounts - Admin lists all linked accounts
router.get('/accounts', whatsappController.listAccounts);

// DELETE /api/whatsapp/accounts/:accountId - Admin removes a WhatsApp account
router.delete('/accounts/:accountId', whatsappController.removeAccount);

module.exports = router;
