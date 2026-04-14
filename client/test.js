const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('timer.html', 'utf-8');

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", (err) => { console.error("PAGE ERROR:", err); });
virtualConsole.on("warn", (warn) => { console.warn("PAGE WARN:", warn); });
virtualConsole.on("info", (info) => { console.info("PAGE INFO:", info); });
virtualConsole.on("log", (log) => { console.log("PAGE LOG:", log); });

const dom = new JSDOM(html, { 
    runScripts: "dangerously", 
    virtualConsole,
    url: "http://localhost/" // for localStorage
});

const window = dom.window;
const document = window.document;

// Mock localStorage data for TimerApp
window.localStorage.setItem('gravityHrCurrentUser', JSON.stringify({ id: 101, name: 'Mani', role: 'Employee' }));
window.localStorage.setItem('gravityHrProjects', JSON.stringify([
    {id: 1, number: 'PRJ1', name: 'Proj 1', status: 'Active', clientId: 1, sites: ['SiteA']}
]));
window.localStorage.setItem('gravityHrClients', JSON.stringify([{id: 1, name: 'Client 1'}]));
window.localStorage.setItem('gravityHrTags', JSON.stringify([{name: 'Tag1', color: '#fff'}]));

try {
    // Attempt init
    if (window.TimerApp && window.TimerApp.init) {
        console.log("Found TimerApp, calling init()...");
        window.TimerApp.init();
        console.log("TimerApp.init() completed without top-level exception.");
    } else {
        console.error("TimerApp or TimerApp.init not found.");
    }
} catch (e) {
    console.error("Exception during init:", e.message);
    console.error(e.stack);
}
