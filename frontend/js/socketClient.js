// Ensure this script is loaded after the Socket.IO CDN script and api.js/auth.js if using token for connection.

const socketClient = {
    socket: null,

    init: () => {
        // const token = auth.getToken(); // Get JWT token for authentication if socket server requires it

        // For this iteration, backend socket.io connection doesn't strictly require JWT for initial connection,
        // but for specific authenticated actions or room joins, it might be implicitly verified by API calls
        // that happen before joining rooms, or the backend socket handler could request auth.
        // If backend socket server *does* require token for connection:
        // this.socket = io('http://localhost:3000', { auth: { token } });

        if (typeof io === "undefined") {
            console.error("Socket.IO client library not loaded. Make sure the CDN link is in dashboard.html.");
            return;
        }

        console.log("Initializing Socket.IO connection...");
        this.socket = io('http://localhost:3000'); // Connect to backend WebSocket server

        this.socket.on('connect', () => {
            console.log('Connected to WebSocket server with ID:', this.socket.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from WebSocket server:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
        });

        // Placeholder for other global listeners if needed
    },

    onNewMessage: (callback) => {
        if (this.socket) {
            this.socket.on('new_message', callback);
        } else {
            console.warn("Socket not initialized. Cannot listen for 'new_message'.");
        }
    },

    onChatUpdate: (callback) => {
        if (this.socket) {
            this.socket.on('chat_updated', callback);
        } else {
            console.warn("Socket not initialized. Cannot listen for 'chat_updated'.");
        }
    },

    joinChatRoom: (chatId) => {
        if (this.socket) {
            console.log(`Emitting 'join_chat_room' for chat ID: ${chatId}`);
            this.socket.emit('join_chat_room', chatId.toString());
        } else {
            console.warn("Socket not initialized. Cannot join chat room.");
        }
    },

    leaveChatRoom: (chatId) => {
        if (this.socket) {
            console.log(`Emitting 'leave_chat_room' for chat ID: ${chatId}`);
            this.socket.emit('leave_chat_room', chatId.toString());
        } else {
            console.warn("Socket not initialized. Cannot leave chat room.");
        }
    },

    // Example: Send a message via socket (if your app uses this pattern)
    // sendChatMessage: (chatId, messageData) => {
    //     if (this.socket) {
    //         this.socket.emit('send_chat_message', { chatId, ...messageData });
    //     }
    // }
};

// Note: socketClient.init() should be called from main.js when the dashboard loads.
