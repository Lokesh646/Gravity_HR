const fs = require('fs');
let html = fs.readFileSync('timer.html', 'utf8');

const oldMethods = /formatTextTime[\s\S]*?manualTimeChange(?:.|\n|\r)*?eEl\.value = msToTime\(e\);\r?\n\s*\}\r?\n\s*\}\r?\n\s*\}/;

const newMethods = `formatTextTime(val) {
                if(!val) return '';
                const hasAmPm = /am|pm/i.test(val);
                const isPm = /pm/i.test(val);
                let timePart = val.replace(/[^0-9:]/g, '');
                
                if(!timePart.includes(':') && timePart.length <= 4) {
                    if(timePart.length === 1) timePart = '0' + timePart + ':00';
                    else if(timePart.length === 2) timePart = timePart + ':00';
                    else if(timePart.length === 3) timePart = '0' + timePart.charAt(0) + ':' + timePart.slice(1);
                    else if(timePart.length === 4) timePart = timePart.slice(0,2) + ':' + timePart.slice(2);
                }
                const parts = timePart.split(':');
                if(parts.length < 2) return val;
                let h = parseInt(parts[0]) || 0;
                let m = parseInt(parts[1]) || 0;
                if(m > 59) m = 59;

                let ampm = 'AM';
                if (h >= 12) {
                    ampm = 'PM';
                    if (h > 12) h -= 12;
                } else if (h === 0) {
                    h = 12;
                } else if (hasAmPm && isPm && h < 12) {
                    ampm = 'PM';
                } else if (hasAmPm && !isPm && h === 12) {
                    h = 12;
                }

                return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ' ' + ampm;
            },

            manualTimeChange(source) {
                const sEl = document.getElementById('logStartTime');
                const eEl = document.getElementById('logEndTime');
                const dEl = document.getElementById('logManualDuration');
                
                if(source === 'start') sEl.value = this.formatTextTime(sEl.value);
                if(source === 'end') eEl.value = this.formatTextTime(eEl.value);

                const getMs = (timeStr) => {
                    if(!timeStr) return 0;
                    const isPm = /pm/i.test(timeStr);
                    const parts = timeStr.replace(/[^0-9:]/g, '').split(':');
                    let h = parseInt(parts[0]) || 0;
                    let m = parseInt(parts[1]) || 0;
                    if (isPm && h < 12) h += 12;
                    if (!isPm && h === 12) h = 0;
                    return (h*60 + m) * 60000;
                };

                const msToDurStr = (ms) => {
                    if (ms < 0) ms = 0;
                    const h = Math.floor(ms / 3600000);
                    const m = Math.floor((ms % 3600000) / 60000);
                    return String(Math.min(h, 99)).padStart(2,'0') + ':' + String(m).padStart(2,'0');
                };

                const s = getMs(sEl.value);
                let e = getMs(eEl.value);

                if (sEl.value && eEl.value) {
                    let d = e >= s ? (e - s) : ((e + 86400000) - s);
                    dEl.value = msToDurStr(d);
                } else {
                    dEl.value = '';
                }
            }`;

html = html.replace(oldMethods, newMethods);

const oldUpdateDisplay = /document\.getElementById\('runningTimeDisplay'\)\.textContent = this\.formatDurationMs\(diffMs\);\s*\/\/\s*Update doc title/g;
const newUpdateDisplay = `document.getElementById('runningTimeDisplay').textContent = this.formatDurationMs(diffMs);
                const dEl = document.getElementById('logManualDuration');
                if (dEl) dEl.value = this.formatDurationMs(diffMs);
                
                // Update doc title`;

html = html.replace(oldUpdateDisplay, newUpdateDisplay);

const oldToggleStop = /document\.getElementById\('runningTimeDisplay'\)\.textContent = '00:00:00';\s*document\.title = 'Timer - Gravity HR';/g;
const newToggleStop = `document.getElementById('runningTimeDisplay').textContent = '00:00:00';
                const dEl2 = document.getElementById('logManualDuration');
                if (dEl2) dEl2.value = '';
                document.title = 'Timer - Gravity HR';`;
html = html.replace(oldToggleStop, newToggleStop);

fs.writeFileSync('timer.html', html);
console.log("Replacement completed using Node regex.");
