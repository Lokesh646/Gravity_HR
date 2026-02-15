/* DASHBOARD CORE LOGIC */
const DashboardCore = {
    initSharedFeatures: () => {
        // Shared init logic like theme toggle (if needed)
        console.log("Dashboard Core Initialized");
    },

    updateHeader: (user) => {
        const headerName = document.getElementById('headerUserName');
        if (headerName) headerName.textContent = user.name;
    }
};

// Common chart initialization helpers
function initDashboardCharts(monthFilterId) {
    const dashMonthFilter = document.getElementById(monthFilterId);
    if (dashMonthFilter && dashMonthFilter.value) {
        if (typeof renderDashTrafficIntelligence === 'function') {
            renderDashTrafficIntelligence(dashMonthFilter.value);
        }
    }
}
