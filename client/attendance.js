// --- ATTENDANCE MODULE ---
const AttendanceModule = {
    currentDate: new Date(),
    selectedDate: null,

    init() {
        console.log("Attendance Module Initialized");
        this.currentDate = new Date();
        this.selectedDate = this.getLocalISO(this.currentDate); // Auto-select today
        this.setupEventListeners();
        this.renderCalendar();
        this.renderDetails(this.selectedDate); // Initial render for today
    },

    setupEventListeners() {
        document.getElementById('prevMonth')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('nextMonth')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });

        // Search functionality
        document.getElementById('attendanceSearch')?.addEventListener('input', (e) => {
            this.renderDetails(this.selectedDate, e.target.value);
        });

        // Export button
        document.getElementById('exportDayBtn')?.addEventListener('click', () => {
            this.exportDayLogs();
        });

        // Setup biometric upload listeners
        const user = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
        if (user && ['Admin', 'HR'].includes(user.role)) {
            const btn = document.getElementById('openUploadBiometricBtn');
            if (btn) btn.style.display = 'flex';
        }

        document.getElementById('openUploadBiometricBtn')?.addEventListener('click', () => {
            const modal = document.getElementById('biometricUploadModal');
            if (modal) modal.classList.add('active');
        });

        document.getElementById('downloadBioTemplateBtn')?.addEventListener('click', () => {
            this.downloadBiometricTemplate();
        });

        ['closeUploadModalBtn', 'cancelUploadModalBtn'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', () => {
                document.getElementById('biometricUploadModal').classList.remove('active');
            });
        });

        document.getElementById('biometricUploadForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBiometricUpload();
        });
    },

    async handleBiometricUpload(overwrite = false) {
        const dateInput = document.getElementById('bioUploadDate').value;
        const branchInput = document.getElementById('bioBranchName').value;
        const fileInput = document.getElementById('bioCsvFile');
        const file = fileInput.files[0];

        if (!dateInput || !branchInput || !file) return;

        // format date as DD-MM-YYYY
        const d = new Date(dateInput);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const formattedDate = `${dd}-${mm}-${yyyy}`;

        const fileName = `${formattedDate}_${branchInput}.csv`;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', fileName);
        if (overwrite) formData.append('overwrite', 'true');

        try {
            let serverSuccess = true;
            try {
                const res = await fetch('http://localhost:5000/api/upload-biometric', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();

                if (res.status === 409) {
                    // Duplicate 
                    this.showConfirmDialog(data.error, () => {
                        this.handleBiometricUpload(true); // retry with overwrite
                    });
                    return;
                }

                if (!res.ok) throw new Error(data.error || 'Upload failed');
            } catch (fetchErr) {
                console.warn("Backend not reachable. Processing locally.", fetchErr);
                serverSuccess = false;
            }

            // Now parse CSV
            await this.parseBiometricCSV(file, dateInput);
            
            document.getElementById('biometricUploadModal').classList.remove('active');
            document.getElementById('biometricUploadForm').reset();
            
            if (typeof showSuccess === 'function') {
                showSuccess("Biometric data uploaded & processed successfully!");
            } else {
                alert("Success: Biometric data updated.");
            }

            this.selectedDate = dateInput;
            this.currentDate = new Date(dateInput);
            this.renderCalendar();
            this.renderDetails(dateInput);

        } catch (err) {
            console.error(err);
            alert("Error: " + err.message);
        }
    },

    showConfirmDialog(msg, onConfirm) {
        document.getElementById('confirmMsg').textContent = msg;
        const modal = document.getElementById('confirmModal');
        modal.classList.add('active');
        
        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');

        // clean up previous listeners
        const newOk = okBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        newOk.addEventListener('click', () => {
            modal.classList.remove('active');
            onConfirm();
        });

        newCancel.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    },

    async parseBiometricCSV(file, baseDateStr) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const lines = text.split('\n').filter(l => l.trim().length > 0);
                if (lines.length <= 1) return resolve();

                const reportsObj = {};
                for (let i = 1; i < lines.length; i++) {
                    const row = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                    const empId = row[0];
                    
                    if (!empId) continue;

                    if (!reportsObj[empId]) {
                        let empName = "Unknown";
                        if (typeof STATE !== 'undefined' && STATE.employees) {
                            const found = STATE.employees.find(emp => emp.id === empId);
                            if (found) empName = found.name;
                        }
                        reportsObj[empId] = {
                            id: empId,
                            name: empName,
                            times: []
                        };
                    }

                    for (let c = 1; c < row.length; c++) {
                        let timestampStr = row[c];
                        if (!timestampStr || timestampStr === '-') continue;
                        
                        // ensure 2-digit padding for 9:01:00 -> 09:01:00 to prevent Date parsing errors
                        if (/^\d:\d{2}:\d{2}$/.test(timestampStr)) {
                            timestampStr = '0' + timestampStr;
                        }

                        let dInfo = new Date(timestampStr);
                        if (isNaN(dInfo.getTime())) {
                            dInfo = new Date(`${baseDateStr}T${timestampStr}`);
                        }
                        if (!isNaN(dInfo.getTime())) {
                            reportsObj[empId].times.push(dInfo.getTime());
                        }
                    }
                }

                let reports = JSON.parse(localStorage.getItem("loginReports") || "[]");
                
                // Optional: remove existing reports for that date and these employees to avoid duplication on overwrite
                reports = reports.filter(r => {
                    const rDate = this.getLocalISO(r.login);
                    if (rDate !== baseDateStr) return true;
                    // if it is same day, check if employee is in the CSV we just parsed
                    if (reportsObj[r.id]) return false; 
                    return true;
                });

                Object.values(reportsObj).forEach(emp => {
                    emp.times.sort();
                    if (emp.times.length > 0) {
                        const login = new Date(emp.times[0]).toISOString();
                        const logout = emp.times.length > 1 ? new Date(emp.times[emp.times.length - 1]).toISOString() : null;
                        
                        reports.push({
                            id: emp.id,
                            name: emp.name,
                            login,
                            logout
                        });
                    }
                });

                localStorage.setItem("loginReports", JSON.stringify(reports));
                resolve();
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    downloadBiometricTemplate() {
        const headers = "Employee ID, First IN, First Out, Second In, Second Out\n";
        const sampleData = "EMP001,09:00:00,13:00:00,14:00:00,18:00:00\nEMP002,08:30:00,12:30:00,13:00:00,17:00:00\n";
        const csvContent = headers + sampleData;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "Biometric_Template.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    renderCalendar() {
        // ... (rest of renderCalendar remains the same)
        const grid = document.getElementById('calendarGrid');
        const monthYearLabel = document.getElementById('currentMonthYear');
        if (!grid || !monthYearLabel) return;

        grid.innerHTML = '';
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        monthYearLabel.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(this.currentDate);

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();

        const reports = JSON.parse(localStorage.getItem("loginReports") || "[]");

        for (let i = firstDay - 1; i >= 0; i--) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day other-month';
            dayDiv.textContent = prevMonthDays - i;
            grid.appendChild(dayDiv);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            dayDiv.textContent = day;

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dateObj = new Date(year, month, day);

            if (dateObj.getDay() === 0) {
                dayDiv.classList.add('day-sunday');
            } else {
                const dayReports = reports.filter(r => {
                    const rDate = this.getLocalISO(r.login);
                    return rDate === dateStr;
                });

                if (dayReports.length > 0) {
                    let totalMs = 0;
                    dayReports.forEach(r => {
                        if (r.logout) {
                            totalMs += (new Date(r.logout) - new Date(r.login));
                        } else {
                            const todayStr = this.getLocalISO(new Date());
                            if (dateStr === todayStr) {
                                totalMs += (new Date() - new Date(r.login));
                            }
                        }
                    });

                    const totalHours = totalMs / (1000 * 60 * 60);
                    if (totalHours >= 8.5) {
                        dayDiv.classList.add('day-complete');
                    } else if (totalHours > 0) {
                        dayDiv.classList.add('day-short');
                    }
                }
            }

            if (this.selectedDate === dateStr) {
                dayDiv.classList.add('active');
            }

            dayDiv.addEventListener('click', () => {
                document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('active'));
                dayDiv.classList.add('active');
                this.selectedDate = dateStr;
                this.renderDetails(dateStr);
            });

            grid.appendChild(dayDiv);
        }
    },

    getLocalISO(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    formatDuration(ms) {
        const hh = Math.floor(ms / 3600000);
        const mm = Math.floor((ms % 3600000) / 60000);
        return `${hh}h ${mm}m`;
    },

    renderDetails(dateStr, searchQuery = '') {
        const detailsContainer = document.getElementById('attendanceDetails');
        const dateDisplay = document.getElementById('selectedDateDisplay');
        const exportBtn = document.getElementById('exportDayBtn');
        if (!detailsContainer || !dateDisplay) return;

        if (!dateStr) {
            detailsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-calendar-day"></i>
                    <p>Select a date from the calendar to view login/logout history</p>
                </div>
            `;
            if (exportBtn) exportBtn.style.display = 'none';
            return;
        }

        const dateObj = new Date(dateStr);
        dateDisplay.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (exportBtn) exportBtn.style.display = 'flex';

        const reports = JSON.parse(localStorage.getItem("loginReports") || "[]");
        const currentUser = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
        const accessibleIds = (currentUser && typeof Hierarchy !== 'undefined') ? Hierarchy.getAccessibleIds(currentUser) : [];

        let filtered = reports.filter(r =>
            this.getLocalISO(r.login) === dateStr &&
            (accessibleIds.length === 0 || accessibleIds.includes(r.id))
        );

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(r =>
                (r.name && r.name.toLowerCase().includes(query)) ||
                (r.id && r.id.toLowerCase().includes(query))
            );
        }

        if (filtered.length === 0) {
            detailsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                    <p>No login activity recorded for this day.</p>
                </div>
            `;
            return;
        }

        // Group by employee ID
        const grouped = {};
        filtered.forEach(r => {
            if (!grouped[r.id]) {
                grouped[r.id] = {
                    name: r.name || "Unknown Employee",
                    id: r.id,
                    sessions: [],
                    totalMs: 0
                };
            }
            const loginTime = new Date(r.login);
            const logoutTime = r.logout ? new Date(r.logout) : null;
            let durationMs = 0;
            if (logoutTime) {
                durationMs = logoutTime - loginTime;
            } else {
                const todayStr = this.getLocalISO(new Date());
                if (dateStr === todayStr) {
                    durationMs = new Date() - loginTime;
                }
            }
            grouped[r.id].sessions.push({ loginTime, logoutTime, durationMs });
            grouped[r.id].totalMs += durationMs;
        });

        detailsContainer.innerHTML = '';
        Object.values(grouped).forEach(emp => {
            const item = document.createElement('div');
            item.className = 'log-item expandable';

            const sessionsHtml = emp.sessions.map(s => `
                <div class="session-row">
                    <div class="log-time-range">
                        ${s.loginTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                        ${s.logoutTime ? s.logoutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '<span style="color: #22c55e;">Present</span>'}
                    </div>
                    <div class="log-duration">${this.formatDuration(s.durationMs)}</div>
                </div>
            `).join('');

            item.innerHTML = `
                <div class="log-item-header">
                    <div class="log-emp-info">
                        <span class="log-name">${emp.name}</span>
                        <span class="log-id">${emp.id}</span>
                    </div>
                    <div class="log-times">
                        <div class="log-total-time">${this.formatDuration(emp.totalMs)}</div>
                        <i class="fa-solid fa-chevron-down expand-icon"></i>
                    </div>
                </div>
                <div class="log-item-sessions">
                    ${sessionsHtml}
                </div>
            `;

            item.addEventListener('click', () => {
                // Close others
                document.querySelectorAll('.log-item.active').forEach(other => {
                    if (other !== item) other.classList.remove('active');
                });
                item.classList.toggle('active');
            });

            detailsContainer.appendChild(item);
        });
    },

    exportDayLogs() {
        if (!this.selectedDate) return;

        const reports = JSON.parse(localStorage.getItem("loginReports") || "[]");
        const filtered = reports.filter(r => this.getLocalISO(r.login) === this.selectedDate);

        if (filtered.length === 0) {
            alert("No logs to export for this date.");
            return;
        }

        let csv = "Employee Name,Employee ID,Login Time,Logout Time,Duration\n";
        filtered.forEach(r => {
            const login = new Date(r.login).toLocaleTimeString();
            const logout = r.logout ? new Date(r.logout).toLocaleTimeString() : "Present";
            let duration = "Active";
            if (r.logout) {
                const diff = new Date(r.logout) - new Date(r.login);
                const hh = Math.floor(diff / 3600000);
                const mm = Math.floor((diff % 3600000) / 60000);
                duration = `${hh}h ${mm}m`;
            }
            csv += `"${r.name}","${r.id}","${login}","${logout}","${duration}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `attendance_${this.selectedDate}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
};

// Replace global exposure
window.renderAttendance = () => AttendanceModule.renderCalendar();

// Self init
AttendanceModule.init();
