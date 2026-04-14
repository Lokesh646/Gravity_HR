const fs = require('fs');
let html = fs.readFileSync('timer.html', 'utf8');

const regex = /<div class="timer-actions">\s*<button id="toggleTimerBtn"[\s\S]*?<\/div>/;

const replacement = `<div class="timer-actions">
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
                                <i class="fa-regular fa-clock" style="font-size: 1.1rem;"></i>
                            </button>
                            <button id="modeManualBtn" class="mode-icon-btn" onclick="TimerApp.switchEntryMode('manual')" title="Manual Mode">
                                <i class="fa-solid fa-list-ul" style="font-size: 1.1rem;"></i>
                            </button>
                        </div>
                    </div>`;

const newHtml = html.replace(regex, replacement);

if (html === newHtml) {
    console.log("Regex replacement failed.");
} else {
    fs.writeFileSync('timer.html', newHtml);
    console.log("Regex replacement successful.");
}
