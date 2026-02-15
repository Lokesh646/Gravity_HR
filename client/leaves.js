// --- LEAVE MANAGEMENT MODULE ---
const LeavesModule = {
    state: {
        currentTab: 'pending' // 'pending' | 'history'
    },

    init() {
        console.log("Leaves Module Initialized");
        this.setupEventListeners();
        this.renderLeaves();
    },

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#applyLeaveBtn')) this.openLeaveModal();
            if (e.target.closest('.close-modal-leave') || e.target.closest('.close-modal-leave-btn')) this.closeLeaveModal();

            // Tab switching
            const leaveTabBtn = e.target.closest('[data-leave-tab]');
            if (leaveTabBtn) {
                this.state.currentTab = leaveTabBtn.dataset.leaveTab;
                document.querySelectorAll('[data-leave-tab]').forEach(btn => btn.classList.remove('active'));
                leaveTabBtn.classList.add('active');
                this.renderLeaves();
            }
        });

        const form = document.getElementById('applyLeaveForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLeaveSubmit();
            });
        }

        // Search
        document.getElementById('empLeaveSearch')?.addEventListener('input', () => this.renderLeaves());
    },


    openLeaveModal() {
        const modal = document.getElementById('leaveModal');
        const select = document.getElementById('leaveEmpId');

        if (select) {
            select.innerHTML = '<option value="">Select Employee</option>';
            STATE.employees.filter(e => e.status === 'active').forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.id;
                opt.textContent = `${emp.name} (${emp.id})`;
                select.appendChild(opt);
            });
        }

        modal.classList.add('active');
    },

    closeLeaveModal() {
        document.getElementById('leaveModal').classList.remove('active');
    },

    handleLeaveSubmit() {
        const empId = document.getElementById('leaveEmpId').value;
        const type = document.getElementById('leaveType').value;
        const start = document.getElementById('leaveStart').value;
        const end = document.getElementById('leaveEnd').value;
        const reason = document.getElementById('leaveReason').value;

        if (!STATE.leaves) STATE.leaves = [];

        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (diffDays <= 0 || isNaN(diffDays)) {
            showSuccess("Please select valid dates.");
            return;
        }

        const request = {
            id: 'LV-' + Date.now(),
            empId,
            type,
            start,
            end,
            days: diffDays,
            reason,
            status: 'Pending',
            requestedAt: new Date().toISOString()
        };

        STATE.leaves.unshift(request);
        saveData();
        this.renderLeaves();
        this.closeLeaveModal();
        showSuccess(`Applied for ${diffDays} day(s) ${type}!`);
    },

    approveLeave(id) {
        const index = STATE.leaves.findIndex(l => l.id === id);
        if (index > -1) {
            STATE.leaves[index].status = 'Approved';
            saveData();
            this.renderLeaves();
            showSuccess('Leave Approved!');
        }
    },

    rejectLeave(id) {
        const index = STATE.leaves.findIndex(l => l.id === id);
        if (index > -1) {
            STATE.leaves[index].status = 'Rejected';
            saveData();
            this.renderLeaves();
            showSuccess('Leave Rejected');
        }
    },

    renderAll() {
        this.renderLeaves();
    },

    renderLeaves() {
        if (!STATE.leaves) STATE.leaves = [];
        if (!STATE.employees) STATE.employees = [];

        const currentUser = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
        const accessibleIds = (currentUser && typeof Hierarchy !== 'undefined') ? Hierarchy.getAccessibleIds(currentUser) : [];

        // 1. Render Employee Leave Master Table
        const masterBody = document.getElementById('empLeaveMasterBody');
        const searchQuery = document.getElementById('empLeaveSearch')?.value.toLowerCase() || '';

        if (masterBody) {
            masterBody.innerHTML = '';
            STATE.employees.filter(emp =>
                emp.status === 'active' &&
                (accessibleIds.length === 0 || accessibleIds.includes(emp.id)) &&
                (emp.name.toLowerCase().includes(searchQuery) || emp.id.toLowerCase().includes(searchQuery))
            ).forEach(emp => {
                const balances = this.getEmployeeBalances(emp);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-main);">${emp.id}</span></td>
                    <td style="font-weight: 600; color: var(--primary-color);">${emp.name}</td>
                    <td style="font-size: 0.85rem; opacity: 0.8;">${emp.role || '-'}</td>
                    <td style="font-size: 0.85rem; opacity: 0.8;">${emp.doj || '-'}</td>
                    <td style="font-size: 0.85rem;">${balances.tenureMonths} months</td>
                    <td style="color: #10b981; font-weight: 600;">${balances.earnedPaid.toFixed(2)}</td>
                    <td style="color: #3b82f6; font-weight: 600;">${balances.earnedSick}</td>
                    <td style="color: #ef4444; font-weight: 600;">${balances.taken}.00</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-weight: 800; color: var(--text-main); font-size: 1rem;">${balances.totalRemaining.toFixed(2)}</span>
                            <span style="font-size: 0.7rem; color: var(--text-dim);">days left</span>
                        </div>
                    </td>
                `;
                masterBody.appendChild(row);
            });
        }

        // 2. Render List of applications (based on tab)
        const listContainer = document.getElementById('leavesList');
        if (!listContainer) return;

        const filteredLeaves = (STATE.leaves || []).filter(l => {
            if (accessibleIds.length > 0 && !accessibleIds.includes(l.empId)) return false;
            if (this.state.currentTab === 'pending') return l.status === 'Pending';
            return l.status !== 'Pending'; // Approved or Rejected
        });

        if (filteredLeaves.length === 0) {
            listContainer.innerHTML = `<p style="text-align: center; color: var(--text-dim); padding: 2rem;">No ${this.state.currentTab} applications found.</p>`;
            return;
        }

        listContainer.innerHTML = '';
        filteredLeaves.forEach(l => {
            const emp = STATE.employees.find(e => e.id === l.empId) || { name: 'Unknown' };
            const item = document.createElement('div');
            item.className = 'leave-request-item';

            const isPending = l.status === 'Pending';

            item.innerHTML = `
                <div class="leave-info">
                    <h4>${emp.name} - ${l.type} (${l.days} Day)</h4>
                    <p>${l.start} to ${l.end}</p>
                    <p style="font-style: italic; opacity: 0.7;">Reason: ${l.reason || 'N/A'}</p>
                </div>
                <div class="leave-status">
                    <span class="status-badge status-${l.status}">${l.status}</span>
                    ${isPending ? `
                        <div class="approval-actions">
                            <button class="btn-approve" onclick="LeavesModule.approveLeave('${l.id}')">Approve</button>
                            <button class="btn-reject" onclick="LeavesModule.rejectLeave('${l.id}')">Reject</button>
                        </div>
                    ` : ''}
                </div>
            `;
            listContainer.appendChild(item);
        });
    },

    getEmployeeBalances(emp) {
        // Tenure Calculation
        const doj = new Date(emp.doj || new Date());
        const now = new Date();
        const diffYears = now.getFullYear() - doj.getFullYear();
        const diffMonths = (diffYears * 12) + (now.getMonth() - doj.getMonth());

        const tenureMonths = Math.max(0, diffMonths);

        // Rules: 1.25 Paid per month, 1 Sick per 3 months
        const earnedPaid = tenureMonths * 1.25;
        const earnedSick = Math.floor(tenureMonths / 3);

        // Taken (Approved only)
        const approvedLeaves = (STATE.leaves || []).filter(l => l.empId === emp.id && l.status === 'Approved');
        const taken = approvedLeaves.reduce((sum, l) => sum + l.days, 0);

        const totalRemaining = (earnedPaid + earnedSick) - taken;

        return {
            tenureMonths,
            earnedPaid,
            earnedSick,
            taken,
            totalRemaining
        };
    }
};

// Self init
LeavesModule.init();
