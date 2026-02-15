const ROLES = {
    ADMIN: 'Admin',
    EMPLOYEE: 'Employee',
    TEAM_LEADER: 'Team Leader',
    MANAGER: 'Manager'
};

function login(name, role, id) {
    const finalId = id || generateId(name);

    // New structure
    localStorage.setItem('currentUser', JSON.stringify({ name, role, id: finalId }));

    // Legacy support
    localStorage.setItem('currentEmployee', name);
    localStorage.setItem('currentRole', role);
    localStorage.setItem('currentID', finalId);

    // Record Login Session for Attendance
    recordSession(name, finalId, role);

    // Determine target dashboard
    let targetDash = 'dashboard.html';
    if (role === 'Manager') targetDash = 'manager-dashboard.html';
    else if (role === 'Team Leader') targetDash = 'tl-dashboard.html';
    else if (role === 'Employee' || role === 'IT Team') targetDash = 'employee-dashboard.html';

    // Ensure Admin always sees dashboard first (Legacy/Shared state)
    if (role === 'Admin') {
        localStorage.setItem('activeDashboardSection', 'dashboard');
    }

    window.location.href = targetDash;
}

function recordSession(name, id, role) {
    const reports = JSON.parse(localStorage.getItem("loginReports") || "[]");

    // Check if there is already an active session (no logout) for this user ID
    // We only create a new one if none is active
    const activeSession = reports.find(r => r.id === id && !r.logout);

    if (!activeSession) {
        reports.push({
            name: name,
            id: id,
            role: role,
            login: new Date().toISOString(),
            logout: null
        });
        localStorage.setItem("loginReports", JSON.stringify(reports));
    }
}

function ensureSessionRecord() {
    const user = getCurrentUser();
    if (user) {
        recordSession(user.name, user.id, user.role);
    }
}

function getLocalISO(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function generateId(name) {
    // Fallback if no ID is provided
    return 'E-' + Math.floor(1000 + Math.random() * 9000);
}

function logout() {
    const name = localStorage.getItem("currentEmployee");
    const id = localStorage.getItem("currentID");

    if (name && id) {
        let reports = JSON.parse(localStorage.getItem("loginReports") || "[]");
        // Update logout time for the most recent active session of this user
        for (let i = reports.length - 1; i >= 0; i--) {
            if (reports[i].name === name && reports[i].id === id && !reports[i].logout) {
                reports[i].logout = new Date().toISOString();
                break;
            }
        }
        localStorage.setItem("loginReports", JSON.stringify(reports));
    }

    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentEmployee');
    localStorage.removeItem('currentRole');
    localStorage.removeItem('currentID');
    window.location.href = 'login.html';
}

function getCurrentUser() {
    let user = localStorage.getItem('currentUser');
    if (user) return JSON.parse(user);

    // Migration for legacy sessions
    const name = localStorage.getItem('currentEmployee');
    const role = localStorage.getItem('currentRole');
    const id = localStorage.getItem('currentID');

    if (name && role && id) {
        const newUser = { name, role, id };
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        return newUser;
    }

    return null;
}

function checkAuth() {
    const user = getCurrentUser();
    if (!user) {
        // If on login page, that's fine, otherwise redirect
        if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = 'login.html';
        }
        return null;
    }
    return user;
}

// Simple permission checker
function hasAccess(page) {
    const user = getCurrentUser();
    if (!user) return false;

    // Disabled role-based restrictions as per user request
    return true;
}

window.Auth = {
    ROLES,
    login,
    logout,
    getCurrentUser,
    checkAuth,
    hasAccess,
    recordSession,
    ensureSessionRecord,
    getLocalISO
};
