// --- SHARED STATE FOR DYNAMIC DOM TARGETING ---
const trafficCounterState = {
  currentRow: 0,
  table: null,
  isInitialized: false,
  gamepadRequestIdx: null,
  sessionStartTime: null // Track when session starts
};

// 1. Helper functions that always use the active table
function saveCurrentSession() {
  if (!trafficCounterState.table) return;
  const data = [...trafficCounterState.table.rows].map(row => ({
    direction: row.cells[0].textContent,
    car: row.cells[1].textContent,
    lgv: row.cells[2].textContent,
    ogv1: row.cells[3].textContent,
    ogv2: row.cells[4].textContent,
    bus: row.cells[5].textContent,
    mc: row.cells[6].textContent,
    pc: row.cells[7].textContent,
    peds: row.cells[8].textContent
  }));
  localStorage.setItem("alienTrafficCounts", JSON.stringify(data));
}

function highlightRow() {
  if (!trafficCounterState.table) return;
  [...trafficCounterState.table.rows].forEach((tr, i) => {
    if (i === trafficCounterState.currentRow) {
      tr.classList.add("active-traffic-row");
    } else {
      tr.classList.remove("active-traffic-row");
    }
  });
}

function increment(rowIndex, colIndex) {
  if (!trafficCounterState.table || !trafficCounterState.table.rows[rowIndex]) return;
  const cell = trafficCounterState.table.rows[rowIndex].cells[colIndex + 1];
  const oldValue = parseInt(cell.textContent || "0");
  const newValue = oldValue + 1;

  cell.textContent = newValue;
  saveCurrentSession();

  cell.classList.add("counter-animate");
  setTimeout(() => {
    cell.classList.remove("counter-animate");
  }, 400);

  // Trigger dashboard update if visible (Decoupled to prevent freezes)
  if (typeof updateStats === 'function') {
    setTimeout(updateStats, 10);
  }
}

// 2. Global Event Listeners (Keyboard & Gamepad) - Only attached once
function attachGlobalListeners() {
  if (trafficCounterState.isInitialized) return;

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (!trafficCounterState.table) return;
    const key = e.key;
    if (key === "q") {
      trafficCounterState.currentRow = (trafficCounterState.currentRow - 1 + 6) % 6;
    } else if (key === "e") {
      trafficCounterState.currentRow = (trafficCounterState.currentRow + 1) % 6;
    }

    if (key === "1") increment(trafficCounterState.currentRow, 0);
    else if (key === "2") increment(trafficCounterState.currentRow, 1);
    else if (key === "3") increment(trafficCounterState.currentRow, 2);
    else if (key === "4") increment(trafficCounterState.currentRow, 3);
    else if (key === "ArrowUp" || key.toLowerCase() === "w") increment(trafficCounterState.currentRow, 4);
    else if (key === "ArrowRight" || key.toLowerCase() === "d") increment(trafficCounterState.currentRow, 5);
    else if (key === "ArrowDown" || key.toLowerCase() === "s") increment(trafficCounterState.currentRow, 6);
    else if (key === "ArrowLeft" || key.toLowerCase() === "a") increment(trafficCounterState.currentRow, 7);

    highlightRow();
  });

  // Gamepad
  let lastButtons = [];
  function pollGamepad() {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0];
    if (!gp || !trafficCounterState.table) return;

    const buttons = gp.buttons.map(btn => btn.pressed);
    const axes = gp.axes;

    const bearLeft = buttons[6];  // L2
    const bearRight = buttons[7]; // R2
    const left = buttons[4];      // L1
    const right = buttons[5];     // R1

    if (bearLeft && bearRight) trafficCounterState.currentRow = 5;
    else if (bearLeft) trafficCounterState.currentRow = 0;
    else if (left) trafficCounterState.currentRow = 1;
    else if (right) trafficCounterState.currentRow = 3;
    else if (bearRight) trafficCounterState.currentRow = 4;
    else trafficCounterState.currentRow = 2; // Default thru if nothing pressed but active? Actually simpler: only change row if pressed.

    const faceButtonMap = { 0: 0, 1: 1, 2: 2, 3: 3 };
    for (let [btnStr, col] of Object.entries(faceButtonMap)) {
      const btn = parseInt(btnStr);
      if (buttons[btn] && !lastButtons[btn]) {
        increment(trafficCounterState.currentRow, col);
      }
      lastButtons[btn] = buttons[btn];
    }

    const deadzone = 0.5;
    if (axes[1] < -deadzone && !lastButtons['bus']) {
      increment(trafficCounterState.currentRow, 4);
      lastButtons['bus'] = true;
    } else if (axes[1] >= -deadzone) {
      lastButtons['bus'] = false;
    }
    if (axes[0] > deadzone && !lastButtons['mc']) {
      increment(trafficCounterState.currentRow, 5);
      lastButtons['mc'] = true;
    } else if (axes[0] <= deadzone) {
      lastButtons['mc'] = false;
    }
    if (axes[1] > deadzone && !lastButtons['pc']) {
      increment(trafficCounterState.currentRow, 6);
      lastButtons['pc'] = true;
    } else if (axes[1] >= deadzone) {
      lastButtons['pc'] = false;
    }
    if (axes[0] < -deadzone && !lastButtons['peds']) {
      increment(trafficCounterState.currentRow, 7);
      lastButtons['peds'] = true;
    } else if (axes[0] >= -deadzone) {
      lastButtons['peds'] = false;
    }
    highlightRow();
  }

  function gamepadLoop() {
    pollGamepad();
    trafficCounterState.gamepadRequestIdx = requestAnimationFrame(gamepadLoop);
  }

  window.addEventListener("gamepadconnected", (e) => {
    console.log("🎮 Gamepad connected:", e.gamepad.id);
    gamepadLoop();
  });

  window.addEventListener("gamepaddisconnected", () => {
    console.log("🎮 Gamepad disconnected");
    cancelAnimationFrame(trafficCounterState.gamepadRequestIdx);
  });

  trafficCounterState.isInitialized = true;
}

// 3. MAIN INITIALIZATION (Called everytime section is loaded)
window.initTrafficCounter = function () {
  if (!trafficCounterState.sessionStartTime) {
    trafficCounterState.sessionStartTime = Date.now();
  }

  const tableEl = document.getElementById("counter-table");
  if (!tableEl) return;
  trafficCounterState.table = tableEl.getElementsByTagName("tbody")[0];

  // Restore saved session data if any
  const savedData = localStorage.getItem("alienTrafficCounts");
  if (savedData) {
    try {
      const data = JSON.parse(savedData);
      [...trafficCounterState.table.rows].forEach((row, i) => {
        const d = data[i];
        if (d) {
          row.cells[1].textContent = d.car || "0";
          row.cells[2].textContent = d.lgv || "0";
          row.cells[3].textContent = d.ogv1 || "0";
          row.cells[4].textContent = d.ogv2 || "0";
          row.cells[5].textContent = d.bus || "0";
          row.cells[6].textContent = d.mc || "0";
          row.cells[7].textContent = d.pc || "0";
          row.cells[8].textContent = d.peds || "0";
        }
      });
    } catch (e) {
      console.error("Error parsing saved traffic data:", e);
    }
  }

  highlightRow();
  attachGlobalListeners();

  // Button Listeners (New DOM elements each time)
  const resetBtn = document.getElementById("reset");
  if (resetBtn) {
    resetBtn.onclick = () => {
      const performReset = () => {
        [...trafficCounterState.table.rows].forEach(row => {
          [...row.cells].forEach((cell, i) => {
            if (i > 0) cell.textContent = "0";
          });
        });
        localStorage.removeItem("alienTrafficCounts");
        trafficCounterState.sessionStartTime = Date.now(); // Reset start time
        trafficCounterState.currentRow = 0;
        highlightRow();
        if (typeof updateStats === 'function') {
          setTimeout(updateStats, 10);
        }
      };

      if (typeof showConfirm === 'function') {
        showConfirm(
          "Reset Session?",
          "Are you sure you want to clear all counts for this session? This cannot be undone.",
          performReset,
          'fa-circle-question',
          'danger'
        );
      } else if (confirm("Reset all counts for this session?")) {
        performReset();
      }
    };
  }

  const saveBtn = document.getElementById("save");
  if (saveBtn) {
    saveBtn.onclick = () => {
      const data = [...trafficCounterState.table.rows].map(row => ({
        direction: row.cells[0].textContent,
        car: row.cells[1].textContent,
        lgv: row.cells[2].textContent,
        ogv1: row.cells[3].textContent,
        ogv2: row.cells[4].textContent,
        bus: row.cells[5].textContent,
        mc: row.cells[6].textContent,
        pc: row.cells[7].textContent,
        peds: row.cells[8].textContent
      }));

      const performSave = () => {
        localStorage.setItem("alienTrafficCounts", JSON.stringify(data));

        const today = new Date().toISOString().split('T')[0];
        let totalVehicles = 0;
        data.forEach(row => {
          Object.keys(row).forEach(key => {
            if (key !== 'direction') {
              totalVehicles += parseInt(row[key] || 0);
            }
          });
        });

        const history = JSON.parse(localStorage.getItem('alienTrafficHistory') || '{}');
        const user = (typeof Auth !== 'undefined') ? Auth.getCurrentUser() : null;

        let dayEntry = history[today];
        if (!dayEntry || typeof dayEntry !== 'object') {
          dayEntry = { total: 0, breakdown: [], contributors: {} };
        }

        dayEntry.total = totalVehicles;
        dayEntry.breakdown = data;

        if (!dayEntry.contributors) dayEntry.contributors = {};

        const userId = user ? (user.id || 'Unknown') : 'Unknown';
        if (!dayEntry.contributors[userId]) {
          dayEntry.contributors[userId] = {
            name: user ? user.name : 'Unknown User',
            role: user ? user.role : 'N/A',
            sessions: []
          };
        }

        // Calculate session duration
        const endTime = Date.now();
        const startTime = trafficCounterState.sessionStartTime || endTime;
        const durationHours = (endTime - startTime) / (1000 * 60 * 60);

        dayEntry.contributors[userId].sessions.push({
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          duration: durationHours
        });

        // Update last timestamp
        dayEntry.contributors[userId].timestamp = new Date(endTime).toISOString();

        history[today] = dayEntry;
        localStorage.setItem('alienTrafficHistory', JSON.stringify(history));

        // Reset session start time for next period
        trafficCounterState.sessionStartTime = Date.now();

        if (typeof showSuccess === 'function') {
          showSuccess("Traffic Data Saved Successfully!");
        } else {
          alert("Traffic Data Saved Successfully!");
        }

        if (typeof updateStats === 'function') {
          setTimeout(updateStats, 10);
        }
      };

      if (typeof showConfirm === 'function') {
        showConfirm(
          "Save Traffic Data?",
          "Ready to finalize the current traffic session? This counts towards the daily total.",
          performSave,
          'fa-circle-check',
          'success'
        );
      } else {
        performSave();
      }
    };
  }

  const user = (typeof Auth !== 'undefined') ? Auth.getCurrentUser() : null;
  if (user) {
    if (document.getElementById("employeeLabel")) document.getElementById("employeeLabel").textContent = `Name: ${user.name}`;
    if (document.getElementById("employeeIdLabel")) document.getElementById("employeeIdLabel").textContent = ` | ID: ${user.id || 'N/A'}`;
    if (document.getElementById("roleLabel")) document.getElementById("roleLabel").textContent = ` | Role: ${user.role}`;
  }
};

// Check if we need to auto-init
if (document.getElementById("counter-table")) {
  window.initTrafficCounter();
}







