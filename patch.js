const fs = require('fs');
let lines = fs.readFileSync('src/pages/diagnostics/DiagnosticsPage.tsx', 'utf8').split('\n');
let start = lines.findIndex(l => l.includes('FINANCE CONFIG TAB'));
if (start !== -1) {
    let end = start;
    while(end < lines.length && !lines[end].includes('</main>')) {
        end++;
    }
    lines.splice(start, end - start);
    fs.writeFileSync('src/pages/diagnostics/DiagnosticsPage.tsx', lines.join('\n'));
    console.log('Removed');
} else {
    console.log('Not found');
}
