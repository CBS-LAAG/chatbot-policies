require('dotenv').config();
const express = require('express');
const http = require('http'); // Required for Socket.IO
const socketService = require('./services/socketService'); // Import Socket.IO service
const app = express();

const PORT = process.env.PORT || 3000;

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Socket.IO
socketService.initializeSocket(httpServer);

// Middleware to parse JSON bodies
app.use(express.json());

app.get('/', (req, res) => {
  res.send('WhatsApp CRM Backend is running!');
});

// Auth Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// User Management Routes (Admin Only)
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// WhatsApp Management Routes (Admin Only)
const whatsappRoutes = require('./routes/whatsappRoutes');
app.use('/api/whatsapp', whatsappRoutes);

// Chat Routes
const chatRoutes = require('./routes/chatRoutes');
app.use('/api/chats', chatRoutes);

// Statistics Routes (Admin Only)
const statisticsRoutes = require('./routes/statisticsRoutes');
app.use('/api/statistics', statisticsRoutes);


// Graceful shutdown
httpServer.listen(PORT, () => { // Listen on httpServer, not app
  console.log(`Server is running on port ${PORT}`);
  // Initialize WhatsApp clients after server starts and DB is presumably connected
  setTimeout(() => {
    const whatsappService = require('./services/whatsappService');
    // whatsappService.js already requires WhatsAppAccount model directly.
    whatsappService.loadAndInitializeAllAccounts().catch(err => {
        console.error("Failed to initialize WhatsApp accounts on startup:", err);
    });
  }, 5000); // Delay 5 seconds
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(async () => { // Close httpServer
    console.log('HTTP server closed');
    // Disconnect WhatsApp clients
    const whatsappService = require('./services/whatsappService');
    const clients = whatsappService.getAllClients();
    if (clients && clients.size > 0) {
      for (const accountId of clients.keys()) {
        await whatsappService.disconnectClient(accountId);
      }
    }
    console.log('All WhatsApp clients disconnected.');

    // Close Socket.IO server
    const io = socketService.getIoInstance();
    if (io) {
      io.close(() => {
        console.log('Socket.IO server closed.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});
