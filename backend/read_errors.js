const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '..', 'datas', 'Jsons', 'server-logs.json');

try {
    const data = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    const errors = data.filter(e => e.level === 'error').slice(-10);
    console.log("=== LATEST ERRORS ===");
    errors.forEach(e => {
        console.log(`[${e.timestamp}] ${e.message}`);
    });
} catch (e) {
    console.error("Error reading logs:", e.message);
}
