const TimerApp = {
    logs: [],
    projects: [],
    timerInterval: null,
    startTime: null,
    running: false,
    currentUser: null,
    editLogId: null,

    init() {
        this.currentUser = JSON.parse(localStorage.getItem('gravityHrCurrentUser'));
        if (!this.currentUser) return; // auth.js will redirect

        this.loadData();
        this.populateProjectDropdown();
        this.renderLogs();

        // Check if there is an active timer stored in localStorage or sessionStorage
        const activeTimerStr = localStorage.getItem('gravityHrActiveTimer');
        if (activeTimerStr) {
            const activeData = JSON.parse(activeTimerStr);
            if (activeData.userId === this.currentUser.id) {
                this.resumeTimer(activeData);
            }
        }
    },

    loadData() {
        const logsStr = localStorage.getItem('gravityHrTimerLogs');
        this.logs = logsStr ? JSON.parse(logsStr) : [];

        const projStr = localStorage.getItem('gravityHrProjects');
        this.projects = projStr ? JSON.parse(projStr) : [];
    },

    saveData() {
        localStorage.setItem('gravityHrTimerLogs', JSON.stringify(this.logs));
    },

    // --- DROPDOWNS ---
    populateProjectDropdown() {
        const list = document.getElementById('projectOptionsList');
        if (!list) return;

        // Filter: Only active projects, irrespective of role to match task page
        let activeProjects = this.projects.filter(p => p.status !== 'Completed');

        // Store active projects for filtering later
        this.activeProjects = activeProjects;
        this.renderProjectOptions(activeProjects);

        // Explicitly bind the trigger click to avoid inline scope issues
        const trigger = document.querySelector('#projectSelectContainer .custom-select-trigger');
        if (trigger) {
            trigger.onclick = (e) => this.toggleProjectDropdown(e);
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const container = document.getElementById('projectSelectContainer');
            if (container && !container.contains(e.target)) {
                const menu = document.getElementById('projectDropdownMenu');
                if (menu) menu.style.display = 'none';
            }
        });
    },

    renderProjectOptions(projects) {
        const list = document.getElementById('projectOptionsList');
        if (!list) return;

        if (projects.length === 0) {
            list.innerHTML = `<div style="padding: 0.5rem; color: var(--text-dim); text-align: center; font-size: 0.85rem;">No projects found</div>`;
            return;
        }

        let html = '';
        projects.forEach(p => {
            html += `
                <div class="project-option" onclick="TimerApp.selectProject('${p.id}', '${p.number}', '${p.name.replace(/'/g, "\\'")}')" 
                     style="padding: 0.5rem; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-color);">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${p.color};"></div>
                    <strong>${p.number}</strong> <span style="color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</span>
                </div>
            `;
        });

        // Add hover styles dynamically
        list.innerHTML = html;
        const options = list.querySelectorAll('.project-option');
        options.forEach(opt => {
            opt.addEventListener('mouseover', () => opt.style.backgroundColor = 'rgba(255,255,255,0.05)');
            opt.addEventListener('mouseout', () => opt.style.backgroundColor = 'transparent');
        });
    },

    toggleProjectDropdown(e) {
        e.preventDefault();
        const menu = document.getElementById('projectDropdownMenu');
        const isHidden = menu.style.display === 'none';

        if (isHidden) {
            menu.style.display = 'block';
            document.getElementById('projectSearchInput').value = '';
            this.renderProjectOptions(this.activeProjects || []);
            document.getElementById('projectSearchInput').focus();
        } else {
            menu.style.display = 'none';
        }
    },

    filterProjects() {
        const query = document.getElementById('projectSearchInput').value.toLowerCase();
        if (!this.activeProjects) return;

        const filtered = this.activeProjects.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.number.toLowerCase().includes(query)
        );
        this.renderProjectOptions(filtered);
    },

    selectProject(id, number, name) {
        // Set hidden input value
        const input = document.getElementById('logProject');
        input.value = id;

        // Set display text
        document.getElementById('selectedProjectText').innerHTML = `<strong>${number}</strong> <span style="color: var(--text-dim);">${name}</span>`;

        // Hide dropdown
        document.getElementById('projectDropdownMenu').style.display = 'none';

        // Trigger generic change event to load sites
        this.onProjectChange();
    },

    onProjectChange() {
        const projId = document.getElementById('logProject').value;
        const siteSelect = document.getElementById('logSite');

        if (!projId) {
            siteSelect.innerHTML = '<option value="">Select Site</option>';
            return;
        }

        const project = this.projects.find(p => String(p.id) === String(projId));
        let html = '<option value="">Select Site</option>';
        if (project && project.sites && project.sites.length > 0) {
            project.sites.forEach(site => {
                html += `<option value="${site}">${site}</option>`;
            });
        }
        siteSelect.innerHTML = html;
    },

    // --- MANUAL ADD ---
    addManualLog() {
        if (this.running) {
            alert("Please stop the active timer before adding a manual log.");
            return;
        }

        const desc = document.getElementById('logDescription').value.trim();
        const projId = document.getElementById('logProject').value;
        const site = document.getElementById('logSite').value;
        const dateInput = document.getElementById('logDate').value;
        const startInput = document.getElementById('logStartTime').value;
        const endInput = document.getElementById('logEndTime').value;

        if (!projId || !dateInput || !startInput || !endInput) {
            alert("Please select a Project and fill Date, Start, and End times.");
            return;
        }

        if (startInput >= endInput) {
            alert("End time must be after Start time.");
            return;
        }

        const project = this.projects.find(p => String(p.id) === String(projId));

        const newLog = {
            id: Date.now(),
            userId: this.currentUser.id,
            userName: this.currentUser.name,
            description: desc,
            projectId: projId,
            projectName: project ? project.name : 'Unknown',
            projectNumber: project ? project.number : '',
            projectColor: project ? project.color : '#3b82f6',
            site: site,
            date: dateInput,
            startTime: startInput,
            endTime: endInput,
            durationMs: this.calculateDurationMs(startInput, endInput)
        };

        this.logs.unshift(newLog); // Add to beginning
        this.saveData();
        this.renderLogs();
        this.clearInputs();
        if (window.showSuccess) window.showSuccess("Time log added manually.");
    },

    // --- STOPWATCH ---
    toggleTimer() {
        const descInput = document.getElementById('logDescription');
        const projSelect = document.getElementById('logProject');
        const siteSelect = document.getElementById('logSite');

        if (!this.running) {
            // Start Timer
            if (!projSelect.value) {
                alert("Please select a Project before starting the timer.");
                return;
            }

            this.running = true;
            this.startTime = Date.now();

            // UI changes
            document.getElementById('timerIcon').className = 'fa-solid fa-square';
            document.getElementById('timerText').textContent = 'Stop';
            const toggleBtn = document.getElementById('toggleTimerBtn');
            toggleBtn.style.backgroundColor = '#ef4444';
            toggleBtn.style.borderColor = '#ef4444';

            document.getElementById('runningTimeDisplay').style.display = 'inline-block';

            // Current input references to save with the timer session
            const activeData = {
                userId: this.currentUser.id,
                startTime: this.startTime,
                description: descInput.value.trim(),
                projectId: projSelect.value,
                site: siteSelect.value
            };
            localStorage.setItem('gravityHrActiveTimer', JSON.stringify(activeData));

            this.timerInterval = setInterval(() => this.updateTimerDisplay(), 1000);
            this.updateTimerDisplay(); // immediate call

            // Automatically set date to today for UI consistency
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            document.getElementById('logDate').value = `${yyyy}-${mm}-${dd}`;

        } else {
            // Stop Timer
            clearInterval(this.timerInterval);
            this.running = false;

            const endTime = Date.now();
            const activeData = JSON.parse(localStorage.getItem('gravityHrActiveTimer'));
            localStorage.removeItem('gravityHrActiveTimer');

            this.resetTimerUI();

            if (activeData) {
                // Calculate formatted start/end times
                const startD = new Date(activeData.startTime);
                const endD = new Date(endTime);

                const formatTime = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                const p = this.projects.find(proj => String(proj.id) === String(activeData.projectId));

                const newLog = {
                    id: Date.now(),
                    userId: this.currentUser.id,
                    userName: this.currentUser.name,
                    description: activeData.description,
                    projectId: activeData.projectId,
                    projectName: p ? p.name : 'Unknown',
                    projectNumber: p ? p.number : '',
                    projectColor: p ? p.color : '#3b82f6',
                    site: activeData.site,
                    date: formatDate(startD), // use start date
                    startTime: formatTime(startD),
                    endTime: formatTime(endD),
                    durationMs: endTime - activeData.startTime
                };

                this.logs.unshift(newLog);
                this.saveData();
                this.renderLogs();
                this.clearInputs();
                if (window.showSuccess) window.showSuccess("Timer stopped and logged successfully.");
            }
        }
    },

    resumeTimer(activeData) {
        this.running = true;
        this.startTime = activeData.startTime;

        // Restore inputs visually
        document.getElementById('logDescription').value = activeData.description || '';
        document.getElementById('logProject').value = activeData.projectId || '';
        this.onProjectChange();
        setTimeout(() => { document.getElementById('logSite').value = activeData.site || ''; }, 50);

        // Auto date UI
        const today = new Date();
        document.getElementById('logDate').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // UI changes
        document.getElementById('timerIcon').className = 'fa-solid fa-square';
        document.getElementById('timerText').textContent = 'Stop';
        const toggleBtn = document.getElementById('toggleTimerBtn');
        toggleBtn.style.backgroundColor = '#ef4444';
        toggleBtn.style.borderColor = '#ef4444';
        document.getElementById('runningTimeDisplay').style.display = 'inline-block';

        this.timerInterval = setInterval(() => this.updateTimerDisplay(), 1000);
        this.updateTimerDisplay();
    },

    updateTimerDisplay() {
        const now = Date.now();
        const diffMs = now - this.startTime;
        document.getElementById('runningTimeDisplay').textContent = this.formatDurationMs(diffMs);
    },

    resetTimerUI() {
        document.getElementById('timerIcon').className = 'fa-solid fa-play';
        document.getElementById('timerText').textContent = 'Start';
        const toggleBtn = document.getElementById('toggleTimerBtn');
        toggleBtn.style.backgroundColor = '#10b981';
        toggleBtn.style.borderColor = '#10b981';
        document.getElementById('runningTimeDisplay').style.display = 'none';
        document.getElementById('runningTimeDisplay').textContent = '00:00:00';
    },

    clearInputs() {
        document.getElementById('logDescription').value = '';
        document.getElementById('logProject').value = '';
        document.getElementById('selectedProjectText').innerHTML = 'Select Project';
        document.getElementById('logSite').innerHTML = '<option value="">Select Site</option>';
        document.getElementById('logDate').value = '';
        document.getElementById('logStartTime').value = '';
        document.getElementById('logEndTime').value = '';
    },

    // --- HELPERS ---
    calculateDurationMs(startStr, endStr) {
        const [sH, sM] = startStr.split(':').map(Number);
        const [eH, eM] = endStr.split(':').map(Number);
        let diffMins = (eH * 60 + eM) - (sH * 60 + sM);
        if (diffMins < 0) diffMins = 0;
        return diffMins * 60 * 1000;
    },

    formatDurationMs(ms) {
        if (!ms || ms < 0) return '00:00:00';
        let totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const pad = n => String(n).padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    },

    formatDurationShort(ms) {
        if (!ms || ms < 0) return '0h 0m';
        let totalMins = Math.floor(ms / 60000);
        const hours = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    },

    formatDateLabel(dateStr) {
        const today = new Date();
        const yest = new Date(today);
        yest.setDate(yest.getDate() - 1);

        const pad = n => String(n).padStart(2, '0');

        const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
        const yestStr = `${yest.getFullYear()}-${pad(yest.getMonth() + 1)}-${pad(yest.getDate())}`;

        if (dateStr === todayStr) return "Today";
        if (dateStr === yestStr) return "Yesterday";

        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    // --- RENDERING LOGS ---
    renderLogs() {
        const container = document.getElementById('logsContainer');
        if (!container) return;

        let userLogs = this.logs.filter(l => l.userId === this.currentUser.id);

        // Group by Date
        const grouped = {};
        userLogs.forEach(log => {
            if (!grouped[log.date]) grouped[log.date] = { totalMs: 0, items: [] };
            grouped[log.date].items.push(log);
            grouped[log.date].totalMs += log.durationMs;
        });

        // Sort dates descending
        const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

        if (sortedDates.length === 0) {
            container.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center; color: var(--text-dim);">No time logged yet. Start the tracker or add a manual entry.</div>`;
            return;
        }

        let html = '';

        sortedDates.forEach(date => {
            const group = grouped[date];
            html += `
            <div class="glass-panel table-container" style="margin-bottom: 2rem;">
                <div style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: space-between; background: rgba(59, 130, 246, 0.05);">
                    <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-color);"><i class="fa-regular fa-calendar" style="color: var(--primary-color);"></i> ${this.formatDateLabel(date)}</h3>
                    <div style="font-weight: 600; color: var(--primary-color); font-size: 1.1rem;">Total: ${this.formatDurationShort(group.totalMs)}</div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Project</th>
                            <th>Description</th>
                            <th>Time Log</th>
                            <th style="text-align: right;">Duration</th>
                            <th style="width: 80px; text-align: center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            // Sort items by start time descending
            group.items.sort((a, b) => b.startTime.localeCompare(a.startTime)).forEach(log => {
                const siteBadge = log.site ? `<span style="font-size: 0.75rem; background: var(--bg-color); border: 1px solid var(--glass-border); padding: 0.1rem 0.4rem; border-radius: 4px; margin-left: 0.5rem; color: var(--text-dim);"><i class="fa-solid fa-location-dot"></i> ${log.site}</span>` : '';

                html += `
                    <tr>
                        <td ondblclick="TimerApp.startInlineEdit(${log.id}, 'project', this)">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${log.projectColor}"></div>
                                <div style="display: flex; flex-direction: column;">
                                    <strong>${log.projectName}</strong>
                                    <span style="font-size: 0.75rem; color: var(--text-dim);">${log.projectNumber} ${siteBadge}</span>
                                </div>
                            </div>
                        </td>
                        <td ondblclick="TimerApp.startInlineEdit(${log.id}, 'description', this)">${log.description || '<em style="color:var(--text-dim)">No description</em>'}</td>
                        <td ondblclick="TimerApp.startInlineEdit(${log.id}, 'time', this)"><span style="color: var(--text-dim); font-family: monospace; font-size: 1.05em;"><i class="fa-regular fa-clock"></i> ${log.startTime} - ${log.endTime}</span></td>
                        <td style="text-align: right; font-weight: 600; font-family: monospace; font-size: 1.05em;">${this.formatDurationMs(log.durationMs)}</td>
                        <td style="text-align: center;">
                            <div style="display: flex; gap: 0.5rem; justify-content: center;">
                                <button class="btn-icon edit-btn" onclick="TimerApp.openEditModal(${log.id})" title="Edit Log">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button class="btn-icon delete-btn" style="color: #ef4444;" onclick="TimerApp.deleteLog(${log.id})" title="Delete Log">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
        });

        container.innerHTML = html;
    },

    // --- EDIT / DELETE LOGS ---
    deleteLog(id) {
        if (!confirm('Are you sure you want to delete this time log?')) return;
        this.logs = this.logs.filter(l => l.id !== id);
        this.saveData();
        this.renderLogs();
    },

    openEditModal(id) {
        const log = this.logs.find(l => l.id === id);
        if (!log) return;
        this.editLogId = id;
        document.getElementById('editLogDesc').value = log.description;
        document.getElementById('editLogDate').value = log.date;
        document.getElementById('editLogStart').value = log.startTime;
        document.getElementById('editLogEnd').value = log.endTime;

        const modal = document.getElementById('editLogModal');
        modal.classList.add('active');
        modal.style.display = 'flex';
    },

    closeEditModal() {
        this.editLogId = null;
        const modal = document.getElementById('editLogModal');
        modal.classList.remove('active');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    },

    saveEditedLog() {
        if (!this.editLogId) return;

        const desc = document.getElementById('editLogDesc').value.trim();
        const dateInput = document.getElementById('editLogDate').value;
        const startInput = document.getElementById('editLogStart').value;
        const endInput = document.getElementById('editLogEnd').value;

        if (!dateInput || !startInput || !endInput) {
            alert("Date, Start Time, and End Time are required.");
            return;
        }

        if (startInput >= endInput) {
            alert("End time must be after Start time.");
            return;
        }

        const logIndex = this.logs.findIndex(l => l.id === this.editLogId);
        if (logIndex > -1) {
            this.logs[logIndex].description = desc;
            this.logs[logIndex].date = dateInput;
            this.logs[logIndex].startTime = startInput;
            this.logs[logIndex].endTime = endInput;
            this.logs[logIndex].durationMs = this.calculateDurationMs(startInput, endInput);

            this.saveData();
            this.renderLogs();
            this.closeEditModal();
            if (window.showSuccess) window.showSuccess("Time log updated.");
        }
    },

    // --- INLINE EDITING ---
    startInlineEdit(logId, field, element) {
        const log = this.logs.find(l => l.id === logId);
        if (!log) return;

        // Prevent multiple simultaneous edits
        if (element.querySelector('input')) return;

        const originalHtml = element.innerHTML;
        element.innerHTML = '';

        if (field === 'description') {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = log.description || '';
            input.style.width = '100%';
            input.style.padding = '4px 8px';
            input.style.background = 'var(--input-bg)';
            input.style.color = 'var(--text-color)';
            input.style.border = '1px solid var(--primary-color)';
            input.style.borderRadius = '4px';

            const finish = (save) => {
                if (save) {
                    const newVal = input.value.trim();
                    log.description = newVal;
                    this.saveData();
                }
                this.renderLogs();
            };

            input.onblur = () => finish(true);
            input.onkeydown = (e) => {
                if (e.key === 'Enter') finish(true);
                if (e.key === 'Escape') finish(false);
            };

            element.appendChild(input);
            input.focus();
        } else if (field === 'time') {
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.gap = '4px';
            container.style.alignItems = 'center';

            const startInput = document.createElement('input');
            startInput.type = 'time';
            startInput.value = log.startTime;
            const endInput = document.createElement('input');
            endInput.type = 'time';
            endInput.value = log.endTime;

            [startInput, endInput].forEach(inp => {
                inp.style.padding = '2px';
                inp.style.background = 'var(--input-bg)';
                inp.style.color = 'var(--text-color)';
                inp.style.border = '1px solid var(--glass-border)';
                inp.style.borderRadius = '4px';
                inp.style.fontSize = '0.9rem';
            });

            const finish = (save) => {
                if (save) {
                    const s = startInput.value;
                    const e = endInput.value;
                    if (s < e) {
                        log.startTime = s;
                        log.endTime = e;
                        log.durationMs = this.calculateDurationMs(s, e);
                        this.saveData();
                    } else {
                        alert("End time must be after start time.");
                    }
                }
                this.renderLogs();
            };

            // Complex blur handling (only finish if neither input is focused)
            const handleBlur = () => {
                setTimeout(() => {
                    if (document.activeElement !== startInput && document.activeElement !== endInput) {
                        finish(true);
                    }
                }, 10);
            };

            startInput.onblur = handleBlur;
            endInput.onblur = handleBlur;

            [startInput, endInput].forEach(inp => {
                inp.onkeydown = (e) => {
                    if (e.key === 'Enter') finish(true);
                    if (e.key === 'Escape') finish(false);
                };
            });

            container.appendChild(startInput);
            container.appendChild(document.createTextNode('-'));
            container.appendChild(endInput);
            element.appendChild(container);
            startInput.focus();
        } else if (field === 'project') {
            const select = document.createElement('select');
            select.style.width = '100%';
            select.style.padding = '4px';
            select.style.background = 'var(--input-bg)';
            select.style.color = 'var(--text-color)';
            select.style.border = '1px solid var(--primary-color)';
            
            // Filter: same as create log
            let activeProjects = this.projects.filter(p => p.status !== 'Completed');
            
            let html = '<option value="">Select Project</option>';
            activeProjects.forEach(p => {
                html += `<option value="${p.id}" ${String(p.id) === String(log.projectId) ? 'selected' : ''}>${p.number} - ${p.name}</option>`;
            });
            select.innerHTML = html;

            const finish = (save) => {
                if (save) {
                    const newId = select.value;
                    if (newId) {
                        const p = this.projects.find(proj => String(proj.id) === String(newId));
                        if (p) {
                            log.projectId = p.id;
                            log.projectName = p.name;
                            log.projectNumber = p.number;
                            log.projectColor = p.color;
                            this.saveData();
                        }
                    }
                }
                this.renderLogs();
            };

            select.onblur = () => finish(true);
            select.onchange = () => finish(true);
            select.onkeydown = (e) => {
                if (e.key === 'Enter') finish(true);
                if (e.key === 'Escape') finish(false);
            };

            element.appendChild(select);
            select.focus();
        }
    }
};

window.addEventListener('DOMContentLoaded', () => {
    TimerApp.init();
});
