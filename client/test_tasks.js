const puppeteer = require('puppeteer');

(async () => {
    console.log('Starting puppeteer...');
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
        
        await page.goto('http://127.0.0.1:5000/tasks.html');
        await new Promise(r => setTimeout(r, 1500));
        
        const res = await page.evaluate(() => {
            if (typeof TaskApp !== 'undefined') {
                return {
                    defined: true,
                    cachedElementsArrayCount: Object.keys(TaskApp.elements).length,
                    clientsTabObjExists: !!document.getElementById('tab-clients'),
                    addClientModalObjExists: !!document.getElementById('addClientModal')
                };
            }
            return { defined: false, error: "TaskApp not defined on window" };
        });
        
        console.log('Result:', JSON.stringify(res, null, 2));
        
        await browser.close();
        process.exit(0);
    } catch(e) {
        console.error('Script Error:', e);
        process.exit(1);
    }
})();
