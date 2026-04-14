// --- LEAVE MANAGEMENT MODULE ---
const LeavesModule = {
    state: {
        currentTab: 'pending',
        historyFilter: 'all'
    },

    currentDate: new Date(),
    selectedTab: 'balance',
    selectedEmployee: null,

    notify(toEmpId, message) {
        if (!STATE.notifications) STATE.notifications = [];
        STATE.notifications.push({
            id: Date.now(),
            to: toEmpId,
            message,
            at: new Date().toISOString(),
            read: false
        });
        saveData();
    },

    exportLeavesData() {
        const leavesToExport = (STATE.leaves || []).map(l => {
            const emp = STATE.employees.find(e => e.id === l.empId) || { name: 'Unknown' };
            return [
                `"${emp.name}"`,
                `"${l.empId}"`,
                `"${l.type}"`,
                `"${l.date || l.start}"`,
                `"${l.end || ''}"`,
                `"${l.days || 1}"`,
                `"${l.status}"`,
                `"${l.requestedAt ? new Date(l.requestedAt).toLocaleDateString() : '-'}"`
            ].join(',');
        });
        
        leavesToExport.unshift(['Employee Name', 'Employee ID', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Requested At'].join(','));
        const csvContent = "data:text/csv;charset=utf-8," + leavesToExport.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `leave_requests_export_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    init() {
        this.setupEventListeners();
        
        // Check current page to decide what to render
        const page = document.body.dataset.page;
        if (page === 'leave-requests') {
            this.renderLeaves();
        } else {
            this.showViews();
        }
    },

    showViews() {
        const currentUser = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
        this.selectedEmployee = currentUser;

        const isAdmin = currentUser && ['Admin', 'HR'].includes(currentUser.role);
        
        // Ensure main container is visible
        const empEl = document.getElementById('employeeView');
        if (empEl) empEl.style.display = 'block';

        // Admin Tab Visibility
        const tabBtnAll = document.getElementById('tabBtnAllBalances');
        if (tabBtnAll) tabBtnAll.style.display = isAdmin ? 'inline-block' : 'none';

        const lastTab = localStorage.getItem('gravity_last_leave_tab');
        let initialTab = isAdmin ? 'all-balances' : 'balance';

        if (lastTab) {
            if (lastTab === 'all-balances' && !isAdmin) initialTab = 'balance';
            else initialTab = lastTab;
        }

        const targetBtn = document.querySelector(`[onclick*="'${initialTab}'"]`);
        if (targetBtn) {
            this.switchTab(initialTab, targetBtn);
        } else {
            const firstTab = document.querySelector('.tab-nav-simple .tab-btn-nav');
            if (firstTab) this.switchTab('balance', firstTab);
        }
    },



    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#applyLeaveBtn')) this.openLeaveModal();
            if (e.target.closest('.close-modal-leave') || e.target.closest('.close-modal-leave-btn')) this.closeLeaveModal();

            // Tab switching
            const leaveTabBtn = e.target.closest('[data-leave-tab]');
            if (leaveTabBtn) {
                const tab = leaveTabBtn.dataset.leaveTab;
                this.state.currentTab = tab;
                document.querySelectorAll('[data-leave-tab]').forEach(btn => btn.classList.remove('active'));
                leaveTabBtn.classList.add('active');

                // Special handling for leave-requests.html sections
                const isRequestPage = document.body.dataset.page === 'leave-requests';
                if (isRequestPage) {
                    const pendingSec = document.getElementById('pendingRequestsSection');
                    const historySec = document.getElementById('historyRequestsSection');
                    if (pendingSec) pendingSec.style.display = tab === 'pending' ? 'block' : 'none';
                    if (historySec) historySec.style.display = tab === 'history' ? 'block' : 'none';
                }

                if (tab === 'history') this.renderHistory();
                else this.renderLeaves();
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
        document.getElementById('leaveActionSearch')?.addEventListener('input', () => this.renderLeaves());

        // Employee View Form Listeners
        document.getElementById('personalLeaveForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePersonalLeaveSubmit();
        });

        document.getElementById('compOffRequestForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCompOffRequest();
        });

        document.getElementById('regularizationForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegularizationSubmit();
        });
    },

    // --- EMPLOYEE VIEW DASHBOARD ---
    renderEmployeeView() {
        const viewUser = this.selectedEmployee;
        if (!viewUser) return;

        // Update header title
        const headerTitle = document.getElementById('employeeHeaderTitle');
        const currentUser = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
        const isAdmin = currentUser && ['Admin', 'HR'].includes(currentUser.role);
        if (headerTitle) {
            headerTitle.textContent = isAdmin ? `${viewUser.name}'s Leave Master` : 'My Leave Master';
        }

        const balances = this.getEmployeeBalances(viewUser);
        const grid = document.getElementById('personalBalanceGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="glass-panel" style="padding: 1.5rem; text-align: center; border-left: 4px solid #10b981;">
                    <div style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 0.5rem;">Casual Earned</div>
                    <div style="font-size: 1.8rem; font-weight: 700; color: #10b981;">${balances.earnedPaid.toFixed(1)}</div>
                </div>
                <div class="glass-panel" style="padding: 1.5rem; text-align: center; border-left: 4px solid #f59e0b;">
                    <div style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 0.5rem;">Comp Off</div>
                    <div style="font-size: 1.8rem; font-weight: 700; color: #f59e0b;">${balances.compOff}</div>
                </div>
                <div class="glass-panel" style="padding: 1.5rem; text-align: center; border-left: 4px solid #3b82f6;">
                    <div style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 0.5rem;">Sick Earned</div>
                    <div style="font-size: 1.8rem; font-weight: 700; color: #3b82f6;">${balances.earnedSick}</div>
                </div>
                <div class="glass-panel" style="padding: 1.5rem; text-align: center; border-left: 4px solid #ef4444;">
                    <div style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 0.5rem;">Total Taken</div>
                    <div style="font-size: 1.8rem; font-weight: 700; color: #ef4444;">${balances.taken}</div>
                </div>
                <div class="glass-panel" style="padding: 1.5rem; text-align: center; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2);">
                    <div style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 0.5rem;">Total Available</div>
                    <div style="font-size: 1.8rem; font-weight: 700; color: var(--primary-color);">${balances.totalRemaining.toFixed(1)}</div>
                </div>
            `;
        }

        this.renderCalendar();
    },

    updateBalanceTip() {
        const type = document.getElementById('persLeaveType').value;
        const tip = document.getElementById('persLeaveBalanceTip');
        if (!tip) return;

        if (!type || type === 'Work From Home') {
            tip.textContent = '';
            return;
        }

        const user = Auth.getCurrentUser();
        const isAdmin = user && ['Admin', 'HR'].includes(user.role);
        const emp = isAdmin ? this.selectedEmployee : user;

        if (!emp) return;

        const balances = this.getEmployeeBalances(emp);
        let bal = 0;
        if (type === 'Casual') bal = balances.remainingCasual;
        if (type === 'Sick') bal = balances.remainingSick;
        if (type === 'CompOff') bal = balances.remainingCompOff;
        if (type === 'RH') {
            tip.textContent = `Limit: ${balances.remainingRH} left this year`;
            return;
        }

        tip.textContent = `Balance: ${bal.toFixed(1)} days`;
    },

    switchTab(tabId, btn) {
        if (!btn) return;
        this.selectedTab = tabId;
        localStorage.setItem('gravity_last_leave_tab', tabId);
        
        // Reset all buttons
        document.querySelectorAll('.tab-btn-nav').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Toggle Panes
        document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
        const targetPane = document.getElementById(`tab-${tabId}`);
        if (targetPane) {
            targetPane.style.display = 'block';
        }

        // Specific Render Logic
        if (tabId === 'calendar') this.renderCalendar();
        if (tabId === 'all-balances') this.renderLeaves();
        if (tabId === 'balance') this.renderEmployeeView();
        if (tabId === 'holidays') this.renderHolidays();
        if (tabId === 'history') this.renderHistory();
    },

    filterHistory(status, btn) {
        this.state.historyFilter = status;
        if (btn) {
            document.querySelectorAll('#historyFilters .pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
        this.renderHistory();
    },

    renderHistory() {
        const grid = document.getElementById('personalHistoryList');
        if (!grid) return;

        const user = Auth.getCurrentUser();
        if (!user) return;

        // 1. Hierarchy Filtering
        const accessibleIds = (typeof Hierarchy !== 'undefined') ? Hierarchy.getAccessibleIds(user) : [user.id];
        
        let allLeaves = (STATE.leaves || []).filter(l => {
            // Role based visibility
            if (user.role === 'Admin' || user.role === 'HR') return true;
            return accessibleIds.includes(l.empId);
        });

        // 2. Status Filtering
        const filter = this.state.historyFilter;
        if (filter !== 'all') {
            allLeaves = allLeaves.filter(l => {
                if (filter === 'pending') return l.status.includes('Pending') || l.status.includes('Waiting');
                if (filter === 'approved') return l.status === 'Final Approved' || l.status === 'Granted';
                if (filter === 'rejected') return l.status.includes('Rejected');
                return true;
            });
        }

        // 3. Sort Order: Latest to Oldest
        allLeaves.sort((a, b) => {
            const dateA = new Date(a.requestedAt || a.start || a.date);
            const dateB = new Date(b.requestedAt || b.start || b.date);
            return dateB - dateA;
        });

        if (allLeaves.length === 0) {
            grid.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 350px; color: var(--text-dim); text-align: center; opacity: 0.8;">
                    <i class="fa-solid fa-folder-open" style="font-size: 3rem; margin-bottom: 1.5rem; opacity: 0.2;"></i>
                    <p style="font-size: 1rem; font-weight: 500;">No records found.</p>
                </div>
            `;
            return;
        }

        // 4. Group by Month
        const grouped = {};
        allLeaves.forEach(l => {
            const date = new Date(l.requestedAt || l.start || l.date);
            const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (!grouped[monthKey]) grouped[monthKey] = [];
            grouped[monthKey].push(l);
        });

        grid.innerHTML = '';
        
        // 5. Render grouped by month keys (Sorted Latest to Oldest)
        const monthKeys = Object.keys(grouped).sort((a, b) => {
            const dateA = new Date(a);
            const dateB = new Date(b);
            return dateB - dateA;
        });

        monthKeys.forEach((month, idx) => {
            const items = grouped[month];
            const monthSection = document.createElement('div');
            monthSection.className = 'month-section';
            monthSection.style.marginBottom = '2rem';

            // Create Section Header (Collapsible)
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex; justify-content: space-between; align-items: center;
                padding: 0.75rem 1rem; background: rgba(255,255,255,0.02);
                border: 1px solid var(--glass-border); border-radius: 8px;
                cursor: pointer; margin-bottom: 1rem; transition: all 0.3s ease;
            `;
            header.innerHTML = `
                <span style="font-weight: 700; font-size: 0.9rem; color: var(--primary-color);">${month}</span>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span style="font-size: 0.75rem; color: var(--text-dim);">${items.length} Request(s)</span>
                    <i class="fa-solid fa-chevron-down" style="font-size: 0.8rem; transition: transform 0.3s ease;"></i>
                </div>
            `;

            const content = document.createElement('div');
            content.className = 'month-content';
            content.style.display = idx === 0 ? 'block' : 'none'; // Open first month by default
            if (idx !== 0) header.querySelector('i').style.transform = 'rotate(-90deg)';

            header.onclick = () => {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                header.querySelector('i').style.transform = isHidden ? 'rotate(0)' : 'rotate(-90deg)';
                header.style.background = isHidden ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)';
            };

            items.forEach(l => {
                const requester = STATE.employees.find(e => e.id === l.empId) || { name: 'Unknown' };
                const item = document.createElement('div');
                item.className = 'glass-panel';
                item.style.cssText = `
                    padding: 1.25rem; margin-bottom: 0.75rem; 
                    border-left: 4px solid ${this.getStatusColor(l.status)};
                    background: rgba(255,255,255,0.01);
                `;

                let actionBtn = '';
                if (l.status.includes('Pending') || l.status.includes('Waiting')) {
                    actionBtn = `<button class="btn-secondary btn-sm" style="color: #ef4444; border-color: rgba(239,68,68,0.2);" onclick="LeavesModule.withdrawLeave('${l.id}')"><i class="fa-solid fa-trash-can"></i> Withdraw</button>`;
                } else if (l.status === 'Final Approved' || l.status === 'Granted') {
                    actionBtn = `<button class="btn-secondary btn-sm" style="color: #ef4444; border-color: rgba(239,68,68,0.15);" onclick="LeavesModule.requestCancel('${l.id}')"><i class="fa-solid fa-ban"></i> Cancel</button>`;
                }

                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <h4 style="margin: 0; font-size: 0.95rem;">${l.type}</h4>
                                <span style="font-size: 0.7rem; padding: 2px 6px; background: rgba(99,102,241,0.1); color: var(--primary-color); border-radius: 4px;">#${l.id.split('-')[1]}</span>
                                ${user.role !== 'Employee' ? `<span style="font-size: 0.75rem; color: var(--text-dim);">for <strong>${requester.name}</strong></span>` : ''}
                            </div>
                            <p style="margin: 0.3rem 0; font-size: 0.85rem; color: var(--text-main); font-weight: 500;">
                                <i class="fa-solid fa-calendar-alt" style="color: var(--primary-color); font-size: 0.8rem; margin-right: 0.3rem;"></i>
                                ${l.start || l.date} ${l.end ? ' to ' + l.end : ''} (${l.days || 1} Day)
                            </p>
                            <div style="display: flex; gap: 0.8rem; font-size: 0.75rem; margin-top: 0.5rem; background: rgba(0,0,0,0.1); padding: 4px 8px; border-radius: 4px; display: inline-flex;">
                                <span style="color: ${l.tlStatus === 'Approved' ? '#10b981' : (l.tlStatus === 'Rejected' ? '#ef4444' : '#f59e0b')}">TL: ${l.tlStatus || 'Pending'}</span>
                                <span style="color: ${l.managerStatus === 'Approved' ? '#10b981' : (l.managerStatus === 'Rejected' ? '#ef4444' : '#f59e0b')}">Mgr: ${l.managerStatus || 'Pending'}</span>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span class="status-badge" style="background: ${this.getStatusColor(l.status)}22; color: ${this.getStatusColor(l.status)}; border: 1px solid ${this.getStatusColor(l.status)}44;">${l.status}</span>
                            <div style="margin-top: 0.75rem;">${actionBtn}</div>
                        </div>
                    </div>
                `;
                content.appendChild(item);
            });

            monthSection.appendChild(header);
            monthSection.appendChild(content);
            grid.appendChild(monthSection);
        });
    },

    getStatusColor(status) {
        if (status === 'Final Approved' || status === 'Granted') return '#10b981';
        if (status === 'Cancelled') return '#94a3b8';
        if (status.includes('Rejected')) return '#ef4444';
        if (status.includes('Pending')) return '#f59e0b';
        return '#f59e0b'; // Default
    },

    withdrawLeave(id) {
        if (!confirm("Are you sure you want to withdraw this request?")) return;
        const index = STATE.leaves.findIndex(l => l.id === id);
        if (index > -1) {
            STATE.leaves.splice(index, 1);
            saveData();
            this.renderHistory();
            showSuccess("Request withdrawn.");
        }
    },

    requestCancel(id) {
        if (!confirm("Apply for Leave Cancellation? This will need TL & Manager approval.")) return;
        const index = STATE.leaves.findIndex(l => l.id === id);
        if (index > -1) {
            STATE.leaves[index].status = 'Cancel Pending (TL)';
            STATE.leaves[index].tlStatus = 'Pending (Cancel)';
            STATE.leaves[index].managerStatus = 'Pending (Cancel)';
            saveData();
            this.renderHistory();
            showSuccess("Cancellation request submitted.");
        }
    },

    applyForRH(date, name) {
        // Switch to apply tab
        const applyBtn = document.querySelector('[onclick*="apply"]');
        this.switchTab('apply', applyBtn);
        
        // Fill the form
        const typeSelect = document.getElementById('persLeaveType');
        const startInput = document.getElementById('persLeaveStart');
        const endInput = document.getElementById('persLeaveEnd');
        const reasonInput = document.getElementById('persLeaveReason');
        
        if (typeSelect) {
            typeSelect.value = 'RH';
            this.updateBalanceTip();
        }
        if (startInput) startInput.value = date;
        if (endInput) {
            endInput.value = date;
            const endS = document.getElementById('endSession');
            if (endS) endS.value = 'S2';
        }
        if (reasonInput) {
            reasonInput.value = `Applied for Restricted Holiday: ${name}`;
            reasonInput.required = false; // Make optional for RH
        }
    },

    // --- HOLIDAYS LOGIC ---
    renderHolidays() {
        const grid = document.getElementById('holidaysGrid');
        if (!grid) return;

        const year = 2026;
        let holidays = [];
        try {
            const saved = localStorage.getItem("gravity_holidays");
            if (saved) holidays = JSON.parse(saved);
        } catch(e) { console.error("Holiday load error", e); }

        if (!holidays || holidays.length === 0) {
            holidays = [
                { date: "2026-01-01", name: "New Year's Day", type: "Applied" },
                { date: "2026-01-15", name: "Pongal", type: "Mandatory" },
                { date: "2026-01-16", name: "Thiruvalluvar Day", type: "Mandatory" },
                { date: "2026-01-26", name: "Republic Day", type: "Mandatory" },
                { date: "2026-03-21", name: "Ramzan (Idul' Fitr)", type: "Apply" },
                { date: "2026-04-03", name: "Good Friday", type: "Apply" },
                { date: "2026-04-14", name: "Tamil New Year", type: "Mandatory" },
                { date: "2026-05-01", name: "May Day", type: "Mandatory" },
                { date: "2026-05-28", name: "Bakrid (Idul Azha)", type: "Apply" },
                { date: "2026-08-15", name: "Independence Day", type: "Mandatory" },
                { date: "2026-08-26", name: "Eid-Milad/Thirvonam", type: "Apply" },
                { date: "2026-09-14", name: "Vinayakar Chathurthi", type: "Mandatory" },
                { date: "2026-10-02", name: "Gandhi Jayanthi", type: "Mandatory" },
                { date: "2026-10-20", name: "Vijaya Dasami", type: "Mandatory" },
                { date: "2026-12-25", name: "Christmas", type: "Mandatory" }
            ];
        }

        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        
        let html = '';
        for (let m = 0; m < 12; m++) {
            const mHolidays = holidays.filter(h => new Date(h.date).getMonth() === m);
            
            html += `
                <div class="glass-panel" style="padding: 1.5rem; display: flex; flex-direction: column; height: 260px; overflow: hidden; animation-delay: ${m * 0.05}s;">
                    <h3 style="margin-bottom: 1rem; font-size: 0.95rem; color: var(--text-dim); text-transform: uppercase;">${months[m]} ${year}</h3>
                    <div class="custom-scrollbar" style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding-right: 1rem; margin-right: -1rem;">
            `;

            if (mHolidays.length === 0) {
                html += `<div style="flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-dim); font-size: 0.9rem; opacity: 0.5;">No Holidays</div>`;
            } else {
                mHolidays.forEach((h, idx) => {
                    const d = new Date(h.date);
                    const dayNum = String(d.getDate()).padStart(2, '0');
                    const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
                    
                    const isLast = idx === mHolidays.length - 1;
                    const borderStyle = isLast ? '' : 'border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 0.8rem; padding-bottom: 0.8rem;';

                    let actionHtml = '';
                    if (h.type === 'Apply') {
                        // Triggers the standard apply router if they want to click it.
                        actionHtml = `<a href="#" onclick="event.preventDefault(); LeavesModule.applyForRH('${h.date}', '${h.name}')" style="color: #38bdf8; font-size: 0.8rem; text-decoration: none; font-weight: 600;">Apply</a>`;
                    } else if (h.type === 'Applied') {
                        actionHtml = `<span style="font-size: 0.75rem; color: var(--text-dim); font-weight: 600; letter-spacing: 0.5px;">APPLIED</span>`;
                    }

                    html += `
                        <div style="display: flex; justify-content: space-between; align-items: center; ${borderStyle}">
                            <div style="display: flex; gap: 1rem; align-items: center;">
                                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 32px;">
                                    <span style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); line-height: 1;">${dayNum}</span>
                                    <span style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase;">${dayStr}</span>
                                </div>
                                <span style="font-size: 0.9rem; color: var(--text-main); font-weight: 500;">${h.name}</span>
                            </div>
                            ${actionHtml}
                        </div>
                    `;
                });
            }

            html += `
                    </div>
                </div>
            `;
        }

        grid.innerHTML = html;
    },

    // --- ATTENDANCE CALENDAR LOGIC ---
    renderCalendar() {
        const grid = document.getElementById('personalCalendarGrid');
        const label = document.getElementById('personalCalMonthYear');
        if (!grid || !label) return;

        grid.innerHTML = '';
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        label.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(this.currentDate);

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();

        const reports = JSON.parse(localStorage.getItem("loginReports") || "[]");
        const user = this.selectedEmployee;
        if (!user) return;

        // Pad start
        for (let i = firstDay - 1; i >= 0; i--) {
            const d = document.createElement('div');
            d.className = 'calendar-day other-month';
            d.textContent = prevMonthDays - i;
            grid.appendChild(d);
        }

        const today = new Date();
        const todayStr = this.formatISODate(today);

        for (let day = 1; day <= daysInMonth; day++) {
            const d = document.createElement('div');
            d.className = 'calendar-day';
            d.innerHTML = `<span>${day}</span>`;

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dateObj = new Date(year, month, day);

            if (dateObj.getDay() === 0) {
                d.style.background = 'rgba(255,255,255,0.01)'; // Light Sunday shading
            } else if (dateObj <= today) {
                const dayReports = reports.filter(r => r.id === user.id && this.formatISODate(new Date(r.login)) === dateStr);
                
                let status = 'A'; // Default Absent
                let statusClass = 'day-a';

                if (dayReports.length > 0) {
                    // Evaluate status
                    let totalMs = 0;
                    let firstLogin = null;
                    let lastLogout = null;
                    let allSessionsHTML = "";

                    dayReports.forEach(r => {
                        const lin = new Date(r.login);
                        const lout = r.logout ? new Date(r.logout) : (dateStr === todayStr ? new Date() : null);
                        
                        let durationStr = "Present";
                        if (lout) {
                            totalMs += (lout - lin);
                            if (!firstLogin || lin < firstLogin) firstLogin = lin;
                            if (!lastLogout || lout > lastLogout) lastLogout = lout;
                            
                            const diff = lout - lin;
                            const h = Math.floor(diff/3600000);
                            const m = Math.floor((diff%3600000)/60000);
                            durationStr = `${h}h ${m}m`;
                        } else {
                            if (!firstLogin || lin < firstLogin) firstLogin = lin;
                        }

                        allSessionsHTML += `
                            <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                                <span><i class="fa-solid fa-arrow-right-to-bracket" style="color:var(--primary-color)"></i> ${lin.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                                <span><i class="fa-solid fa-arrow-right-from-bracket" style="color:#ef4444"></i> ${lout ? lout.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : 'Active'}</span>
                                <span style="color: var(--text-dim); font-size:0.85rem;">${durationStr}</span>
                            </div>
                        `;
                    });

                    let totalDurationStr = "0h 0m";
                    if (firstLogin && lastLogout) {
                        const durationMs = lastLogout - firstLogin;
                        const totalHrs = durationMs / (1000 * 60 * 60);
                        totalDurationStr = `${Math.floor(durationMs/3600000)}h ${Math.floor((durationMs%3600000)/60000)}m`;

                        if (totalHrs >= 8.0) {
                            status = 'P';
                            statusClass = 'day-p';
                        } else if (totalHrs >= 4) {
                            status = 'P:A';
                            statusClass = 'day-half';
                        } else {
                            status = 'A';
                            statusClass = 'day-a';
                        }
                    } else if (firstLogin) { // No logout yet, but logged in
                        status = 'P:A';
                        statusClass = 'day-half';
                        totalDurationStr = "Active";
                    }

                    // Click handler
                    d.style.cursor = 'pointer';
                    d.addEventListener('click', () => {
                        const container = document.getElementById('inlineRegFormContainer');
                        if (container) container.style.display = 'none'; // Hide if previously opened
                        
                        document.getElementById('attPanelRegBtn').style.display = 'block';
                        document.getElementById('attPanelDate').textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                        document.getElementById('attPanelLogs').innerHTML = allSessionsHTML || `<p style="color:var(--text-dim)">No sessions.</p>`;
                        document.getElementById('attPanelTotalHrs').textContent = totalDurationStr;
                        // pass date silently to reg form if they click it
                        const dateParts = dateStr.split('-');
                        document.getElementById('regDate').value = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                        document.getElementById('regDate').dataset.rawDate = dateStr;
                    });
                } else {
                    // Check if there is an approved regularization for this date that overrides this? No, we will literally insert it into loginReports.
                    // But check if pending regularization exists
                    const regs = (STATE.leaves || []).filter(l => l.empId === user.id && l.type.includes('Correction') && l.date === dateStr);
                    const isPendingReg = regs.length && regs.some(r => r.status === 'Pending');
                    if (isPendingReg) {
                        statusClass += ' pending-reg';
                        d.innerHTML += `<div style="position: absolute; top:4px; right:4px; width:6px; height:6px; background:#f59e0b; border-radius:50%" title="Pending Regularization"></div>`;
                    }
                    d.style.cursor = 'pointer';
                    d.addEventListener('click', () => {
                        const container = document.getElementById('inlineRegFormContainer');
                        if (container) container.style.display = 'none'; // Hide if previously opened

                        document.getElementById('attPanelRegBtn').style.display = 'block';
                        document.getElementById('attPanelDate').textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                        document.getElementById('attPanelLogs').innerHTML = `<p style="color:var(--text-dim)">No login data found for this date.</p>`;
                        document.getElementById('attPanelTotalHrs').textContent = '0h 0m';
                        const dateParts = dateStr.split('-');
                        document.getElementById('regDate').value = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                        document.getElementById('regDate').dataset.rawDate = dateStr;
                    });
                }

                d.classList.add(statusClass);
                d.innerHTML += `<div class="day-status">${status}</div>`;
            }

            grid.appendChild(d);
        }
    },

    formatISODate(date) {
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    },

    changeCalendarMonth(offset) {
        this.currentDate.setMonth(this.currentDate.getMonth() + offset);
        this.renderCalendar();
    },

    // --- PERSONAL FORM HANDLERS ---
    addRegPunchRow() {
        const container = document.getElementById('punchRowsContainer');
        if (!container) return;
        const row = document.createElement('div');
        row.className = 'punch-row';
        row.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.5rem; align-items: center;';
        row.innerHTML = `
            <input type="time" class="regCheckIn multi-punch" required style="width: 100%;">
            <input type="time" class="regCheckOut multi-punch" style="width: 100%;" placeholder="--:--">
            <button type="button" class="btn-icon" style="width: 32px; height: 32px; color: #ef4444;" onclick="this.parentElement.remove()" title="Remove Punch"><i class="fa-solid fa-trash"></i></button>
        `;
        container.appendChild(row);
    },

    triggerRegularizationFromPanel() {
        const container = document.getElementById('inlineRegFormContainer');
        const regBtn = document.getElementById('attPanelRegBtn');
        
        if (container) container.style.display = 'block';
        if (regBtn) regBtn.style.display = 'none';
        
        // Scroll slightly if needed on smaller screens to ensure visibility
        if (container) container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    handleRegularizationSubmit() {
        const dateInput = document.getElementById('regDate');
        const date = dateInput.dataset.rawDate || dateInput.value;
        const type = document.getElementById('regType').value;
        const reason = document.getElementById('regReason').value;
        const user = Auth.getCurrentUser();

        if (!user) return;
        
        const container = document.getElementById('punchRowsContainer');
        const rows = container ? container.querySelectorAll('.punch-row') : [];
        let punches = [];
        
        rows.forEach(row => {
            const cin = row.querySelector('.regCheckIn').value;
            const cout = row.querySelector('.regCheckOut').value;
            if (cin) punches.push({ checkIn: cin, checkOut: cout || null });
        });

        if (!date || !type || !reason || punches.length === 0) {
            alert("Please fill all required fields, including at least one check-in time.");
            return;
        }

        const request = {
            id: 'REG-' + Date.now(),
            empId: user.id,
            type: `Regularization - ${type}`,
            date,
            punches,
            // Fallback for UI tables expecting legacy strings
            checkIn: punches[0].checkIn,
            checkOut: punches[0].checkOut || 'N/A',
            reason,
            status: 'Pending (Team Leader)',
            tlStatus: 'Pending',
            managerStatus: 'Pending',
            requestedAt: new Date().toISOString()
        };

        if (!STATE.leaves) STATE.leaves = [];
        STATE.leaves.unshift(request);
        if (typeof saveData === 'function') saveData();
        
        // Notify Team Leader
        const myEmp = STATE.employees.find(e => e.id === user.id);
        if (myEmp && myEmp.reportsTo) {
            this.notify(myEmp.reportsTo, `New Regularization Request from ${myEmp.name}`);
        }

        if (typeof showSuccess === 'function') {
            showSuccess("Attendance Regularization request submitted successfully!");
        } else {
            alert("Request submitted!");
        }
        document.getElementById('regularizationForm').reset();
        
        // Reset dynamic punch rows correctly
        const dynContainer = document.getElementById('punchRowsContainer');
        if (dynContainer) {
            dynContainer.innerHTML = `
                <div class="punch-row" style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.5rem; align-items: center;">
                    <input type="time" class="regCheckIn multi-punch" required style="width: 100%;">
                    <input type="time" class="regCheckOut multi-punch" style="width: 100%;" placeholder="--:--">
                    <button type="button" class="btn-icon" style="width: 32px; height: 32px; opacity: 0; pointer-events: none;"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
        }
        
        // Hide the form and show the button again after success
        const formContainer = document.getElementById('inlineRegFormContainer');
        const regBtn = document.getElementById('attPanelRegBtn');
        if (formContainer) formContainer.style.display = 'none';
        if (regBtn) regBtn.style.display = 'block';

        this.renderCalendar();
    },

    handlePersonalLeaveSubmit() {
        const type = document.getElementById('persLeaveType').value;
        const start = document.getElementById('persLeaveStart').value;
        const end = document.getElementById('persLeaveEnd').value;
        const reason = document.getElementById('persLeaveReason').value;
        // Use selected employee for Admin/HR, otherwise current user
        const currentUser = Auth.getCurrentUser();
        const isAdmin = currentUser && ['Admin', 'HR'].includes(currentUser.role);
        const user = isAdmin ? this.selectedEmployee : currentUser;

        const balances = this.getEmployeeBalances(user);

        if (type === 'RH' && (balances.remainingRH || 0) <= 0) {
            alert("No Restricted Holidays (RH) left for this year.");
            return;
        }

        if (type !== 'RH' && !reason) {
            alert("Please provide a reason.");
            return;
        }

        const finalReason = type === 'RH' ? (reason || "Restricted Holiday Application") : reason;

        const startDate = new Date(start);
        const endDate = new Date(end);
        
        const startSession = document.getElementById('startSession').value; // S1 or S2
        const endSession = document.getElementById('endSession').value; // S1 or S2

        // Base days calculation
        let diffTime = endDate - startDate;
        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (diffDays <= 0 || isNaN(diffDays)) {
            alert("Please select valid dates.");
            return;
        }

        // Adjust for sessions
        // If same day: S1 to S1 = 0.5, S2 to S2 = 0.5, S1 to S2 = 1.0
        if (start === end) {
            if (startSession === endSession) diffDays = 0.5;
            else if (startSession === 'S2' && endSession === 'S1') {
                alert("Invalid session range on same day.");
                return;
            } else diffDays = 1.0;
        } else {
            // Multi day
            if (startSession === 'S2') diffDays -= 0.5;
            if (endSession === 'S1') diffDays -= 0.5;
        }

        if (diffDays <= 0) {
            alert("Please select a valid session range.");
            return;
        }

        const request = {
            id: 'LV-' + Date.now(),
            empId: user.id,
            type,
            start,
            end,
            startSession,
            endSession,
            days: diffDays,
            reason: finalReason,
            status: 'Pending (Team Leader)',
            tlStatus: 'Pending',
            managerStatus: 'Pending',
            requestedAt: new Date().toISOString()
        };

        if (!STATE.leaves) STATE.leaves = [];
        STATE.leaves.unshift(request);
        saveData();

        // Notify Team Leader
        const myEmp = STATE.employees.find(e => e.id === user.id);
        if (myEmp && myEmp.reportsTo) {
            this.notify(myEmp.reportsTo, `New Leave Request from ${myEmp.name}`);
        }

        showSuccess(`Leave request submitted for ${diffDays} day(s)!`);
        document.getElementById('personalLeaveForm').reset();
    },

    handleCompOffRequest() {
        const date = document.getElementById('workDate').value;
        const task = document.getElementById('workTask').value;
        const reason = document.getElementById('compOffReason').value;
        // Use selected employee for Admin/HR, otherwise current user
        const currentUser = Auth.getCurrentUser();
        const isAdmin = currentUser && ['Admin', 'HR'].includes(currentUser.role);
        const user = isAdmin ? this.selectedEmployee : currentUser;

        if (!user) return;

        const request = {
            id: 'CO-' + Date.now(),
            empId: user.id,
            type: 'CompOffRequest',
            date,
            task,
            reason,
            status: 'Pending (Team Leader)',
            tlStatus: 'Pending',
            managerStatus: 'Pending',
            requestedAt: new Date().toISOString()
        };

        if (!STATE.leaves) STATE.leaves = [];
        STATE.leaves.unshift(request);
        saveData();
        showSuccess("Comp Off request submitted!");
        document.getElementById('compOffRequestForm').reset();
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
        if (index === -1) return;

        const req = STATE.leaves[index];
        const user = Auth.getCurrentUser();
        if (!user) return;

        const isTL = user.role === 'Team Leader';
        const isManager = ['Admin', 'HR', 'Manager'].includes(user.role);

        let finalStageMet = false;
        
        const requester = STATE.employees.find(e => e.id === req.empId);

        // ---- CANCELLATION WORKFLOW ----
        if (req.status.includes('Cancel Pending')) {
            if (isTL) {
                req.tlStatus = 'Approved';
                req.status = 'Cancel Pending (Manager)';
                // Notify Manager
                if (requester && requester.reportsTo) {
                    const myTL = STATE.employees.find(e => e.id === user.id);
                    // Find who the TL reports to (Manager)
                    const mgrId = myTL ? myTL.reportsTo : null;
                    if (mgrId) this.notify(mgrId, `Cancellation Request Approved by TL for ${requester.name}`);
                }
            }
            if (isManager) {
                req.managerStatus = 'Approved';
                if (req.tlStatus === 'Approved') {
                    req.status = 'Cancelled';
                    finalStageMet = true;
                    this.notify(req.empId, `Your Leave Cancellation has been Final Approved!`);
                }
            }
        } 
        // ---- NORMAL APPROVAL WORKFLOW ----
        else {
            if (isTL) {
                req.tlStatus = 'Approved';
                req.status = 'Pending (Manager)';
                
                // Notify Manager
                const myTL = STATE.employees.find(e => e.id === user.id);
                const mgrId = myTL ? myTL.reportsTo : null;
                if (mgrId) this.notify(mgrId, `Leave Request for ${requester?.name || 'Employee'} waiting for your approval.`);
            }
            if (isManager) {
                req.managerStatus = 'Approved';
                if (req.tlStatus === 'Approved' || isManager) {
                    req.tlStatus = 'Approved';
                    req.status = 'Final Approved';
                    finalStageMet = true;
                    this.notify(req.empId, `Congratulations! Your Leave Request (${req.type}) is Final Approved.`);
                }
            }
        }

        // Final Data Hydration (Biometric sync) - only if it becomes 'Final Approved'
        if (finalStageMet && req.status === 'Final Approved' && req.type && req.type.includes('Regularization')) {
            let reports = JSON.parse(localStorage.getItem("loginReports") || "[]");
            reports = reports.filter(r => {
                const rDateObj = new Date(r.login);
                const rDateStr = rDateObj.getFullYear() + '-' + String(rDateObj.getMonth() + 1).padStart(2, '0') + '-' + String(rDateObj.getDate()).padStart(2, '0');
                return !(r.id === req.empId && rDateStr === req.date);
            });

            const emp = STATE.employees.find(e => e.id === req.empId);
            const empName = emp ? emp.name : "Unknown";
            const punchesToApply = req.punches || [{ checkIn: req.checkIn, checkOut: req.checkOut }];

            punchesToApply.forEach(p => {
                if (!p.checkIn) return;
                const combinedLogin = new Date(`${req.date}T${p.checkIn}`).toISOString();
                const combinedLogout = p.checkOut && p.checkOut !== 'N/A' ? new Date(`${req.date}T${p.checkOut}`).toISOString() : null;
                reports.push({ id: req.empId, name: empName, login: combinedLogin, logout: combinedLogout });
            });
            localStorage.setItem("loginReports", JSON.stringify(reports));
        }

        saveData();
        this.renderLeaves();
        this.renderHistory();
        showSuccess(finalStageMet ? `Request ${req.status}!` : 'Approved (Level 1)!');
    },

    rejectLeave(id) {
        const index = STATE.leaves.findIndex(l => l.id === id);
        if (index > -1) {
            STATE.leaves[index].status = 'Rejected';
            STATE.leaves[index].tlStatus = 'Rejected';
            STATE.leaves[index].managerStatus = 'Rejected';
            saveData();
            this.renderLeaves();
            this.renderHistory();
            showSuccess('Request Rejected');
        }
    },

    renderAll() {
        this.showViews();
    },

    renderLeaves() {
        // --- FORCE FRESH STATE LOAD (Solves sync issues) ---
        const savedState = JSON.parse(localStorage.getItem('gravity_hrm_state') || '{}');
        if (savedState.employees) STATE.employees = savedState.employees;
        if (savedState.leaves) STATE.leaves = savedState.leaves;

        console.log("Rendering Master Table. Total Employees in State:", (STATE.employees || []).length);

        if (!STATE.leaves) STATE.leaves = [];
        if (!STATE.employees) STATE.employees = [];

        const currentUser = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
        const accessibleIds = (currentUser && typeof Hierarchy !== 'undefined') ? Hierarchy.getAccessibleIds(currentUser) : [];

        // 1. Render Employee Leave Master Table
        const masterBody = document.getElementById('empLeaveMasterBody');
        const searchQuery = document.getElementById('empLeaveSearch')?.value.toLowerCase() || '';

        if (masterBody) {
            masterBody.innerHTML = '';
            const filtered = STATE.employees.filter(emp =>
                // Be more lenient with status - only exclude EXPLICITLY inactive
                emp.status !== 'inactive' && 
                (accessibleIds.length === 0 || accessibleIds.includes(emp.id)) &&
                (emp.name.toLowerCase().includes(searchQuery) || emp.id.toLowerCase().includes(searchQuery))
            );
            
            console.log("Employees after filter:", filtered.length);
            
            filtered.forEach(emp => {
                const balances = this.getEmployeeBalances(emp);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-main);">${emp.id}</span></td>
                    <td style="font-weight: 600; color: var(--primary-color);">${emp.name}</td>
                    <td style="font-size: 0.85rem; opacity: 0.8;">${emp.role || '-'}</td>
                    <td style="color: #10b981; font-weight: 600;">${balances.earnedPaid.toFixed(2)}</td>
                    <td style="color: #f59e0b; font-weight: 600;">${balances.compOff}</td>
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
        const tableBody = document.getElementById('leaveRequestsBody');
        if (!listContainer && !tableBody) return;

        const filteredLeaves = (STATE.leaves || []).filter(l => {
            // 1. Hierarchy Filter (Team based access)
            if (accessibleIds.length > 0 && !accessibleIds.includes(l.empId)) return false;

            const user = Auth.getCurrentUser();
            const isAdminHR = user && ['Admin', 'HR'].includes(user.role);
            const isTL = user && user.role === 'Team Leader';
            const isManagerOnly = user && user.role === 'Manager';

            // 2. Tab Filter (Pending / All)
            const isWaitStatus = l.status.includes('Pending') || l.status.includes('Waiting');
            if (this.state.currentTab === 'pending' && !isWaitStatus) return false;
            // Removed strict exclusion of pending from other tabs (allows viewing pending in history/all)

            // 3. Strict Role-Stage Filter (Only filter if we are NOT on a history view)
            const isHistoryView = this.state.currentTab === 'history' || document.body.dataset.page === 'history';
            if (!isAdminHR && !isHistoryView) {
                // TL sees only what they can approve right now
                if (isTL && !l.status.includes('(Team Leader)')) return false;
                // Manager sees only what they can approve right now
                if (isManagerOnly && !l.status.includes('(Manager)')) return false;
            }

            return true;
        });

        if (filteredLeaves.length === 0) {
            if (listContainer) {
                listContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 250px; color: var(--text-dim); text-align: center; opacity: 0.8; position: relative;">
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; height: 300px; background: radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%); pointer-events: none; z-index: 0;"></div>
                        <i class="fa-solid fa-folder-open" style="font-size: 3rem; margin-bottom: 1.5rem; opacity: 0.2; position: relative; z-index: 1;"></i>
                        <p style="font-size: 1rem; font-weight: 500; position: relative; z-index: 1;">No ${this.state.currentTab} applications found.</p>
                    </div>
                `;
            }
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; border-bottom: none; padding: 4rem 1rem;">
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 250px; color: var(--text-dim); text-align: center; opacity: 0.8; position: relative;">
                                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; height: 400px; background: radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%); pointer-events: none; z-index: 0;"></div>
                                <i class="fa-solid fa-folder-open" style="font-size: 3rem; margin-bottom: 1.5rem; opacity: 0.2; position: relative; z-index: 1;"></i>
                                <p style="font-size: 1rem; font-weight: 500; position: relative; z-index: 1;">No ${this.state.currentTab} applications found.</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
            return;
        }

        if (listContainer) listContainer.innerHTML = '';
        if (tableBody) tableBody.innerHTML = '';

        filteredLeaves.forEach(l => {
            const emp = STATE.employees.find(e => e.id === l.empId) || { name: 'Unknown' };
            const user = Auth.getCurrentUser();
            const isTL = user && user.role === 'Team Leader';
            const isMgr = user && ['Admin', 'HR', 'Manager'].includes(user.role);

            // Determine if current user can approve
            let canApprove = false;
            if (l.status.includes('(Team Leader)')) {
                if (isTL || isMgr) canApprove = true;
            } else if (l.status.includes('(Manager)')) {
                if (isMgr) canApprove = true;
            }

            // A. Render as Table Row (If on approval page)
            if (tableBody) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div style="font-weight: 600;">${emp.name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-dim);">ID: ${l.empId}</div>
                    </td>
                    <td><span class="badge" style="background: rgba(99,102,241,0.1); color: var(--primary-color);">${l.type}</span></td>
                    <td style="font-size: 0.85rem;">
                        <div>${l.start || l.date} ${l.end ? ' to ' + l.end : ''}</div>
                        <div style="color: var(--text-dim); font-size: 0.75rem;">(${l.days || 1} Day)</div>
                    </td>
                    <td><span class="status-badge" style="background: ${this.getStatusColor(l.status)}22; color: ${this.getStatusColor(l.status)};">${l.status}</span></td>
                    <td style="font-size: 0.75rem; color: var(--text-dim);">${l.requestedAt ? new Date(l.requestedAt).toLocaleDateString() : '-'}</td>
                    <td>
                        ${canApprove && (l.status.includes('Pending') || l.status.includes('Waiting')) ? `
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn-primary btn-sm" onclick="LeavesModule.approveLeave('${l.id}')" style="background: #10b981; border-color: #10b981; padding: 4px 10px;">
                                    <i class="fa-solid fa-check"></i>
                                </button>
                                <button class="btn-secondary btn-sm" onclick="LeavesModule.rejectLeave('${l.id}')" style="color: #ef4444; border-color: rgba(239,68,68,0.3); padding: 4px 10px;">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        ` : '<span style="font-size: 0.75rem; color: var(--text-dim);">No Actions</span>'}
                    </td>
                `;
                tableBody.appendChild(tr);
            }

            // B. Render as List Item (If on dashboard/master page)
            if (listContainer) {
                const item = document.createElement('div');
                item.className = 'leave-request-item';
                item.innerHTML = `
                    <div class="leave-info">
                        <h4>${emp.name} <span style="font-size: 0.8rem; font-weight: normal; opacity: 0.7;">(${l.empId})</span> - ${l.type}</h4>
                        <p style="margin: 0.3rem 0;">${l.start || l.date}${l.end ? ' to ' + l.end : ''} (${l.days || 1} Day)</p>
                        <p style="font-size: 0.8rem; font-style: italic; opacity: 0.8;">Reason: ${l.reason || 'No reason provided'}</p>
                        <div style="display: flex; gap: 1rem; margin-top: 0.5rem; font-size: 0.75rem; font-weight: 600;">
                            <span style="color: ${l.tlStatus === 'Approved' ? '#10b981' : '#f59e0b'}">TL: ${l.tlStatus || 'Pending'}</span>
                            <span style="color: ${l.managerStatus === 'Approved' ? '#10b981' : '#f59e0b'}">MGR: ${l.managerStatus || 'Pending'}</span>
                        </div>
                    </div>
                    <div class="leave-status" style="text-align: right;">
                        <span class="status-badge" style="background: ${this.getStatusColor(l.status)}22; color: ${this.getStatusColor(l.status)}; margin-bottom: 0.5rem; display: inline-block;">${l.status}</span>
                        ${canApprove && (l.status.includes('Pending') || l.status.includes('Waiting')) ? `
                            <div class="leave-actions" style="margin-top: 0.5rem;">
                                <button class="btn-icon" onclick="LeavesModule.approveLeave('${l.id}')" style="color: #10b981;" title="Approve"><i class="fa-solid fa-check"></i> Approve</button>
                                <button class="btn-icon" onclick="LeavesModule.rejectLeave('${l.id}')" style="color: #ef4444;" title="Reject"><i class="fa-solid fa-xmark"></i> Reject</button>
                            </div>
                        ` : ''}
                    </div>
                `;
                listContainer.appendChild(item);
            }
        });
    },

    getEmployeeBalances(emp) {
        if (typeof window.getEmployeeBalances === 'function') {
            return window.getEmployeeBalances(emp);
        }
        // Fallback for safety (though script.js should be loaded)
        return { earnedPaid: 0, earnedSick: 0, compOff: 0, taken: 0, totalRemaining: 0 };
    },

    checkEmployeeId() {
        const inputId = document.getElementById('verifyIdInput').value.trim();
        if (!inputId) return;

        const cleanI = parseInt(inputId.replace(/\D/g, ''), 10);
        if (isNaN(cleanI)) {
            alert("Please enter a numeric ID or an ID containing digits (e.g. 1001 or EMP-1001)");
            return;
        }

        const match = (STATE.employees || []).find(e => {
            const cleanE = parseInt(String(e.id).replace(/\D/g, ''), 10);
            return cleanE === cleanI;
        });

        if (match) {
            alert(`✅ MATCH FOUND!\n\nID: ${match.id}\nName: ${match.name}\nRole: ${match.role}\n\nThis ID in your CSV will correctly update ${match.name}'s balance.`);
        } else {
            alert(`❌ NO MATCH FOUND for ID: ${inputId}\n\nNo employee in the system matches numeric value: ${cleanI}.\nPlease check if the ID exists in the system or if it's missing from the database.`);
        }
    },

    // --- MODAL CONTROLS ---

    openImportModal() {
        document.getElementById('leaveImportModal').classList.add('active');
    },

    closeImportModal() {
        document.getElementById('leaveImportModal').classList.remove('active');
    },

    openHolidayImportModal() {
        document.getElementById('holidayImportModal').classList.add('active');
    },

    closeHolidayImportModal() {
        document.getElementById('holidayImportModal').classList.remove('active');
    },

    downloadHolidayTemplate() {
        const headers = ["Date", "Name", "Type"];
        const rows = [
            ["2026-01-01", "New Year's Day", "Mandatory"],
            ["2026-03-21", "Ramzan", "RH"],
            ["2026-04-03", "Good Friday", "RH"]
        ];
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        this.downloadCSV(csv, "Company_Holidays_Template.csv");
    },

    handleHolidayImport() {
        const fileInput = document.getElementById('holidayImportInput');
        const file = fileInput ? fileInput.files[0] : null;
        if (!file) {
            alert("Please select a CSV file first.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split('\n');
            if (lines.length <= 1) return;

            const headers = lines[0].split(',').map(h => h.trim().toUpperCase());
            const dateIdx = headers.indexOf('DATE');
            const nameIdx = headers.indexOf('NAME');
            const typeIdx = headers.indexOf('TYPE');

            if (dateIdx === -1 || nameIdx === -1 || typeIdx === -1) {
                alert("Invalid format. Headers must include Date, Name, and Type.");
                return;
            }

            const newHolidays = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const cols = this.parseCSVLine(lines[i]);
                const date = cols[dateIdx];
                const name = cols[nameIdx];
                const typeRaw = cols[typeIdx] ? cols[typeIdx].toUpperCase() : 'MANDATORY';
                
                // Map to UI types: Mandatory -> Mandatory, RH -> Apply
                const type = (typeRaw === 'RH' || typeRaw === 'RESTRICTED') ? 'Apply' : 'Mandatory';

                if (date && name) {
                    newHolidays.push({ date, name, type });
                }
            }

            if (newHolidays.length > 0) {
                localStorage.setItem("gravity_holidays", JSON.stringify(newHolidays));
                showSuccess(`Imported ${newHolidays.length} holidays successfully!`);
                this.closeHolidayImportModal();
                this.renderHolidays();
            }
        };
        reader.readAsText(file);
    },

    // --- CSV IMPORT / EXPORT ---
    
    // Robust CSV Line Parser (handles quotes and commas in fields)
    parseCSVLine(text) {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const next = text[i+1];
            if (char === '"' && inQuotes && next === '"') {
                cur += '"'; i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(cur.trim());
                cur = '';
            } else {
                cur += char;
            }
        }
        result.push(cur.trim());
        return result.map(v => v.replace(/^"|"$/g, '').trim()); // Strip remaining quotes
    },

    exportToCSV() {
        if (!STATE.employees || STATE.employees.length === 0) {
            alert("No data to export");
            return;
        }

        const currentUser = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
        const accessibleIds = (currentUser && typeof Hierarchy !== 'undefined') ? Hierarchy.getAccessibleIds(currentUser) : [];

        const headers = ["ID", "Name", "Role", "Casual", "CompOff", "Sick Earned", "Taken", "Total Balance"];
        const rows = STATE.employees.filter(emp =>
            emp.status === 'active' &&
            (accessibleIds.length === 0 || accessibleIds.includes(emp.id))
        ).map(emp => {
            const balances = this.getEmployeeBalances(emp);
            return [
                emp.id,
                `"${emp.name}"`, // Quote names for safety
                `"${emp.role || ''}"`,
                balances.earnedPaid.toFixed(2),
                balances.compOff,
                balances.earnedSick,
                balances.taken,
                balances.totalRemaining.toFixed(2)
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        this.downloadCSV(csvContent, `Leave_Master_Export_${new Date().toISOString().split('T')[0]}.csv`);
    },

    downloadSampleCSV() {
        const headers = ["ID", "Name", "Role", "Casual", "CompOff", "Sick Earned"];
        const activeEmployees = (STATE.employees || []).filter(e => e.status === 'active');
        
        const sampleRows = activeEmployees.length > 0 
            ? activeEmployees.map(emp => {
                const balances = this.getEmployeeBalances(emp);
                return [
                    emp.id, 
                    `"${emp.name}"`, 
                    `"${emp.role || ''}"`,
                    balances.earnedPaid.toFixed(2),
                    balances.compOff || 0,
                    balances.earnedSick
                ];
            })
            : [
                ["EMP001", "John Doe", "Admin", "15.00", "2", "4"],
                ["EMP002", "Jane Smith", "Employee", "7.50", "0", "2"]
            ];

        const csvContent = [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\n');
        this.downloadCSV(csvContent, "Leave_Master_Template.csv");
    },

    handleImport(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            let text = e.target.result;
            
            // 1. Handle Byte Order Mark (BOM)
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.slice(1);
            }

            const rows = text.split(/\r?\n/).filter(line => line.trim());
            if (rows.length < 2) {
                alert("CSV file is empty or missing data rows.");
                return;
            }

            // 2. Case-insensitive fuzzy header matching
            const rawHeaders = this.parseCSVLine(rows[0]);
            const headers = rawHeaders.map(h => h.toUpperCase().replace(/\s+/g, ' '));
            
            const findIdx = (keywords) => {
                const exact = headers.findIndex(h => keywords.some(k => h === k.toUpperCase()));
                if (exact !== -1) return exact;
                return headers.findIndex(h => keywords.some(k => h.includes(k.toUpperCase())));
            };
            
            const idIdx = findIdx(['ID', 'Employee ID', 'Emp ID']);
            const dojIdx = findIdx(['Joining', 'DOJ']);
            const casualIdx = findIdx(['Casual']);
            const sickIdx = findIdx(['Sick']);
            const compOffIdx = findIdx(['Comp Off', 'CompOff']);

            if (idIdx === -1) {
                alert("Invalid CSV format. Header 'ID' not found.\nDetected headers: " + rawHeaders.join(', '));
                return;
            }

            // --- DIRECT LOCALSTORAGE SYNC ---
            const storageKey = 'gravity_hrm_state';
            const state = JSON.parse(localStorage.getItem(storageKey) || '{"employees":[],"leaves":[]}');
            const employees = state.employees || [];

            let updatedCount = 0;
            let skipCount = 0;
            let idMismatches = [];

            for (let i = 1; i < rows.length; i++) {
                const values = this.parseCSVLine(rows[i]);
                if (values.length <= idIdx) continue;
                
                const rawId = values[idIdx].trim();
                if (!rawId) {
                    skipCount++;
                    continue;
                }

                // 3. Robust ID matching (Case-insensitive + fuzzy matching)
                const emp = employees.find(e => {
                    const systemId = String(e.id).trim().toUpperCase();
                    const csvId = rawId.toUpperCase();
                    if (systemId === csvId) return true;

                    // Robust integer-based fuzzy ID match (EMP-1001 vs 1001 vs 001)
                    const cleanE = parseInt(systemId.replace(/\D/g, ''), 10);
                    const cleanI = parseInt(csvId.replace(/\D/g, ''), 10);
                    return !isNaN(cleanE) && !isNaN(cleanI) && cleanE === cleanI;
                });

                if (emp) {
                    try {
                        const cleanNum = (val) => {
                            if (val === null || val === undefined || val === '') return null;
                            const cleaned = val.toString().replace(/[^0-9.]/g, '');
                            const num = parseFloat(cleaned);
                            return isNaN(num) ? null : num;
                        };

                        if (dojIdx !== -1 && values[dojIdx]) emp.doj = values[dojIdx];
                        
                        const casual = casualIdx !== -1 ? cleanNum(values[casualIdx]) : null;
                        const sick = sickIdx !== -1 ? cleanNum(values[sickIdx]) : null;
                        const compOff = compOffIdx !== -1 ? cleanNum(values[compOffIdx]) : null;

                        if (casual !== null) emp.casualEarned = casual;
                        if (sick !== null) emp.sickEarned = sick;
                        if (compOff !== null) emp.compOff = compOff;
                        
                        updatedCount++;
                    } catch (err) {
                        console.error("Error parsing row " + i, err);
                    }
                } else {
                    skipCount++;
                    idMismatches.push(rawId);
                }
            }

            if (updatedCount > 0) {
                // Save directly to localStorage
                localStorage.setItem(storageKey, JSON.stringify(state));
                
                let msg = `Successfully updated ${updatedCount} employees!`;
                if (skipCount > 0) {
                    msg += `\n\nNote: ${skipCount} IDs were skipped.`;
                }
                alert(msg + "\n\nThe page will now refresh to show the updated balances.");
                location.reload();
            } else {
                let errorMsg = `No employees were updated (Checked ${rows.length - 1} rows).`;
                errorMsg += `\n\n- ${skipCount} IDs were not found in the system.`;
                if (idMismatches.length > 0) {
                    errorMsg += `\nSample missing IDs: ${idMismatches.slice(0, 5).join(', ')}`;
                }
                alert(errorMsg);
            }
            input.value = '';
        };
        reader.readAsText(file);
    },

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// Self init
LeavesModule.init();
