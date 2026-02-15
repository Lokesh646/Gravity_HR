/* Team Leader Dashboard Initialization */
document.addEventListener('DOMContentLoaded', () => {
    console.log("Team Leader Dashboard Loaded");

    const user = Auth.getCurrentUser();
    if (!user) return;

    // 1. Initialize Dashboard Stats (Specific for TL if needed)
    if (typeof renderDashboardStats === 'function') {
        renderDashboardStats(user.role);
    }

    // 2. Initialize Charts
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
