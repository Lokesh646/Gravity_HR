const fs = require('fs');
let html = fs.readFileSync('timer.html', 'utf8');

// 1. Add CSS for mode toggling
const cssToAdd = `
        /* --- Timer/Manual Entry Mode Toggle --- */
        .manual-mode-only { display: none !important; }
        .timer-mode .manual-mode-only { display: none !important; }
        
        .manual-mode .manual-mode-only { 
            display: block !important; 
        }
        .manual-mode button.manual-mode-only {
            display: flex !important;
        }
        
        .manual-mode .timer-mode-only { display: none !important; }

        .mode-icon-btn {
            background: transparent;
            border: none;
            color: var(--text-dim);
            cursor: pointer;
            padding: 6px;
            border-radius: 4px;
            font-size: 1.1rem;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .mode-icon-btn:hover {
            color: var(--primary-color);
            background: rgba(59, 130, 246, 0.1);
        }
        .mode-icon-btn.active {
            color: var(--primary-color);
            background: rgba(59, 130, 246, 0.15);
            border: 1px solid var(--primary-color);
        }
        .mode-toggle-group {
            display: flex; 
            flex-direction: column; 
            gap: 4px; 
            margin-left: 10px; 
            border-left: 1px solid var(--glass-border); 
            padding-left: 10px;
        }
`;
html = html.replace('</style>', cssToAdd + '\n    </style>');

// 2. Wrap the timer container in a class "timer-mode" by default
html = html.replace('<div id="timerContainer">', '<div id="timerContainer" class="timer-mode">');

// 3. Mark the Date, Start, End fields as manual-mode-only
html = html.replace(
    '<div class="timer-field" style="min-width: 140px;">\r\n                        <label>Date</label>',
    '<div class="timer-field manual-mode-only" style="min-width: 140px;">\n                        <label>Date</label>'
);
html = html.replace(
    '<div class="timer-field" style="min-width: 80px;">\r\n                        <label>Start</label>',
    '<div class="timer-field manual-mode-only" style="min-width: 80px;">\n                        <label>Start</label>'
);
html = html.replace(
    '<div class="timer-field" style="min-width: 80px;">\r\n                        <label>End</label>',
    '<div class="timer-field manual-mode-only" style="min-width: 80px;">\n                        <label>End</label>'
);

// 4. Update the timer-actions block
const oldActions = `<div class="timer-actions">
                        <button id="toggleTimerBtn" class="timer-btn start" onclick="TimerApp.toggleTimer()">
                            <i class="fa-solid fa-play"></i> Start
                        </button>
                        <button class="timer-btn add" onclick="TimerApp.addManualLog()">
                            <i class="fa-solid fa-plus"></i> Add
                        </button>
                    </div>`;

const newActions = `<div class="timer-actions">
                        <!-- Timer Mode Button -->
                        <button id="toggleTimerBtn" class="timer-btn start timer-mode-only" onclick="TimerApp.toggleTimer()">
                            <i class="fa-solid fa-play"></i> Start
                        </button>
                        
                        <!-- Manual Mode Button -->
                        <button class="timer-btn add manual-mode-only" onclick="TimerApp.addManualLog()">
                            <i class="fa-solid fa-plus"></i> Add
                        </button>

                        <!-- Entry Mode Toggles -->
                        <div class="mode-toggle-group">
                            <button id="modeTimerBtn" class="mode-icon-btn active" onclick="TimerApp.switchEntryMode('timer')" title="Timer Mode">
                                <i class="fa-regular fa-clock"></i>
                            </button>
                            <button id="modeManualBtn" class="mode-icon-btn" onclick="TimerApp.switchEntryMode('manual')" title="Manual Mode">
                                <i class="fa-solid fa-list-ul"></i>
                            </button>
                        </div>
                    </div>`;

html = html.replace(oldActions, newActions);

// 5. Add switchEntryMode to TimerApp
const extraMethod = `
            switchEntryMode(mode) {
                const container = document.getElementById('timerContainer');
                const tBtn = document.getElementById('modeTimerBtn');
                const mBtn = document.getElementById('modeManualBtn');
                
                if (mode === 'timer') {
                    container.classList.remove('manual-mode');
                    container.classList.add('timer-mode');
                    tBtn.classList.add('active');
                    mBtn.classList.remove('active');
                } else {
                    container.classList.remove('timer-mode');
                    container.classList.add('manual-mode');
                    mBtn.classList.add('active');
                    tBtn.classList.remove('active');
                    
                    // Pre-fill date with today if empty
                    const dateInput = document.getElementById('logDate');
                    if (!dateInput.value) {
                        const now = new Date();
                        const pad = n => String(n).padStart(2, '0');
                        dateInput.value = \`\${now.getFullYear()}-\${pad(now.getMonth() + 1)}-\${pad(now.getDate())}\`;
                    }
                }
            },
`;
html = html.replace(/init\(\) \{/, extraMethod + '\n            init() {');

fs.writeFileSync('timer.html', html);
console.log("HTML successfully updated with manual mode and formatting toggles.");
