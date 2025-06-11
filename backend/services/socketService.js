let io;

const initializeSocket = (httpServer) => {
  io = require('socket.io')(httpServer, {
    cors: {
      origin: "*", // Configure this to your frontend URL in production
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('A user connected to WebSocket:', socket.id);

    socket.on('join_chat_room', (chatId) => {
      console.log(`Socket ${socket.id} joined room for chat ${chatId}`);
      socket.join(chatId.toString());
    });

    socket.on('leave_chat_room', (chatId) => {
      console.log(`Socket ${socket.id} left room for chat ${chatId}`);
      socket.leave(chatId.toString());
    });

    socket.on('disconnect', () => {
      console.log('User disconnected from WebSocket:', socket.id);
    });
  });

  console.log('Socket.IO initialized');
  return io;
};

const getIoInstance = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized!");
  }
  return io;
};

const emitNewMessage = (chatId, messageData) => {
  if (io) {
    console.log(`Emitting 'new_message' to room ${chatId}:`, messageData);
    io.to(chatId.toString()).emit('new_message', messageData);
  }
};

const emitChatUpdate = (chatId, chatData) => {
  if (io) {
    console.log(`Emitting 'chat_updated' to room ${chatId}:`, chatData);
    io.to(chatId.toString()).emit('chat_updated', chatData);
  }
};

module.exports = {
  initializeSocket,
  getIoInstance,
  emitNewMessage,
  emitChatUpdate
};
