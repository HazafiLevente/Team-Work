const fs = require("fs");
const path = require("path");

const FILLER_PATH = path.join(
    __dirname,
    "..",
    "..",
    "datas",
    "Jsons",
    "filler.json"
);

let excludePatterns = [];


function loadFilters() {
    if (!fs.existsSync(FILLER_PATH)) {
        console.warn("⚠️ filler.json nem található, nincs szűrés.");
        return;
    }

    try {
        const json = JSON.parse(fs.readFileSync(FILLER_PATH, "utf8"));
        excludePatterns = json.exclude_table_patterns || [];
    } catch (e) {
        console.error("❌ filler.json betöltési hiba:", e.message);
    }
}


loadFilters();


function shouldExclude(tableName) {
    if (!tableName) return true;


    return excludePatterns.some(pattern => tableName.includes(pattern));
}

module.exports = {
    shouldExclude,
    loadFilters
};
