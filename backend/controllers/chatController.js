const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User'); // For role checks
const whatsappService = require('../services/whatsappService');
const socketService = require('../services/socketService');

const chatController = {
  assignChat: async (req, res) => {
    const { chatId } = req.params;
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ message: 'Agent ID is required.' });
    }

    try {
      const chat = await Chat.getChatById(chatId);
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found.' });
      }
      if (chat.agent_id === parseInt(agentId) && chat.status === 'assigned') {
        return res.status(200).json({ message: 'Chat already assigned to this agent.' });
      }

      const agent = await User.findUserById(agentId);
      if (!agent || (agent.role_name !== 'Agent' && agent.role_name !== 'Admin')) {
        return res.status(404).json({ message: 'Valid agent not found or user is not an Agent/Admin.' });
      }

      await Chat.assignAgentToChat(chatId, agentId);
      const updatedChat = await Chat.getChatById(chatId); // Fetch updated chat
      socketService.emitChatUpdate(chatId.toString(), { ...updatedChat, event_type: 'assigned' });
      res.status(200).json({ message: `Chat ${chatId} assigned to agent ${agentId}.`, chat: updatedChat });
    } catch (error) {
      console.error(`Error assigning chat ${chatId} to agent ${agentId}:`, error);
      res.status(500).json({ message: 'Error assigning chat.', error: error.message });
    }
  },

  closeChat: async (req, res) => {
    const { chatId } = req.params;
    const { closure_type } = req.body; // 'quotation', 'billing', or other
    const { userId, role } = req.user; // from authenticateToken middleware

    try {
      const chat = await Chat.getChatById(chatId);
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found.' });
      }

      // Authorization: Admin can close any chat. Agent can only close their assigned chat.
      if (role === 'Agent' && chat.agent_id !== userId) {
        return res.status(403).json({ message: 'Forbidden. Agent not assigned to this chat.' });
      }
      if (chat.status === 'closed') {
         return res.status(400).json({ message: 'Chat already closed.' });
      }

      await Chat.closeChat(chatId, closure_type);
      const updatedChat = await Chat.getChatById(chatId); // Fetch updated chat
      socketService.emitChatUpdate(chatId.toString(), { ...updatedChat, event_type: 'closed' });
      res.status(200).json({ message: `Chat ${chatId} closed.`, chat: updatedChat });
    } catch (error) {
      console.error(`Error closing chat ${chatId}:`, error);
      res.status(500).json({ message: 'Error closing chat.', error: error.message });
    }
  },

  getChatMessages: async (req, res) => {
    const { chatId } = req.params;
    const { userId, role } = req.user;

    try {
      const chat = await Chat.getChatById(chatId);
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found.' });
      }

      // Authorization: Admin can see any chat. Agent only their assigned chats.
      if (role === 'Agent' && chat.agent_id !== userId) {
        return res.status(403).json({ message: 'Forbidden. Agent not assigned to this chat.' });
      }

      const messages = await Message.getMessagesByChatId(chatId);
      res.status(200).json(messages);
    } catch (error) {
      console.error(`Error retrieving messages for chat ${chatId}:`, error);
      res.status(500).json({ message: 'Error retrieving messages.', error: error.message });
    }
  },

  listChats: async (req, res) => {
    const { userId, role } = req.user;
    const filters = req.query; // e.g., /api/chats?status=open

    try {
      let chats;
      if (role === 'Admin') {
        chats = await Chat.getAllChats(filters);
      } else if (role === 'Agent') {
        // Agent sees their assigned chats, plus potentially 'open' chats if that's a feature
        // For now, only assigned chats by agentId, plus any other filters they apply
        filters.agentId = userId;
        chats = await Chat.getAllChats(filters);
        // If agents should also see 'open' chats:
        // const openChats = await Chat.getAllChats({ ...filters, status: 'open', agentId: null });
        // chats = [...chats, ...openChats]; // Combine and de-duplicate if necessary
      } else { // Other roles (e.g. 'User') don't see chats by default
        return res.status(403).json({ message: 'Forbidden. Insufficient role.'});
      }
      res.status(200).json(chats);
    } catch (error) {
      console.error('Error listing chats:', error);
      res.status(500).json({ message: 'Error listing chats.', error: error.message });
    }
  },

  sendMessage: async (req, res) => {
    const { chatId } = req.params;
    const { content } = req.body;
    const { userId, role } = req.user; // Agent sending the message

    if (!content) {
      return res.status(400).json({ message: 'Message content is required.' });
    }

    try {
      const chat = await Chat.getChatById(chatId);
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found.' });
      }
      if (chat.status === 'closed') {
        return res.status(400).json({ message: 'Cannot send message to a closed chat.' });
      }

      // Authorization: Agent must be assigned to the chat, or be an Admin.
      if (role === 'Agent' && chat.agent_id !== userId) {
        return res.status(403).json({ message: 'Forbidden. Agent not assigned to this chat.' });
      }
      // If an Admin is sending, ensure they are recorded as the sender if no agent is assigned,
      // or use the assigned agent's ID if one is present. For simplicity, let's assume if an
      // Admin sends, they are acting as an agent, so their ID is used as sender_id.
      const senderAgentId = (role === 'Admin' && !chat.agent_id) ? userId : chat.agent_id;
      if (!senderAgentId) { // Should not happen if agent is assigned or admin is sending
          return res.status(403).json({ message: 'No assigned agent to send message as, and you are not an admin taking over.' });
      }


      const whatsappClient = whatsappService.getClientById(chat.whatsapp_account_id);
      if (!whatsappClient) {
        return res.status(500).json({ message: 'Associated WhatsApp account is not connected.' });
      }

      // Send message via WhatsApp
      // customer_contact_id is like 'phonenumber@c.us'
      await whatsappClient.sendMessage(chat.customer_contact_id, content);

      // Store message in DB
      const messageTimestamp = new Date(); // Or Date.now() / 1000 for unix seconds
      const createdMessage = await Message.createMessage(
        chatId,
        senderAgentId, // The agent (or admin acting as agent) who sent the message
        'agent',
        content,
        messageTimestamp
      );

      socketService.emitNewMessage(chatId.toString(), createdMessage);
      res.status(200).json({ message: 'Message sent successfully.', messageData: createdMessage });

    } catch (error) {
      console.error(`Error sending message to chat ${chatId}:`, error);
      // Check for specific whatsapp-web.js errors, e.g., if contact is invalid or client not ready
      if (error.message && error.message.includes("Protocol error")) {
          return res.status(500).json({ message: 'Failed to send WhatsApp message due to a protocol error. Is the phone connected?' });
      }
      res.status(500).json({ message: 'Failed to send message.', error: error.message });
    }
  }
};

module.exports = chatController;
