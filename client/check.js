const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\ADMIN\\Desktop\\Gravity Web Development\\Gravity HR\\client\\timer.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
if (match) {
    try {
        new Function(match[1]);
        console.log("Syntax OK");
    } catch (e) {
        console.error("Syntax Error:", e);
    }
} else {
    console.log("No script tag found");
}
