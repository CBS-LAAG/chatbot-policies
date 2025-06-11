// statistics.js - Functionality for Admin Statistics Dashboard

const statistics = {
    charts: {}, // To store chart instances for updates

    init: () => {
        console.log("Statistics module initializing...");
        const loadStatsButton = document.getElementById('loadStatsButton');
        if (loadStatsButton) {
            loadStatsButton.addEventListener('click', statistics.loadAllStatistics);
        } else {
            console.error("Load Stats Button not found.");
            return;
        }
        statistics.populateFilterDropdowns();
    },

    populateFilterDropdowns: async () => {
        try {
            // Populate Agents Dropdown
            const users = await fetchApi('/users'); // Fetches all users
            const agents = users.filter(u => u.role_name === 'Agent' || u.role_name === 'Admin');
            const agentSelect = document.getElementById('statsAgentId');
            if (agentSelect) {
                agents.forEach(agent => {
                    const option = document.createElement('option');
                    option.value = agent.id;
                    option.textContent = `${agent.username} (${agent.role_name})`;
                    agentSelect.appendChild(option);
                });
            }

            // Populate WhatsApp Accounts Dropdown
            const waAccounts = await fetchApi('/whatsapp/accounts');
            const waAccountSelect = document.getElementById('statsWhatsAppAccountId');
            if (waAccountSelect) {
                waAccounts.forEach(acc => {
                    const option = document.createElement('option');
                    option.value = acc.id;
                    option.textContent = acc.phone_number;
                    waAccountSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Error populating filter dropdowns:", error);
            alert("Could not load filter options for statistics.");
        }
    },

    loadAllStatistics: async () => {
        const filters = {
            startDate: document.getElementById('statsStartDate').value,
            endDate: document.getElementById('statsEndDate').value,
            agentId: document.getElementById('statsAgentId').value,
            whatsappAccountId: document.getElementById('statsWhatsAppAccountId').value,
        };

        // Remove empty filters
        Object.keys(filters).forEach(key => {
            if (!filters[key]) {
                delete filters[key];
            }
        });

        const queryString = new URLSearchParams(filters).toString();

        try {
            console.log("Loading statistics with filters:", filters);
            const chatVolumeData = await fetchApi(`/statistics/chat-volume?${queryString}`);
            statistics.renderChatVolumeChart(chatVolumeData);

            const closureTypesData = await fetchApi(`/statistics/closure-types?${queryString}`);
            statistics.renderClosureTypesChart(closureTypesData);

            // Agent performance typically doesn't use whatsappAccountId filter in backend model
            const agentPerfFilters = { startDate: filters.startDate, endDate: filters.endDate };
            const agentPerfQueryString = new URLSearchParams(agentPerfFilters).toString();
            const agentPerformanceData = await fetchApi(`/statistics/agent-performance?${agentPerfQueryString}`);
            statistics.renderAgentPerformanceTable(agentPerformanceData);

        } catch (error) {
            console.error("Error loading statistics:", error);
            alert(`Failed to load statistics: ${error.message}`);
        }
    },

    renderChatVolumeChart: (data) => {
        const ctx = document.getElementById('chatVolumeChart').getContext('2d');
        if (statistics.charts.chatVolume) {
            statistics.charts.chatVolume.destroy();
        }
        statistics.charts.chatVolume = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.date),
                datasets: [{
                    label: 'Chat Volume',
                    data: data.map(item => item.count),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    },

    renderClosureTypesChart: (data) => {
        const ctx = document.getElementById('closureTypesChart').getContext('2d');
        if (statistics.charts.closureTypes) {
            statistics.charts.closureTypes.destroy();
        }
        statistics.charts.closureTypes = new Chart(ctx, {
            type: 'pie', // Or 'bar'
            data: {
                labels: data.map(item => item.closure_type),
                datasets: [{
                    label: 'Closure Types',
                    data: data.map(item => item.count),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                    ]
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    },

    renderAgentPerformanceTable: (data) => {
        const tableBody = document.getElementById('agentPerformanceTable').querySelector('tbody');
        ui.populateTableOrList(tableBody.id, data, (agentPerf) => {
            const row = document.createElement('tr');
            row.insertCell().textContent = agentPerf.agentId;
            row.insertCell().textContent = agentPerf.agentName;
            row.insertCell().textContent = agentPerf.chatsHandled;
            row.insertCell().textContent = agentPerf.quotations;
            row.insertCell().textContent = agentPerf.billings;
            return row;
        }, true);
    }
};

// statistics.init() will be called from main.js if user is Admin,
// likely after admin.init() or as part of it.
// For example, in admin.js:
// init: () => { ... admin.loadUsers(); ... statistics.init(); }
// Or in main.js:
// if (userRole === 'admin') { ... admin.init(); statistics.init(); ... }
