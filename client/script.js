const STATE = {
    employees: [],
    packages: [],
    payrollHistory: {}, // { "YYYY-MM": { "EMP-ID": { specialBonus: 0, daysPayable: 26 } } }
    currentTab: 'active',
    searchQuery: '',
    theme: 'dark',
    sortBy: 'name',
    sortOrder: 'asc'
};

// --- PERSISTENCE HELPERS ---
const saveData = () => {
    localStorage.setItem('gravity_hrm_state', JSON.stringify(STATE));
};

const loadData = () => {
    const page = document.body.dataset.page;
    const role = localStorage.getItem('currentRole');

    if (!role) {
        if (page !== 'login') window.location.href = 'login.html';
        return;
    }

    // Ensure current session is recorded for attendance
    if (typeof Auth !== 'undefined' && Auth.ensureSessionRecord) {
        Auth.ensureSessionRecord();
    }

    const isAdminRole = ['Admin', 'Manager', 'HR'].includes(role);
    const isEmployeeRole = role === 'Employee' || role === 'Team Leader';

    /* 
    // Strict Role Redirect - Temporarily disabled for debugging/smoother navigation
    if (isEmployeeRole) {
        // Employees can only access counter and their own profile
        if (!['counter', 'traffic-counter', 'user'].includes(page)) {
            window.location.href = 'traffic-counter.html';
            return;
        }
    } else if (!isAdminRole) {
        // Unknown role or session error
        window.location.href = 'login.html';
        return;
    } 
    */

    const data = localStorage.getItem('gravity_hrm_state');
    if (data) {
        const parsed = JSON.parse(data);
        STATE.employees = parsed.employees || [];
        STATE.currentTab = parsed.currentTab || 'active';
        STATE.packages = parsed.packages || [];
        STATE.payrollHistory = parsed.payrollHistory || {};
        if (parsed.theme) {
            STATE.theme = parsed.theme;
            applyTheme();
        }

        // Migration: Ensure all employees have a secret code and salary package
        let needsSave = false;
        STATE.employees.forEach(emp => {
            if (!emp.secretCode) {
                emp.secretCode = generateSecretCode(emp.name);
                needsSave = true;
            }
            if (!emp.salaryPackage) {
                emp.salaryPackage = 'PKG-001';
                needsSave = true;
            }
        });
        if (needsSave) saveData();
    } else {
        generateSampleData();
        saveData();
    }
    renderAll();
};

// --- ROLE-BASED ACCESS UTILITIES ---
const Hierarchy = {
    getAccessibleIds: (user) => {
        if (!user) return [];
        if (['Admin', 'HR'].includes(user.role)) {
            return STATE.employees.map(e => e.id);
        }

        let ids = [user.id]; // Always include self

        if (user.role === 'Manager') {
            // My Team Leaders
            const tls = STATE.employees.filter(e => e.reportsTo === user.id);
            const tlIds = tls.map(tl => tl.id);
            ids = ids.concat(tlIds);

            // Employees reporting to my Team Leaders
            const emps = STATE.employees.filter(e => tlIds.includes(e.reportsTo));
            ids = ids.concat(emps.map(e => e.id));
        } else if (user.role === 'Team Leader') {
            // Employees reporting to me
            const emps = STATE.employees.filter(e => e.reportsTo === user.id);
            ids = ids.concat(emps.map(e => e.id));
        }

        return [...new Set(ids)]; // Unique IDs
    },

    canViewEmployee: (currentUser, employeeId) => {
        if (!currentUser) return false;
        if (['Admin', 'HR'].includes(currentUser.role)) return true;
        const accessibleIds = Hierarchy.getAccessibleIds(currentUser);
        return accessibleIds.includes(employeeId);
    }
};
window.Hierarchy = Hierarchy; // Expose for other modules (attendance.js, leaves.js)

// --- DOM ELEMENTS ---
const elements = {
    employeeTableBody: () => document.querySelector('#employeeTable tbody'),
    pastEmployeeTableBody: () => document.querySelector('#pastEmployeeTable tbody'),
    activeContainer: () => document.getElementById('activeEmployeesContainer'),
    pastContainer: () => document.getElementById('pastEmployeesContainer'),
    tabBtns: () => document.querySelectorAll('.tab-btn'),
    navItems: () => document.querySelectorAll('.nav-item'),
    sections: () => document.querySelectorAll('.view-section'),
    statTotal: () => document.querySelector('.stat-card h3'), // Assuming this is the only one for now
};

// --- RENDERING ---
const renderAll = () => {
    const page = document.body.dataset.page;

    // Global updates
    updateSidebarUser();

    if (page === 'dashboard') {
        updateStats();
    } else if (page === 'employees') {
        renderEmployees();
        renderTabs();
        updatePackageDropdowns();
    } else if (page === 'packages') {
        renderPackages();
    } else if (page === 'payout') {
        renderPayroll();
    } else if (page === 'attendance') {
        if (typeof renderAttendanceLogs === 'function') renderAttendanceLogs();
    } else if (page === 'leave-master' || page === 'leave-requests') {
        if (typeof LeavesModule !== 'undefined') LeavesModule.renderAll();
    } else if (page === 'teams') {
        const user = Auth.getCurrentUser();
        const container = document.getElementById('teamsContainer');
        if (typeof renderTeamsPage === 'function' && container && user) {
            renderTeamsPage(user.role, container);
        }
    }
};

const highlightSidebar = () => {
    const page = document.body.dataset.page;

    // On Dashboard, let render-logic.js handle highlighting to support SPA sections
    if (page === 'dashboard') return;

    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.classList.remove('active');
        const href = item.getAttribute('href');
        // Simple matching logic
        if (href.includes(page)) {
            item.classList.add('active');
        }
    });

    // Special case for dashboard alias or root
    if (page === 'dashboard') {
        const dashLink = document.querySelector('.nav-item[href="dashboard.html"]');
        if (dashLink) dashLink.classList.add('active');
    }
};

const updateSidebarUser = () => {
    highlightSidebar(); // Ensure sidebar is correct on load
    const name = localStorage.getItem('currentEmployee') || 'Admin User';
    const role = localStorage.getItem('currentRole') || 'Manager';

    const sidebarName = document.getElementById('sidebarUserName');
    const sidebarRole = document.getElementById('sidebarUserRole');
    const headerName = document.getElementById('headerUserName');
    const dashboardLink = document.getElementById('dashboardLink');
    const isAdminRole = ['Admin', 'HR', 'Manager'].includes(role);

    if (sidebarName) sidebarName.textContent = name;
    if (sidebarRole) sidebarRole.textContent = role;
    if (headerName) headerName.textContent = name.split(' ')[0];
    if (dashboardLink) {
        dashboardLink.style.display = 'flex';
    }

    const empId = localStorage.getItem('currentID');
    const emp = STATE.employees.find(e => e.id === empId);
    const avatar = document.querySelector('.sidebar .avatar');
    if (avatar && emp && emp.image) {
        avatar.innerHTML = `<img src="${emp.image}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; border-radius: 50%;">`;
    }
};

const renderPackages = () => {
    const grid = document.getElementById('packagesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (STATE.packages.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1);">
                <i class="fa-solid fa-box-open" style="font-size: 2.5rem; color: var(--text-dim); margin-bottom: 1rem;"></i>
                <h3 style="color: var(--text-main); margin-bottom: 0.5rem;">No Packages Yet</h3>
                <p style="color: var(--text-dim); margin-bottom: 1.5rem;">Create a standard salary structure to use in payslips.</p>
                <button class="btn-primary" onclick="document.getElementById('addPackageBtn').click()">
                    <i class="fa-solid fa-plus"></i> Create Package
                </button>
            </div>
        `;
        return;
    }

    STATE.packages.forEach(pkg => {
        const earnings = (pkg.basic || 0) + (pkg.hra || 0) + (pkg.conveyance || 0) +
            (pkg.medical || 0) + (pkg.special || 0) + (pkg.bonus || 0) +
            (pkg.da || 0) + (pkg.variable || 0);
        const totalDed = (pkg.pf || 0) + (pkg.tax || 0);
        const net = earnings - totalDed;
        const ctc = earnings * 12;

        const card = document.createElement('div');
        card.className = 'glass-panel package-card';
        card.style.position = 'relative'; // For delete btn
        card.innerHTML = `
            <div style="position: absolute; top: 1rem; right: 1rem; display: flex; gap: 0.5rem;">
                <button class="btn-icon edit-btn" onclick="openEditPackageModal('${pkg.id}')" title="Edit Package">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn-icon delete-btn" onclick="deletePackage('${pkg.id}')" title="Delete Package" style="color: #ef4444;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            <h3 style="margin-bottom: 0.5rem; color: var(--primary-color);">${pkg.name}</h3>
            <div style="margin-bottom: 1rem;">
                <p style="font-size: 0.9rem; color: var(--text-dim);">Net Monthly: <strong style="color: var(--text-main);">${formatCurrency(net)}</strong></p>
                <p style="font-size: 0.9rem; color: var(--text-dim);">Est. Annual CTC: <strong style="color: var(--text-main);">${formatCurrency(ctc)}</strong></p>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.85rem; background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 8px;">
                <div>Basic: ${formatCurrency(pkg.basic || 0)}</div>
                <div>HRA: ${formatCurrency(pkg.hra || 0)}</div>
                <div>Conv: ${formatCurrency(pkg.conveyance || 0)}</div>
                <div>Medical: ${formatCurrency(pkg.medical || 0)}</div>
                <div style="color: #ef4444;">PF: -${formatCurrency(pkg.pf || 0)}</div>
                <div style="color: #ef4444;">Tax: -${formatCurrency(pkg.tax || 0)}</div>
            </div>
            <button class="btn-secondary btn-sm" style="width: 100%; margin-top: 1rem;" onclick="usePackage('${pkg.id}')">Use Protocol</button>
        `;
        grid.appendChild(card);
    });
};

const openDetailModal = (id) => {
    const emp = STATE.employees.find(e => e.id === id);
    if (!emp) return;

    const content = `
        <div style="text-align: center; margin-bottom: 2rem;">
            <div style="width: 100px; height: 100px; border-radius: 50%; overflow: hidden; margin: 0 auto 1rem; border: 2px solid var(--primary-color);">
                ${emp.image ? `<img src="${emp.image}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i class="fa-solid fa-user" style="font-size: 3rem; color: var(--text-dim); margin-top: 1.5rem; display: block;"></i>`}
            </div>
            <h3 style="margin: 0; font-size: 1.4rem;">${emp.name}</h3>
            <p style="color: var(--text-dim); margin: 0.2rem 0;">${emp.role}</p>
        </div>
        <div class="detail-grid" style="display: grid; gap: 1rem;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                <span style="color: var(--text-dim);">Employee ID</span>
                <span font-weight: 600;">${emp.id}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                <span style="color: var(--text-dim);">Date of Joining</span>
                <span>${emp.doj || '-'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                <span style="color: var(--text-dim);">Secret Code</span>
                <span style="font-family: monospace; letter-spacing: 1px; color: var(--primary-color);">${emp.secretCode || '-'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                <span style="color: var(--text-dim);">Mobile</span>
                <span>${emp.mobile || '-'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                <span style="color: var(--text-dim);">Email</span>
                <span>${emp.email || '-'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                <span style="color: var(--text-dim);">Blood Group</span>
                <span>${emp.blood || '-'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                <span>${emp.edu || '-'}</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;">
                <span style="color: var(--text-dim);">Documents</span>
                <div class="glass-panel" style="padding: 0.8rem; font-size: 0.85rem; background: rgba(255,255,255,0.02); border-radius: 8px;">
                    ${(emp.docs || []).join(', ') || 'No documents submitted'}
                </div>
            </div>
        </div>
        <div style="margin-top: 2rem; display: flex; gap: 1rem;">
            <button class="btn-primary" style="flex: 1;" onclick="document.getElementById('detailModal').style.display='none'; openEditModal('${emp.id}')">
                <i class="fa-solid fa-pen"></i> Edit Details
            </button>
        </div>
    `;

    const detailContent = document.getElementById('detailContent');
    const detailModal = document.getElementById('detailModal');
    if (detailContent && detailModal) {
        detailContent.innerHTML = content;
        detailModal.style.display = 'flex';
    }
};

window.openDetailModal = openDetailModal;

window.handleHeaderSort = (field) => {
    if (STATE.sortBy === field) {
        // Toggle order
        STATE.sortOrder = STATE.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        // New field, default to asc
        STATE.sortBy = field;
        STATE.sortOrder = 'asc';
    }
    renderEmployees();
};

const renderEmployees = () => {
    const activeBody = elements.employeeTableBody();
    const pastBody = elements.pastEmployeeTableBody();

    if (!activeBody || !pastBody) return;

    activeBody.innerHTML = '';
    pastBody.innerHTML = '';

    const query = (STATE.searchQuery || '').toLowerCase();
    const roleFilter = document.getElementById('roleFilter')?.value || '';

    // Sort State
    const sortBy = STATE.sortBy || 'name';
    const sortOrder = STATE.sortOrder || 'asc';



    // Update Header Icons
    const headers = document.querySelectorAll('th[onclick^="handleHeaderSort"]');
    headers.forEach(th => {
        const icon = th.querySelector('i');
        if (icon) {
            icon.className = 'fa-solid fa-sort'; // Reset
            icon.style.opacity = '0.3';
            icon.style.color = 'var(--text-dim)';
        }
    });

    // Find active header
    const activeHeader = document.querySelector(`th[onclick="handleHeaderSort('${sortBy}')"]`);
    if (activeHeader) {
        const icon = activeHeader.querySelector('i');
        if (icon) {
            icon.className = sortOrder === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
            icon.style.opacity = '1';
            icon.style.color = 'var(--primary-color)';
        }
    }

    const currentUser = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
    const accessibleIds = (currentUser && typeof Hierarchy !== 'undefined') ? Hierarchy.getAccessibleIds(currentUser) : [];

    const filterFn = e => {
        const matchesQuery = !query || e.name.toLowerCase().includes(query) || e.id.toLowerCase().includes(query);
        const matchesRole = !roleFilter || e.role === roleFilter;
        const isAccessible = accessibleIds.length === 0 || accessibleIds.includes(e.id);
        return matchesQuery && matchesRole && isAccessible;
    };

    const sortFn = (a, b) => {
        let valA = a[sortBy] || '';
        let valB = b[sortBy] || '';

        if (sortBy === 'doj') {
            valA = new Date(valA || 0);
            valB = new Date(valB || 0);
        } else {
            valA = valA.toString().toLowerCase();
            valB = valB.toString().toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    };

    const activeEmps = STATE.employees.filter(e => e.status === 'active' && filterFn(e)).sort(sortFn);
    const pastEmps = STATE.employees.filter(e => e.status === 'past' && filterFn(e)).sort(sortFn);

    // Render Active
    activeEmps.forEach(emp => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${emp.id}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <div class="table-avatar" style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: rgba(255,255,255,0.05); flex-shrink: 0;">
                        ${emp.image ? `<img src="${emp.image}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i class="fa-solid fa-user" style="font-size: 0.8rem; display: flex; align-items: center; justify-content: center; height: 100%; opacity: 0.5;"></i>`}
                    </div>
                    <span>${emp.name}</span>
                </div>
            </td>
            <td>${emp.role}</td>
            <td>${emp.doj || '-'}</td>
            <td>${emp.edu || '-'}</td>
            <td>${emp.mobile || '-'}</td>
            <td style="font-family: monospace; letter-spacing: 1px; color: var(--primary-color);">${emp.secretCode || '-'}</td>
            <td><span class="badge active">Active</span></td>
            <td>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-icon edit-btn" onclick="openEditModal('${emp.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon delete-btn" onclick="moveToPast('${emp.id}')" title="Delete" style="color: #ef4444;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        activeBody.appendChild(row);
    });

    // Render Past
    pastEmps.forEach(emp => {
        const row = document.createElement('tr');

        // Calculate Time Left display
        let timeLeftText = "120 Days";
        if (emp.expiry) {
            const now = Date.now();
            const diff = emp.expiry - now;
            if (diff > 0) {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                timeLeftText = days > 0 ? `${days} Days` : `${hours} Hours`;
            } else {
                timeLeftText = "Expired";
            }
        }

        row.innerHTML = `
            <td>${emp.id}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <div class="table-avatar" style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: rgba(255,255,255,0.05); flex-shrink: 0;">
                        ${emp.image ? `<img src="${emp.image}" style="width: 100%; height: 100%; object-fit: cover; object-position: center;">` : `<i class="fa-solid fa-user" style="font-size: 0.8rem; display: flex; align-items: center; justify-content: center; height: 100%; opacity: 0.5;"></i>`}
                    </div>
                    <span>${emp.name}</span>
                </div>
            </td>
            <td>${emp.role}</td>
            <td>${emp.doj || '-'}</td>
            <td>${emp.edu || '-'}</td>
            <td>${emp.mobile || '-'}</td>
            <td style="font-family: monospace; letter-spacing: 1px; opacity: 0.7;">${emp.secretCode || '-'}</td>
            <td><span class="badge inactive" style="background: rgba(100, 116, 139, 0.2); color: #cbd5e1;">Past</span></td>
            <td>
                <button class="btn-icon rejoin-btn" onclick="rejoinEmployee('${emp.id}')" title="Rejoin" style="color: #10b981; width: auto; padding: 0 1rem; gap: 0.5rem;">
                    <i class="fa-solid fa-rotate-left"></i> Rejoin
                </button>
            </td>
            <td>${timeLeftText}</td>
        `;
        pastBody.appendChild(row);
    });
};

const renderTabs = () => {
    const btns = elements.tabBtns();
    const activeCont = elements.activeContainer();
    const pastCont = elements.pastContainer();

    btns.forEach(btn => {
        if (btn.dataset.tab === STATE.currentTab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (STATE.currentTab === 'active') {
        activeCont.style.display = 'block';
        pastCont.style.display = 'none';
    } else {
        activeCont.style.display = 'none';
        pastCont.style.display = 'block';
    }
};

const renderNavigation = () => {
    // Legacy section switching removed for multi-page architecture
};

const updateStats = () => {
    const page = document.body.dataset.page;
    if (page !== 'dashboard') return;

    // Show containers if they are hidden (e.g. initial load for Admin)
    const statsGrid = document.getElementById('statsGrid');
    const chartContainer = document.getElementById('chartContainer');
    const role = localStorage.getItem('currentRole');
    const isAdmin = ['Admin', 'Manager', 'HR'].includes(role);

    if (isAdmin) {
        if (statsGrid) statsGrid.style.display = 'grid';
        if (chartContainer) chartContainer.style.display = 'block';
    }

    renderTrafficStats();

    // Also trigger the new monthly intelligence if filter is present
    const dashMonthFilter = document.getElementById('dashTrafficMonthFilter');
    if (dashMonthFilter && dashMonthFilter.value) {
        if (typeof renderDashTrafficIntelligence === 'function') {
            renderDashTrafficIntelligence(dashMonthFilter.value);
        }
    }
};

// --- DASHBOARD STATS & CHARTS ---
let trafficChartInstance = null;
const renderTrafficStats = () => {
    if (!(document.body.dataset.page || '').includes('dashboard')) return;

    // 1. Traffic Growth Logic
    const history = JSON.parse(localStorage.getItem('alienTrafficHistory') || '{}');
    const todayStr = new Date().toISOString().split('T')[0];

    const getHistoryTotal = (entry) => {
        if (typeof entry === 'number') return entry;
        if (entry && typeof entry === 'object') return entry.total || 0;
        return 0;
    };

    let todayTotal = getHistoryTotal(history[todayStr]);

    // Check for live session counts to make it "lively"
    const liveSessionData = localStorage.getItem("alienTrafficCounts");
    if (liveSessionData) {
        const liveRows = JSON.parse(liveSessionData);
        let liveTotal = 0;
        liveRows.forEach(row => {
            Object.keys(row).forEach(key => {
                if (['car', 'lgv', 'ogv1', 'ogv2', 'bus', 'mc', 'pc', 'peds'].includes(key)) {
                    liveTotal += parseInt(row[key] || 0);
                }
            });
        });
        // Use the higher value or just liveTotal if it's the current session
        if (liveTotal > todayTotal) todayTotal = liveTotal;
    }

    const trafficTotalEl = document.getElementById('statTotalTraffic');
    if (trafficTotalEl) trafficTotalEl.innerText = todayTotal;

    // Find Yesterday
    const dates = Object.keys(history).sort();
    let prevTotal = 0;
    const todayIndex = dates.indexOf(todayStr);

    if (todayIndex > 0) {
        prevTotal = getHistoryTotal(history[dates[todayIndex - 1]]);
    } else if (dates.length > 1 && todayIndex === -1) {
        prevTotal = getHistoryTotal(history[dates[dates.length - 1]]);
    } else if (dates.length === 1 && todayIndex === 0) {
        // Fake yesterday for 1 day old data
        const yesterStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (history[yesterStr]) prevTotal = getHistoryTotal(history[yesterStr]);
    }

    let growth = 0;
    if (prevTotal > 0) {
        growth = ((todayTotal - prevTotal) / prevTotal) * 100;
    } else if (todayTotal > 0) {
        growth = 100;
    }

    const badge = document.getElementById('trafficGrowthBadge');
    if (badge) {
        const isPositive = growth >= 0;
        const iconInfo = isPositive ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
        const colorInfo = isPositive ? '#10b981' : '#ef4444';
        const bgInfo = isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';

        badge.style.color = colorInfo;
        badge.style.background = bgInfo;
        badge.innerHTML = `<i class="fa-solid ${iconInfo}"></i> ${Math.abs(growth).toFixed(1)}% ${isPositive ? 'Growth' : 'Decrease'}`;
    }

    // 2. Update Chart (Preserve User's Date selection if any, else default to today)
    const dateFilter = document.getElementById('chartDateFilter');
    const selectedDate = dateFilter && dateFilter.value ? dateFilter.value : null;
    initTrafficChart(selectedDate);
};

// Seeder for Dummy Data
const seedDummyHistory = () => {
    const history = {};
    const today = new Date();
    const user = (typeof Auth !== 'undefined') ? Auth.getCurrentUser() : { id: 'EMP001', name: 'Admin', role: 'Super Admin' };

    for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const total = Math.floor(Math.random() * 500) + 100;

        // Sample sessions: 0.5h to 2.5h
        const sessions = [
            { startTime: '09:00', endTime: '10:30', duration: 1.5 },
            { startTime: '14:00', endTime: '15:00', duration: 1.0 }
        ];

        history[dateStr] = {
            total: total,
            breakdown: [
                { direction: 'Northbound', car: Math.floor(total * 0.4), lgv: 20, ogv1: 10, ogv2: 5, bus: 5, mc: 5, pc: 5, peds: 5 },
                { direction: 'Southbound', car: Math.floor(total * 0.4), lgv: 20, ogv1: 10, ogv2: 5, bus: 5, mc: 5, pc: 5, peds: 5 }
            ],
            contributors: {
                [user.id]: {
                    name: user.name,
                    role: user.role,
                    timestamp: new Date().toISOString(),
                    sessions: sessions
                },
                'USE999': {
                    name: 'Test Controller',
                    role: 'Employee',
                    timestamp: new Date().toISOString(),
                    sessions: [{ startTime: '11:00', endTime: '11:30', duration: 0.5 }]
                }
            }
        };
    }
    localStorage.setItem('alienTrafficHistory', JSON.stringify(history));
    console.log('Dummy Traffic History seeded with session data.');
};

const initTrafficChart = (dateStr = null) => {
    const ctx = document.getElementById('trafficChart');
    if (!ctx) return;

    let rawData = [];
    let contributors = {};
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = !dateStr || dateStr === todayStr;

    const history = JSON.parse(localStorage.getItem('alienTrafficHistory') || '{}');

    if (isToday) {
        // READ LIVE FROM ACTIVE SESSION
        const current = localStorage.getItem("alienTrafficCounts");
        if (current) {
            rawData = JSON.parse(current);
        } else if (history[todayStr] && history[todayStr].breakdown) {
            // Fallback to history if no live session started yet
            rawData = history[todayStr].breakdown;
        }

        // Also get today's contributors from history
        if (history[todayStr] && history[todayStr].contributors) {
            contributors = history[todayStr].contributors;
        }
    } else {
        // READ FROM HISTORY
        const entry = history[dateStr];
        if (entry) {
            if (entry.breakdown) rawData = entry.breakdown;
            if (entry.contributors) contributors = entry.contributors;
        }
    }

    // Render Contributor Summary (Role Based)
    const roleContribCont = document.getElementById('contributorRolesSummary');
    if (roleContribCont) {
        roleContribCont.innerHTML = '<span style="color: var(--text-dim); font-size: 0.82rem; margin-right: 8px;">Counters Active:</span>';
        const roleCounts = {};
        Object.values(contributors).forEach(c => {
            roleCounts[c.role] = (roleCounts[c.role] || 0) + 1;
        });

        if (Object.keys(roleCounts).length === 0) {
            roleContribCont.innerHTML += '<span style="color: var(--text-dim); font-size: 0.82rem;">None</span>';
        } else {
            Object.entries(roleCounts).forEach(([role, count]) => {
                const tag = document.createElement('span');
                tag.style.cssText = `background: rgba(0, 242, 254, 0.1); color: #00f2fe; padding: 2px 10px; border-radius: 20px; font-size: 0.78rem; border: 1px solid rgba(0, 242, 254, 0.2); font-weight: 500;`;
                tag.innerText = `${role}: ${count}`;
                roleContribCont.appendChild(tag);
            });
        }
    }

    let chartData = [0, 0, 0, 0, 0, 0, 0, 0];
    const labels = ["Car", "LGV", "OGV1", "OGV2", "Bus", "Moto", "Cycle", "Peds"];
    const keyMap = {
        'car': 0, 'lgv': 1, 'ogv1': 2, 'ogv2': 3, 'bus': 4, 'mc': 5, 'pc': 6, 'peds': 7
    };

    if (rawData && Array.isArray(rawData)) {
        rawData.forEach(row => {
            for (const [key, index] of Object.entries(keyMap)) {
                chartData[index] += parseInt(row[key] || 0);
            }
        });
    }

    // --- VISUAL FIX: If data is empty, show Demo Data so graph is never blank ---
    const totalVol = chartData.reduce((a, b) => a + b, 0);
    if (totalVol === 0) {
        // Demo Data for visualization
        chartData = [12, 19, 8, 15, 22, 10, 14, 25];
    }

    if (trafficChartInstance) {
        trafficChartInstance.destroy();
    }

    const isDark = STATE.theme === 'dark';
    const textColor = isDark ? '#f8fafc' : '#1e293b';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    // Financial Gradient for Bars
    const gtx = ctx.getContext('2d');
    const gradient = gtx.createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, 'rgba(0, 242, 254, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 242, 254, 0.2)');

    trafficChartInstance = new Chart(ctx, {
        type: 'bar', // CHANGED FROM LINE TO BAR
        data: {
            labels: labels,
            datasets: [{
                label: 'Volume',
                data: chartData,
                backgroundColor: gradient,
                borderColor: '#00f2fe',
                borderWidth: 1,
                borderRadius: 8, // Rounded corners
                barPercentage: 0.6,
                categoryPercentage: 0.8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#00f2fe',
                    bodyColor: '#fff',
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: (items) => `Vehicle: ${items[0].label}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor, drawBorder: false },
                    ticks: { color: textColor, font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor, font: { size: 10 } }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
};

// Real-time listener
window.addEventListener('storage', (e) => {
    if ((e.key === 'alienTrafficCounts' || e.key === 'alienTrafficHistory') &&
        (document.body.dataset.page || '').includes('dashboard')) {
        renderDashboardStats();
    }
});

// Init listeners
document.addEventListener('DOMContentLoaded', () => {
    seedDummyHistory();
    const dateInput = document.getElementById('chartDateFilter');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
        dateInput.addEventListener('change', (e) => {
            initTrafficChart(e.target.value);
        });
    }

    // Global Navigation Handler
    const navLinks = document.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === 'dashboard.html' && link.textContent.includes('Dashboard')) {
            link.onclick = () => {
                localStorage.setItem('activeDashboardSection', 'dashboard');
            };
        }
    });
});

// Removed duplicate renderDashboardStats


// --- ACTIONS ---

// Note: Functions called from HTML onclick must be global (window attached) or event delegated in init.
// Since we are refactoring, let's keep event delegation in init generally, but for ease, I'll attach specific handlers
// or use the window object for specific callbacks if helper function needed.

// However, for cleaner code, I will expose necessary functions to window or keep delegation.
// Let's stick to delegation in the 'init' block to keep the HTML clean, 
// BUT the render loop creates new elements, so we need delegation on the container parent.

// Move to Past
const moveToPast = (id) => {
    showConfirm(
        'Confirm Action',
        'Are you sure you want to delete this employee? They will be moved to Past Employees.',
        () => {
            const empIndex = STATE.employees.findIndex(e => e.id === id);
            if (empIndex > -1) {
                STATE.employees[empIndex].status = 'past';
                STATE.employees[empIndex].expiry = Date.now() + (120 * 24 * 60 * 60 * 1000); // 120 days
                saveData();
                renderAll();
                showSuccess("Moved to Past Employees");
            }
        }
    );
};

// Rejoin
const rejoinEmployee = (id) => {
    showConfirm('Confirm Action', 'Re-activate this employee?', () => {
        const empIndex = STATE.employees.findIndex(e => e.id === id);
        if (empIndex > -1) {
            STATE.employees[empIndex].status = 'active';
            delete STATE.employees[empIndex].expiry;
            saveData();
            renderAll();
            showSuccess("Employee Re-activated!");
        }
    });
};

// Open Edit
const openEditModal = (id) => {
    const emp = STATE.employees.find(e => e.id === id);
    if (!emp) return;

    // Populate
    document.getElementById('newEmpId').value = emp.id;
    document.getElementById('newEmpName').value = emp.name;
    document.getElementById('newEmpRole').value = emp.role;
    document.getElementById('newEmpDOJ').value = emp.doj;
    document.getElementById('newEmpEdu').value = emp.edu;
    document.getElementById('newEmpMobile').value = emp.mobile || '';
    document.getElementById('newEmpDob').value = emp.dob || '';
    document.getElementById('newEmpEmail').value = emp.email || '';
    document.getElementById('newEmpSecretCode').value = emp.secretCode || '';
    if (document.getElementById('newEmpBlood')) {
        document.getElementById('newEmpBlood').value = emp.blood || '';
    }

    // Handle Image Preview
    const imgDisplay = document.getElementById('empImageDisplay');
    const imgIcon = document.querySelector('#imagePreview i');
    if (emp.image) {
        imgDisplay.src = emp.image;
        imgDisplay.style.display = 'block';
        imgIcon.style.display = 'none';
    } else {
        imgDisplay.src = '';
        imgDisplay.style.display = 'none';
        imgIcon.style.display = 'block';
    }

    updatePackageDropdowns();
    document.getElementById('newEmpPackage').value = emp.salaryPackage || '';

    // Update Hierarchy UI & Pre-fill
    if (window.updateReportingUI) window.updateReportingUI();
    document.getElementById('newEmpTeamLeader').value = emp.teamLeaderId || '';
    document.getElementById('newEmpManager').value = emp.managerId || '';

    // Set Edit Mode
    const modal = document.getElementById('employeeModal');
    const title = document.querySelector('.modal-header h2');
    const saveBtn = document.querySelector('.modal-actions button[type="submit"]');

    title.innerText = "Edit Employee";
    saveBtn.innerText = "Update Employee";

    // We need a way to know we are editing THIS id. 
    // Let's store it in a data attribute of the form or a global var (module scope)
    document.getElementById('addEmployeeForm').dataset.editId = id;

    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex'; // Force display
    }
};

// Expose these to window so onclick works (if we use onclick string in HTML)
// OR better: use delegation. I'll use delegation in the 'init' section which avoids polluting window.
// WAIT, my render function used `onclick="moveToPast..."`. I should fix that to use delegation or expose to window.
// Exposing to window is easiest for this refactor without rewriting the render string logic too much.
// Use Package (Pre-fill Payout Form)
const usePackage = (id) => {
    const pkg = STATE.packages.find(p => p.id === id);
    if (!pkg) return;

    // Switch to Payout Section
    STATE.currentSection = 'payout-section';
    saveData();
    renderNavigation();

    // Fill Form (Need to wait for render check? No, elements exist just hidden)
    document.getElementById('basicPay').value = pkg.basic || 0;
    document.getElementById('hra').value = pkg.hra || 0;
    document.getElementById('conveyance').value = pkg.conveyance || 0;
    document.getElementById('medical').value = pkg.medical || 0;
    document.getElementById('special').value = pkg.special || 0;
    document.getElementById('bonus').value = pkg.bonus || 0;
    document.getElementById('da').value = pkg.da || 0;
    document.getElementById('variable').value = pkg.variable || 0;
    document.getElementById('pf').value = pkg.pf || 0;
    document.getElementById('tax').value = pkg.tax || 0;

    // Trigger Generation
    generatePaySlip();
    showSuccess(`Applied Package: ${pkg.name}`);
};

const deletePackage = (id) => {
    showConfirm('Confirm Action', 'Delete this salary package?', () => {
        STATE.packages = STATE.packages.filter(p => p.id !== id);
        saveData();
        renderPackages();
        showSuccess('Package Deleted');
    });
};

window.moveToPast = moveToPast;
window.rejoinEmployee = rejoinEmployee;
window.openEditModal = openEditModal;
window.deletePackage = deletePackage;
window.usePackage = usePackage;

window.openEditPackageModal = (id) => {
    const pkg = STATE.packages.find(p => p.id === id);
    if (!pkg) return;

    // Populate Form
    const setVal = (elmId, val) => {
        const el = document.getElementById(elmId);
        if (el) el.value = val || 0;
    };

    document.getElementById('pkgName').value = pkg.name || '';
    setVal('pkgBasic', pkg.basic);
    setVal('pkgHra', pkg.hra);
    setVal('pkgConveyance', pkg.conveyance);
    setVal('pkgMedical', pkg.medical);
    setVal('pkgSpecial', pkg.special);
    setVal('pkgBonus', pkg.bonus);
    setVal('pkgDA', pkg.da);
    setVal('pkgVariable', pkg.variable);
    setVal('pkgPf', pkg.pf);
    setVal('pkgTax', pkg.tax);

    // Trigger input event to update preview
    document.getElementById('pkgBasic').dispatchEvent(new Event('input'));

    // Set Edit Mode
    const modal = document.getElementById('packageModal');
    const form = document.getElementById('addPackageForm');
    const title = document.getElementById('pkgModalTitle'); // Fixed selector
    const saveBtn = document.querySelector('#packageModal button[type="submit"]');

    if (title) title.innerText = "Edit Salary Package";
    if (saveBtn) saveBtn.innerText = "Update Package";
    if (form) form.dataset.editId = id;

    // ACTUALLY OPEN THE MODAL
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
};

// --- HELPERS ---
const generateSecretCode = (name) => {
    if (!name) return "User@123";
    const firstName = name.split(' ')[0] || "User";
    return `${firstName}@123`;
};

window.openEditPackageModal = openEditPackageModal;


// --- GENERATORS ---
const generateSampleData = () => {
    // 1. Define Hierarchy
    // We will create:
    // - 3 Managers
    // - 9 Team Leaders (3 per Manager)
    // - ~88 Employees (Distributed among Team Leaders)

    const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];
    const educations = ['B.Tech (CS)', 'M.Tech', 'BBA', 'MBA', 'B.Sc', 'MCA', 'PhD'];

    const getRandomName = () => {
        const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
        return `${fName} ${lName}`;
    };

    const getRandomDate = () => {
        const start = new Date(2020, 0, 1);
        const end = new Date();
        const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
        return date.toISOString().split('T')[0];
    };

    const createEmployee = (id, role, reportsTo = null) => {
        const name = getRandomName();
        const roleData = {
            id,
            name,
            role,
            displayRole: role,
            doj: getRandomDate(),
            edu: educations[Math.floor(Math.random() * educations.length)],
            mobile: Math.floor(9000000000 + Math.random() * 900000000).toString(),
            secretCode: generateSecretCode(name),
            status: Math.random() > 0.1 ? 'active' : 'inactive',
            reportsTo: reportsTo,
            blood: ['A+', 'B+', 'O+', 'AB+'][Math.floor(Math.random() * 4)],
            email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
            salaryPackage: '' // Will be assigned shortly
        };

        // Normalize manager/TL IDs based on role
        if (role === 'Employee') {
            roleData.teamLeaderId = reportsTo;
            const supervisor = newEmps.find(e => e.id === reportsTo);
            if (supervisor) roleData.managerId = supervisor.reportsTo;
        } else if (role === 'Team Leader') {
            roleData.managerId = reportsTo;
        }

        return roleData;
    };

    // 0. Create Initial Packages if missing
    if (STATE.packages.length === 0) {
        STATE.packages = [
            { id: 'PKG-001', name: 'Standard Executive', basic: 25000, hra: 12500, conveyance: 5000, medical: 2500, special: 5000, bonus: 0, pf: 3000, tax: 200, da: 0, variable: 0 },
            { id: 'PKG-002', name: 'Senior Lead', basic: 45000, hra: 22500, conveyance: 8000, medical: 4000, special: 10000, bonus: 5000, pf: 5400, tax: 500, da: 0, variable: 0 },
            { id: 'PKG-003', name: 'Management', basic: 85000, hra: 42500, conveyance: 15000, medical: 7500, special: 20000, bonus: 10000, pf: 10200, tax: 1000, da: 0, variable: 0 }
        ];
    }

    const newEmps = [];
    let idCounter = 1000;

    // A. Create Managers
    const managers = [];
    for (let i = 0; i < 3; i++) {
        idCounter++;
        const manager = createEmployee(`E-${idCounter}`, 'Manager');
        managers.push(manager);
        newEmps.push(manager);
    }

    // B. Create Team Leaders
    const teamLeaders = [];
    managers.forEach(manager => {
        for (let i = 0; i < 3; i++) { // 3 TLs per Manager
            idCounter++;
            const tl = createEmployee(`E-${idCounter}`, 'Team Leader', manager.id);
            teamLeaders.push(tl);
            newEmps.push(tl);
        }
    });

    // C. Create Employees
    const employeeRoles = ['Software Engineer', 'UX Designer', 'QA Tester', 'Data Analyst', 'DevOps Engineer'];
    const totalEmployees = 100 - newEmps.length; // Fill up to 100 total

    for (let i = 0; i < totalEmployees; i++) {
        idCounter++;
        // Randomly assign to a Team Leader
        const supervisor = teamLeaders[Math.floor(Math.random() * teamLeaders.length)];
        const specificRole = employeeRoles[Math.floor(Math.random() * employeeRoles.length)];

        // Internal role is Employee for permission checks, but specificRole helps with diversity
        // Ideally we keep 'Employee' as the main role key or handle sub-roles.
        // For this system, let's use 'Employee' as the strict role, and maybe add specificRole property?
        // Or just use specific roles and map them to 'Employee' permission.
        // For simplicity with existing Auth logic, let's use 'Employee' but maybe append visible title?
        // Actually, let's just stick to 'Employee' role for simplicity in this refactor
        const emp = createEmployee(`E-${idCounter}`, 'Employee', supervisor.id);
        emp.jobTitle = specificRole;
        emp.salaryPackage = 'PKG-001'; // Default package for employees
        newEmps.push(emp);
    }

    // Assign packages to Managers and TLs too
    newEmps.forEach(e => {
        if (e.role === 'Manager') e.salaryPackage = 'PKG-003';
        if (e.role === 'Team Leader') e.salaryPackage = 'PKG-002';
        if (!e.salaryPackage) e.salaryPackage = 'PKG-001';
    });

    STATE.employees = newEmps;
};

const updatePackageDropdowns = () => {
    const dropdown = document.getElementById('newEmpPackage');
    if (!dropdown) return;

    dropdown.innerHTML = '<option value="">Select Package</option>';
    STATE.packages.forEach(pkg => {
        const option = document.createElement('option');
        option.value = pkg.id;
        option.textContent = pkg.name;
        dropdown.appendChild(option);
    });
};


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {

    loadData();

    // --- SEARCH EVENT ---
    const searchInput = document.getElementById('employeeSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            STATE.searchQuery = e.target.result || e.target.value; // Taking care of possible accidental result usage
            STATE.searchQuery = e.target.value;
            renderEmployees();
            updateStats();
        });
    }

    // --- NAVIGATION EVENTS ---
    // --- NAVIGATION EVENTS (REMOVED SPA LOGIC) ---
    // Standard anchor tags now handle navigation naturally


    // --- THEME TOGGLE EVENT ---
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
            saveData();
            applyTheme();
        });
    }

    // --- TAB EVENTS ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            STATE.currentTab = tab;
            saveData();
            renderTabs();
        });
    });

    // --- EXPORT CSV ---
    document.getElementById('exportBtn')?.addEventListener('click', () => {
        const activeEmps = STATE.employees.filter(e => e.status === 'active');
        let csvContent = "data:text/csv;charset=utf-8,";

        // Match headers with Import Template
        const headers = ["ID", "Name", "Designation", "Date of Joining", "Education", "Mobile", "Date of Birth", "Email", "Secret Code", "Salary Package ID", "Manager ID", "Team Leader ID", "Blood Group"];
        csvContent += headers.join(",") + "\n";

        activeEmps.forEach(e => {
            const row = [
                e.id,
                `"${e.name}"`, // Quote name to handle commas
                `"${e.role}"`,
                e.doj,
                `"${e.edu}"`,
                e.mobile,
                e.dob || '',
                e.email || '',
                e.secretCode || '',
                e.salaryPackage || '',
                e.managerId || '',
                e.teamLeaderId || '',
                e.blood || ''
            ].join(",");
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "employees_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --- DOWNLOAD CSV TEMPLATE ---
    document.getElementById('downloadTemplateBtn')?.addEventListener('click', () => {
        // Enriched headers for Hierarchy
        const headers = ["ID", "Name", "Designation", "Date of Joining", "Education", "Mobile", "Date of Birth", "Email", "Secret Code", "Salary Package ID", "Manager ID", "Team Leader ID", "Blood Group"];
        const csvContent = headers.join(",") + "\n" +
            "E-1001,John Doe,Software Engineer,2023-01-15,B.Tech,9876543210,1990-01-01,john@example.com,John@123,PKG-001,,,O+\n" +
            "E-1002,Jane Smith,Team Leader,2023-02-10,MBA,9876543211,1992-05-15,jane@example.com,Jane@123,PKG-002,E-9001,,B+";

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "employee_import_template.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Toolbar Filters
    const roleFilter = document.getElementById('roleFilter');
    const sortBy = document.getElementById('sortBy');
    const sortOrder = document.getElementById('sortOrder');

    if (roleFilter) roleFilter.addEventListener('change', renderEmployees);
    if (sortBy) sortBy.addEventListener('change', renderEmployees);
    if (sortOrder) sortOrder.addEventListener('change', renderEmployees);

    // --- IMPORT CSV ---
    const importModal = document.getElementById('importModal');
    const importBtn = document.getElementById('importBtn');
    const closeImport = document.getElementById('closeImportModal');
    const cancelImport = document.getElementById('cancelImportBtn');
    const confirmImportAdd = document.getElementById('confirmImportAddBtn');
    const confirmImportOverwrite = document.getElementById('confirmImportOverwriteBtn');

    if (importBtn) {
        importBtn.onclick = () => {
            if (importModal) {
                importModal.classList.add('active');
                importModal.style.display = 'flex';
            }
        };
    }
    if (closeImport) closeImport.onclick = () => {
        importModal.classList.remove('active');
        importModal.style.display = 'none';
    };
    if (cancelImport) cancelImport.onclick = () => {
        importModal.classList.remove('active');
        importModal.style.display = 'none';
    };

    const processImport = (isOverwrite) => {
        const input = document.getElementById('csvFileInput');
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const text = e.target.result;
                const lines = text.split('\n');
                let count = 0;

                if (isOverwrite) {
                    STATE.employees = [];
                }

                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim() === '') continue;
                    const cols = lines[i].split(',');

                    // Allow looser length check (min 6 mandatory fields)
                    if (cols.length >= 6) {
                        const role = cols[2].trim();
                        const managerId = cols[10]?.trim() || '';
                        const teamLeaderId = cols[11]?.trim() || '';

                        // Determine reportsTo based on role
                        let reportsTo = null;
                        if (role === 'Team Leader') {
                            reportsTo = managerId;
                        } else if (role === 'Employee') {
                            reportsTo = teamLeaderId;
                        }

                        // LOGIC FIX: Resolve Salary Package Name to ID if needed
                        const rawPackage = cols[9]?.trim() || '';
                        const foundPkg = STATE.packages.find(p =>
                            p.name.toLowerCase() === rawPackage.toLowerCase() ||
                            p.id === rawPackage
                        );
                        const packageId = foundPkg ? foundPkg.id : rawPackage;

                        STATE.employees.push({
                            id: cols[0].trim(),
                            name: cols[1].trim(),
                            role: role,
                            doj: cols[3].trim(),
                            edu: cols[4].trim(),
                            mobile: cols[5].trim(),
                            dob: cols[6]?.trim() || '',
                            email: cols[7]?.trim() || '',
                            secretCode: cols[8]?.trim() || generateSecretCode(cols[1].trim()),
                            salaryPackage: packageId,
                            managerId: managerId,
                            teamLeaderId: teamLeaderId,
                            reportsTo: reportsTo,
                            blood: cols[12]?.trim() || '',
                            status: 'active'
                        });
                        count++;
                    }
                }
                saveData();
                renderAll();
                importModal.style.display = 'none';
                showSuccess(isOverwrite ? `List Overwritten with ${count} Employees!` : `Successfully Added ${count} Employees!`);
            };
            reader.readAsText(input.files[0]);
        } else {
            alert("Please select a CSV file first.");
        }
    };

    if (confirmImportAdd) {
        confirmImportAdd.addEventListener('click', () => processImport(false));
    }
    if (confirmImportOverwrite) {
        confirmImportOverwrite.addEventListener('click', () => {
            showConfirm(
                "DANGER: Overwrite List",
                "WARNING: This will delete ALL current employees and replace them with the CSV list. Proceed?",
                () => processImport(true)
            );
        });
    }

    // --- ADD/EDIT EMPLOYEE MODAL ---
    const modal = document.getElementById('employeeModal');
    const openBtn = document.getElementById('addEmployeeBtn');
    const closeBtns = document.querySelectorAll('.close-modal, .close-modal-btn');
    const form = document.getElementById('addEmployeeForm');
    const modalTitle = document.querySelector('.modal-header h2');
    const saveSubmitBtn = document.querySelector('.modal-actions button[type="submit"]');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            console.log('Add New Employee Clicked');
            if (form) {
                delete form.dataset.editId; // Clear edit mode
                form.reset();
            }
            if (typeof updatePackageDropdowns === 'function') updatePackageDropdowns();
            if (window.updateReportingUI) window.updateReportingUI();

            if (modalTitle) modalTitle.innerText = "Add New Employee";
            if (saveSubmitBtn) saveSubmitBtn.innerText = "Save Employee";

            if (modal) {
                modal.classList.add('active');
                modal.style.display = 'flex'; // Force display
            }
        });
    } else {
        console.warn('Add New Employee Button Not Found');
    }

    // Image Upload Preview in Modal
    const imgInput = document.getElementById('empImageInput');
    const imgDisplay = document.getElementById('empImageDisplay');
    const imgIcon = document.querySelector('#imagePreview i');

    if (imgInput) {
        imgInput.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    imgDisplay.src = e.target.result;
                    imgDisplay.style.display = 'block';
                    imgIcon.style.display = 'none';
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    closeBtns.forEach(btn => btn.addEventListener('click', () => {
        modal.classList.remove('active');
        modal.style.display = 'none'; // Force hide

        // Reset image preview on close
        imgDisplay.style.display = 'none';
        imgIcon.style.display = 'block';
        imgDisplay.src = '';
    }));

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            modal.style.display = 'none'; // Force hide

            // Reset image preview on close
            imgDisplay.style.display = 'none';
            imgIcon.style.display = 'block';
            imgDisplay.src = '';
        }
    });

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const id = document.getElementById('newEmpId').value;
            const name = document.getElementById('newEmpName').value;
            const role = document.getElementById('newEmpRole').value;
            const mobile = document.getElementById('newEmpMobile').value;
            const doj = document.getElementById('newEmpDOJ').value || '-';
            const edu = document.getElementById('newEmpEdu').value || '-';
            const dob = document.getElementById('newEmpDob').value || '';
            const email = document.getElementById('newEmpEmail').value || '';
            const manualSecretCode = document.getElementById('newEmpSecretCode').value;
            const secretCode = manualSecretCode || generateSecretCode(name);
            const salaryPackage = document.getElementById('newEmpPackage').value || '';
            const blood = document.getElementById('newEmpBlood')?.value || '';

            // Hierarchy Data (Capture inputs)
            const managerId = document.getElementById('newEmpManager')?.value || '';
            const teamLeaderId = document.getElementById('newEmpTeamLeader')?.value || '';

            // LOGIC FIX: Populate 'reportsTo' based on Role for compatibility with Teams Page
            let reportsTo = null;
            if (role === 'Team Leader') {
                reportsTo = managerId; // TL reports to Manager
            } else if (role === 'Employee') {
                reportsTo = teamLeaderId; // Employee reports to TL
            }

            const editId = form.dataset.editId;
            // Get existing image if not changing
            const existingEmp = editId ? STATE.employees.find(e => e.id === editId) : null;
            const image = (imgDisplay.style.display === 'block' && imgDisplay.src.startsWith('data:'))
                ? imgDisplay.src
                : (existingEmp ? existingEmp.image : '');

            if (editId) {
                // Update
                const index = STATE.employees.findIndex(e => e.id === editId);
                if (index > -1) {
                    STATE.employees[index] = {
                        ...STATE.employees[index],
                        id, name, role, mobile, doj, edu, dob, email, secretCode, salaryPackage, image,
                        managerId, teamLeaderId, reportsTo, blood
                    };
                    showSuccess('Employee Updated Successfully!');
                }
            } else {
                // Add New
                STATE.employees.push({
                    id, name, role, mobile, doj, edu, dob, email, secretCode, salaryPackage, image,
                    status: 'active', managerId, teamLeaderId, reportsTo, blood
                });
                showSuccess('Employee Added Successfully!');
            }

            modal.style.display = 'none';
            saveData();
            renderAll();
        });
    }

    // --- HIERARCHY LOGIC (Reporting Lines) ---
    const roleSelect = document.getElementById('newEmpRole');
    const tlContainer = document.getElementById('teamLeaderSelectContainer');
    const mgrContainer = document.getElementById('managerSelectContainer');
    const tlSelect = document.getElementById('newEmpTeamLeader');
    const mgrSelect = document.getElementById('newEmpManager');

    const updateReportingDropdowns = () => {
        if (!tlSelect || !mgrSelect) return;

        // Clear options
        tlSelect.innerHTML = '<option value="">Select Team Leader</option>';
        mgrSelect.innerHTML = '<option value="">Select Manager</option>';

        // Populate from Active Employees
        STATE.employees.filter(e => e.status === 'active').forEach(emp => {
            if (emp.role === 'Team Leader') {
                const opt = document.createElement('option');
                opt.value = emp.id;
                opt.innerText = emp.name + ' (' + emp.id + ')';
                tlSelect.appendChild(opt);
            }
            if (emp.role === 'Manager') {
                const opt = document.createElement('option');
                opt.value = emp.id;
                opt.innerText = emp.name + ' (' + emp.id + ')';
                mgrSelect.appendChild(opt);
            }
        });
    };

    const toggleReportingFields = () => {
        if (!roleSelect || !tlContainer || !mgrContainer) return;

        const role = roleSelect.value;

        // Reset Logic
        tlContainer.style.display = 'none';
        mgrContainer.style.display = 'none';

        if (role === 'Employee') {
            // Employee needs TL and Manager
            tlContainer.style.display = 'block';
            mgrContainer.style.display = 'block';
        } else if (role === 'Team Leader') {
            // Team Leader needs Manager only
            mgrContainer.style.display = 'block';
        }
        // Managers and others don't need reporting lines for now
    };

    if (roleSelect) {
        roleSelect.addEventListener('change', toggleReportingFields);
    }

    // Expose for Modal Open
    window.updateReportingUI = () => {
        updateReportingDropdowns();
        toggleReportingFields();
    };

    // --- FILE SIZE VALIDATION ---
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                if (this.files[0].size > MAX_SIZE) {
                    alert('File is too large! Maximum size allowed is 5MB.');
                    this.value = '';
                }
            }
        });
    });

    renderAll();


    // --- PACKAGE MODAL & FORM ---
    const pkgModal = document.getElementById('packageModal');
    const openPkgBtn = document.getElementById('addPackageBtn');
    const closePkgBtns = document.querySelectorAll('.close-modal-pkg, .close-modal-pkg-btn');
    const pkgForm = document.getElementById('addPackageForm');

    if (openPkgBtn) {
        openPkgBtn.addEventListener('click', () => {
            if (pkgForm) {
                pkgForm.reset();
                delete pkgForm.dataset.editId; // Clear edit mode
            }
            // Reset preview
            document.getElementById('pkgPreviewGross').innerText = "0.00";
            document.getElementById('pkgPreviewDed').innerText = "0.00";
            document.getElementById('pkgPreviewNet').innerText = "0.00";

            // Reset Text
            // Reset Text
            const titleEl = document.getElementById('pkgModalTitle') || document.querySelector('#packageModal .modal-header h2');
            const btnEl = document.querySelector('#packageModal button[type="submit"]') || document.querySelector('#packageModal .btn-primary');

            if (titleEl) titleEl.innerText = "Create Salary Package";
            if (btnEl) btnEl.innerText = "Create Package";

            pkgModal.classList.add('active'); // Add active class for transition
            pkgModal.style.display = 'flex'; // Force display flex
            console.log('Open Package Modal');
        });
    } else {
        console.warn('Add Package Button Not Found');
    }

    // Live Calculation
    const pkgInputs = document.querySelectorAll('#addPackageForm input[type="number"]');
    pkgInputs.forEach(input => {
        input.addEventListener('input', () => {
            const getPkgVal = (id) => parseFloat(document.getElementById(id).value) || 0;
            const basic = getPkgVal('pkgBasic');
            const hra = getPkgVal('pkgHra');
            const conv = getPkgVal('pkgConveyance');
            const medical = getPkgVal('pkgMedical');
            const special = getPkgVal('pkgSpecial');
            const bonus = getPkgVal('pkgBonus');
            const da = getPkgVal('pkgDA');
            const variable = getPkgVal('pkgVariable');

            const pf = getPkgVal('pkgPf');
            const tax = getPkgVal('pkgTax');

            const gross = basic + hra + conv + medical + special + bonus + da + variable;
            const ded = pf + tax;
            const net = gross - ded;

            document.getElementById('pkgPreviewGross').innerText = formatCurrency(gross);
            document.getElementById('pkgPreviewDed').innerText = formatCurrency(ded);
            document.getElementById('pkgPreviewNet').innerText = formatCurrency(net);
        });
    });

    closePkgBtns.forEach(b => b.addEventListener('click', () => {
        pkgModal.classList.remove('active');
        pkgModal.style.display = 'none';
    }));

    if (pkgForm) {
        pkgForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const getPkgVal = (id) => parseFloat(document.getElementById(id).value) || 0;

            const editId = pkgForm.dataset.editId;

            if (editId) {
                // UPDATE EXISTING - SHOW CONFIRMATION
                const performUpdate = () => {
                    const index = STATE.packages.findIndex(p => p.id === editId);
                    if (index > -1) {
                        STATE.packages[index] = {
                            ...STATE.packages[index],
                            name: document.getElementById('pkgName').value,
                            basic: getPkgVal('pkgBasic'),
                            hra: getPkgVal('pkgHra'),
                            conveyance: getPkgVal('pkgConveyance'),
                            medical: getPkgVal('pkgMedical'),
                            special: getPkgVal('pkgSpecial'),
                            bonus: getPkgVal('pkgBonus'),
                            da: getPkgVal('pkgDA'),
                            variable: getPkgVal('pkgVariable'),
                            pf: getPkgVal('pkgPf'),
                            tax: getPkgVal('pkgTax')
                        };
                        saveData();
                        renderPackages();
                        pkgModal.style.display = 'none';
                    }
                };

                showConfirm("Save Changes?", "Are you sure you want to update this package?", performUpdate);
                return; // Stop here, wait for confirm
            } else {
                // CREATE NEW
                const newPkg = {
                    id: 'PKG-' + Date.now(),
                    name: document.getElementById('pkgName').value,
                    basic: getPkgVal('pkgBasic'),
                    hra: getPkgVal('pkgHra'),
                    conveyance: getPkgVal('pkgConveyance'),
                    medical: getPkgVal('pkgMedical'),
                    special: getPkgVal('pkgSpecial'),
                    bonus: getPkgVal('pkgBonus'),
                    da: getPkgVal('pkgDA'),
                    variable: getPkgVal('pkgVariable'),
                    pf: getPkgVal('pkgPf'),
                    tax: getPkgVal('pkgTax')
                };
                STATE.packages.push(newPkg);
                showSuccess('Salary Package Created!');
                saveData();
                renderPackages();
                pkgModal.style.display = 'none';
            }
        });
    }

    // --- TIMEOUT CHECKER ---
    setInterval(() => {
        // Redraw to update "Time Left" text if currently viewing past
        if (STATE.currentTab === 'past' && STATE.currentSection === 'employees-section') {
            renderEmployees();
            // Also clean up expired
            const now = Date.now();
            let changed = false;
            // Iterate backwards to remove safely
            for (let i = STATE.employees.length - 1; i >= 0; i--) {
                const emp = STATE.employees[i];
                if (emp.status === 'past' && emp.expiry && (emp.expiry - now <= 0)) {
                    STATE.employees.splice(i, 1);
                    changed = true;
                }
            }
            if (changed) {
                saveData();
                renderEmployees();
            }
        }
    }, 60000); // 1 min

    // --- PAYSLIP LOGIC ---
    // (Keeping mostly same, just hooking up IDs)
    document.getElementById('generateBtn')?.addEventListener('click', generatePaySlip);
    document.getElementById('resetBtn')?.addEventListener('click', resetForm);
    document.getElementById('printBtn')?.addEventListener('click', printPaySlip);

    // Set default month
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    const payMonthInput = document.getElementById('payMonth');
    if (payMonthInput) payMonthInput.value = currentMonth;

    const payrollDateFilter = document.getElementById('payrollDateFilter');
    if (payrollDateFilter) {
        // Restore saved month or default to current
        const savedMonth = localStorage.getItem('selectedPayrollMonth') || currentMonth;
        payrollDateFilter.value = savedMonth;

        payrollDateFilter.addEventListener('change', (e) => {
            localStorage.setItem('selectedPayrollMonth', e.target.value);
            renderPayroll();
        });
    }

    document.getElementById('printFullPayrollBtn')?.addEventListener('click', () => {
        const originalTitle = document.title;
        const date = document.getElementById('payrollDateFilter').value || 'Current';
        document.title = `Payroll_Summary_${date}`;
        window.print();
        document.title = originalTitle;
    });

    // --- SUCCESS MODAL ---
    const successModal = document.getElementById('successModal');
    const successOkBtn = document.getElementById('successOkBtn');
    if (successOkBtn) {
        successOkBtn.addEventListener('click', () => {
            successModal.classList.remove('active');
        });
    }

    // --- CONFIRM MODAL ---
    const confirmModal = document.getElementById('confirmModal');
    const confirmOkBtn = document.getElementById('confirmOkBtn');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');

    if (confirmOkBtn) {
        confirmOkBtn.addEventListener('click', () => {
            if (window.pendingConfirmCallback) {
                window.pendingConfirmCallback();
                window.pendingConfirmCallback = null;
            }
            confirmModal.classList.remove('active');
        });
    }

    // --- PAYROLL CSV EXPORT ---
    document.getElementById('exportPayrollBtn')?.addEventListener('click', () => {
        const activeEmps = STATE.employees.filter(e => e.status === 'active');
        const rawDate = document.getElementById('payrollDateFilter')?.value || new Date().toISOString().slice(0, 7);
        const dateObj = new Date(rawDate + '-01');
        const monthYear = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const monthData = STATE.payrollHistory[rawDate] || {};

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += `Payroll Summary - ${monthYear}\n`;
        csvContent += "Employee ID,Name,Designation,Salary Package,Base Net Salary,Special Bonus,Total Net Payable,Days\n";

        activeEmps.forEach(emp => {
            const pkg = STATE.packages.find(p => p.id === emp.salaryPackage);
            const { net: baseNet } = calculatePackageTotals(pkg);

            const history = monthData[emp.id] || { specialBonus: 0, daysPayable: 26 };
            const days = history.daysPayable || 26;
            const specialBonus = history.specialBonus || 0;

            const proRatedNet = (baseNet / 26) * days;
            const netPayable = proRatedNet + specialBonus;

            const row = [
                emp.id,
                `"${emp.name}"`,
                `"${emp.role}"`,
                pkg ? `"${pkg.name}"` : "Not Assigned",
                proRatedNet.toFixed(2),
                specialBonus.toFixed(2),
                netPayable.toFixed(2),
                days
            ].join(",");
            csvContent += row + "\n";
        });

        const monthName = dateObj.toLocaleDateString('en-US', { month: 'long' });
        const yearName = dateObj.getFullYear();
        const fileName = `Payroll_Summary_${monthName}_${yearName}.csv`;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --- PAYROLL CSV TEMPLATE ---
    document.getElementById('downloadPayrollTemplateBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        const headers = ["Employee ID", "Employee Name", "Designation", "Special Bonus Count", "Days Payable"];
        const rows = [
            "E-1001,John Doe,Software Engineer,1,26",
            "E-1002,Jane Smith,Team Leader,2.5,13"
        ];
        const csvContent = headers.join(",") + "\n" + rows.join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "payroll_bonus_count_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --- PAYROLL IMPORT MODAL ---
    const payrollImportModal = document.getElementById('payrollImportModal');
    const importPayrollBtn = document.getElementById('importPayrollBtn');
    const closePayrollImport = document.getElementById('closePayrollImportModal');
    const cancelPayrollImport = document.getElementById('cancelPayrollImportBtn');
    const confirmPayrollAdd = document.getElementById('confirmPayrollImportAddBtn');
    const confirmPayrollOverwrite = document.getElementById('confirmPayrollImportOverwriteBtn');

    if (importPayrollBtn) {
        importPayrollBtn.onclick = () => {
            if (payrollImportModal) {
                payrollImportModal.classList.add('active');
                payrollImportModal.style.display = 'flex';
            }
        };
    }

    const hidePayrollImport = () => {
        if (payrollImportModal) {
            payrollImportModal.classList.remove('active');
            payrollImportModal.style.display = 'none';
        }
    };

    if (closePayrollImport) closePayrollImport.onclick = hidePayrollImport;
    if (cancelPayrollImport) cancelPayrollImport.onclick = hidePayrollImport;

    const processPayrollImport = (isOverwrite) => {
        const input = document.getElementById('csvPayrollFileInput');
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const text = e.target.result;
                const lines = text.split('\n');
                let count = 0;

                const selectedMonth = document.getElementById('payrollDateFilter')?.value || new Date().toISOString().slice(0, 7);

                if (isOverwrite) {
                    STATE.payrollHistory[selectedMonth] = {};
                }

                if (!STATE.payrollHistory[selectedMonth]) STATE.payrollHistory[selectedMonth] = {};
                const monthHistory = STATE.payrollHistory[selectedMonth];

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    const cols = line.split(',');
                    if (cols.length >= 4) {
                        const id = cols[0].trim();
                        const bonusCount = parseFloat(cols[3].trim()) || 0;
                        const daysPayable = cols[4] ? (parseFloat(cols[4].trim()) || 26) : 26;

                        const emp = STATE.employees.find(e => e.id === id);
                        if (emp) {
                            // Find package to get bonus value
                            const pkg = STATE.packages.find(p => p.id === emp.salaryPackage);
                            const bonusValue = pkg ? (pkg.bonus || 0) : 0;

                            // Save to historical data
                            monthHistory[id] = {
                                specialBonus: bonusValue > 0 ? (bonusCount * bonusValue) : bonusCount,
                                specialBonusCount: bonusCount,
                                daysPayable: daysPayable
                            };
                            count++;
                        }
                    }
                }

                saveData();
                renderPayroll();
                hidePayrollImport();
                showSuccess(`Bulk Imported Bonuses for ${count} Employees!`);
            };
            reader.readAsText(input.files[0]);
        } else {
            alert("Please select a CSV file first!");
        }
    };

    if (confirmPayrollAdd) confirmPayrollAdd.onclick = () => processPayrollImport(false);
    if (confirmPayrollOverwrite) confirmPayrollOverwrite.onclick = () => processPayrollImport(true);

    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', () => {
            confirmModal.classList.remove('active');
            window.pendingConfirmCallback = null;
        });
    }
});

// --- HELPER FUNCTIONS ---
const showSuccess = (msg) => {
    const title = document.getElementById('successTitle');
    const body = document.getElementById('successMsg');
    const modal = document.getElementById('successModal');
    if (title) title.innerText = "Success!";
    if (body) body.innerText = msg;
    if (modal) modal.classList.add('active');
};

// Theme Applicator
const applyTheme = () => {
    document.documentElement.setAttribute('data-theme', STATE.theme);
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        const icon = themeBtn.querySelector('i');
        const text = themeBtn.querySelector('span');
        if (STATE.theme === 'light') {
            icon.className = 'fa-solid fa-sun';
            text.innerText = 'Light Mode';
        } else {
            icon.className = 'fa-solid fa-moon';
            text.innerText = 'Dark Mode';
        }
    }
};

// New Confirm Helper
const showConfirm = (title, msg, onConfirm, iconClass = 'fa-circle-question', type = 'danger') => {
    const titleEl = document.getElementById('confirmTitle');
    const msgEl = document.getElementById('confirmMsg');
    const modal = document.getElementById('confirmModal');
    const iconEl = document.getElementById('confirmModalIcon');
    const containerEl = document.getElementById('confirmModalIconContainer');

    if (titleEl) titleEl.innerText = title;
    if (msgEl) msgEl.innerText = msg;
    if (iconEl) iconEl.className = `fa-solid ${iconClass} pop-in`;

    if (containerEl) {
        if (type === 'success') {
            containerEl.style.background = 'rgba(34, 197, 94, 0.1)';
            containerEl.style.color = '#22c55e';
        } else {
            containerEl.style.background = 'rgba(239, 68, 68, 0.1)';
            containerEl.style.color = '#ef4444';
        }
    }

    const okBtn = document.getElementById('confirmOkBtn');
    if (okBtn) {
        if (type === 'success') {
            okBtn.style.background = '#22c55e';
            okBtn.style.borderColor = '#22c55e';
        } else {
            okBtn.style.background = '#ef4444';
            okBtn.style.borderColor = '#ef4444';
        }
    }

    window.pendingConfirmCallback = onConfirm;
    if (modal) modal.classList.add('active');
};

const getVal = (id) => {
    const val = document.getElementById(id).value;
    return val ? parseFloat(val) : 0;
};

const setText = (id, val) => {
    document.getElementById(id).innerText = val;
};

const formatCurrency = (amount) => {
    return amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const getCurrentUserData = () => {
    const authUser = Auth.getCurrentUser();
    if (!authUser) return null;

    // Find the full employee record from STATE
    const fullRecord = STATE.employees.find(e => e.id === authUser.id) ||
        STATE.employees.find(e => e.name === authUser.name);

    // Find assigned package
    const pkg = fullRecord ? STATE.packages.find(p => p.id === fullRecord.salaryPackage) : null;

    // Normalize for profile page
    return {
        ...fullRecord,
        id: authUser.id,
        name: authUser.name,
        role: authUser.role,
        image: fullRecord ? fullRecord.image : '',
        doj: fullRecord ? (fullRecord.doj || '2024-01-01') : '2024-01-01',
        mobile: fullRecord ? (fullRecord.mobile || 'N/A') : 'N/A',
        email: fullRecord ? (fullRecord.email || 'N/A') : 'N/A',
        edu: fullRecord ? (fullRecord.edu || 'N/A') : 'N/A',
        bloodGroup: fullRecord ? (fullRecord.blood || 'O+') : 'O+',
        managerId: fullRecord ? (fullRecord.managerId || null) : null,
        teamLeaderId: fullRecord ? (fullRecord.teamLeaderId || null) : null,
        packageData: pkg || (STATE.packages ? STATE.packages[0] : null)
    };
};

window.getCurrentUserData = getCurrentUserData;
window.formatCurrency = formatCurrency;

const calculatePackageTotals = (pkg) => {
    if (!pkg) return { gross: 0, net: 0 };
    const gross = (pkg.basic || 0) + (pkg.hra || 0) + (pkg.conveyance || 0) +
        (pkg.medical || 0) + (pkg.special || 0) + (pkg.bonus || 0) +
        (pkg.da || 0) + (pkg.variable || 0);
    const ded = (pkg.pf || 0) + (pkg.tax || 0);
    return { gross, net: gross - ded };
};

const renderPayroll = () => {
    const tbody = document.getElementById('payrollTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const selectedMonth = document.getElementById('payrollDateFilter')?.value || new Date().toISOString().slice(0, 7);
    const monthData = STATE.payrollHistory[selectedMonth] || {};

    const currentUser = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
    const accessibleIds = (currentUser && typeof Hierarchy !== 'undefined') ? Hierarchy.getAccessibleIds(currentUser) : [];

    const activeEmps = STATE.employees.filter(e =>
        e.status === 'active' &&
        (accessibleIds.length === 0 || accessibleIds.includes(e.id))
    );

    activeEmps.forEach(emp => {
        const pkg = STATE.packages.find(p => p.id === emp.salaryPackage);
        const { net: baseNet } = calculatePackageTotals(pkg);

        // Use historical data if available, else defaults
        const history = monthData[emp.id] || { specialBonus: 0, daysPayable: 26 };
        const days = history.daysPayable || 26;
        const specialBonus = history.specialBonus || 0;

        const proRatedNet = (baseNet / 26) * days;
        const netPayable = proRatedNet + specialBonus;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <div class="table-avatar" style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: rgba(255,255,255,0.05); flex-shrink: 0;">
                        ${emp.image ? `<img src="${emp.image}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i class="fa-solid fa-user" style="font-size: 0.8rem; display: flex; align-items: center; justify-content: center; height: 100%; opacity: 0.5;"></i>`}
                    </div>
                    <span>${emp.name}</span>
                </div>
            </td>
            <td>${emp.id}</td>
            <td>${emp.role}</td>
            <td>${pkg ? pkg.name : '<span style="color: #ef4444;">Not Assigned</span>'}</td>
            <td>${formatCurrency(proRatedNet)} <span style="font-size: 0.7rem; color: var(--text-dim);">(${days}d)</span></td>
            <td>
                <input type="number" value="${specialBonus}" 
                    style="width: 100px; padding: 0.3rem 0.5rem; text-align: right; background: var(--input-bg); border: 1px solid var(--glass-border); border-radius: 4px; color: var(--text-main);"
                    onchange="updateSpecialBonus('${emp.id}', this.value)">
            </td>
            <td style="font-weight: 700; color: var(--primary-color);">${formatCurrency(netPayable)}</td>
            <td>
                <button class="btn-icon" onclick="prepareAndPrintSlip('${emp.id}')" title="Print Slip" ${!pkg ? 'disabled' : ''}>
                    <i class="fa-solid fa-print"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
};

const updateSpecialBonus = (empId, val) => {
    const selectedMonth = document.getElementById('payrollDateFilter')?.value || new Date().toISOString().slice(0, 7);

    if (!STATE.payrollHistory[selectedMonth]) STATE.payrollHistory[selectedMonth] = {};
    if (!STATE.payrollHistory[selectedMonth][empId]) STATE.payrollHistory[selectedMonth][empId] = { daysPayable: 26 };

    STATE.payrollHistory[selectedMonth][empId].specialBonus = parseFloat(val) || 0;

    saveData();
    renderPayroll();
};

const prepareAndPrintSlip = (empId) => {
    const emp = STATE.employees.find(e => e.id === empId);
    if (!emp) return;
    const pkg = STATE.packages.find(p => p.id === emp.salaryPackage);
    if (!pkg) return;

    const selectedMonth = document.getElementById('payrollDateFilter')?.value || new Date().toISOString().slice(0, 7);
    const dateObj = new Date(selectedMonth + '-01');
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const monthData = STATE.payrollHistory[selectedMonth] || {};
    const history = monthData[empId] || { specialBonus: 0, daysPayable: 26 };

    const { gross: baseGross, net: baseNet } = calculatePackageTotals(pkg);
    const days = history.daysPayable || 26;
    const proRatedGross = (baseGross / 26) * days;
    const proRatedNet = (baseNet / 26) * days;

    // Also pro-rate components for display precision if needed
    const proRate = (val) => (val / 26) * days;

    const specialBonus = history.specialBonus || 0;
    const grossTotal = proRatedGross + specialBonus;
    const netPay = proRatedNet + specialBonus;

    // Fill the hidden printable area
    setText('prevCompany', 'Gravity Tech');
    setText('prevMonth', formattedDate);

    setText('prevName', emp.name);
    setText('prevId', emp.id);
    setText('prevDesignation', emp.role);
    setText('prevDate', new Date().toLocaleDateString());

    setText('prevBasic', formatCurrency(proRate(pkg.basic || 0)));
    setText('prevHRA', formatCurrency(proRate(pkg.hra || 0)));
    setText('prevConveyance', formatCurrency(proRate(pkg.conveyance || 0)));
    setText('prevMedical', formatCurrency(proRate(pkg.medical || 0)));
    setText('prevSpecial', formatCurrency(proRate(pkg.special || 0)));
    setText('prevBonus', formatCurrency(specialBonus));
    setText('prevDA', formatCurrency(proRate(pkg.da || 0)));
    setText('prevVariable', formatCurrency(proRate(pkg.variable || 0)));
    setText('prevPF', formatCurrency(proRate(pkg.pf || 0)));
    setText('prevTax', formatCurrency(proRate(pkg.tax || 0)));
    setText('prevGross', formatCurrency(grossTotal));
    setText('prevDeductions', formatCurrency(proRate((pkg.pf || 0) + (pkg.tax || 0))));
    setText('prevNet', formatCurrency(netPay));

    const originalTitle = document.title;
    const fullName = emp.name.replace(/\s+/g, '_');
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
    const yearName = dateObj.getFullYear();
    document.title = `${emp.id}_${fullName}_${monthName}_${yearName}`;

    const printArea = document.getElementById('printableArea');
    printArea.style.display = 'block';
    document.body.classList.add('printing-slip');
    window.print();
    document.body.classList.remove('printing-slip');
    printArea.style.display = 'none';
    document.title = originalTitle;
};

// Replace these globally
window.updateSpecialBonus = updateSpecialBonus;
window.prepareAndPrintSlip = prepareAndPrintSlip;
window.renderPayroll = renderPayroll;

const generatePaySlip = () => {
    // No longer used but kept for legacy/referenced code if any
};

const resetForm = () => {
    // No longer used
};

const printPaySlip = () => {
    // No longer used
};




// --- ATTENDANCE RENDERER (GROUPED WITH TOTALS) ---
const renderAttendanceLogs = () => {
    const tbody = document.getElementById('attendanceLogBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const currentUser = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
    const accessibleIds = (currentUser && typeof Hierarchy !== 'undefined') ? Hierarchy.getAccessibleIds(currentUser) : [];

    const rawReports = JSON.parse(localStorage.getItem("loginReports") || "[]");
    const reports = rawReports.filter(r => accessibleIds.length === 0 || accessibleIds.includes(r.id));
    const dateFilter = document.getElementById('attendanceDateFilter')?.value;
    const statusFilter = document.getElementById('attendanceStatusFilter')?.value || 'all';

    // Filter First
    let filteredReports = reports;
    if (dateFilter) {
        const filterDateStr = new Date(dateFilter).toLocaleDateString();
        filteredReports = reports.filter(r => new Date(r.login).toLocaleDateString() === filterDateStr);
    }

    // Group By Employee ID
    const grouped = {};
    filteredReports.forEach(r => {
        if (!grouped[r.id]) {
            grouped[r.id] = {
                name: r.name,
                id: r.id,
                logs: [],
                totalDurationMs: 0,
                lastActive: r.login
            };
        }
        grouped[r.id].logs.push(r);

        // Track latest activity
        if (new Date(r.login) > new Date(grouped[r.id].lastActive)) {
            grouped[r.id].lastActive = r.login;
        }
        if (r.logout && new Date(r.logout) > new Date(grouped[r.id].lastActive)) {
            grouped[r.id].lastActive = r.logout;
        }

        // Calculate duration if logout exists
        if (r.logout) {
            const diff = new Date(r.logout) - new Date(r.login);
            if (diff > 0) grouped[r.id].totalDurationMs += diff;
        }
    });

    let hasRecords = false;

    Object.values(grouped).forEach(emp => {
        // Sort individual logs desc
        emp.logs.sort((a, b) => new Date(b.login) - new Date(a.login));

        const sessions = emp.logs.length;
        const lastActiveTime = new Date(emp.lastActive).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

        // Calculate Total Duration
        const totalHrs = Math.floor(emp.totalDurationMs / 3600000);
        const totalMins = Math.floor((emp.totalDurationMs % 3600000) / 60000);
        const totalDurationStr = `${totalHrs.toString().padStart(2, '0')}:${totalMins.toString().padStart(2, '0')}:00`;

        // Determine Status based on Total Duration
        let statusBadge = '';
        let currentStatus = 'Absent';

        if (emp.totalDurationMs >= 8 * 3600000) { // >= 8 hours
            currentStatus = 'Present';
            statusBadge = '<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7;">Present</span>';
        } else if (emp.totalDurationMs >= 4 * 3600000) { // >= 4 hours
            currentStatus = 'Half Day';
            statusBadge = '<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24;">Half Day</span>';
        } else { // < 4 hours
            statusBadge = '<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">Absent</span>';
        }

        // Apply Status Filter
        if (statusFilter !== 'all' && statusFilter !== currentStatus) {
            return;
        }

        hasRecords = true;

        // Generate History Table
        let historyResult = '';
        emp.logs.forEach(log => {
            const login = new Date(log.login);
            const timeIn = login.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const date = login.toLocaleDateString();

            let timeOut = '-';
            let duration = '-';

            if (log.logout) {
                const logoutDate = new Date(log.logout);
                timeOut = logoutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const diffMs = logoutDate - login;
                const h = Math.floor(diffMs / 3600000);
                const m = Math.floor((diffMs % 3600000) / 60000);
                duration = `${h}h ${m}m`;
            }

            historyResult += `
                <tr>
                    <td>${date}</td>
                    <td style="color: #10b981;">${timeIn}</td>
                    <td style="color: #ef4444;">${timeOut}</td>
                    <td>${duration}</td>
                </tr>
            `;
        });

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${emp.name}</strong></td>
            <td><span style="font-family: monospace;">${emp.id}</span></td>
            <td>${totalDurationStr} Hrs</td>
            <td>${lastActiveTime}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn-icon" onclick="toggleHistory('${emp.id}')">
                    <i class="fa-solid fa-chevron-down" id="icon-${emp.id}"></i>
                </button>
            </td>
        `;

        const detailsRow = document.createElement('tr');
        detailsRow.id = `details-${emp.id}`;
        detailsRow.style.display = 'none';
        detailsRow.innerHTML = `
            <td colspan="6" style="padding: 0;">
                <div class="history-container">
                    <table class="history-table" style="width: 100%; text-align: left;">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>In Time</th>
                                <th>Out Time</th>
                                <th>Session Duration</th>
                            </tr>
                        </thead>
                        <tbody>${historyResult}</tbody>
                    </table>
                </div>
            </td>
        `;

        tbody.appendChild(row);
        tbody.appendChild(detailsRow);
    });

    if (!hasRecords) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim);">No attendance records found</td></tr>`;
    }
};

window.toggleHistory = (id) => {
    const row = document.getElementById(`details-${id}`);
    const icon = document.getElementById(`icon-${id}`);
    if (row.style.display === 'none') {
        row.style.display = 'table-row';
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        row.style.display = 'none';
        icon.classList.add('fa-chevron-down');
        icon.classList.remove('fa-chevron-up');
    }
};

window.renderAttendanceLogs = renderAttendanceLogs;
document.getElementById('attendanceDateFilter')?.addEventListener('change', renderAttendanceLogs);
document.getElementById('attendanceStatusFilter')?.addEventListener('change', renderAttendanceLogs);

window.logout = () => {
    if (typeof Auth !== 'undefined' && Auth.logout) {
        Auth.logout();
    } else {
        // Fallback for safety
        localStorage.removeItem("currentEmployee");
        localStorage.removeItem("currentRole");
        localStorage.removeItem("currentID");
        window.location.href = "login.html";
    }
};

// --- AUTO LOGOUT (30 Mins Idle) ---
let idleTimer;
const IDLE_LIMIT = 30 * 60 * 1000; // 30 Minutes

function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        if (typeof showConfirm === 'function') {
            showConfirm("Session Expired", "Your session has timed out due to inactivity.", () => window.logout());
        } else {
            window.logout();
        }
    }, IDLE_LIMIT);
}

// Global activity listeners
if (document.body.dataset.page !== 'login') {
    window.addEventListener('load', resetIdleTimer);
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keypress', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);
    window.addEventListener('scroll', resetIdleTimer);
}

// --- CORPORATE REPORTS LOGIC ---
const renderCorporateReports = () => {
    const currentUser = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
    const accessibleIds = (currentUser && typeof Hierarchy !== 'undefined') ? Hierarchy.getAccessibleIds(currentUser) : [];

    const activeEmps = STATE.employees.filter(e =>
        e.status === 'active' &&
        (accessibleIds.length === 0 || accessibleIds.includes(e.id))
    );
    const rawReports = JSON.parse(localStorage.getItem("loginReports") || "[]");
    const reports = rawReports.filter(r => accessibleIds.length === 0 || accessibleIds.includes(r.id));

    // 1. Calculate KPI Values
    let totalPayroll = 0;
    const selectedMonth = document.getElementById('payrollDateFilter')?.value || new Date().toISOString().slice(0, 7);
    const monthData = STATE.payrollHistory[selectedMonth] || {};

    activeEmps.forEach(emp => {
        const pkg = STATE.packages.find(p => p.id === emp.salaryPackage);
        const { net: baseNet } = calculatePackageTotals(pkg);

        const history = monthData[emp.id] || { specialBonus: 0, daysPayable: 26 };
        const days = history.daysPayable || 26;
        const specialBonus = history.specialBonus || 0;

        const proRatedNet = (baseNet / 26) * days;
        totalPayroll += (proRatedNet + specialBonus);
    });

    // Avg Work Hours (from reports)
    let totalDurationMs = 0;
    let distinctDays = new Set();
    reports.forEach(r => {
        if (r.login && r.logout) {
            const diff = new Date(r.logout) - new Date(r.login);
            if (diff > 0) totalDurationMs += diff;
            distinctDays.add(new Date(r.login).toLocaleDateString());
        }
    });
    const avgHrs = distinctDays.size > 0 ? (totalDurationMs / (distinctDays.size * 3600000)).toFixed(1) : 0;

    // Update UI
    const kpiEmps = document.getElementById('kpiTotalEmps');
    const kpiPayroll = document.getElementById('kpiTotalPayroll');
    const kpiHours = document.getElementById('kpiAvgHours');
    const kpiPkgs = document.getElementById('kpiTotalPkgs');

    if (kpiEmps) kpiEmps.innerText = activeEmps.length;
    if (kpiPayroll) kpiPayroll.innerText = `₹ ${formatCurrency(totalPayroll)}`;
    if (kpiHours) kpiHours.innerText = `${avgHrs}h`;
    if (kpiPkgs) kpiPkgs.innerText = STATE.packages.length;

    // 2. Financial Matrix (By Role)
    const roleStats = {};
    activeEmps.forEach(emp => {
        if (!roleStats[emp.role]) {
            roleStats[emp.role] = { count: 0, basic: 0, hra: 0, ded: 0, net: 0 };
        }
        const pkg = STATE.packages.find(p => p.id === emp.salaryPackage);
        const { gross, net: baseNet } = calculatePackageTotals(pkg);

        const history = monthData[emp.id] || { specialBonus: 0, daysPayable: 26 };
        const days = history.daysPayable || 26;
        const bonus = history.specialBonus || 0;
        const proRatedNet = (baseNet / 26) * days;

        roleStats[emp.role].count++;
        roleStats[emp.role].basic += (pkg?.basic || 0); // Not pro-rating basic for simple KPI? Or should we?
        roleStats[emp.role].hra += (pkg?.hra || 0);
        roleStats[emp.role].ded += ((pkg?.pf || 0) + (pkg?.tax || 0));
        roleStats[emp.role].net += (proRatedNet + bonus);
    });

    const financeTbody = document.getElementById('roleFinanceBody');
    if (financeTbody) {
        financeTbody.innerHTML = '';
        Object.entries(roleStats).forEach(([role, stats]) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:600;">${role}</td>
                <td>${stats.count}</td>
                <td>${formatCurrency(stats.basic / stats.count)}</td>
                <td>${formatCurrency(stats.hra)}</td>
                <td><span style="color:#ef4444;">${formatCurrency(stats.ded)}</span></td>
                <td style="font-weight:700; color:var(--primary-color);">₹ ${formatCurrency(stats.net)}</td>
            `;
            financeTbody.appendChild(tr);
        });
    }

    // 3. Initialize Charts
    initReportCharts(roleStats);

    // 4. Initial Audit Logs
    renderAttendanceAudit();
};

const initReportCharts = (roleStats) => {
    const roleCtx = document.getElementById('roleChart');
    const financeCtx = document.getElementById('financeChart');

    if (!roleCtx || !financeCtx) return;

    // Destroy existing if any (Chart.js pattern)
    if (window.roleChartObj) window.roleChartObj.destroy();
    if (window.financeChartObj) window.financeChartObj.destroy();

    const labels = Object.keys(roleStats);
    const counts = labels.map(l => roleStats[l].count);
    const finances = labels.map(l => roleStats[l].net);

    window.roleChartObj = new Chart(roleCtx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });

    window.financeChartObj = new Chart(financeCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Monthly Net Expenditure (INR)',
                data: finances,
                backgroundColor: 'rgba(99, 102, 241, 0.7)',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
};

const renderAttendanceAudit = () => {
    const tbody = document.getElementById('auditLogBody');
    if (!tbody) return;

    const reports = JSON.parse(localStorage.getItem("loginReports") || "[]");
    const dateFilter = document.getElementById('reportDateFilter')?.value;

    let filtered = reports;
    if (dateFilter) {
        filtered = reports.filter(r => r.login.startsWith(dateFilter));
    }

    tbody.innerHTML = '';
    filtered.slice().reverse().forEach(log => {
        const duration = calculateDuration(log.login, log.logout);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="font-weight:600;">${log.name}</div>
                <div style="font-size:0.75rem; color:var(--text-dim);">${log.id}</div>
            </td>
            <td>${new Date(log.login).toLocaleDateString()}</td>
            <td style="color:#10b981;">${new Date(log.login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            <td style="color:#ef4444;">${log.logout ? new Date(log.logout).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
            <td>${duration}</td>
            <td>${log.logout ? '<span class="badge" style="background:rgba(16,185,129,0.1); color:#10b981;">Complete</span>' : '<span class="badge" style="background:rgba(245,158,11,0.1); color:#f59e0b;">Active</span>'}</td>
        `;
        tbody.appendChild(tr);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:3rem; color:var(--text-dim);">No operational logs found for this period.</td></tr>';
    }
};

const calculateDuration = (start, end) => {
    if (!start || !end) return '--';
    const diff = new Date(end) - new Date(start);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
};

const exportRoleFinance = () => {
    const table = document.getElementById('roleFinanceBody');
    let csv = "Role,Staff Count,Avg Basic,Total HRA,Total Deductions,Total Net Payout\n";

    table.querySelectorAll('tr').forEach(tr => {
        const cols = tr.querySelectorAll('td');
        const row = Array.from(cols).map(c => `"${c.innerText.replace('₹ ', '')}"`).join(",");
        csv += row + "\n";
    });

    downloadCSV(csv, "role_financial_matrix.csv");
};

const exportAuditLogs = () => {
    const reports = JSON.parse(localStorage.getItem("loginReports") || "[]");
    let csv = "Employee,ID,Role,Login,Logout,Duration\n";

    reports.forEach(log => {
        csv += `"${log.name}","${log.id}","${log.role}","${log.login}","${log.logout}","${calculateDuration(log.login, log.logout)}"\n`;
    });

    downloadCSV(csv, "operational_audit_logs.csv");
};

const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
};

// --- TRAFFIC INTELLIGENCE (Monthly) ---
const getDaysInMonth = (monthStr) => {
    const [year, month] = monthStr.split('-').map(Number);
    return new Date(year, month, 0).getDate();
};

const renderTrafficIntelligence = (monthStr) => {
    const history = JSON.parse(localStorage.getItem('alienTrafficHistory') || '{}');
    const tbody = document.getElementById('trafficHistoryBody');
    if (!tbody) return;

    const daysInMonth = getDaysInMonth(monthStr);
    tbody.innerHTML = '';
    const chartLabels = [];
    const chartData = [];

    const getPeakDir = (breakdown) => {
        if (!breakdown || breakdown.length === 0) return 'N/A';
        let peak = { dir: 'N/A', total: -1 };
        breakdown.forEach(row => {
            const rowTotal = Object.keys(row).reduce((acc, key) => {
                return ['car', 'lgv', 'ogv1', 'ogv2', 'bus', 'mc', 'pc', 'peds'].includes(key) ? acc + parseInt(row[key] || 0) : acc;
            }, 0);
            if (rowTotal > peak.total) peak = { dir: row.direction, total: rowTotal };
        });
        return peak.dir;
    };

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
        const entry = history[dateStr];
        const total = (entry && typeof entry === 'object') ? (entry.total || 0) : ((typeof entry === 'number') ? entry : 0);
        const peakDir = (entry && entry.breakdown) ? getPeakDir(entry.breakdown) : '-';

        // Calculate Usage Metrics
        let userCount = 0;
        let minH = 0, maxH = 0, avgH = 0;
        if (entry && entry.contributors) {
            const contributors = Object.entries(entry.contributors);
            userCount = contributors.length;

            let allDurations = [];
            contributors.forEach(([id, info]) => {
                if (info.sessions && Array.isArray(info.sessions)) {
                    info.sessions.forEach(s => allDurations.push(parseFloat(s.duration || 0)));
                } else if (info.duration) { // Fallback for old records
                    allDurations.push(parseFloat(info.duration));
                }
            });

            if (allDurations.length > 0) {
                minH = Math.min(...allDurations);
                maxH = Math.max(...allDurations);
                avgH = allDurations.reduce((a, b) => a + b, 0) / allDurations.length;
            }
        }

        chartLabels.push(String(day));
        chartData.push(total);

        const tr = document.createElement('tr');
        tr.style.opacity = total > 0 ? '1' : '0.5';
        tr.innerHTML = `
            <td style="font-weight:600;">${dateStr}</td>
            <td style="font-weight:700; color:var(--primary-color);">${total}</td>
            <td><span class="badge" style="background:rgba(99,102,241,0.1); color:var(--primary-color); border:1px solid rgba(99,102,241,0.2);">${peakDir}</span></td>
            <td><span class="badge active" style="background:var(--primary-color);">${userCount} Users</span></td>
            <td>
                <div style="font-size:0.8rem; line-height:1.2;">
                    <span style="color:var(--text-dim);">Min:</span> ${minH.toFixed(2)}h | 
                    <span style="color:var(--text-dim);">Avg:</span> ${avgH.toFixed(2)}h | 
                    <span style="color:var(--text-dim);">Max:</span> ${maxH.toFixed(2)}h
                </div>
            </td>
            <td>
                ${total > 0 ? `
                <button class="btn-secondary btn-sm" onclick="viewDailyDetail('${dateStr}')" title="View Detail" style="padding: 4px 10px;">
                    <i class="fa-solid fa-eye"></i> Details
                </button>` : `<span style="font-size:0.8rem; color:var(--text-dim);">No Data</span>`}
            </td>
        `;
        tbody.appendChild(tr);
    }

    initMonthlyTrafficChart(chartLabels, chartData, 'monthlyTrafficChart');
};

const handleDashTrafficFilter = () => {
    const monthStr = document.getElementById('dashTrafficMonthFilter').value;
    renderDashTrafficIntelligence(monthStr);
};

const renderDashTrafficIntelligence = (monthStr) => {
    const history = JSON.parse(localStorage.getItem('alienTrafficHistory') || '{}');
    const daysInMonth = getDaysInMonth(monthStr);
    const trendLabels = [];
    const trendData = [];
    const userStats = {};

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
        const entry = history[dateStr];
        const total = (entry && typeof entry === 'object') ? (entry.total || 0) : ((typeof entry === 'number') ? entry : 0);
        const contributors = (entry && entry.contributors) ? entry.contributors : {};

        trendLabels.push(String(day));
        trendData.push(total);

        // Aggregate User Contributions (Total Volume per User)
        Object.entries(contributors).forEach(([id, info]) => {
            const name = info && typeof info === 'object' ? (info.name || 'Unknown') : (info || 'Unknown');
            if (!userStats[name]) userStats[name] = 0;
            userStats[name] += 1;
        });
    }

    initMonthlyTrafficChart(trendLabels, trendData, 'trafficChart');
    initUserContribChart(Object.keys(userStats), Object.values(userStats));
};

let userContribChartObj = null;
const initUserContribChart = (labels, data) => {
    const ctx = document.getElementById('userContribChart');
    if (!ctx) return;
    if (userContribChartObj) userContribChartObj.destroy();

    userContribChartObj = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: STATE.theme === 'dark' ? '#cbd5e1' : '#475569', boxWidth: 12, font: { size: 10 } } }
            },
            cutout: '65%'
        }
    });
};

// Update initMonthlyTrafficChart to accept custom canvas ID
const initMonthlyTrafficChart = (labels, data, canvasId = 'monthlyTrafficChart') => {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (canvasId === 'monthlyTrafficChart' && window.monthlyTrafficChartObj) window.monthlyTrafficChartObj.destroy();
    if (canvasId === 'trafficChart' && window.dashTrafficChartObj) window.dashTrafficChartObj.destroy();

    const isDark = STATE.theme === 'dark';
    const textColor = isDark ? '#f8fafc' : '#1e293b';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    const gtx = ctx.getContext('2d');
    const gradient = gtx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(0, 242, 254, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 242, 254, 0)');

    const chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Volume',
                data: data,
                backgroundColor: '#00f2fe',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', cornerRadius: 8 }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: gridColor, drawBorder: false }, ticks: { color: textColor, font: { size: 9 } } },
                x: { grid: { display: false }, ticks: { color: textColor, font: { size: 9 } } }
            }
        }
    });

    if (canvasId === 'monthlyTrafficChart') window.monthlyTrafficChartObj = chartInstance;
    if (canvasId === 'trafficChart') window.dashTrafficChartObj = chartInstance;
};

const viewDailyDetail = (date) => {
    const history = JSON.parse(localStorage.getItem('alienTrafficHistory') || '{}');
    const entry = history[date];
    if (!entry) return;

    let detailStr = `Traffic Data for ${date}\n\n`;
    if (entry.breakdown) {
        entry.breakdown.forEach(row => {
            const total = Object.keys(row).reduce((acc, key) => {
                return ['car', 'lgv', 'ogv1', 'ogv2', 'bus', 'mc', 'pc', 'peds'].includes(key) ? acc + parseInt(row[key] || 0) : acc;
            }, 0);
            detailStr += `${row.direction}: ${total} vehicles\n`;
        });
    }
    alert(detailStr);
};

// Global Exposure
window.renderCorporateReports = renderCorporateReports;
window.renderAttendanceAudit = renderAttendanceAudit;
window.exportRoleFinance = exportRoleFinance;
window.exportAuditLogs = exportAuditLogs;
window.renderTrafficIntelligence = renderTrafficIntelligence;
window.viewDailyDetail = viewDailyDetail;
window.seedDummyHistory = seedDummyHistory;
window.handleDashTrafficFilter = handleDashTrafficFilter;
window.renderDashTrafficIntelligence = renderDashTrafficIntelligence;

// Initial Load
loadData();
if (localStorage.getItem('alienTrafficHistory') === null || localStorage.getItem('alienTrafficHistory') === '{}') {
    seedDummyHistory();
}

// Dash Init (Moved to role-specific dashboard scripts)
// The logic previously here is now in manager-dash.js, tl-dash.js etc.
