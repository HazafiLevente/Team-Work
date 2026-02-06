const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DB_DIR = path.join(__dirname, "../../datas/setup_configurator");
const DB_PATH = path.join(DB_DIR, "local_cache.db");

if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");

function tableExists(table) {
    const row = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get(table);
    return !!row;
}

function selectAll(table, limit = 2000) {
    if (!tableExists(table)) return [];
    return db.prepare(`SELECT * FROM "${table}" LIMIT ?`).all(limit);
}

function selectWhereEquals(table, col, value, limit = 2000) {
    if (!tableExists(table)) return [];
    return db.prepare(`SELECT * FROM "${table}" WHERE "${col}" = ? LIMIT ?`).all(value, limit);
}

module.exports = {
    db,
    tableExists,
    selectAll,
    selectWhereEquals
};
