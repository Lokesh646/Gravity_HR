const fs = require('fs');
let html = fs.readFileSync('timer.html', 'utf8');

// Align actions and remove the padding that lifted buttons
html = html.replace(/\.timer-actions \{\s*display: flex;\s*gap: 0.75rem;\s*padding-bottom: 0.2rem;\s*\}/g, 
`.timer-actions {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }`);

// Update start button to blue
html = html.replace(/\.timer-btn\.start \{\s*background: #10b981;\s*color: white;\s*\}/g,
`.timer-btn.start {
            background: #008cd1;
            color: white;
        }`);

html = html.replace(/\.timer-btn\.start:hover \{\s*background: #059669;\s*transform: translateY\(-1px\);\s*\}/g,
`.timer-btn.start:hover {
            background: #0077b2;
            transform: translateY(-1px);
        }`);

fs.writeFileSync('timer.html', html);
console.log("CSS alignment and colors updated successfully.");
