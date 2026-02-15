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
// 2. HELPER FUNCTIONS

// 2. HELPER FUNCTIONS

function highlightRow() {
  if (!trafficCounterState.table) return;
  const rows = trafficCounterState.table.rows;
  if (!rows || rows.length === 0) return;

  // Clamp row index logic
  if (trafficCounterState.currentRow < 0) {
    trafficCounterState.currentRow = rows.length - 1;
  } else if (trafficCounterState.currentRow >= rows.length) {
    trafficCounterState.currentRow = 0;
  }

  // Apply visual class
  Array.from(rows).forEach((row, i) => {
    if (i === trafficCounterState.currentRow) {
      row.classList.add('active-traffic-row');
      // Ensure smooth scroll into view if needed
      // row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      row.classList.remove('active-traffic-row');
    }
  });
}

// Gamepad polling state
const gamepadState = {
  lastTimestamp: 0,
  buttonCooldowns: Array(16).fill(0) // Cooldown per button
};

function handleInputLoop() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  if (!gamepads) return;

  const gp = gamepads[0]; // Use first controller found
  if (gp) {
    const now = Date.now();

    // D-PAD / AXES HANDLING FOR ROW NAVIGATION
    // Standard mapping: Axis 9 is D-pad vertical on some, Headers 12/13 on others.
    // Let's assume Standard Gamepad: Button 12 (Up), Button 13 (Down)

    // Check UP (Button 12)
    if (gp.buttons[12] && gp.buttons[12].pressed) {
      if (now > gamepadState.buttonCooldowns[12]) {
        trafficCounterState.currentRow--;
        highlightRow();
        gamepadState.buttonCooldowns[12] = now + 200; // 200ms debounce for nav
      }
    }
    // Check DOWN (Button 13)
    else if (gp.buttons[13] && gp.buttons[13].pressed) {
      if (now > gamepadState.buttonCooldowns[13]) {
        trafficCounterState.currentRow++;
        highlightRow();
        gamepadState.buttonCooldowns[13] = now + 200;
      }
    }

    // VEHICLE COUNT BUTTONS (0-7)
    // Mapped to columns 1-8 (indices)
    // 0(A), 1(B), 2(X), 3(Y), 4(LB), 5(RB), 6(LT), 7(RT)
    const buttonMap = [0, 1, 2, 3, 4, 5, 6, 7];

    if (trafficCounterState.table && trafficCounterState.table.rows.length > 0) {
      const row = trafficCounterState.table.rows[trafficCounterState.currentRow];
      if (row) {
        buttonMap.forEach((btnIdx, colOffset) => {
          if (gp.buttons[btnIdx] && gp.buttons[btnIdx].pressed) {
            if (now > (gamepadState.buttonCooldowns[btnIdx] || 0)) {
              // Increment Count
              const cell = row.cells[colOffset + 1];
              if (cell) {
                let val = parseInt(cell.textContent || '0');
                cell.textContent = val + 1;

                // Visual Feedback
                cell.classList.add('counter-animate');
                setTimeout(() => cell.classList.remove('counter-animate'), 200);

                saveCurrentSession();
              }
              gamepadState.buttonCooldowns[btnIdx] = now + 200; // 200ms debounce
            }
          }
        });
      }
    }
  }

  trafficCounterState.gamepadRequestIdx = requestAnimationFrame(handleInputLoop);
}

function attachGlobalListeners() {
  // 1. Keyboard Navigation & Fallback Inputs
  document.addEventListener('keydown', (e) => {
    // Only act if on traffic page and table exists
    if (!trafficCounterState.table) return;

    if (e.key === 'ArrowUp') {
      trafficCounterState.currentRow--;
      highlightRow();
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      trafficCounterState.currentRow++;
      highlightRow();
      e.preventDefault();
    } else if (e.key >= '1' && e.key <= '8') {
      // Keyboard numeric fallback (1-8)
      const colIdx = parseInt(e.key);
      const row = trafficCounterState.table.rows[trafficCounterState.currentRow];
      if (row && row.cells[colIdx]) {
        const cell = row.cells[colIdx];
        let val = parseInt(cell.textContent || '0');
        cell.textContent = val + 1;

        cell.classList.add('counter-animate');
        setTimeout(() => cell.classList.remove('counter-animate'), 200);

        saveCurrentSession();
      }
    }
  });

  // 2. Start Gamepad Polling
  if (trafficCounterState.gamepadRequestIdx) cancelAnimationFrame(trafficCounterState.gamepadRequestIdx);
  trafficCounterState.gamepadRequestIdx = requestAnimationFrame(handleInputLoop);

  // 3. Listen for Gamepad Connections (optional, polling handles it mostly)
  window.addEventListener("gamepadconnected", (e) => {
    console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
      e.gamepad.index, e.gamepad.id,
      e.gamepad.buttons.length, e.gamepad.axes.length);
  });
}// 3. MAIN INITIALIZATION (Called everytime section is loaded)
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
  }

  highlightRow();
  attachGlobalListeners();

  // Button Listeners (New DOM elements each time)
  const resetBtn = document.getElementById("reset");
  if (resetBtn) {
    resetBtn.onclick = () => {
      showConfirm(
        "Reset Session?",
        "Are you sure you want to clear all counts for this session? This cannot be undone.",
        () => {
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
        },
        'fa-circle-question',
        'danger'
      );
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
            sessions: [] // Track multiple saves as sessions
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







