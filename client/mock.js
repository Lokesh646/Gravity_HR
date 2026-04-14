const fs = require('fs');
const html = fs.readFileSync('timer.html', 'utf-8');
const scriptMatches = html.match(/<script>([\s\S]*?)<\/script>/g);
let scripts = "";
scriptMatches.forEach(script => { scripts += script.replace(/<\/?script>/g, '') + "\n"; });

global.window = global;
global.document = {
    addEventListener: () => {},
    getElementById: (id) => {
        // Return a dummy element
        return {
            id: id,
            style: {},
            classList: { toggle: () => {}, add: () => {}, remove: () => {} },
            addEventListener: () => {},
            innerHTML: "",
            innerText: "",
            value: "",
            appendChild: () => {},
            focus: () => {}
        };
    },
    querySelectorAll: () => {
        return [{
            style: {},
            classList: { toggle: () => {}, add: () => {}, remove: () => {} },
            dataset: {},
            addEventListener: () => {}
        }];
    },
    createElement: (tag) => {
        return {
            style: {},
            appendChild: () => {}
        };
    }
};

global.localStorage = {
    getItem: (key) => {
        if (key === 'gravityHrCurrentUser') return JSON.stringify({id:1, name:'Test', role:'Employee'});
        if (key === 'gravityHrProjects') return JSON.stringify([{id:1, status:'Active'}]);
        if (key === 'gravityHrTimerLogs') return JSON.stringify([]);
        return null;
    },
    setItem: () => {}
};

global.alert = console.log;

try {
    eval(scripts);
    TimerApp.init();
    console.log("TimerApp.init() ran successfully.");
} catch(e) {
    console.error("Error during init:", e);
}
