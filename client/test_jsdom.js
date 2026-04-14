const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('C:\\Users\\ADMIN\\Desktop\\Gravity Web Development\\Gravity HR\\client\\timer.html', 'utf8');

const dom = new JSDOM(html, {
    url: "http://localhost/",
    runScripts: "dangerously",
    beforeParse(window) {
        window.localStorage = {
            getItem: (key) => {
                if (key === 'currentUser') return JSON.stringify({id: 'emp1', name: 'John', role: 'Employee'});
                if (key === 'gravityHrTimerLogs') return JSON.stringify([{id: 1, userId: 'emp1', date: '2026-03-22', startTime: '10:00', endTime: '11:00', durationMs: 3600000}]);
                if (key === 'gravityHrProjects') return JSON.stringify([{id: 'p1', name: 'Proj1'}]);
                return null;
            },
            setItem: () => {},
            removeItem: () => {}
        };
        // Mock chart.js
        window.Chart = class Chart { constructor() {} destroy() {} };
        // Mock window methods
        window.alert = console.log;
        window.confirm = () => true;
        
        // Catch errors
        window.onerror = function (message, source, lineno, colno, error) {
            console.error('Browser Error:', message, 'at line', lineno, error);
        };
    }
});

setTimeout(() => {
    console.log("Evaluation complete. Logs Container innerHTML size:", dom.window.document.getElementById('logsContainer').innerHTML.length);
    process.exit(0);
}, 2000);
