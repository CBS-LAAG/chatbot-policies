const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const WhatsAppAccount = require('../models/WhatsAppAccount');
const Chat = require('../models/Chat'); // Import Chat model
const Message = require('../models/Message'); // Import Message model
const socketService = require('./socketService'); // Import Socket.IO service

const clients = new Map(); // To store active clients, keyed by accountId
const qrStore = {}; // Temporary store for QR codes { accountId: qrCodeString }

const initializeClient = async (accountDetails) => {
  const accountId = accountDetails.id.toString(); // Ensure accountId is a string for consistent keying
  const associatedPhoneNumber = accountDetails.phone_number; // Keep for logging
  console.log(`Initializing WhatsApp client for account ID: ${accountId}, Phone: ${associatedPhoneNumber}`);

  if (clients.has(accountId)) {
    console.log(`Client for account ${accountId} already exists or is being initialized.`);
    return;
  }

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: accountId, dataPath: './wwebjs_sessions' }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu'
      ],
    }
  });

  client.on('qr', (qr) => {
    console.log(`QR code received for account ${accountId}, Phone: ${associatedPhoneNumber}`);
    qrcode.generate(qr, { small: true });
    qrStore[accountId] = qr;
  });

  client.on('authenticated', () => {
    console.log(`Client authenticated for account ${accountId}, Phone: ${associatedPhoneNumber}`);
    if (qrStore[accountId]) delete qrStore[accountId];
  });

  client.on('auth_failure', async (msg) => {
    console.error(`Authentication failure for account ${accountId}, Phone: ${associatedPhoneNumber}: ${msg}`);
    try {
      await WhatsAppAccount.updateAccountStatus(accountId, 'auth_failure');
      // Consider also deleting the session files via LocalAuth's mechanism if possible,
      // or letting LocalAuth handle it on next init attempt.
      // For now, just update DB status.
    } catch (dbError) {
      console.error(`DBError on auth_failure for account ${accountId}:`, dbError);
    }
    clients.delete(accountId);
  });

  client.on('ready', async () => {
    console.log(`WhatsApp client is ready for account ${accountId}, Phone: ${associatedPhoneNumber}!`);
    try {
      await WhatsAppAccount.updateAccountStatus(accountId, 'connected');
    } catch (dbError) {
      console.error(`DBError on ready for account ${accountId}:`, dbError);
    }
    if (qrStore[accountId]) delete qrStore[accountId];
  });

  client.on('message', async (message) => {
    console.log(`Message received on AccID ${accountId} from ${message.from} to ${message.to}: ${message.body}`);
    const customer_contact_id = message.from; // This is the WhatsApp ID like '1234567890@c.us'

    try {
      let chat = await Chat.findChatByCustomerAndAccount(accountId, customer_contact_id);
      let chatId;

      if (!chat) {
        console.log(`No existing open/assigned chat found for ${customer_contact_id} on account ${accountId}. Creating new chat.`);
        chatId = await Chat.createChat(accountId, customer_contact_id);
        if (chatId) {
            chat = { id: chatId }; // Basic chat object for proceeding
            console.log(`New chat created with ID: ${chatId}`);
            // Optionally emit a 'new_chat_created' event via socketService if frontend needs to react
            // socketService.emitNewChat(chat); // Example
        } else {
            console.error(`Failed to create chat for ${customer_contact_id} on account ${accountId}.`);
            return; // Cannot proceed without a chat ID
        }
      } else {
        chatId = chat.id;
        console.log(`Found existing chat with ID: ${chatId} for ${customer_contact_id} on account ${accountId}.`);
      }

      const createdMessage = await Message.createMessage(
        chatId,
        customer_contact_id, // sender_id is the customer's WhatsApp ID
        'customer',          // sender_type
        message.body,
        message.timestamp    // Unix timestamp from WhatsApp
      );

      if (createdMessage) {
        socketService.emitNewMessage(chatId.toString(), createdMessage);
        console.log(`Message from ${customer_contact_id} stored and emitted for chat ${chatId}.`);
      } else {
          console.error(`Failed to store message from ${customer_contact_id} for chat ${chatId}.`);
      }

    } catch (error) {
      console.error(`Error processing incoming message for account ${accountId} from ${customer_contact_id}:`, error);
    }
  });

  client.on('message_create', async (message) => {
    // Fired on all message creations, including those sent by the bot itself.
    // We handle agent-sent messages via API, which then calls client.sendMessage()
    // and stores the message. So, we only need to capture outgoing messages here if they
    // are NOT sent via our application's sendMessage flow (e.g. if someone uses the phone directly).
    // For now, the primary flow is: agent sends via API -> controller calls client.sendMessage -> message stored & emitted.
    // This handler can be enhanced later for full 2-way sync even if phone is used directly.
    if (message.fromMe) {
      // console.log(`Message sent by us (fromMe) on account ${accountId}: To: ${message.to}, Body: ${message.body}`);
      // This is where we would sync messages sent directly from the linked phone, if needed.
      // This would involve finding the chat, storing the message with sender_type 'agent' (or 'account'),
      // and emitting via socket. For now, focusing on agent messages via API.
    }
  });

  client.on('disconnected', async (reason) => {
    console.log(`Client for account ${accountId}, Phone: ${associatedPhoneNumber} was logged out: ${reason}`);
    try {
      await WhatsAppAccount.updateAccountStatus(accountId, 'disconnected');
    } catch (dbError) {
      console.error(`DBError on disconnected for account ${accountId}:`, dbError);
    }
    clients.delete(accountId);
  });

  try {
    await client.initialize();
    clients.set(accountId, client);
    console.log(`Client init process started for ${accountId} (${associatedPhoneNumber}). Waiting for events.`);
  } catch (error) {
    console.error(`Error initializing client for account ${accountId} (${associatedPhoneNumber}): ${error.message}`);
    clients.delete(accountId);
    if (qrStore[accountId]) delete qrStore[accountId];
  }
};

const getQrCodeForAccount = (accountId) => {
  return qrStore[accountId.toString()];
};

const getClientById = (accountId) => {
  return clients.get(accountId.toString());
};

const getAllClients = () => {
  return clients;
};

const disconnectClient = async (accountId) => {
  accountId = accountId.toString();
  const client = clients.get(accountId);
  if (client) {
    console.log(`Disconnecting client for account ${accountId}...`);
    try {
      await client.logout();
    } catch (error) {
      console.error(`Error logging out client for account ${accountId}: ${error.message}`);
      // If logout fails, attempt to destroy to ensure session files might be cleaned by LocalAuth
      try {
        await client.destroy();
        console.log(`Client ${accountId} destroyed after logout error.`);
      } catch (destroyError) {
        console.error(`Error destroying client ${accountId} after logout error: ${destroyError.message}`);
      }
    } finally {
      clients.delete(accountId);
      if (qrStore[accountId]) delete qrStore[accountId];
      console.log(`Client for account ${accountId} removed from active clients map.`);
    }
  } else {
    console.log(`No active client found for account ${accountId} to disconnect.`);
  }
};

const loadAndInitializeAllAccounts = async () => {
    console.log('Attempting to load and initialize all existing WhatsApp accounts...');
    if (!WhatsAppAccount) { // Should always be true as it's imported at top
        console.error("WhatsAppAccount model not available. Cannot initialize accounts.");
        return;
    }
    try {
        const accounts = await WhatsAppAccount.getAllAccountsWithSessions();
        if (accounts && accounts.length > 0) {
            console.log(`Found ${accounts.length} accounts to initialize.`);
            for (const acc of accounts) {
                if (acc.id && acc.phone_number) {
                    console.log(`Initializing client for account ID: ${acc.id}, Phone: ${acc.phone_number}.`);
                    // Pass full account details, though LocalAuth primarily uses clientId (acc.id)
                    await initializeClient(acc);
                } else {
                    console.warn(`Account data missing id or phone_number: ${JSON.stringify(acc)}. Skipping.`);
                }
            }
        } else {
            console.log('No existing WhatsApp accounts found to initialize.');
        }
    } catch (error) {
        console.error('Error loading and initializing accounts:', error);
    }
};

module.exports = {
  initializeClient,
  getQrCodeForAccount,
  getClientById,
  getAllClients,
  disconnectClient,
  loadAndInitializeAllAccounts,
};
