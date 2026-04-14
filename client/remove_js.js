const fs = require('fs');
let html = fs.readFileSync('timer.html', 'utf8');

// 1. Guard getter and setter for logClient
html = html.replace(/document\.getElementById\('logClient'\)/g, "(document.getElementById('logClient')||{value:'', style:{}, innerText:'', classList:{add:()=>{}, remove:()=>{}}})");

// 2. Guard getter and setter for logSite
html = html.replace(/document\.getElementById\('logSite'\)/g, "(document.getElementById('logSite')||{value:'', style:{}, innerText:'', classList:{add:()=>{}, remove:()=>{}}})");

// 3. Guard getter and setter for summaryClientFilter
html = html.replace(/document\.getElementById\('summaryClientFilter'\)/g, "(document.getElementById('summaryClientFilter')||{value:'', style:{}, innerText:'', classList:{add:()=>{}, remove:()=>{}}})");

// 4. Guard getter and setter for reportClientFilter
html = html.replace(/document\.getElementById\('reportClientFilter'\)/g, "(document.getElementById('reportClientFilter')||{value:'', style:{}, innerText:'', classList:{add:()=>{}, remove:()=>{}}})");

// 5. Remove Client filter from Summary tab
let oldHtml = html;
html = html.replace(/<div class="filter-group">\s*<label>Client ID<\/label>\s*<input type="hidden" id="summaryClientFilter" value="">\s*<div class="custom-select-container">[\s\S]*?id="summaryClientDropdownMenu"[\s\S]*?id="summaryClientOptionsList"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g, '');
if(oldHtml.length === html.length) console.log("Failed to match summaryClientFilter HTML");

// 6. Remove Client filter from Report tab
oldHtml = html;
html = html.replace(/<div class="filter-group">\s*<label>Client ID<\/label>\s*<input type="hidden" id="reportClientFilter" value="">\s*<div class="custom-select-container">[\s\S]*?id="reportClientDropdownMenu"[\s\S]*?id="reportClientOptionsList"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g, '');
if(oldHtml.length === html.length) console.log("Failed to match reportClientFilter HTML");

// 7. Fix selectedClientText
html = html.replace(/document\.getElementById\('selectedClientText'\)/g, "(document.getElementById('selectedClientText')||{value:'', style:{}, innerText:'', classList:{add:()=>{}, remove:()=>{}}})");

// 8. Fix selectedSiteText
html = html.replace(/document\.getElementById\('selectedSiteText'\)/g, "(document.getElementById('selectedSiteText')||{value:'', style:{}, innerText:'', classList:{add:()=>{}, remove:()=>{}}})");

fs.writeFileSync('timer.html', html);
console.log("Guard replacements done.");
