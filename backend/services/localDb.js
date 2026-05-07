/**
 * --------------------------------------------------------------------------
 *  LOCAL SQLITE ENGINE (BETTER-SQLITE3)
 * --------------------------------------------------------------------------
 *  Provides a high-performance, synchronous data layer for local caching,
 *  metrics, and session storage. Includes safety wrappers for table
 *  existence and dynamic query building.
 */

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// --- DATABASE PATH CONFIGURATION ---
const DB_DIR = path.join(__dirname, "../../datas/setup_configurator");
const DB_PATH = path.join(DB_DIR, "local_cache.db");

// Ensure the storage directory exists
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

/**
 * Initialize the SQLite database.
 * 'better-sqlite3' is synchronous, which is ideal for high-speed local operations
 * in Node.js where async overhead is not desired.
 */
const db = new Database(DB_PATH);

// Enable foreign key constraints for data integrity
db.pragma("foreign_keys = ON");

// --- DATABASE UTILITIES ---

/**
 * Checks if a specific table exists in the SQLite schema.
 */
function tableExists(table) {
    const row = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get(table);
    return !!row;
}

/**
 * Retrieves all rows from a table with a safety limit.
 */
function selectAll(table, limit = 2000) {
    if (!tableExists(table)) return [];
    return db.prepare(`SELECT * FROM "${table}" LIMIT ?`).all(limit);
}

/**
 * Performs a simple 'WHERE column = value' search.
 */
function selectWhereEquals(table, col, value, limit = 2000) {
    if (!tableExists(table)) return [];
    try {
        return db
            .prepare(`SELECT * FROM "${table}" WHERE "${col}" = ? LIMIT ?`)
            .all(value, limit);
    } catch (err) {
        console.error(`❌ SQLite Select Error (${table}):`, err.message);
        return [];
    }
}

/**
 * Performs a 'WHERE column IN (...)' search with unique value filtering.
 */
function selectWhereIn(table, col, values, limit = 5000) {
    if (!tableExists(table) || !Array.isArray(values) || !values.length) return [];

    // Filter out null/undefined and ensure unique set for efficiency
    const uniqueValues = Array.from(
        new Set(values.filter((v) => v !== null && v !== undefined))
    );

    if (!uniqueValues.length) return [];

    const placeholders = uniqueValues.map(() => "?").join(", ");
    const sql = `SELECT * FROM "${table}" WHERE "${col}" IN (${placeholders}) LIMIT ?`;

    try {
        return db.prepare(sql).all(...uniqueValues, limit);
    } catch (err) {
        console.error(`❌ SQLite IN Error (${table}):`, err.message);
        return [];
    }
}

/**
 * Returns the total row count for a given table.
 */
function countAll(table) {
    if (!tableExists(table)) return 0;
    const row = db.prepare(`SELECT COUNT(*) as count FROM "${table}"`).get();
    return row?.count ?? 0;
}

module.exports = {
    db,
    tableExists,
    selectAll,
    selectWhereEquals,
    selectWhereIn,
    countAll
};