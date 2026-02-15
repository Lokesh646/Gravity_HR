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
// ... [rest of the file helpers remain same until initTrafficCounter]

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







