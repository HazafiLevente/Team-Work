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

/**
 * Betölti a filler.json-ból a kizárandó mintákat.
 */
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

// Kezdeti betöltés
loadFilters();

/**
 * Meghatározza, hogy egy táblát ki kell-e zárni a neve alapján.
 * @param {string} tableName 
 * @returns {boolean} true, ha ki kell zárni
 */
function shouldExclude(tableName) {
    if (!tableName) return true;

    // Ha bármelyik minta szerepel a táblanévben (bárhol)
    return excludePatterns.some(pattern => tableName.includes(pattern));
}

module.exports = {
    shouldExclude,
    loadFilters
};
