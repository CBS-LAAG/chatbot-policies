// chat.js - Functionality for Chat Interface

const chat = {
    currentChatId: null,
    agents: [], // Store agents for assignment dropdown

    init: () => {
        console.log("Chat module initializing...");
        const userData = auth.getUserData();
        const userRole = userData ? userData.role.toLowerCase() : null;

        // Event listeners only for roles that can interact
        if (userRole === 'admin' || userRole === 'agent') {
            const sendMessageButton = document.getElementById('sendMessageButton');
            if (sendMessageButton) sendMessageButton.addEventListener('click', chat.handleSendMessage);

            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        chat.handleSendMessage();
                    }
                });
            }

            const assignChatButton = document.getElementById('assignChatButton');
            if (assignChatButton && userRole === 'admin') { // Only admin can assign
                assignChatButton.addEventListener('click', chat.handleAssignAgentToSelectedChat);
            }

            const closeChatButton = document.getElementById('closeChatButton');
            if (closeChatButton) closeChatButton.addEventListener('click', chat.handleCloseSelectedChat);
        }

        chat.loadInitialData();

        if (socketClient && socketClient.socket) {
            socketClient.onNewMessage(chat.handleNewMessageRealtime);
            socketClient.onChatUpdate(chat.handleChatUpdateRealtime);
        } else {
            console.warn("Socket client not ready in chat.js init.");
        }
    },

    loadInitialData: async () => {
        await chat.loadChats();
        const userData = auth.getUserData();
        // Load agents only if admin, as only they use the agent assignment dropdown
        if (userData && userData.role && userData.role.toLowerCase() === 'admin') {
            await chat.loadAgentsForAssignment();
        }
    },

    loadChats: async () => {
        try {
            const chatsData = await fetchApi('/chats');
            const chatListUL = document.getElementById('chatListUL');
            // Assuming backend /api/chats correctly filters by user role (User sees their chats, Agent their assigned, Admin all)
            ui.populateTableOrList('chatListUL', chatsData, (c) => {
                const listItem = document.createElement('li');
                listItem.id = `chat-item-${c.id}`;
                listItem.dataset.chatId = c.id;
                listItem.dataset.status = c.status;
                listItem.dataset.agentId = c.agent_id || '';
                let agentInfo = '';
                if (c.agent_id) {
                    const agentUser = chat.agents.find(agent => agent.id === c.agent_id); // chat.agents mostly for admin
                    agentInfo = ` - Agent: ${agentUser ? agentUser.username : (c.agent_username || c.agent_id)}`;
                }
                listItem.textContent = `Chat ID: ${c.id} | Cust: ${c.customer_contact_id.split('@')[0]} | Status: ${c.status}${agentInfo}`;
                listItem.onclick = () => chat.selectChat(c.id);
                return listItem;
            }, false);

        } catch (error) {
            console.error('Failed to load chats:', error);
            document.getElementById('chatListUL').innerHTML = `<li>Error loading chats: ${error.message}</li>`;
        }
    },

    loadAgentsForAssignment: async () => {
        // ... (same as before, used by Admin)
        try {
            const users = await fetchApi('/users');
            chat.agents = users.filter(u => u.role_name === 'Agent' || u.role_name === 'Admin');
            const agentSelect = document.getElementById('agentSelect');
            agentSelect.innerHTML = '<option value="">Select Agent</option>';
            chat.agents.forEach(agent => {
                const option = document.createElement('option');
                option.value = agent.id;
                option.textContent = `${agent.username} (${agent.role_name})`;
                agentSelect.appendChild(option);
            });
        } catch (error) { console.error('Failed to load agents:', error); }
    },

    selectChat: async (chatId) => {
        // ... (same as before)
        if (chat.currentChatId && chat.currentChatId.toString() !== chatId.toString()) {
            socketClient.leaveChatRoom(chat.currentChatId.toString());
        }
        chat.currentChatId = chatId.toString();
        socketClient.joinChatRoom(chat.currentChatId);
        document.querySelectorAll('#chatListUL li').forEach(li => li.style.fontWeight = 'normal');
        const selectedLi = document.getElementById(`chat-item-${chat.currentChatId}`);
        if (selectedLi) selectedLi.style.fontWeight = 'bold';
        await chat.displayChatMessages(chat.currentChatId);
        chat.updateChatControls();
    },

    displayChatMessages: async (chatId) => {
        // ... (same as before)
        const messagesView = document.getElementById('messagesView');
        messagesView.innerHTML = `Loading messages for chat ${chatId}...`;
        try {
            const messages = await fetchApi(`/chats/${chatId}/messages`);
            messagesView.innerHTML = '';
            if (messages && messages.length > 0) { messages.forEach(msg => chat.appendMessageToView(msg)); }
            else { messagesView.innerHTML = '<p>No messages in this chat yet.</p>'; }
            messagesView.scrollTop = messagesView.scrollHeight;
        } catch (error) { console.error(`Failed to load messages for chat ${chatId}:`, error); messagesView.innerHTML = `<p class="error-message">Error loading messages: ${error.message}</p>`; }
    },

    appendMessageToView: (message) => {
        // ... (same as before)
        const messagesView = document.getElementById('messagesView');
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', message.sender_type);
        const senderSpan = document.createElement('span');
        senderSpan.classList.add('sender');
        let senderName = message.sender_id;
        if (message.sender_type === 'agent') {
            const agentUser = chat.agents.find(agent => agent.id.toString() === message.sender_id.toString());
            senderName = agentUser ? agentUser.username : `Agent ${message.sender_id}`;
        } else { senderName = `Customer ${message.sender_id.split('@')[0]}`; }
        senderSpan.textContent = senderName;
        const contentP = document.createElement('p');
        contentP.classList.add('content'); contentP.textContent = message.content;
        const timestampSpan = document.createElement('span');
        timestampSpan.classList.add('timestamp'); timestampSpan.textContent = new Date(message.timestamp).toLocaleString();
        messageDiv.appendChild(senderSpan); messageDiv.appendChild(contentP); messageDiv.appendChild(timestampSpan);
        messagesView.appendChild(messageDiv); messagesView.scrollTop = messagesView.scrollHeight;
    },

    updateChatControls: () => {
        if (!chat.currentChatId) return;

        const assignAgentArea = document.getElementById('assignAgentArea');
        const closeChatButton = document.getElementById('closeChatButton');
        const closureTypeSelect = document.getElementById('closureTypeSelect');
        const messageInput = document.getElementById('messageInput');
        const sendMessageButton = document.getElementById('sendMessageButton');

        const currentChatElement = document.getElementById(`chat-item-${chat.currentChatId}`);
        if (!currentChatElement) return;

        const chatStatus = currentChatElement.dataset.status;
        const currentAgentId = currentChatElement.dataset.agentId;
        const userData = auth.getUserData();
        const userRole = userData ? userData.role.toLowerCase() : null;

        // Default to hidden/disabled
        assignAgentArea.style.display = 'none';
        closeChatButton.style.display = 'none';
        closureTypeSelect.style.display = 'none';
        messageInput.style.display = 'none';
        sendMessageButton.style.display = 'none';

        if (userRole === 'admin') {
            messageInput.style.display = 'inline-block'; // Admins can always type/send
            sendMessageButton.style.display = 'inline-block';
            if (chatStatus !== 'closed') {
                if (!currentAgentId) assignAgentArea.style.display = 'block'; // Assign if no agent
                closeChatButton.style.display = 'inline-block'; // Admin can close
                closureTypeSelect.style.display = 'inline-block';
            }
        } else if (userRole === 'agent') {
            if (chatStatus !== 'closed' && currentAgentId && userData.userId.toString() === currentAgentId) {
                messageInput.style.display = 'inline-block'; // Agent can type/send if assigned
                sendMessageButton.style.display = 'inline-block';
                closeChatButton.style.display = 'inline-block'; // Agent can close their chat
                closureTypeSelect.style.display = 'inline-block';
            }
        }
        // For 'user' role, all controls remain hidden (read-only chat view)
        // If chat is selected, messages are visible, but no input/action controls.
    },

    handleAssignAgentToSelectedChat: async () => {
        // ... (same as before)
        if (!chat.currentChatId) { alert('Please select a chat first.'); return; }
        const agentSelect = document.getElementById('agentSelect');
        const agentId = agentSelect.value;
        if (!agentId) { alert('Please select an agent.'); return; }
        try {
            await fetchApi(`/chats/${chat.currentChatId}/assign`, {
                method: 'POST', body: JSON.stringify({ agentId: parseInt(agentId) }),
            });
            alert(`Chat ${chat.currentChatId} assigned to agent ${agentId}.`);
        } catch (error) { console.error('Failed to assign chat:', error); alert(`Error assigning chat: ${error.message}`); }
    },

    handleCloseSelectedChat: async () => {
        // ... (same as before)
        if (!chat.currentChatId) { alert('Please select a chat first.'); return; }
        const closureTypeSelect = document.getElementById('closureTypeSelect');
        const closure_type = closureTypeSelect.value;
        if (!closure_type) { alert('Please select a closure type.'); closureTypeSelect.focus(); return; }
        if (!confirm(`Are you sure you want to close chat ID ${chat.currentChatId} as ${closure_type}?`)) return;
        try {
            await fetchApi(`/chats/${chat.currentChatId}/close`, {
                method: 'POST', body: JSON.stringify({ closure_type }),
            });
            alert(`Chat ${chat.currentChatId} closed.`);
        } catch (error) { console.error('Failed to close chat:', error); alert(`Error closing chat: ${error.message}`); }
    },

    handleSendMessage: async () => {
        // ... (same as before)
        if (!chat.currentChatId) { alert('Please select a chat to send a message to.'); return; }
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();
        if (!content) return;
        try {
            await fetchApi(`/chats/${chat.currentChatId}/messages`, {
                method: 'POST', body: JSON.stringify({ content }),
            });
            messageInput.value = '';
        } catch (error) { console.error('Failed to send message:', error); alert(`Error sending message: ${error.message}`); }
    },

    handleNewMessageRealtime: (message) => {
        // ... (same as before)
        console.log("Realtime: New message received", message);
        if (message.chat_id && chat.currentChatId && message.chat_id.toString() === chat.currentChatId.toString()) {
            chat.appendMessageToView(message);
        }
        const chatListItem = document.getElementById(`chat-item-${message.chat_id}`);
        if (chatListItem) { /* Update snippet if needed */ }
    },

    handleChatUpdateRealtime: (updatedChat) => {
        // ... (same as before)
        console.log("Realtime: Chat update received", updatedChat);
        const listItem = document.getElementById(`chat-item-${updatedChat.id}`);
        if (listItem) {
            listItem.dataset.status = updatedChat.status;
            listItem.dataset.agentId = updatedChat.agent_id || '';
            let agentNameForDisplay = '';
            if(updatedChat.agent_id) {
                const agentUser = chat.agents.find(a => a.id.toString() === updatedChat.agent_id.toString());
                agentNameForDisplay = agentUser ? agentUser.username : (updatedChat.agent_username || updatedChat.agent_id);
            }
            listItem.textContent = `Chat ID: ${updatedChat.id} | Cust: ${updatedChat.customer_contact_id.split('@')[0]} | Status: ${updatedChat.status}${agentNameForDisplay ? ' - Agent: ' + agentNameForDisplay : ''}`;
        }
        if (chat.currentChatId && chat.currentChatId.toString() === updatedChat.id.toString()) {
            chat.updateChatControls();
        }
    }
};
