document.addEventListener('DOMContentLoaded', () => {
    const user = Auth.checkAuth();
    if (!user) return;

    // Update UI with user info
    const sidebarName = document.getElementById('sidebarUserName');
    const sidebarRole = document.getElementById('sidebarUserRole');
    const headerName = document.getElementById('headerUserName');

    if (sidebarName) sidebarName.textContent = user.name;
    if (sidebarRole) sidebarRole.textContent = user.role;
    if (headerName) headerName.textContent = user.name;

    // Simplified header info
    const header = document.querySelector('.section-header');

    // Ensure sidebar is rendered regardless of header presence
    renderSidebar(user.role);
    renderDashboardStats(user.role);
});

function renderSidebar(role) {
    const navLinks = document.querySelector('.nav-links');
    navLinks.innerHTML = ''; // Clear existing

    // Helper to get correct dashboard file per role
    const getDashHref = (role) => {
        if (role === 'Manager') return 'manager-dashboard.html';
        if (role === 'Team Leader') return 'tl-dashboard.html';
        if (role === 'Employee' || role === 'IT Team') return 'employee-dashboard.html';
        return 'dashboard.html'; // Admin, HR, etc.
    };

    const dashHref = getDashHref(role);

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line', href: dashHref, roles: ['Admin', 'Manager', 'HR', 'Team Leader'] },
        { id: 'traffic', label: 'Traffic Counter', icon: 'fa-stopwatch', href: dashHref, roles: ['Employee', 'Team Leader', 'Manager', 'Admin', 'HR'] },
        { id: 'employees', label: 'Employees', icon: 'fa-users', href: 'employees.html', roles: ['Admin', 'HR'] },
        { id: 'packages', label: 'Packages', icon: 'fa-box-open', href: 'packages.html', roles: ['Admin', 'HR'] },
        { id: 'payout', label: 'Payout', icon: 'fa-file-invoice-dollar', href: 'payout.html', roles: ['Admin', 'HR'] },
        { id: 'attendance', label: 'Attendance', icon: 'fa-calendar-check', href: 'attendance.html', roles: ['Admin', 'Manager', 'HR', 'Team Leader', 'Employee'] },
        { id: 'leave-master', label: 'Leave Master', icon: 'fa-id-card', href: 'leave-master.html', roles: ['Admin', 'Manager', 'HR', 'Team Leader', 'Employee'], comingSoon: true },
        { id: 'leave-requests', label: 'Leave Requests', icon: 'fa-envelope-open-text', href: 'leave-requests.html', roles: ['Admin', 'Manager', 'HR', 'Team Leader', 'Employee'], comingSoon: true },
        { id: 'reports', label: 'Reports', icon: 'fa-chart-pie', href: 'reports.html', roles: ['Admin', 'HR'] },
        { id: 'teams', label: 'Teams', icon: 'fa-users-gear', href: 'teams.html', roles: ['Team Leader', 'Manager', 'Admin'] }
    ];

    const dashboardSections = ['dashboard', 'traffic'];

    menuItems.forEach(item => {
        if (!item.roles.includes(role)) return;
        const a = document.createElement('a');
        a.href = item.comingSoon ? '#' : item.href;
        a.className = 'nav-item';
        if (item.comingSoon) a.style.opacity = '0.7';
        a.id = `nav-${item.id}`;

        let content = `<i class="fa-solid ${item.icon}"></i> ${item.label}`;
        if (item.comingSoon) {
            content += ` <i class="fa-solid fa-lock" style="margin-left: auto; font-size: 0.8rem; opacity: 0.5;"></i>`;
        }
        a.innerHTML = content;

        a.onclick = (e) => {
            const page = document.body.dataset.page || '';
            const isDashboardPage = page.includes('dashboard');
            const isTargetDashboardSection = dashboardSections.includes(item.id);

            // 1. If we are ALREADY on dashboard and clicking a dashboard section -> SPA Move
            if (isDashboardPage && isTargetDashboardSection) {
                e.preventDefault();
                setActiveNav(item.id);
                loadSection(item.id, role);
            }
            // 2. If we are clicking a dashboard section link (from anywhere) -> Set Preference & Navigate
            else if (isTargetDashboardSection) {
                // e.g. Clicking "Traffic Counter" from Employees page
                // We let the href='dashboard.html' take effect, but PRE-SET the section
                localStorage.setItem('activeDashboardSection', item.id);
                // Allow default navigation
            }
            // 3. Normal off-page navigation (e.g. Employees) -> Allow default
        };
        navLinks.appendChild(a);
    });

    const page = document.body.dataset.page || '';

    // Load saved section or default to dashboard (Only if on dashboard page)
    if (page.includes('dashboard')) {
        const savedSection = localStorage.getItem('activeDashboardSection') || 'dashboard';
        const initialSection = menuItems.find(item => item.id === savedSection) ? savedSection : 'dashboard';
        setActiveNav(initialSection);
        loadSection(initialSection, role);
    } else if (page === 'teams') {
        // Highlight Teams link manually since it's a separate page now
        setActiveNav('teams');
        const teamsContainer = document.getElementById('teamsContainer');
        if (teamsContainer) renderTeamsPage(role, teamsContainer);
    } else {
        // For other pages (employees, etc.), just highlight based on ID matching if needed
        // The script.js highlightSidebar does a general job, but we can enforce it here too
        const currentItem = menuItems.find(item => item.href.includes(page + '.html'));
        if (currentItem) setActiveNav(currentItem.id);
    }
}

function setActiveNav(id) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById(`nav-${id}`);
    if (activeEl) activeEl.classList.add('active');
}

function loadSection(section, role) {
    // Only relevant for Dashboard SPA sections now
    if (!['dashboard', 'traffic'].includes(section)) return;

    // Save active section for persistence on refresh
    localStorage.setItem('activeDashboardSection', section);

    const mainContent = document.querySelector('.main-content');
    const headerTitle = mainContent.querySelector('h1');
    const statsGrid = document.getElementById('statsGrid');
    const chartSection = document.getElementById('chartContainer');

    // Reset visibility
    if (statsGrid) statsGrid.style.display = 'none';
    if (chartSection) chartSection.style.display = 'none';

    // Remove dynamic container if exists
    const dynamicContainer = document.getElementById('dynamicSectionContainer');
    if (dynamicContainer) dynamicContainer.remove();

    const container = document.createElement('div');
    container.id = 'dynamicSectionContainer';
    // Append after header if possible, or just append to main
    const header = mainContent.querySelector('header');
    if (header) {
        header.insertAdjacentElement('afterend', container);
    } else {
        mainContent.appendChild(container);
    }


    if (section === 'dashboard') {
        if (headerTitle) headerTitle.textContent = 'Dashboard';
        if (statsGrid) statsGrid.style.display = 'grid';
        if (chartSection) chartSection.style.display = 'block';
        renderDashboardStats(role);
    } else if (section === 'traffic') {
        const user = Auth.getCurrentUser();
        if (headerTitle) headerTitle.textContent = 'Traffic Counter';
        container.innerHTML = `
            <div class="glass-panel" style="margin-top: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0;">Traffic Data</h3>
                    <div id="employee-info" class="info-bar" style="font-size: 0.9rem; color: var(--text-dim); display: flex; gap: 15px;">
                        <span id="employeeLabel">Name: ${user.name}</span>
                        <span id="employeeIdLabel"> | ID: ${user.id || 'N/A'}</span>
                        <span id="roleLabel"> | Role: ${user.role}</span>
                    </div>
                </div>

                <div class="table-container">
                    <table id="counter-table" class="data-table" style="text-align: center;">
                        <thead>
                            <tr>
                                <th>Direction</th>
                                <th>Car</th>
                                <th>LGV</th>
                                <th>OGV1</th>
                                <th>OGV2</th>
                                <th>Bus</th>
                                <th>MC</th>
                                <th>PC</th>
                                <th>Peds</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${['Bear Left', 'Left', 'Thru', 'Right', 'Bear Right', 'U-turn'].map(dir => `
                                <tr>
                                    <th>${dir}</th>
                                    <td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div id="controls" class="controls-container" style="margin-top: 20px; display: flex; justify-content: center; gap: 20px;">
                    <button id="reset" class="btn-secondary">
                        <i class="fa-solid fa-rotate"></i> Reset
                    </button>
                    <button id="save" class="btn-primary">
                        <i class="fa-solid fa-floppy-disk"></i> Save
                    </button>
                </div>
            </div>
        `;
        // Check if traffic-counter.js is loaded and initialize it
        if (window.initTrafficCounter) {
            window.initTrafficCounter();
        }
    }
}

function renderDashboardStats(role) {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;

    // Optimization: Skip rendering if dashboard is hidden or on another section
    const activeSection = localStorage.getItem('activeDashboardSection');
    if (activeSection && activeSection !== 'dashboard') return;
    if (statsGrid.style.display === 'none') return;

    statsGrid.innerHTML = '';

    // 1. Get stats from dynamic state
    const currentUser = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
    const accessibleIds = (currentUser && typeof Hierarchy !== 'undefined') ? Hierarchy.getAccessibleIds(currentUser) : [];

    const activeEmps = (typeof STATE !== 'undefined' && STATE.employees) ? STATE.employees.filter(e =>
        e.status === 'active' &&
        (accessibleIds.length === 0 || accessibleIds.includes(e.id))
    ) : [];

    // 2. Add Total Employees Card
    addStatCard(statsGrid, 'Total Employees', activeEmps.length, 'fa-users', 'var(--primary-color)');

    // 2.5 Add Total Traffic Card
    addStatCard(statsGrid, 'Total Traffic', '0', 'fa-car-side', '#3973ff', null, 'statTotalTraffic');

    // 3. Add Role-based breakdown
    const roleCounts = activeEmps.reduce((acc, emp) => {
        const r = emp.role || 'Unassigned';
        acc[r] = (acc[r] || 0) + 1;
        return acc;
    }, {});

    const colors = ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];
    Object.entries(roleCounts).forEach(([roleName, count], index) => {
        const color = colors[index % colors.length];
        addStatCard(statsGrid, `${roleName}s`, count, 'fa-id-badge', color);
    });

    // 4. Quick Access Modules
    const isAdminOrHR = ['Admin', 'HR'].includes(role);

    if (isAdminOrHR) {
        addStatCard(statsGrid, 'Payroll Payout', 'View', 'fa-file-invoice-dollar', '#f59e0b', 'payout.html');
    }

    addStatCard(statsGrid, 'Attendance Logs', 'View', 'fa-calendar-check', '#ec4899', 'attendance.html');

    if (isAdminOrHR) {
        addStatCard(statsGrid, 'Leave Requests', 'Manage', 'fa-envelope-open-text', '#8b5cf6', 'leave-requests.html');
        addStatCard(statsGrid, 'Reports', 'Generate', 'fa-chart-pie', '#06b6d4', 'reports.html');
    }

    // 5. Update Traffic Stats if script.js is loaded
    if (typeof renderTrafficStats === 'function') {
        renderTrafficStats();
    }
}

function addStatCard(container, title, value, icon, color, href = null, valueId = null) {
    const card = document.createElement('div');
    card.className = 'stat-card glass-panel';
    if (href) {
        card.style.cursor = 'pointer';
        card.onclick = () => window.location.href = href;
    }
    card.style.cssText += `display: flex; align-items: center; gap: 1.5rem; padding: 2rem; border-left: 5px solid ${color};`;
    card.innerHTML = `
        <div class="icon-box" style="width: 50px; height: 50px; font-size: 1.5rem; background: ${color}22; color: ${color}; display: flex; align-items: center; justify-content: center; border-radius: 12px;">
            <i class="fa-solid ${icon}"></i>
        </div>
        <div class="stat-info">
            <h3 style="font-size: 0.9rem; color: var(--text-dim); margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.5px;">${title}</h3>
            <p class="stat-number" ${valueId ? `id="${valueId}"` : ''} style="font-size: 2.2rem; font-weight: 700; line-height: 1;">${value}</p>
        </div>
    `;
    container.appendChild(card);
}

// Make toggleAccordion global so it works with inline onclick attributes
window.toggleAccordion = function (header) {
    const item = header.closest('.accordion-item');
    if (!item) return;

    const isOpening = !item.classList.contains('open');

    if (isOpening) {
        // Find siblings and close them
        const container = item.parentElement;
        const siblings = container.querySelectorAll(':scope > .accordion-item.open');
        siblings.forEach(sibling => sibling.classList.remove('open'));

        item.classList.add('open');
    } else {
        item.classList.remove('open');
    }
};

function renderTeamsPage(role, container) {
    const user = Auth.getCurrentUser();
    console.log('Rendering Teams Page', { user });

    // 1. Get All Employees from STATE (if available) or fallback
    let allEmployees = [];
    if (typeof STATE !== 'undefined' && STATE.employees) {
        allEmployees = STATE.employees;
    } else {
        // Fallback for independent testing or if STATE isn't ready
        console.warn('STATE.employees not found, using DashboardData fallback');
        if (window.DashboardData && window.DashboardData.managerData) {
            // Render using old static data if STATE is missing
            renderStaticTeams(container);
            return;
        }
    }

    if (allEmployees.length === 0) {
        container.innerHTML = `<div style="padding: 2rem; text-align: center;">No employee data available.</div>`;
        return;
    }

    // 2. Build Hierarchy Tree
    let hierarchy = buildHierarchy(allEmployees);

    // 2.5 Role-Based Filtering
    if (user.role === 'Manager') {
        hierarchy = hierarchy.filter(m => m.id === user.id);
    } else if (user.role === 'Team Leader') {
        hierarchy = hierarchy.map(m => {
            const myTLs = m.teamLeaders.filter(tl => tl.id === user.id);
            return { ...m, teamLeaders: myTLs };
        }).filter(m => m.teamLeaders.length > 0);
    } else if (!['Admin', 'HR'].includes(user.role)) {
        hierarchy = [];
    }

    // 3. Render
    container.innerHTML = `
        <div class="glass-panel" style="padding: 1.5rem;">
            <header style="margin-bottom: 2rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 1rem;">
                <h2 style="margin:0;">Organization Hierarchy</h2>
                <p style="color:var(--text-dim); margin: 0.5rem 0 0 0;">Click to expand Managers and Team Leaders</p>
            </header>
            
            <div class="accordion" id="teamsAccordion">
                ${hierarchy.map(manager => `
                    <div class="accordion-item glass-panel" style="margin-bottom: 1.5rem; overflow: hidden; border: 1px solid var(--glass-border);">
                        
                        <!-- Level 1: Manager -->
                        <div class="accordion-header" style="padding: 1.25rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: rgba(59, 130, 246, 0.08);" onclick="toggleAccordion(this)">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <div class="icon-circle" style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary-color); display: flex; align-items: center; justify-content: center; color: white;">
                                    <i class="fa-solid fa-user-tie"></i>
                                </div>
                                <div>
                                    <div style="font-weight: 700; font-size: 1.1rem;">${manager.name}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-dim);">${manager.role} | ID: ${manager.id}</div>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <span class="badge" style="background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2);">${manager.teamLeaders.length} Team Leaders</span>
                                <i class="fa-solid fa-chevron-down transition-icon" style="color: var(--text-dim);"></i>
                            </div>
                        </div>
 
                        <!-- Level 1 Content: List of Team Leaders -->
                        <div class="accordion-content">
                            <div class="nested-level-1">
                                ${manager.teamLeaders.map(leader => `
                                    <div class="accordion-item" style="margin-top: 1rem; border: 1px solid var(--glass-border); border-radius: 12px; overflow: hidden; background: rgba(255,255,255,0.02);">
                                        
                                        <!-- Level 2: Team Leader -->
                                        <div class="accordion-header" style="padding: 1rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: rgba(168, 85, 247, 0.05);" onclick="toggleAccordion(this)">
                                            <div style="display: flex; align-items: center; gap: 0.8rem;">
                                                <div class="icon-circle" style="width: 32px; height: 32px; border-radius: 50%; background: #a855f7; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.8rem;">
                                                    <i class="fa-solid fa-user-group"></i>
                                                </div>
                                                <div>
                                                    <div style="font-weight: 600;">${leader.name}</div>
                                                    <div style="font-size: 0.75rem; color: var(--text-dim);">${leader.role}</div>
                                                </div>
                                            </div>
                                            <div style="display: flex; align-items: center; gap: 1rem;">
                                                <span class="badge" style="background: rgba(168, 85, 247, 0.1); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.2);">${leader.team.length} Members</span>
                                                <i class="fa-solid fa-chevron-down transition-icon" style="font-size: 0.8rem; color: var(--text-dim);"></i>
                                            </div>
                                        </div>
 
                                        <!-- Level 2 Content: List of Members -->
                                        <div class="accordion-content">
                                            <div class="nested-level-2" style="padding-top: 0.5rem; padding-bottom: 0.5rem;">
                                                <div style="background: rgba(255,255,255,0.01); border-radius: 8px; margin-right: 1rem;">
                                                    <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                                                        <thead>
                                                            <tr style="background: rgba(255,255,255,0.03);">
                                                                <th style="padding: 0.75rem;">Employee Name</th>
                                                                <th style="padding: 0.75rem;">Job Title</th>
                                                                <th style="padding: 0.75rem; text-align: right;">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            ${leader.team.map(member => `
                                                                <tr>
                                                                    <td style="padding: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                                        <div style="display: flex; align-items: center; gap: 0.6rem;">
                                                                            <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: var(--text-dim);">
                                                                                <i class="fa-solid fa-user"></i>
                                                                            </div>
                                                                            ${member.name}
                                                                        </div>
                                                                    </td>
                                                                    <td style="padding: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--text-dim);">${member.jobTitle || 'Employee'}</td>
                                                                    <td style="padding: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">
                                                                        <span class="badge ${member.status}" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">${member.status}</span>
                                                                    </td>
                                                                </tr>
                                                            `).join('')}
                                                            ${leader.team.length === 0 ? '<tr><td colspan="3" style="text-align: center; padding: 2rem; color: var(--text-dim); font-style: italic;">No team members assigned</td></tr>' : ''}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                                ${manager.teamLeaders.length === 0 ? '<div style="padding: 2rem; text-align: center; color: var(--text-dim); font-style: italic;">No Team Leaders assigned to this Manager</div>' : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
                ${hierarchy.length === 0 ? `
                    <div style="text-align: center; padding: 4rem; opacity: 0.5;">
                        <i class="fa-solid fa-sitemap" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <p>No team structure found in the current environment.</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function buildHierarchy(employees) {
    const managers = employees.filter(e => e.role === 'Manager');
    const teamLeaders = employees.filter(e => e.role === 'Team Leader');
    const regularEmployees = employees.filter(e => e.role === 'Employee');

    // 1. Map Assigned Team Leaders to Managers
    const hierarchy = managers.map(manager => {
        const myTLs = teamLeaders.filter(tl => tl.reportsTo === manager.id);
        const mappedTLs = myTLs.map(tl => {
            const myTeam = regularEmployees.filter(emp => emp.reportsTo === tl.id);
            return { ...tl, team: myTeam };
        });
        return { ...manager, teamLeaders: mappedTLs };
    });

    // 2. Capture Unassigned Team Leaders
    // Any TL who is not in the 'hierarchy' above needs to be shown
    const assignedTLIds = new Set(hierarchy.flatMap(m => m.teamLeaders.map(tl => tl.id)));
    const unassignedTLs = teamLeaders.filter(tl => !assignedTLIds.has(tl.id));

    if (unassignedTLs.length > 0) {
        hierarchy.push({
            id: 'unassigned-manager',
            name: 'Unassigned Team Leaders',
            role: 'System Group',
            teamLeaders: unassignedTLs.map(tl => {
                const myTeam = regularEmployees.filter(emp => emp.reportsTo === tl.id);
                return { ...tl, team: myTeam };
            })
        });
    }

    // 3. Capture Unassigned Employees (Direct reports to Managers or Orphaned)
    // Currently, Employees report to TLs. If an Employee reports to a Manager directly, they won't show in the standard tree above.
    // Also if reportsTo is null.

    // Let's find all employees that have been 'claimed' by the logic above
    const claimedEmployeeIds = new Set();

    // From Managers -> TLs -> Employees
    hierarchy.forEach(m => {
        m.teamLeaders.forEach(tl => {
            tl.team.forEach(e => claimedEmployeeIds.add(e.id));
        });
    });

    const unassignedEmps = regularEmployees.filter(e => !claimedEmployeeIds.has(e.id));

    if (unassignedEmps.length > 0) {
        // Group them under a dummy "Unassigned" Manager -> "Direct Reports" TL
        let systemManager = hierarchy.find(m => m.id === 'unassigned-manager');
        if (!systemManager) {
            systemManager = {
                id: 'unassigned-manager',
                name: 'Unassigned Staff',
                role: 'System Group',
                teamLeaders: []
            };
            hierarchy.push(systemManager);
        }

        systemManager.teamLeaders.push({
            id: 'unassigned-tl',
            name: 'Direct Reports / Unassigned',
            role: 'System Group',
            team: unassignedEmps
        });
    }

    return hierarchy;
}

// Fallback for static data
function renderStaticTeams(container) {
    const { managerData } = window.DashboardData;
    container.innerHTML = `
        <div class="glass-panel" style="padding: 1.5rem;">
            <h3 style="margin-bottom: 1.5rem;">All Teams (Static Data)</h3>
            <div class="accordion" id="teamsAccordion">
                ${managerData.map(manager => `
                    <div class="accordion-item glass-panel" style="margin-bottom: 1rem; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                        <div class="accordion-header" style="padding: 1rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: rgba(59, 130, 246, 0.1);" onclick="toggleAccordion(this)">
                            <div><strong>${manager.name}</strong> (Manager)</div>
                        </div>
                        <div class="accordion-content" style="display: none; padding: 1rem;">
                            (Checking static data...)
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
}
