const fs = require('fs');
let html = fs.readFileSync('timer.html', 'utf8');

const oldHTML = `<div class="timer-field" style="min-width: 90px;">
                        <label>Start</label>
                        <input type="time" id="logStartTime">
                    </div>

                    <div class="timer-field" style="min-width: 90px;">
                        <label>End</label>
                        <input type="time" id="logEndTime">
                    </div>

                    <div class="timer-actions">`;

const newHTML = `<div class="timer-field" style="min-width: 80px;">
                        <label>Start</label>
                        <input type="text" id="logStartTime" placeholder="HH:MM" onchange="TimerApp.manualTimeChange('start')" style="text-align: center;">
                    </div>

                    <div class="timer-field" style="min-width: 80px;">
                        <label>End</label>
                        <input type="text" id="logEndTime" placeholder="HH:MM" onchange="TimerApp.manualTimeChange('end')" style="text-align: center;">
                    </div>

                    <div class="timer-field" style="min-width: 80px;">
                        <label>Duration</label>
                        <input type="text" id="logManualDuration" placeholder="HH:MM" onchange="TimerApp.manualTimeChange('duration')" style="text-align: center; border: 1px dashed var(--glass-border); background: rgba(255,255,255,0.02); font-weight: bold; font-family: monospace;">
                    </div>

                    <div class="timer-actions">`;

html = html.replace(oldHTML, newHTML);

// Also we need to make sure 'addManualLog' accepts logs that have a duration but no start/end.
// But let's just make it simple: if duration is typed, end time is calculated.

const extraMethods = `
            formatTextTime(val) {
                if(!val) return '';
                val = val.replace(/[^0-9:]/g, '');
                if(!val.includes(':') && val.length <= 4) {
                    if(val.length === 1) val = '0' + val + ':00';
                    else if(val.length === 2) val = val + ':00';
                    else if(val.length === 3) val = '0' + val.charAt(0) + ':' + val.slice(1);
                    else if(val.length === 4) val = val.slice(0,2) + ':' + val.slice(2);
                }
                const parts = val.split(':');
                if(parts.length < 2) return val;
                let h = parseInt(parts[0]) || 0;
                let m = parseInt(parts[1]) || 0;
                if(h > 23) h = 23;
                if(m > 59) m = 59;
                return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
            },

            manualTimeChange(source) {
                const sEl = document.getElementById('logStartTime');
                const eEl = document.getElementById('logEndTime');
                const dEl = document.getElementById('logManualDuration');
                
                if(source === 'start') sEl.value = this.formatTextTime(sEl.value);
                if(source === 'end') eEl.value = this.formatTextTime(eEl.value);
                if(source === 'duration') dEl.value = this.formatTextTime(dEl.value);

                const getMs = (timeStr) => {
                    if(!timeStr) return 0;
                    const parts = timeStr.split(':');
                    return (parseInt(parts[0]||0)*60 + parseInt(parts[1]||0)) * 60000;
                };

                const msToTime = (ms) => {
                    if (ms < 0) ms = 0;
                    const h = Math.floor(ms / 3600000);
                    const m = Math.floor((ms % 3600000) / 60000);
                    return String(Math.min(h, 23)).padStart(2,'0') + ':' + String(m).padStart(2,'0');
                };

                const s = getMs(sEl.value);
                let e = getMs(eEl.value);
                let d = getMs(dEl.value);

                if (source === 'start' || source === 'end') {
                    if (sEl.value && eEl.value) {
                        d = e >= s ? (e - s) : ((e + 86400000) - s); // Next day logic
                        dEl.value = this.formatDurationMs(d).replace(/[^0-9hm ]/ig, '').trim(); // '1h 30m'
                        // Alternatively, just format as HH:MM
                        dEl.value = msToTime(d);
                    }
                } else if (source === 'duration') {
                    if (sEl.value && dEl.value) {
                        e = s + d;
                        eEl.value = msToTime(e);
                    }
                }
            },
`;

html = html.replace(/init\(\)\s*\{/, extraMethods + "\n            init() {");

// In addManualLog, we need to allow adding if start is empty but duration is present?
// Re-format addManualLog:
html = html.replace(/const dateInput = document\.getElementById\('logDate'\)\.value;\r?\n\s*const startInput = document\.getElementById\('logStartTime'\)\.value;\r?\n\s*const endInput = document\.getElementById\('logEndTime'\)\.value;/,
`const dateInput = document.getElementById('logDate').value;
                const startInput = document.getElementById('logStartTime').value;
                const endInput = document.getElementById('logEndTime').value;
                const manualDur = document.getElementById('logManualDuration').value;`);

html = html.replace(/if \(!projId \|\| !dateInput \|\| !startInput \|\| !endInput\) \{/, `if (!projId || !dateInput || (!startInput && !manualDur)) {`);
html = html.replace(/alert\("Please select a Project and fill Date, Start, and End times\."\);/, `alert("Please select a Project, and provide Date, plus Start Time or Duration.");`);

// bypass startInput >= endInput
html = html.replace(/if \(startInput >= endInput\) \{/, `if (startInput && endInput && startInput >= endInput && !manualDur) {`);

// fix calculateDurationMs usage in addManualLog
html = html.replace(/durationMs: this\.calculateDurationMs\(startInput, endInput\)/, `durationMs: document.getElementById('logManualDuration').value ? ((parseInt(document.getElementById('logManualDuration').value.split(':')[0]||0)*60)+parseInt(document.getElementById('logManualDuration').value.split(':')[1]||0))*60000 : this.calculateDurationMs(startInput, endInput)`);

fs.writeFileSync('timer.html', html);
console.log("Replacement text inputs successful.");
