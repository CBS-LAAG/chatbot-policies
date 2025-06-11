// admin.js - Functionality for the Admin Dashboard

const admin = {
    currentEditUserId: null,

    init: () => {
        console.log("Admin module initializing...");
        // User Management
        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.addEventListener('submit', admin.handleSaveUser);
        }
        const clearFormButton = document.getElementById('clearUserFormButton');
        if (clearFormButton) {
            clearFormButton.addEventListener('click', admin.clearUserForm);
        }
        admin.loadUsers();

        // WhatsApp Account Management
        const linkWhatsAppForm = document.getElementById('linkWhatsAppForm');
        if (linkWhatsAppForm) {
            linkWhatsAppForm.addEventListener('submit', admin.handleLinkWhatsApp);
        }
        admin.loadWhatsAppAccounts();

        // Setup navigation for admin
        ui.populateAdminNav();
    },

    // USER MANAGEMENT FUNCTIONS
    loadUsers: async () => {
        try {
            const users = await fetchApi('/users');
            const usersTableBody = document.getElementById('usersTable').querySelector('tbody');
            usersTableBody.innerHTML = ''; // Clear existing users

            users.forEach(user => {
                const row = usersTableBody.insertRow();
                row.insertCell().textContent = user.id;
                row.insertCell().textContent = user.username;
                row.insertCell().textContent = user.role_name; // role_name from backend

                const actionsCell = row.insertCell();
                const editButton = document.createElement('button');
                editButton.textContent = 'Edit';
                editButton.onclick = () => admin.populateUserFormForEdit(user);
                actionsCell.appendChild(editButton);

                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.onclick = () => admin.handleDeleteUser(user.id);
                actionsCell.appendChild(deleteButton);
            });
        } catch (error) {
            console.error('Failed to load users:', error);
            alert(`Error loading users: ${error.message}`);
        }
    },

    populateUserFormForEdit: (user) => {
        document.getElementById('userId').value = user.id;
        document.getElementById('userUsername').value = user.username;
        document.getElementById('userRole').value = user.role_name; // Make sure role_name matches option value
        document.getElementById('userPassword').value = ''; // Clear password field
        admin.currentEditUserId = user.id;
        document.getElementById('saveUserButton').textContent = 'Update User';
    },

    clearUserForm: () => {
        document.getElementById('userForm').reset();
        document.getElementById('userId').value = '';
        admin.currentEditUserId = null;
        document.getElementById('saveUserButton').textContent = 'Save User';
    },

    handleSaveUser: async (event) => {
        event.preventDefault();
        const userId = document.getElementById('userId').value;
        const username = document.getElementById('userUsername').value;
        const password = document.getElementById('userPassword').value; // Optional
        const roleName = document.getElementById('userRole').value;

        const userData = {
            username,
            role_name: roleName, // Backend expects role_name for creation/update
        };
        if (password) {
            userData.password = password;
        }

        try {
            if (admin.currentEditUserId) { // Editing existing user
                // Backend expects role_name for admin user creation/update, ensure controller handles this
                await fetchApi(`/users/${admin.currentEditUserId}`, {
                    method: 'PUT',
                    body: JSON.stringify(userData),
                });
                alert('User updated successfully!');
            } else { // Creating new user
                if (!password) {
                    alert('Password is required for new users.');
                    return;
                }
                // Backend createUserAdmin expects: username, password, role_name
                await fetchApi('/users', {
                    method: 'POST',
                    body: JSON.stringify(userData),
                });
                alert('User created successfully!');
            }
            admin.clearUserForm();
            admin.loadUsers();
        } catch (error) {
            console.error('Failed to save user:', error);
            alert(`Error saving user: ${error.message}`);
        }
    },

    handleDeleteUser: async (userId) => {
        if (!confirm(`Are you sure you want to delete user ID ${userId}?`)) {
            return;
        }
        try {
            await fetchApi(`/users/${userId}`, { method: 'DELETE' });
            alert('User deleted successfully!');
            admin.loadUsers();
        } catch (error) {
            console.error('Failed to delete user:', error);
            alert(`Error deleting user: ${error.message}`);
        }
    },

    // WHATSAPP ACCOUNT MANAGEMENT FUNCTIONS
    loadWhatsAppAccounts: async () => {
        try {
            const accounts = await fetchApi('/whatsapp/accounts');
            const accountsListUl = document.getElementById('whatsAppAccountsList');
            accountsListUl.innerHTML = ''; // Clear list

            if (accounts && accounts.length > 0) {
                accounts.forEach(account => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `ID: ${account.id}, Phone: ${account.phone_number}, Status: ${account.status || 'N/A'}`;

                    const removeButton = document.createElement('button');
                    removeButton.textContent = 'Remove';
                    removeButton.onclick = () => admin.handleRemoveWhatsApp(account.id);
                    listItem.appendChild(removeButton);

                    accountsListUl.appendChild(listItem);
                });
            } else {
                accountsListUl.innerHTML = '<li>No WhatsApp accounts linked yet.</li>';
            }
        } catch (error) {
            console.error('Failed to load WhatsApp accounts:', error);
            alert(`Error loading WhatsApp accounts: ${error.message}`);
        }
    },

    handleLinkWhatsApp: async (event) => {
        event.preventDefault();
        const phoneNumberInput = document.getElementById('phoneNumber');
        const phoneNumber = phoneNumberInput.value.trim();
        const qrCodeDisplay = document.getElementById('qrCodeDisplay');
        const qrCodeArea = document.getElementById('qrCodeArea');

        if (!phoneNumber) {
            alert('Phone number is required.');
            return;
        }

        qrCodeDisplay.textContent = 'Attempting to link... please wait.';
        qrCodeArea.style.display = 'block';

        try {
            const response = await fetchApi('/whatsapp/link', {
                method: 'POST',
                body: JSON.stringify({ phoneNumber }),
            });

            phoneNumberInput.value = ''; // Clear input
            alert(response.message || "Linking process initiated.");
            admin.loadWhatsAppAccounts(); // Refresh list, might show pending status

            if (response.qrCode) { // QR code sent directly (less likely with polling design)
                qrCodeDisplay.textContent = response.qrCode;
            } else if (response.qrPollUrl) {
                // Start polling for QR code
                admin.pollForQrCode(response.accountId, response.qrPollUrl);
            } else if (response.accountId && response.status === 'connected') {
                 qrCodeDisplay.textContent = `Account ${response.phoneNumber} is already connected.`;
            } else {
                 qrCodeDisplay.textContent = "QR code will be fetched. Polling started if URL provided.";
            }

        } catch (error) {
            console.error('Failed to link WhatsApp account:', error);
            qrCodeDisplay.textContent = `Error: ${error.message}`;
            alert(`Error linking WhatsApp account: ${error.message}`);
        }
    },

    pollForQrCode: async (accountId, pollUrl, attempts = 10, delay = 5000) => {
        const qrCodeDisplay = document.getElementById('qrCodeDisplay');
        qrCodeDisplay.textContent = `Waiting for QR code for Account ID ${accountId}... (Attempt ${11 - attempts})`;

        if (attempts <= 0) {
            qrCodeDisplay.textContent = `Stopped polling for QR code for Account ID ${accountId}. Please try linking again if not connected.`;
            admin.loadWhatsAppAccounts(); // Refresh status
            return;
        }

        try {
            const qrResponse = await fetchApi(pollUrl); // pollUrl is like /api/whatsapp/qr/:accountId
            if (qrResponse && qrResponse.qrCode) {
                qrCodeDisplay.textContent = qrResponse.qrCode; // Display ASCII QR
                // Keep polling briefly to see if it gets scanned and status changes
                setTimeout(() => admin.pollForQrCode(accountId, pollUrl, attempts -1, delay), delay + 5000); // Check again less frequently
            } else if (qrResponse && (qrResponse.status === 'connected' || qrResponse.status === 'ready')) {
                qrCodeDisplay.textContent = `Account ID ${accountId} is now connected! You can close this message.`;
                admin.loadWhatsAppAccounts(); // Refresh to show connected status
            } else if (qrResponse && qrResponse.status === 'auth_failure') {
                qrCodeDisplay.textContent = `Authentication failed for Account ID ${accountId}. Please try linking again.`;
                admin.loadWhatsAppAccounts();
            }
            else { // No QR code yet, continue polling
                setTimeout(() => admin.pollForQrCode(accountId, pollUrl, attempts - 1, delay), delay);
            }
        } catch (error) {
            // If 404, QR might be gone (scanned or failed)
            if (error.status === 404) {
                 qrCodeDisplay.textContent = `QR code for Account ID ${accountId} is no longer available or may have been scanned. Checking status...`;
                 admin.loadWhatsAppAccounts(); // Refresh status
                 // Consider stopping polling here or after one more check
                 setTimeout(() => admin.loadWhatsAppAccounts(), 7000); // Final status check
                 return;
            }
            console.warn(`Polling error for QR for account ${accountId}: ${error.message}. Retrying...`);
            setTimeout(() => admin.pollForQrCode(accountId, pollUrl, attempts - 1, delay), delay);
        }
    },

    handleRemoveWhatsApp: async (accountId) => {
        if (!confirm(`Are you sure you want to remove WhatsApp account ID ${accountId}?`)) {
            return;
        }
        try {
            await fetchApi(`/whatsapp/accounts/${accountId}`, { method: 'DELETE' });
            alert('WhatsApp account removed successfully!');
            admin.loadWhatsAppAccounts();
            const qrCodeDisplay = document.getElementById('qrCodeDisplay');
            // If the removed account was the one showing a QR, clear it
            if (qrCodeDisplay.textContent.includes(`Account ID ${accountId}`)) {
                qrCodeDisplay.textContent = 'QR code area.';
                 document.getElementById('qrCodeArea').style.display = 'none';
            }
        } catch (error) {
            console.error('Failed to remove WhatsApp account:', error);
            alert(`Error removing WhatsApp account: ${error.message}`);
        }
    }
};

// The admin.init() will be called from main.js if user is Admin.
// Example: if (userData.role === 'Admin') { admin.init(); }
// ui.populateAdminNav is a new function to be added to ui.js for admin specific navigation links
// if different from mainNav. For now, admin subsections are within the adminSection.
