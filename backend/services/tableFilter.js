/**
 * --------------------------------------------------------------------------
 *  DATABASE SCHEMA FILTER SERVICE
 * --------------------------------------------------------------------------
 *  Filters out internal, system, or excluded database tables based on
 *  patterns defined in the central 'filler.json' configuration.
 */

const fs = require("fs");
const path = require("path");

// --- CONFIGURATION ---
const FILLER_PATH = path.join(__dirname, "..", "..", "datas", "Jsons", "filler.json");

/** @type {string[]} List of strings/patterns to identify tables for exclusion */
let excludePatterns = [];

/**
 * Loads (or reloads) the filter patterns from the filesystem.
 * Designed to be called at startup or when the config file changes.
 */
function loadFilters() {
    if (!fs.existsSync(FILLER_PATH)) {
        console.warn("⚠️ filler.json not found. All tables will be visible by default.");
        return;
    }

    try {
        const raw = fs.readFileSync(FILLER_PATH, "utf8");
        const json = JSON.parse(raw);
        excludePatterns = Array.isArray(json.exclude_table_patterns)
            ? json.exclude_table_patterns
            : [];
    } catch (e) {
        console.error("❌ Failed to parse filler.json:", e.message);
    }
}

// Initial load on module require
loadFilters();

/**
 * Checks if a given table name matches any of the exclusion patterns.
 *
 * @param {string} tableName - The name of the DB table to check.
 * @returns {boolean} True if the table should be hidden from the UI/API.
 */
function shouldExclude(tableName) {
    if (!tableName || typeof tableName !== "string") return true;

    // Returns true if any pattern is found within the table name
    return excludePatterns.some(pattern =>
        tableName.toLowerCase().includes(pattern.toLowerCase())
    );
}

module.exports = {
    shouldExclude,
    loadFilters
};