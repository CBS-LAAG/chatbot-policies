// ui.js

const ui = {
    showSection: (sectionId) => {
        const sections = document.querySelectorAll('.dashboard-section');
        sections.forEach(section => {
            section.style.display = 'none';
        });
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
            activeSection.style.display = 'block';
        } else {
            console.warn(`Section with ID '${sectionId}' not found.`);
            const fallbackSection = document.getElementById('userSection');
            if (fallbackSection) fallbackSection.style.display = 'block';
        }
    },

    displayUsername: (username) => {
        const usernameDisplay = document.getElementById('usernameDisplay');
        if (usernameDisplay) {
            usernameDisplay.textContent = username || 'User';
        }
    },

    setupLogoutButton: () => {
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', auth.logout);
        }
    },

    // Generic function to populate a list or table body
    populateTableOrList: (elementId, items, itemRenderer, isTableBody = true) => {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element with ID '${elementId}' not found for populating.`);
            return;
        }
        element.innerHTML = ''; // Clear existing items
        if (items && items.length > 0) {
            items.forEach(item => {
                element.appendChild(itemRenderer(item));
            });
        } else {
            if (isTableBody && element.tagName === 'TBODY') {
                const row = element.insertRow();
                const cell = row.insertCell();
                cell.colSpan = element.previousElementSibling.rows[0].cells.length || 1; // Colspan based on header
                cell.textContent = 'No data available.';
                cell.style.textAlign = 'center';
            } else {
                element.innerHTML = '<li>No data available.</li>';
            }
        }
    },

    // Admin specific navigation (can be expanded)
    // This is a placeholder - actual nav items might be more dynamic
    // or directly part of dashboard.html if static enough for admin.
    populateAdminNav: () => {
        const navUl = document.querySelector('#mainNav ul');
        if (navUl) {
            navUl.innerHTML = `
                <li><a href="#" onclick="ui.showAdminSubSection('adminUserManagement'); return false;">User Management</a></li>
                <li><a href="#" onclick="ui.showAdminSubSection('adminWhatsAppManagement'); return false;">WhatsApp Accounts</a></li>
                <li><a href="#" onclick="ui.showAdminSubSection('adminStatistics'); return false;">Statistics</a></li>
                <li><a href="#" onclick="ui.showSection('chatInterfaceSection'); return false;">Chat Interface</a></li>
            `;
        }
    },

    showAdminSubSection: (subsectionId) => {
        // Ensure adminSection is visible first
        ui.showSection('adminSection');
        // Then, hide all subsections within adminSection
        const subsections = document.querySelectorAll('#adminSection .admin-subsection');
        subsections.forEach(section => {
            section.style.display = 'none';
        });
        // Show the target subsection
        const activeSubsection = document.getElementById(subsectionId);
        if (activeSubsection) {
            activeSubsection.style.display = 'block';
        } else {
            console.warn(`Admin subsection with ID '${subsectionId}' not found.`);
        }
    },

    // Call this early if the logout button is always in the HTML
    // otherwise main.js can call it after ensuring user is authenticated.
    // setupLogoutButton: () => { ... } // Already defined
};

// Initial UI setup that can run once ui.js is loaded
ui.setupLogoutButton();
