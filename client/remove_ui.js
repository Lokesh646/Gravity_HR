const fs = require('fs');
let html = fs.readFileSync('timer.html', 'utf8');

// 1. Remove Client from Timer input bar
html = html.replace(/<div class="timer-field">\s*<label>Client<\/label>[\s\S]*?<!-- Options injected here -->\n*\s*<\/div>\n*\s*<\/div>\n*\s*<\/div>\n*\s*<\/div>/, '');

// 2. Remove Site from Timer input bar
html = html.replace(/<div class="timer-field">\s*<label>Site<\/label>[\s\S]*?<!-- Sites injected here -->\n*\s*<\/div>\n*\s*<\/div>\n*\s*<\/div>\n*\s*<\/div>/, '');

// 3. Remove Client and Site from table headers (Logs)
html = html.replace(/<th>Client<\/th>\r?\n\s*/g, '');
html = html.replace(/<th>Site<\/th>\r?\n\s*/g, '');

// 4. Remove log.clientName and log.site cells from renderLogs
html = html.replace(/<td class="editable" data-field="clientId" data-val="\$\{log\.clientId \|\| ''\}" ondblclick="TimerApp\.activateInlineEdit\(event, this\)">\$\{log\.clientName \|\| '-'\}<\/td>\r?\n\s*/g, '');
html = html.replace(/<td class="editable" data-field="site" ondblclick="TimerApp\.activateInlineEdit\(event, this\)">\$\{log\.site \|\| '-'\}<\/td>\r?\n\s*/g, '');

// 5. Remove Summary Client Filter
html = html.replace(/<div class="filter-group">[\s\S]*?<label>Client ID<\/label>[\s\S]*?id="summaryClientDropdownMenu"[\s\S]*?<\/div>\r?\n\s*<\/div>\r?\n\s*<\/div>/, '');

// 6. Remove Report Client Filter
html = html.replace(/<div class="filter-group">[\s\S]*?<label>Client ID<\/label>[\s\S]*?id="reportClientDropdownMenu"[\s\S]*?<\/div>\r?\n\s*<\/div>\r?\n\s*<\/div>/, '');

// 7. Remove Client from Report Table headers
html = html.replace(/<th onclick="TimerApp\.handleReportSort\('clientName'\)" style="cursor: pointer;">\s*Client <i class="fa-solid fa-sort"[\s\S]*?<\/th>/, '');

// 8. Remove Site from Report Table headers
html = html.replace(/<th onclick="TimerApp\.handleReportSort\('site'\)" style="cursor: pointer;">Site <i[\s\S]*?<\/th>/, '');

// 9. Remove from Report Table Render
html = html.replace(/<td>\$\{log\.clientName \|\| '-'\}<\/td>\r?\n\s*/, '');
html = html.replace(/<td>\$\{log\.site \|\| '-'\}<\/td>\r?\n\s*/, '');

fs.writeFileSync('timer.html', html);
console.log("Replacements done.");
