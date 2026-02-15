/* Employee Dashboard Initialization */
document.addEventListener('DOMContentLoaded', () => {
    console.log("Employee Dashboard Loaded");

    const user = Auth.getCurrentUser();
    if (!user) return;

    // 1. Initialize Dashboard Stats (Employee View)
    if (typeof renderDashboardStats === 'function') {
        renderDashboardStats(user.role);
    }

    // 2. Default to Traffic Counter section if on dashboard
    const savedSection = localStorage.getItem('activeDashboardSection') || 'traffic';
    if (typeof loadSection === 'function') {
        loadSection(savedSection, user.role);
        if (typeof setActiveNav === 'function') {
            setActiveNav(savedSection);
        }
    }
});
