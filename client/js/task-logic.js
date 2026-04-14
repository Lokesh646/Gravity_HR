// Task Management Application Logic
// Handles Projects, Sites, Comments, and Assignments

const TaskApp = {
    // Current State
    projects: [],
    currentProject: null,
    currentUser: null,
    sortColumn: 'number',
    sortDir: 'asc',
    selectedTab: 'projects',
    clients: [],
    tags: [],

    // DOM Elements (will be populated on init)
    elements: {},

    init() {
        this.currentUser = Auth.getCurrentUser();
        // Fallback for demo purposes if not logged in
        if (!this.currentUser) {
            this.currentUser = { id: 'A1', name: 'System Admin', role: 'Admin' };
        }

        this.loadData();
        this.cacheElements();
        this.bindEvents();
        this.populateDropdowns();
        
        // Restore tab UI state (Robustly using IDs)
        const tabBtn = document.getElementById(`tab-btn-${this.selectedTab}`);
        if (tabBtn) {
            this.switchTab(this.selectedTab, tabBtn);
        } else {
            // Fallback
            this.renderProjects();
        }

        this.updateSortIcons();

        // Hide create button for non-admins/managers if needed (handled visually in html, but enforcing here)
        if (this.currentUser.role === 'Employee' || this.currentUser.role === 'Team Leader') {
            if (this.elements.createBtn) this.elements.createBtn.style.display = 'none';
        }
    },

    cacheElements() {
        this.elements = {
            createBtn: document.getElementById('createProjectBtn'),
            projectsContainer: document.getElementById('projectsContainer'),

            // Create Modal
            createModal: document.getElementById('createProjectModal'),
            createForm: document.getElementById('createProjectForm'),
            assigneeSelect: document.getElementById('projAssignee'),

            // Details Modal
            detailsModal: document.getElementById('projectDetailsModal'),
            detailColorTag: document.getElementById('detailColorTag'),
            detailProjName: document.getElementById('detailProjName'),
            detailProjStatus: document.getElementById('detailProjStatus'),

            detailNumber: document.getElementById('detailNumber'),
            detailClientId: document.getElementById('detailClientId'),
            detailDate: document.getElementById('detailDate'),
            detailDeadline: document.getElementById('detailDeadline'),
            detailPriority: document.getElementById('detailPriority'),
            detailAssignee: document.getElementById('detailAssignee'),
            detailAssignedBy: document.getElementById('detailAssignedBy'),

            timelineSelect: document.getElementById('timelineSelect'),

            // Sites
            sitesList: document.getElementById('sitesList'),
            addSiteContainer: document.getElementById('addSiteContainer'),
            newSiteName: document.getElementById('newSiteName'),

            // Comments
            commentsFeed: document.getElementById('commentsFeed'),
            newCommentText: document.getElementById('newCommentText'),

            // Edit Assignee
            editAssigneeBtn: document.getElementById('editAssigneeBtn'),
            editAssigneeContainer: document.getElementById('editAssigneeContainer'),
            editAssigneeSelect: document.getElementById('editAssigneeSelect'),

            // Subtasks
            addSubtaskForm: document.getElementById('addSubtaskForm'),
            newSubtaskName: document.getElementById('newSubtaskName'),
            subtasksList: document.getElementById('subtasksList'),

            // Search & Import
            projectSearch: document.getElementById('projectSearch'),
            importModal: document.getElementById('importModal'),
            csvFileInput: document.getElementById('csvFileInput'),

            // Add Client
            addClientModal: document.getElementById('addClientModal'),
            addClientForm: document.getElementById('addClientForm'),
            newClientId: document.getElementById('newClientId'),

            // Add Tag
            addTagModal: document.getElementById('addTagModal'),
            addTagForm: document.getElementById('addTagForm'),
            newTagName: document.getElementById('newTagName'),
            newTagColor: document.getElementById('newTagColor'),

            // Create Project Client Dropdown
            createClientSelectBtn: document.getElementById('createClientSelectBtn'),
            createClientDropdownMenu: document.getElementById('createClientDropdownMenu'),
            createClientSearchInput: document.getElementById('createClientSearchInput'),
            createClientOptionsList: document.getElementById('createClientOptionsList'),
            projClientId: document.getElementById('projClientId'),
            createSelectedClientText: document.getElementById('createSelectedClientText'),

            // Edit Project Client Dropdown
            editClientSelectBtn: document.getElementById('editClientSelectBtn'),
            editClientDropdownMenu: document.getElementById('editClientDropdownMenu'),
            editClientSearchInput: document.getElementById('editClientSearchInput'),
            editClientOptionsList: document.getElementById('editClientOptionsList'),
            editProjClientId: document.getElementById('editProjClientId'),
            editSelectedClientText: document.getElementById('editSelectedClientText')
        };
    },

    bindEvents() {
        if (this.elements.createForm) {
            this.elements.createForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateProject();
            });
        }
        if (this.elements.addSubtaskForm) {
            this.elements.addSubtaskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addSubtask();
            });
        }
        if (this.elements.projectSearch) {
            this.elements.projectSearch.addEventListener('input', () => {
                this.renderProjects();
            });
        }

        if (this.elements.addClientForm) {
            this.elements.addClientForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addClient();
            });
        }

        if (this.elements.addTagForm) {
            this.elements.addTagForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addTag();
            });
        }

        // Global click to close custom dropdowns
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-select-container')) {
                document.querySelectorAll('.custom-select-container .glass-panel').forEach(menu => {
                    menu.style.display = 'none';
                });
            }
        });
    },

    saveData() {
        localStorage.setItem('gravityHrProjects', JSON.stringify(this.projects));
        localStorage.setItem('gravityHrClients', JSON.stringify(this.clients));
        localStorage.setItem('gravityHrTags', JSON.stringify(this.tags));
        localStorage.setItem('gravityHrSelectedTab', this.selectedTab);
    },

    loadData() {
        // Load selected tab and sort state FIRST to avoid race conditions during internal saves
        const storedTab = localStorage.getItem('gravityHrSelectedTab');
        if (storedTab) this.selectedTab = storedTab;

        const storedSortCol = localStorage.getItem('gravityHrProjectSortCol');
        const storedSortDir = localStorage.getItem('gravityHrProjectSortDir');
        if (storedSortCol) this.sortColumn = storedSortCol;
        if (storedSortDir) this.sortDir = storedSortDir;

        // Load Projects
        const storedProjs = localStorage.getItem('gravityHrProjects');
        if (storedProjs) {
            this.projects = JSON.parse(storedProjs);
        } else {
            // Initial seed data
            this.projects = [
                {
                    id: 1,
                    number: 'PRJ-001',
                    name: 'Alpha Site Deployment',
                    date: '2026-03-01',
                    deadline: '2026-04-15',
                    color: '#6366f1',
                    priority: 'High',
                    status: 'In Progress',
                    assignedToId: '1',
                    assignedToName: 'Raj',
                    assignedById: 'M1',
                    assignedByName: 'Karthik',
                    sites: ['Site Alpha North', 'Site Alpha South'],
                    comments: [],
                    subtasks: []
                }
            ];
            this.saveData();
        }

        // Load Clients
        const storedClients = localStorage.getItem('gravityHrClients');
        if (storedClients) {
            const parsed = JSON.parse(storedClients);
            // Migrate: if old format (has 'name') or empty, reset to MS seed
            if (parsed.length === 0 || (parsed.length > 0 && parsed[0].name)) {
                this.clients = [{ id: 'MS01' }, { id: 'MS02' }];
                this.saveData();
            } else {
                this.clients = parsed;
            }
        } else {
            this.clients = [{ id: 'MS01' }, { id: 'MS02' }];
            this.saveData();
        }

        // Load Tags
        const storedTags = localStorage.getItem('gravityHrTags');
        if (storedTags) {
            this.tags = JSON.parse(storedTags);
        } else {
            this.tags = [
                { id: 'T1', name: 'Development', color: '#6366f1' },
                { id: 'T2', name: 'Design', color: '#ec4899' },
                { id: 'T3', name: 'Marketing', color: '#f59e0b' }
            ];
            this.saveData();
        }
    },

    // Helper: Get Team Leaders from live STATE.employees (preferred) or fallback to data.js
    getTeamLeaders() {
        // Use live dynamic employee state first
        if (typeof STATE !== 'undefined' && STATE.employees && STATE.employees.length > 0) {
            return STATE.employees.filter(e => e.role === 'Team Leader' && e.status === 'active');
        }
        // Fallback to static data.js
        if (window.DashboardData && window.DashboardData.getAllTeamLeaders) {
            const staticTls = window.DashboardData.getAllTeamLeaders();
            // Convert to common format {id, name}
            return staticTls.map(tl => ({ id: String(tl.id), name: tl.name }));
        }
        return [];
    },

    populateDropdowns() {
        if (!this.elements.assigneeSelect) return;

        const tls = this.getTeamLeaders();

        // Populate Team Leaders dropdown
        let html = '<option value="">Select Team Leader</option>';
        tls.forEach(tl => {
            html += `<option value="${tl.id}">${tl.name} (TL)</option>`;
        });
        this.elements.assigneeSelect.innerHTML = html;
    },

    // --- RENDERING ---

    renderProjects() {
        const currentContainer = document.getElementById('projectsContainer');
        const completedContainer = document.getElementById('completedProjectsContainer');
        if (!currentContainer) return;

        const searchQuery = this.elements.projectSearch ? this.elements.projectSearch.value.toLowerCase() : '';
        const currentUserRole = this.currentUser.role;
        const currentUserId = this.currentUser.id;

        // Filter: Admins/Managers see all; Employees/TLs see only assigned projects
        let displayProjects = this.projects.filter(p => {
            if (currentUserRole === 'Employee' || currentUserRole === 'Team Leader') {
                return (p.assignedToId === currentUserId || p.assignedById === currentUserId);
            }
            return true;
        });

        // Search text filtering
        if (searchQuery) {
            displayProjects = displayProjects.filter(p =>
                p.name.toLowerCase().includes(searchQuery) ||
                p.number.toLowerCase().includes(searchQuery)
            );
        }

        // Apply Sorting
        displayProjects.sort((a, b) => {
            let valA = a[this.sortColumn] || '';
            let valB = b[this.sortColumn] || '';
            
            // Handle numeric strings if needed (e.g., project numbers)
            if (this.sortColumn === 'number') {
                return this.sortDir === 'asc' 
                    ? valA.localeCompare(valB, undefined, {numeric: true})
                    : valB.localeCompare(valA, undefined, {numeric: true});
            }

            if (valA < valB) return this.sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return this.sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        // Split into current vs completed
        const currentProjects = displayProjects.filter(p => p.status !== 'Completed');
        const completedProjects = displayProjects.filter(p => p.status === 'Completed');

        const buildRow = (p, isCompleted) => {
            const prioClass = `priority-${p.priority.toLowerCase()}`;
            const statusClass = `status-${p.status.toLowerCase().replace(/ /g, '-')}`;
            const lastCol = isCompleted
                ? `<td style="color: #22c55e; font-size: 0.85rem;"><i class="fa-solid fa-calendar-check"></i> ${p.completedOn ? this.formatDateTime(p.completedOn) : '—'}</td>`
                : `<td><span class="badge ${statusClass}">${p.status}</span></td>`;

            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${p.color}"></div>
                            <strong>${p.number}</strong>
                        </div>
                    </td>
                    <td>${p.name}</td>
                    <td>${p.clientId || '—'}</td>
                    <td>${this.formatDate(p.deadline)}</td>
                    <td><span class="${prioClass}"><i class="fa-solid fa-flag"></i> ${p.priority}</span></td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.3rem;">
                            <i class="fa-solid fa-user-tie" style="color: var(--primary-color);"></i>
                            ${p.assignedToName || '<span class="text-dim">Not Assigned</span>'}
                        </div>
                    </td>
                    ${lastCol}
                    <td>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn-icon edit-btn" onclick="TaskApp.openDetailsModal(${p.id})" title="View Details">
                                <i class="fa-regular fa-eye"></i>
                            </button>
                            ${(currentUserRole !== 'Employee' && currentUserRole !== 'Team Leader') ? `
                                <button class="btn-icon delete-btn" onclick="TaskApp.deleteProject(${p.id})" title="Delete" style="color: #ef4444;">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        };

        // Render current projects
        if (currentProjects.length === 0) {
            currentContainer.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem;"><p class="text-dim">No active projects found.</p></td></tr>`;
        } else {
            currentContainer.innerHTML = currentProjects.map(p => buildRow(p, false)).join('');
        }
        const currentCount = document.getElementById('currentProjectCount');
        if (currentCount) currentCount.textContent = `${currentProjects.length} project${currentProjects.length !== 1 ? 's' : ''}`;

        // Render completed projects
        if (completedContainer) {
            if (completedProjects.length === 0) {
                completedContainer.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem;"><p class="text-dim">No completed projects yet.</p></td></tr>`;
            } else {
                completedContainer.innerHTML = completedProjects.map(p => buildRow(p, true)).join('');
            }
            const completedCount = document.getElementById('completedProjectCount');
            if (completedCount) completedCount.textContent = `${completedProjects.length} project${completedProjects.length !== 1 ? 's' : ''}`;
        }
    },

    switchTab(tabId, btn) {
        this.selectedTab = tabId;
        this.saveData();

        // Update UI
        document.querySelectorAll('.tab-btn-nav').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
        const activePane = document.getElementById(`tab-${tabId}`);
        if (activePane) activePane.style.display = 'block';

        // Render content for current tab
        if (tabId === 'projects') this.renderProjects();
        if (tabId === 'clients') this.renderClients();
        if (tabId === 'tags') this.renderTags();
    },

    renderClients() {
        const container = document.getElementById('clientsContainer');
        if (!container) return;

        if (this.clients.length === 0) {
            container.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 2rem;"><p class="text-dim">No clients found.</p></td></tr>`;
            return;
        }

        container.innerHTML = this.clients.map(c => `
            <tr>
                <td><strong>${c.id}</strong></td>
                <td style="text-align: right; padding-right: 1.5rem;">
                    <button class="btn-icon delete-btn" onclick="TaskApp.deleteClient('${c.id}')" title="Delete Client" style="color: #ef4444;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        const countEl = document.getElementById('clientCount');
        if (countEl) countEl.textContent = `${this.clients.length} client${this.clients.length !== 1 ? 's' : ''}`;
    },

    showAddClientModal() {
        if (this.elements.addClientModal) {
            this.elements.addClientModal.classList.add('active');
            if (this.elements.newClientId) this.elements.newClientId.focus();
        }
    },

    closeAddClientModal() {
        if (this.elements.addClientModal) {
            this.elements.addClientModal.classList.remove('active');
        }
        if (this.elements.addClientForm) this.elements.addClientForm.reset();
    },

    addClient() {
        const id = this.elements.newClientId.value.trim();
        if (!id) return;

        if (this.clients.some(c => c.id === id)) {
            alert('Client ID already exists.');
            return;
        }

        this.clients.push({ id });
        this.saveData();
        this.closeAddClientModal();
        this.renderClients();
    },

    showConfirm(title, message, onOk) {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const msgEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOkBtn');

        if (!modal || !okBtn) return;

        titleEl.textContent = title;
        msgEl.textContent = message;
        modal.classList.add('active');

        // Rebind OK button
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        newOkBtn.addEventListener('click', () => {
            onOk();
            this.closeConfirm();
        });
    },

    closeConfirm() {
        const modal = document.getElementById('confirmModal');
        if (modal) modal.classList.remove('active');
    },

    deleteClient(id) {
        this.showConfirm(
            'Delete Client',
            `Are you sure you want to delete client ${id}? This action cannot be undone.`,
            () => {
                this.clients = this.clients.filter(c => c.id !== id);
                this.saveData();
                this.renderClients();
            }
        );
    },

    renderTags() {
        const grid = document.getElementById('tagsGrid');
        if (!grid) return;

        if (this.tags.length === 0) {
            grid.innerHTML = `<div class="text-dim" style="grid-column: 1/-1; text-align: center; padding: 2rem;">No tags found.</div>`;
            return;
        }

        grid.innerHTML = this.tags.map(t => `
            <div class="glass-panel" style="padding: 1rem; display: flex; align-items: center; gap: 1rem; border-left: 4px solid ${t.color};">
                <div style="width: 32px; height: 32px; border-radius: 8px; background: ${t.color}22; color: ${t.color}; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-tag"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 0.9rem;">${t.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-dim);">#${t.id}</div>
                </div>
                <button class="btn-icon" onclick="TaskApp.deleteTag('${t.id}')" title="Delete Tag" style="font-size: 0.8rem; color: #ef4444;"><i class="fa-solid fa-trash"></i></button>
            </div>
        `).join('');
    },

    showAddTagModal() {
        if (this.elements.addTagModal) {
            this.elements.addTagModal.classList.add('active');
            if (this.elements.newTagName) this.elements.newTagName.focus();
        }
    },

    closeAddTagModal() {
        if (this.elements.addTagModal) {
            this.elements.addTagModal.classList.remove('active');
        }
        if (this.elements.addTagForm) this.elements.addTagForm.reset();
    },

    addTag() {
        const name = this.elements.newTagName.value.trim();
        const color = this.elements.newTagColor.value;
        if (!name) return;

        const id = 'T' + Date.now();
        this.tags.push({ id, name, color });
        this.saveData();
        this.closeAddTagModal();
        this.renderTags();
    },

    deleteTag(id) {
        this.showConfirm(
            'Delete Tag',
            'Are you sure you want to delete this tag?',
            () => {
                this.tags = this.tags.filter(t => t.id !== id);
                this.saveData();
                this.renderTags();
            }
        );
    },

    deleteProject(id) {
        if (confirm("Are you sure you want to delete this project? This cannot be undone.")) {
            this.projects = this.projects.filter(p => p.id !== id);
            this.saveData();
            this.renderProjects();
        }
    },

    handleSort(column) {
        if (this.sortColumn === column) {
            this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDir = 'asc';
        }
        
        // Save sort state
        localStorage.setItem('gravityHrProjectSortCol', this.sortColumn);
        localStorage.setItem('gravityHrProjectSortDir', this.sortDir);

        this.renderProjects();
        this.updateSortIcons();
    },

    updateSortIcons() {
        const headers = document.querySelectorAll('th[onclick^="TaskApp.handleSort"]');
        headers.forEach(th => {
            const col = th.getAttribute('onclick').match(/'([^']+)'/)[1];
            const icon = th.querySelector('i');
            if (icon) {
                if (col === this.sortColumn) {
                    icon.className = `fa-solid fa-sort-${this.sortDir === 'asc' ? 'up' : 'down'}`;
                    icon.style.color = 'var(--primary-color)';
                } else {
                    icon.className = 'fa-solid fa-sort';
                    icon.style.color = '';
                }
            }
        });
    },

    // --- CLIENT DROPDOWN LOGIC ---
    toggleCreateClientDropdown(e) {
        if (e) e.stopPropagation();
        const menu = this.elements.createClientDropdownMenu;
        if (!menu) return;
        
        document.querySelectorAll('.custom-select-container .glass-panel').forEach(m => {
            if(m !== menu) m.style.display = 'none';
        });

        const isHidden = menu.style.display === 'none';
        if (isHidden) {
            menu.style.display = 'block';
            this.populateCreateClientDropdown();
            if (this.elements.createClientSearchInput) {
                this.elements.createClientSearchInput.value = '';
                this.elements.createClientSearchInput.focus();
            }
        } else {
            menu.style.display = 'none';
        }
    },

    populateCreateClientDropdown(filterText = '') {
        const list = this.elements.createClientOptionsList;
        if (!list) return;

        let clients = this.clients || [];
        if (filterText) {
            const lowerFilter = filterText.toLowerCase();
            clients = clients.filter(c => c.id.toLowerCase().includes(lowerFilter));
        }

        if (clients.length === 0) {
            list.innerHTML = `<div style="padding: 0.8rem; text-align: center; color: var(--text-dim); font-size: 0.85rem;">No clients found</div>`;
            return;
        }

        list.innerHTML = clients.map(c => `
            <div class="search-option ${this.elements.projClientId.value === c.id ? 'selected' : ''}" 
                 onclick="TaskApp.selectCreateClient('${c.id}')">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--primary-color);"></div>
                <div class="option-main">${c.id}</div>
            </div>
        `).join('');
    },

    filterCreateClientsDropdown() {
        if (!this.elements.createClientSearchInput) return;
        this.populateCreateClientDropdown(this.elements.createClientSearchInput.value);
    },

    selectCreateClient(id) {
        if (this.elements.projClientId) this.elements.projClientId.value = id;
        if (this.elements.createSelectedClientText) this.elements.createSelectedClientText.textContent = id;
        if (this.elements.createClientDropdownMenu) this.elements.createClientDropdownMenu.style.display = 'none';
    },

    // Edit Modal Dropdown
    toggleEditClientDropdown(e) {
        if (e) e.stopPropagation();
        const menu = this.elements.editClientDropdownMenu;
        if (!menu) return;
        
        document.querySelectorAll('.custom-select-container .glass-panel').forEach(m => {
            if(m !== menu) m.style.display = 'none';
        });

        const isHidden = menu.style.display === 'none';
        if (isHidden) {
            menu.style.display = 'block';
            this.populateEditClientDropdown();
            if (this.elements.editClientSearchInput) {
                this.elements.editClientSearchInput.value = '';
                this.elements.editClientSearchInput.focus();
            }
        } else {
            menu.style.display = 'none';
        }
    },

    populateEditClientDropdown(filterText = '') {
        const list = this.elements.editClientOptionsList;
        if (!list) return;

        let clients = this.clients || [];
        if (filterText) {
            const lowerFilter = filterText.toLowerCase();
            clients = clients.filter(c => c.id.toLowerCase().includes(lowerFilter));
        }

        if (clients.length === 0) {
            list.innerHTML = `<div style="padding: 0.8rem; text-align: center; color: var(--text-dim); font-size: 0.85rem;">No clients found</div>`;
            return;
        }

        list.innerHTML = clients.map(c => `
            <div class="search-option ${this.elements.editProjClientId.value === c.id ? 'selected' : ''}" 
                 onclick="TaskApp.selectEditClient('${c.id}')">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--primary-color);"></div>
                <div class="option-main">${c.id}</div>
            </div>
        `).join('');
    },

    filterEditClientsDropdown() {
        if (!this.elements.editClientSearchInput) return;
        this.populateEditClientDropdown(this.elements.editClientSearchInput.value);
    },

    selectEditClient(id) {
        if (this.elements.editProjClientId) this.elements.editProjClientId.value = id;
        if (this.elements.editSelectedClientText) this.elements.editSelectedClientText.textContent = id;
        if (this.elements.editClientDropdownMenu) this.elements.editClientDropdownMenu.style.display = 'none';
    },

    // --- MODAL CONTROLS ---

    openCreateModal() {
        this.elements.createForm.reset();
        
        // Reset Custom Dropdown
        if (this.elements.projClientId) this.elements.projClientId.value = '';
        if (this.elements.createSelectedClientText) this.elements.createSelectedClientText.textContent = 'Select Client';

        // Default start date to today
        document.getElementById('projDate').valueAsDate = new Date();
        this.elements.createModal.classList.add('active');
    },

    closeCreateModal() {
        this.elements.createModal.classList.remove('active');
    },

    handleCreateProject() {
        const tlSelect = document.getElementById('projAssignee');
        const tlid = tlSelect ? tlSelect.value : '';
        const tlName = tlid ? tlSelect.options[tlSelect.selectedIndex].text.replace(' (TL)', '') : '';

        const newProject = {
            id: Date.now(),
            number: document.getElementById('projNumber').value,
            name: document.getElementById('projName').value,
            clientId: document.getElementById('projClientId').value,
            date: document.getElementById('projDate').value,
            deadline: document.getElementById('projDeadline').value,
            color: document.getElementById('projColor').value,
            priority: document.getElementById('projPriority').value,
            status: document.getElementById('projStatus').value || 'Created',
            assignedToId: tlid,
            assignedToName: tlName,
            assignedById: this.currentUser.id,
            assignedByName: this.currentUser.name,
            sites: [],
            comments: [],
            subtasks: []
        };

        this.projects.push(newProject);
        this.saveData();
        this.renderProjects();
        this.closeCreateModal();

        // Show success
        if (window.showSuccessModal) {
            window.showSuccessModal("Project Created", `${newProject.name} has been successfully created.`);
        } else {
            alert('Project created successfully!');
        }
    },

    openDetailsModal(id) {
        this.currentProject = this.projects.find(p => p.id === id);
        if (!this.currentProject) return;

        const p = this.currentProject;

        // Header
        this.elements.detailColorTag.style.backgroundColor = p.color;
        this.elements.detailProjName.textContent = p.name;

        const statusClass = `status-${p.status.toLowerCase().replace(/ /g, '-')}`;
        this.elements.detailProjStatus.className = `badge ${statusClass}`;
        this.elements.detailProjStatus.textContent = p.status;

        // Info Grid
        this.elements.detailNumber.textContent = p.number;
        if (this.elements.detailClientId) this.elements.detailClientId.textContent = p.clientId || 'Not Assigned';
        this.elements.detailDate.textContent = this.formatDate(p.date);
        this.elements.detailDeadline.textContent = this.formatDate(p.deadline);

        // Priority styling
        const prioClass = `priority-${p.priority.toLowerCase()}`;
        this.elements.detailPriority.innerHTML = `<span class="${prioClass}"><i class="fa-solid fa-flag"></i> ${p.priority}</span>`;

        this.elements.detailAssignee.textContent = p.assignedToName;
        this.elements.detailAssignedBy.textContent = p.assignedByName;

        // Edit Assignee Button Logic
        if (this.elements.editAssigneeBtn) {
            if (this.currentUser.role === 'Employee' || this.currentUser.role === 'Team Leader') {
                this.elements.editAssigneeBtn.style.display = 'none';
            } else {
                this.elements.editAssigneeBtn.style.display = 'inline-block';
            }
        }
        this.cancelEditAssignee(); // ensure edit state is reset

        // Timeline Select
        if (this.elements.timelineSelect) {
            this.elements.timelineSelect.value = p.status;
            // Managers/Admins only
            if (this.currentUser.role === 'Employee' || this.currentUser.role === 'Team Leader') {
                this.elements.timelineSelect.disabled = true;
                this.elements.timelineSelect.nextElementSibling.style.display = 'none'; // hide update btn
            } else {
                this.elements.timelineSelect.disabled = false;
                this.elements.timelineSelect.nextElementSibling.style.display = 'inline-block';
            }
        }

        // Reset completion date UI
        const completionSection = document.getElementById('completionDateSection');
        const completionDisplay = document.getElementById('completionDateDisplay');
        const completionText = document.getElementById('completionDateText');
        const completionInput = document.getElementById('completionDateTime');

        if (completionSection) completionSection.style.display = 'none';
        if (completionInput) completionInput.value = '';

        if (completionDisplay && completionText) {
            if (p.completedOn) {
                completionText.textContent = this.formatDateTime(p.completedOn);
                completionDisplay.style.display = 'block';
            } else {
                completionDisplay.style.display = 'none';
            }
        }

        // Reset edit form state
        this.cancelEditProject();

        // Refresh Edited tags for any previously edited fields
        this.refreshEditedTags();

        // Hide Edit button for Employees/TLs
        const editProjectBtn = document.getElementById('editProjectBtn');
        if (editProjectBtn) {
            editProjectBtn.style.display = (this.currentUser.role === 'Employee' || this.currentUser.role === 'Team Leader') ? 'none' : 'inline-flex';
        }

        this.renderSites();
        this.renderSubtasks();
        this.renderComments();
        this.hideAddSiteInput();

        this.elements.detailsModal.classList.add('active');
    },

    closeDetailsModal() {
        this.elements.detailsModal.classList.remove('active');
        this.currentProject = null;
    },

    // --- ASSIGNEE EDITING ---
    showEditAssignee() {
        if (!this.currentProject || !this.elements.editAssigneeContainer) return;
        this.elements.editAssigneeBtn.style.display = 'none';
        this.elements.detailAssignee.style.display = 'none';

        const tls = this.getTeamLeaders();
        let html = '<option value="">Select Team Leader</option>';
        tls.forEach(tl => {
            const selected = (String(tl.id) === String(this.currentProject.assignedToId)) ? 'selected' : '';
            html += `<option value="${tl.id}" ${selected}>${tl.name} (TL)</option>`;
        });
        this.elements.editAssigneeSelect.innerHTML = html;
        this.elements.editAssigneeContainer.style.display = 'inline-flex';
    },

    cancelEditAssignee() {
        if (!this.elements.editAssigneeContainer) return;
        this.elements.editAssigneeContainer.style.display = 'none';
        this.elements.detailAssignee.style.display = 'inline-block';
        if (this.elements.editAssigneeBtn && (this.currentUser.role !== 'Employee' && this.currentUser.role !== 'Team Leader')) {
            this.elements.editAssigneeBtn.style.display = 'inline-block';
        }
    },

    saveAssignee() {
        if (!this.currentProject) return;
        const newTlId = this.elements.editAssigneeSelect.value;
        if (!newTlId || newTlId == this.currentProject.assignedToId) {
            this.cancelEditAssignee();
            return;
        }

        const tlSelect = this.elements.editAssigneeSelect;
        const tlName = tlSelect.options[tlSelect.selectedIndex].text.replace(' (TL)', '');

        this.currentProject.assignedToId = newTlId;
        this.currentProject.assignedToName = tlName;

        // Re-assigning means existing employee assignments might be invalid because they belong to the old TL's team.
        // We will unassign all subtasks automatically to prevent weird states.
        if (this.currentProject.subtasks) {
            this.currentProject.subtasks.forEach(st => st.assignedTo = null);
        }

        this.addSystemComment(`Project reassigned to ${tlName}`);
        this.saveData();

        // Update UI
        this.elements.detailAssignee.textContent = tlName;
        this.cancelEditAssignee();
        this.renderProjects(); // Update grid behind it
        this.renderSubtasks(); // Re-render to clear team assignments dropdowns
    },

    // --- EDIT PROJECT ---
    toggleEditProjectForm() {
        const form = document.getElementById('editProjectForm');
        if (!form || !this.currentProject) return;
        const isHidden = form.style.display === 'none';
        if (isHidden) {
            // Populate form with current values
            const p = this.currentProject;
            document.getElementById('editProjNumber').value = p.number || '';
            
            // Client Dropdown Populate
            if (this.elements.editProjClientId) this.elements.editProjClientId.value = p.clientId || '';
            if (this.elements.editSelectedClientText) this.elements.editSelectedClientText.textContent = p.clientId || 'Select Client';

            document.getElementById('editProjName').value = p.name || '';
            document.getElementById('editProjDate').value = p.date || '';
            document.getElementById('editProjDeadline').value = p.deadline || '';
            document.getElementById('editProjPriority').value = p.priority || 'Medium';
            document.getElementById('editProjStatus').value = p.status || 'Created';
            document.getElementById('editProjColor').value = p.color || '#3b82f6';
            form.style.display = 'block';
            document.getElementById('editProjectBtn').innerHTML = '<i class="fa-solid fa-xmark"></i> Close Edit';
        } else {
            form.style.display = 'none';
            document.getElementById('editProjectBtn').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit';
        }
    },

    cancelEditProject() {
        const form = document.getElementById('editProjectForm');
        if (form) form.style.display = 'none';
        const btn = document.getElementById('editProjectBtn');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit';
    },

    saveProjectEdit() {
        if (!this.currentProject) return;
        const p = this.currentProject;

        const fields = {
            number: document.getElementById('editProjNumber').value.trim(),
            name: document.getElementById('editProjName').value.trim(),
            clientId: document.getElementById('editProjClientId') ? document.getElementById('editProjClientId').value : p.clientId,
            date: document.getElementById('editProjDate').value,
            deadline: document.getElementById('editProjDeadline').value,
            priority: document.getElementById('editProjPriority').value,
            status: document.getElementById('editProjStatus').value,
            color: document.getElementById('editProjColor').value,
        };

        if (!fields.name || !fields.number) {
            alert('Project Name and Number are required.');
            return;
        }

        // Track which fields were edited compared to their current (saved) values
        if (!p.editedFields) p.editedFields = {};

        const trackableFields = ['number', 'name', 'clientId', 'date', 'deadline', 'priority', 'status', 'color'];
        const changeLog = [];

        trackableFields.forEach(key => {
            if (fields[key] !== p[key]) {
                // Mark as edited (store original value)
                if (!p.editedFields[key]) {
                    p.editedFields[key] = p[key]; // store original
                }
                changeLog.push(`${key}: "${p[key]}" → "${fields[key]}"`);
                p[key] = fields[key];
            }
        });

        if (changeLog.length === 0) {
            this.cancelEditProject();
            return;
        }

        this.saveData();
        this.renderProjects();

        // Refresh the modal info display
        this.elements.detailProjName.textContent = p.name;
        this.elements.detailColorTag.style.backgroundColor = p.color;
        this.elements.detailNumber.textContent = p.number;
        if (this.elements.detailClientId) this.elements.detailClientId.textContent = p.clientId || 'Not Assigned';
        this.elements.detailDate.textContent = this.formatDate(p.date);
        this.elements.detailDeadline.textContent = this.formatDate(p.deadline);
        const prioClass = `priority-${p.priority.toLowerCase()}`;
        this.elements.detailPriority.innerHTML = `<span class="${prioClass}"><i class="fa-solid fa-flag"></i> ${p.priority}</span>`;

        const statusClass = `status-${p.status.toLowerCase().replace(/ /g, '-')}`;
        this.elements.detailProjStatus.className = `badge ${statusClass}`;
        this.elements.detailProjStatus.textContent = p.status;
        this.elements.timelineSelect.value = p.status;

        // Show 'Edited' tags for relevant fields
        this.refreshEditedTags();

        this.addSystemComment(`Project details updated — ${changeLog.join(', ')}`);
        this.cancelEditProject();

        if (window.showSuccess) {
            window.showSuccess('Project updated successfully.');
        }
    },

    refreshEditedTags() {
        if (!this.currentProject) return;
        const ef = this.currentProject.editedFields || {};

        const deadlineTag = document.getElementById('deadlineEditedTag');
        if (deadlineTag) deadlineTag.style.display = ef.deadline ? 'inline' : 'none';

        const priorityTag = document.getElementById('priorityEditedTag');
        if (priorityTag) priorityTag.style.display = ef.priority ? 'inline' : 'none';
    },

    // --- SUBTASKS ---
    renderSubtasks() {
        if (!this.currentProject || !this.elements.subtasksList) return;

        if (!this.currentProject.subtasks || this.currentProject.subtasks.length === 0) {
            this.elements.subtasksList.innerHTML = '<div class="text-dim" style="text-align:center; padding: 1rem; border: 1px dashed var(--glass-border); border-radius: 8px;">No tasks added yet.</div>';
            return;
        }

        // Get team members for the currently assigned Team Leader
        let teamOptions = '<option value="">Unassigned</option>';
        if (window.DashboardData && window.DashboardData.getTeamByLeaderId) {
            const leader = window.DashboardData.getTeamByLeaderId(this.currentProject.assignedToId);
            if (leader && leader.team) {
                leader.team.forEach(member => {
                    teamOptions += `<option value="${member.id}">${member.name}</option>`;
                });
            }
        }

        let html = '';
        this.currentProject.subtasks.forEach(st => {
            const isCompleted = st.completed ? 'completed' : '';
            const isChecked = st.completed ? 'checked' : '';

            // Rebuild select with correct selection
            let currentSelect = teamOptions;
            if (st.assignedTo) {
                currentSelect = currentSelect.replace(`option value="${st.assignedTo}"`, `option value="${st.assignedTo}" selected`);
            }

            html += `
                <div class="subtask-item">
                    <input type="checkbox" class="subtask-checkbox" ${isChecked} onchange="TaskApp.toggleSubtask(${st.id})">
                    <span class="subtask-text ${isCompleted}">${st.title}</span>
                    
                    <div class="subtask-assignee">
                        <select onchange="TaskApp.assignSubtask(${st.id}, this.value)" ${st.completed ? 'disabled' : ''}>
                            ${currentSelect}
                        </select>
                        <button class="subtask-delete" onclick="TaskApp.deleteSubtask(${st.id})"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                </div>
            `;
        });

        this.elements.subtasksList.innerHTML = html;
    },

    addSubtask() {
        if (!this.currentProject) return;
        const title = this.elements.newSubtaskName.value.trim();
        if (title) {
            if (!this.currentProject.subtasks) this.currentProject.subtasks = [];

            this.currentProject.subtasks.push({
                id: Date.now(),
                title: title,
                completed: false,
                assignedTo: null
            });

            this.saveData();
            this.renderSubtasks();
            this.elements.newSubtaskName.value = '';
        }
    },

    toggleSubtask(subtaskId) {
        if (!this.currentProject || !this.currentProject.subtasks) return;
        const st = this.currentProject.subtasks.find(t => t.id === subtaskId);
        if (st) {
            st.completed = !st.completed;
            this.saveData();
            this.renderSubtasks();
        }
    },

    deleteSubtask(subtaskId) {
        if (!this.currentProject || !this.currentProject.subtasks) return;
        this.currentProject.subtasks = this.currentProject.subtasks.filter(t => t.id !== subtaskId);
        this.saveData();
        this.renderSubtasks();
    },

    assignSubtask(subtaskId, employeeId) {
        if (!this.currentProject || !this.currentProject.subtasks) return;
        const st = this.currentProject.subtasks.find(t => t.id === subtaskId);
        if (st) {
            st.assignedTo = employeeId || null;
            this.saveData();
        }
    },

    // --- TIMELINE / STATUS ---
    onTimelineSelectChange() {
        const val = this.elements.timelineSelect.value;
        const completionSection = document.getElementById('completionDateSection');
        if (completionSection) {
            completionSection.style.display = (val === 'Completed') ? 'block' : 'none';
            // Pre-fill with now if empty
            if (val === 'Completed') {
                const dtInput = document.getElementById('completionDateTime');
                if (dtInput && !dtInput.value) {
                    dtInput.value = this.getCurrentDateTimeLocal();
                }
            }
        }
    },

    setNowCompletionTime() {
        const dtInput = document.getElementById('completionDateTime');
        if (dtInput) dtInput.value = this.getCurrentDateTimeLocal();
    },

    getCurrentDateTimeLocal() {
        const now = new Date();
        // Format as yyyy-MM-ddTHH:mm (required by datetime-local input)
        const pad = n => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    },

    formatDateTime(isoStr) {
        if (!isoStr) return '—';
        try {
            const d = new Date(isoStr);
            return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        } catch (e) { return isoStr; }
    },

    updateTimeline() {
        if (!this.currentProject) return;
        const newStatus = this.elements.timelineSelect.value;

        // If marking as Completed, capture the completion date/time
        if (newStatus === 'Completed') {
            const dtInput = document.getElementById('completionDateTime');
            const dtValue = (dtInput && dtInput.value) ? dtInput.value : this.getCurrentDateTimeLocal();
            this.currentProject.completedOn = dtValue;
        } else {
            // If moving away from Completed, clear the completion date
            delete this.currentProject.completedOn;
        }

        this.currentProject.status = newStatus;
        this.saveData();
        this.renderProjects(); // Update grid behind it

        // Update current modal view
        const statusClass = `status-${newStatus.toLowerCase().replace(/ /g, '-')}`;
        this.elements.detailProjStatus.className = `badge ${statusClass}`;
        this.elements.detailProjStatus.textContent = newStatus;

        // Update the completion date display
        const completionDisplay = document.getElementById('completionDateDisplay');
        const completionText = document.getElementById('completionDateText');
        if (completionDisplay && completionText) {
            if (newStatus === 'Completed' && this.currentProject.completedOn) {
                completionText.textContent = this.formatDateTime(this.currentProject.completedOn);
                completionDisplay.style.display = 'block';
            } else {
                completionDisplay.style.display = 'none';
            }
        }
        // Hide the input section after updating
        const completionSection = document.getElementById('completionDateSection');
        if (completionSection) completionSection.style.display = 'none';

        // Add auto comment about status change
        const dateNote = (newStatus === 'Completed' && this.currentProject.completedOn)
            ? ` on ${this.formatDateTime(this.currentProject.completedOn)}`
            : '';
        this.addSystemComment(`Status changed to ${newStatus}${dateNote}`);
    },

    // --- SITES ---
    renderSites() {
        if (!this.currentProject) return;
        let html = '';

        if (this.currentProject.sites.length === 0) {
            html = '<div class="text-dim" style="text-align:center; padding: 1rem; border: 1px dashed var(--glass-border); border-radius: 8px;">No sites added yet.</div>';
        } else {
            this.currentProject.sites.forEach((site, index) => {
                html += `
                    <div class="site-item" style="border-left: 3px solid ${this.currentProject.color}">
                        <div class="site-name">
                            <i class="fa-solid fa-location-dot" style="color: var(--text-dim);"></i>
                            ${site}
                        </div>
                        <button class="btn-secondary btn-sm" onclick="TaskApp.removeSite(${index})" style="padding: 0.25rem 0.5rem; color: #ef4444; border:none; background:transparent;">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;
            });
        }
        this.elements.sitesList.innerHTML = html;
    },

    showAddSiteInput() {
        this.elements.addSiteContainer.style.display = 'flex';
        this.elements.newSiteName.focus();
    },

    hideAddSiteInput() {
        this.elements.addSiteContainer.style.display = 'none';
        this.elements.newSiteName.value = '';
    },

    addSite() {
        if (!this.currentProject) return;
        const val = this.elements.newSiteName.value.trim();
        if (val) {
            this.currentProject.sites.push(val);
            this.saveData();
            this.renderSites();
            this.hideAddSiteInput();
            this.renderProjects(); // to update site count on card
        }
    },

    removeSite(index) {
        if (!this.currentProject) return;
        if (confirm("Remove this site?")) {
            this.currentProject.sites.splice(index, 1);
            this.saveData();
            this.renderSites();
            this.renderProjects();
        }
    },

    // --- COMMENTS ---
    renderComments() {
        if (!this.currentProject) return;
        let html = '';

        if (this.currentProject.comments.length === 0) {
            html = '<div class="text-dim" style="text-align:center; padding: 2rem;">No comments yet.</div>';
        } else {
            // Newest at bottom
            this.currentProject.comments.forEach(c => {
                const isSystem = c.role === 'System';
                const avatarContent = isSystem ? '<i class="fa-solid fa-robot"></i>' : c.author.charAt(0);
                const avatarColor = isSystem ? '#94a3b8' : this.currentProject.color;

                html += `
                    <div class="comment-item" style="border-left-color: ${avatarColor}">
                        <div class="avatar" style="background: ${isSystem ? 'rgba(255,255,255,0.1)' : 'rgba(' + this.hexToRgb(avatarColor) + ', 0.2)'}; color: ${isSystem ? '#94a3b8' : avatarColor}">
                            ${avatarContent}
                        </div>
                        <div class="comment-content">
                            <div class="comment-header">
                                <span class="comment-author">${c.author} <span style="font-weight: normal; color: var(--text-dim); font-size: 0.75rem;">(${c.role})</span></span>
                                <span class="comment-date">${this.formatDateTime(c.date)}</span>
                            </div>
                            <div class="comment-text" style="${isSystem ? 'font-style: italic; color: var(--text-dim);' : ''}">${c.text}</div>
                        </div>
                    </div>
                `;
            });
        }

        this.elements.commentsFeed.innerHTML = html;
        // Scroll to bottom
        this.elements.commentsFeed.scrollTop = this.elements.commentsFeed.scrollHeight;
    },

    addComment() {
        if (!this.currentProject) return;
        const text = this.elements.newCommentText.value.trim();
        if (text) {
            this.currentProject.comments.push({
                id: Date.now(),
                author: this.currentUser.name,
                role: this.currentUser.role,
                text: text,
                date: new Date().toISOString()
            });
            this.saveData();
            this.renderComments();
            this.elements.newCommentText.value = '';
            this.renderProjects(); // to update count
        }
    },

    addSystemComment(text) {
        if (!this.currentProject) return;
        this.currentProject.comments.push({
            id: Date.now(),
            author: 'System',
            role: 'System',
            text: text,
            date: new Date().toISOString()
        });
        this.saveData();
        this.renderComments();
    },

    // --- UTILS ---
    formatDate(dateString) {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    formatDateTime(isoString) {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ?
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
            '99, 102, 241';
    }
};

// --- DATA IMPORT/EXPORT ---
TaskApp.exportCSV = function () {
    if (this.projects.length === 0) {
        alert("No projects to export.");
        return;
    }

    if (window.showSuccess) {
        window.showSuccess("Preparing your projects for export. The download will start shortly.");
    }

    const headers = [
        "Number", "Name", "Date", "Deadline", "Color",
        "Priority", "AssignedToId", "AssignedToName",
        "Status", "SitesCount", "SubtasksCount"
    ];

    const csvRows = [];
    csvRows.push(headers.join(","));

    this.projects.forEach(p => {
        const row = [
            `"${p.number}"`,
            `"${p.name}"`,
            `"${p.date}"`,
            `"${p.deadline}"`,
            `"${p.color}"`,
            `"${p.priority}"`,
            `"${p.assignedToId}"`,
            `"${p.assignedToName}"`,
            `"${p.status}"`,
            p.sites ? p.sites.length : 0,
            p.subtasks ? p.subtasks.length : 0
        ];
        csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `gravity_projects_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

TaskApp.downloadImportTemplate = function () {
    const headers = ["Number", "Name", "Date", "Deadline", "Color", "Priority", "AssignedToId", "AssignedToName"];

    const sampleRows = [
        ["PRJ-001", "Website Redesign", "2026-03-01", "2026-04-30", "#3b82f6", "High", "TL001", "Raj Kumar"],
        ["PRJ-002", "Mobile App Development", "2026-03-05", "2026-06-30", "#10b981", "Critical", "TL002", "Priya Sharma"],
        ["PRJ-003", "Office Renovation", "2026-03-10", "2026-05-15", "#f59e0b", "Medium", "TL003", "Arun Vijay"],
    ];

    const csvRows = [
        headers.join(","),
        ...sampleRows.map(row => row.map(val => `"${val}"`).join(","))
    ];

    const csvString = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvString);
    link.setAttribute("download", "gravity_projects_import_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

TaskApp.showImportModal = function () {
    if (this.elements.importModal) {
        this.elements.importModal.classList.add('active');
        this.elements.importModal.style.display = 'flex';
        this.elements.csvFileInput.value = ''; // Reset input
    }
};

TaskApp.closeImportModal = function () {
    if (this.elements.importModal) {
        this.elements.importModal.classList.remove('active');
        setTimeout(() => {
            this.elements.importModal.style.display = 'none';
        }, 300); // Wait for fade out animation
    }
};

TaskApp.importCSV = function (overwrite) {
    const fileInput = this.elements.csvFileInput;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert("Please select a CSV file first.");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n');

        if (lines.length <= 1) {
            alert("The CSV file appears to be empty or only contains headers.");
            return;
        }

        // Basic CSV parsing (comma separated, handling basic quotes)
        const parseLine = (line) => {
            let escape = false;
            let current = '';
            const cols = [];
            for (let i = 0; i < line.length; i++) {
                if (line[i] === '"') escape = !escape;
                else if (line[i] === ',' && !escape) {
                    cols.push(current.trim());
                    current = '';
                } else current += line[i];
            }
            cols.push(current.trim());
            return cols.map(c => c.replace(/^"|"$/g, '')); // remove framing quotes
        };

        const headers = parseLine(lines[0].toLowerCase());

        // Ensure required headers exist
        if (!headers.includes('number') || !headers.includes('name')) {
            alert("Invalid CSV format. Must contain at least 'Number' and 'Name' columns.");
            return;
        }

        const importedProjects = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // skip empty lines

            const cols = parseLine(lines[i]);
            const rowData = {};
            headers.forEach((h, index) => {
                rowData[h] = cols[index] || '';
            });

            // Reconstruct Project Object structure
            const newProj = {
                id: Date.now() + i, // Unique enough for import
                number: rowData['number'] || `PRJ-IMP-${i}`,
                name: rowData['name'] || `Imported Project ${i}`,
                date: rowData['date'] ? rowData['date'].split('T')[0] : new Date().toISOString().split('T')[0],
                deadline: rowData['deadline'] ? rowData['deadline'].split('T')[0] : new Date().toISOString().split('T')[0],
                color: rowData['color'] || '#6366f1',
                priority: rowData['priority'] || 'Medium',
                status: rowData['status'] || 'Created',
                assignedToId: rowData['assignedtoid'] || '',
                assignedToName: rowData['assignedtoname'] || 'Unassigned',
                assignedById: TaskApp.currentUser.id || 'SYSTEM',
                assignedByName: TaskApp.currentUser.name || 'System Import',
                sites: [], // Imports start with fresh details arrays
                comments: [],
                subtasks: []
            };
            importedProjects.push(newProj);
        }

        if (overwrite) {
            if (window.showConfirm) {
                window.showConfirm(
                    "DANGER: Overwrite List",
                    `This will delete all existing ${this.projects.length} projects and replace them with ${importedProjects.length} imported ones. Proceed?`,
                    () => {
                        this.projects = importedProjects;
                        this.finalizeImport(importedProjects.length);
                    }
                );
                return;
            } else {
                if (!confirm(`Warning: This will delete all existing ${this.projects.length} projects. Continue?`)) return;
                this.projects = importedProjects;
            }
        } else {
            // Add (Append)
            this.projects = [...this.projects, ...importedProjects];
        }
        this.finalizeImport(importedProjects.length);
    };

    reader.readAsText(file);
};

TaskApp.finalizeImport = function (count) {
    this.saveData();
    this.renderProjects();
    this.closeImportModal();

    if (window.showSuccess) {
        window.showSuccess(`${count} projects have been imported successfully.`);
    } else {
        alert(`Successfully imported ${count} projects.`);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Only init if we are on the tasks page
    if (document.body.dataset.page === 'tasks') {
        TaskApp.init();
    }
});
