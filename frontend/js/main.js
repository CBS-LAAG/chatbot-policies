// This is the main script for dashboard.html

function initializeDashboard() {
    console.log("Initializing dashboard...");

    // 1. Check authentication status (redirects if not logged in)
    auth.checkAuthRedirect();

    // 2. Get user data
    const userData = auth.getUserData(); // { userId, username, role }

    if (!userData) {
        console.error("User data not found. Critical error or redirect failed.");
        if (!auth.getToken()) {
            window.location.href = 'index.html';
            return;
        }
        ui.displayUsername("Error: User data missing");
    } else {
        ui.displayUsername(userData.username);
    }

    // 3. Initialize WebSocket connection
    try {
        socketClient.init();
    } catch (e) {
        console.error("Failed to initialize Socket.IO client:", e.message);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = 'Real-time communication failed. Some features may not work.';
        document.querySelector('main').prepend(errorDiv);
    }

    // 4. Setup UI and initialize modules based on role
    if (userData && userData.role) {
        const userRole = userData.role.toLowerCase();
        console.log("User role:", userRole);

        // Common initializations for roles that use chat
        // User role will also init chat for read-only view
        if (userRole === 'admin' || userRole === 'agent' || userRole === 'user') {
            chat.init();
        }

        switch (userRole) {
            case 'admin':
                ui.showSection('adminSection');
                ui.populateAdminNav();
                admin.init();
                if (typeof statistics !== "undefined" && statistics.init) {
                    statistics.init(); // Initialize statistics for admin
                } else {
                    console.warn("Statistics module not loaded or init function missing.");
                }
                ui.showAdminSubSection('adminUserManagement'); // Default admin view
                break;
            case 'agent':
                ui.showSection('agentSection');
                // If agentSection HTML is minimal and chatInterfaceSection is separate and preferred:
                // ui.showSection('chatInterfaceSection');
                // For now, agentSection is the container. Chat functionality is initialized via chat.init().
                // Specific UI controls for agent chat are handled in chat.js or here.
                const assignArea = document.getElementById('assignAgentArea');
                if (assignArea) assignArea.style.display = 'none';
                console.log("Agent dashboard setup initiated. Chat interface should be primary.");
                break;
            case 'user':
                ui.showSection('userSection'); // Default 'userSection' for non-interactive elements
                // Or, if 'chatInterfaceSection' is to be used for read-only view:
                // ui.showSection('chatInterfaceSection');
                // Read-only state will be handled by chat.js based on role.
                console.log("User (read-only) dashboard setup initiated.");
                break;
            default:
                console.warn(`Unknown user role: ${userData.role}. Showing default user section.`);
                ui.showSection('userSection');
        }
    } else {
        console.error("User role not found. Displaying default section.");
        ui.showSection('userSection');
    }

    const loadingSection = document.getElementById('loadingSection');
    if (loadingSection) loadingSection.style.display = 'none';

    ui.setupLogoutButton();
    console.log("Dashboard initialized.");
}

document.addEventListener('DOMContentLoaded', initializeDashboard);
