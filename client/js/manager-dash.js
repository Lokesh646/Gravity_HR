/* Manager Dashboard Initialization */
document.addEventListener('DOMContentLoaded', () => {
    console.log("Manager Dashboard Loaded");

    // 1. Core Auth Check (handled by render-logic.js, but we can add specific checks)
    const user = Auth.getCurrentUser();
    if (!user || (user.role !== 'Manager' && user.role !== 'Admin')) {
        // Optional: restriction logic
    }

    // 2. Initialize Dashboard Stats
    if (typeof renderDashboardStats === 'function') {
        renderDashboardStats(user.role);
    }

    // 3. Initialize Charts
    const dashTrafficMonthFilter = document.getElementById('dashTrafficMonthFilter');
    if (dashTrafficMonthFilter) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        dashTrafficMonthFilter.value = currentMonth;

        if (typeof renderDashTrafficIntelligence === 'function') {
            renderDashTrafficIntelligence(currentMonth);
        }

        dashTrafficMonthFilter.addEventListener('change', (e) => {
            renderDashTrafficIntelligence(e.target.value);
        });
    }
});
