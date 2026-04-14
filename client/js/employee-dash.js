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

    // 3. Initialize Work Hours Chart
    const dashTrafficMonthFilter = document.getElementById('trafficChartMonth');
    const dashTrafficYearFilter = document.getElementById('trafficChartYear');

    if (dashTrafficMonthFilter) {
        // Populate Month Dropdown
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        if (dashTrafficMonthFilter.options.length === 0) {
            monthNames.forEach((name, index) => {
                const opt = document.createElement('option');
                opt.value = String(index + 1).padStart(2, '0');
                opt.textContent = name;
                dashTrafficMonthFilter.appendChild(opt);
            });
        }

        // Set to current date by default
        const now = new Date();
        const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
        const currentYear = String(now.getFullYear());

        // Populate year dropdown if empty
        if (dashTrafficYearFilter && dashTrafficYearFilter.options.length === 0) {
            const startYear = now.getFullYear() - 1;
            const endYear = now.getFullYear() + 1;
            for (let y = startYear; y <= endYear; y++) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                dashTrafficYearFilter.appendChild(opt);
            }
        }

        dashTrafficMonthFilter.value = currentMonth;
        if (dashTrafficYearFilter) dashTrafficYearFilter.value = currentYear;

        const updateChart = () => {
            const m = dashTrafficMonthFilter.value;
            const y = dashTrafficYearFilter ? dashTrafficYearFilter.value : currentYear;
            if (typeof renderDashWorkHours === 'function') {
                renderDashWorkHours(`${y}-${m}`);
            }
        };

        updateChart();

        dashTrafficMonthFilter.addEventListener('change', updateChart);
        if (dashTrafficYearFilter) dashTrafficYearFilter.addEventListener('change', updateChart);
    }
});
