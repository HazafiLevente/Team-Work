const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// ✅ EGYETLEN, VALÓDI DB ÚTVONAL
const DB_DIR = path.join(__dirname, "../../datas/setup_configurator");
const DB_PATH = path.join(DB_DIR, "local_cache.db");

// biztosítjuk a mappát
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

// ✅ NEM readonly
const db = new Database(DB_PATH);

// fontos pragma
db.pragma("foreign_keys = ON");

function tableExists(table) {
    const row = db
        .prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
        )
        .get(table);
    return !!row;
}

function selectAll(table, limit = 2000) {
    if (!tableExists(table)) return [];
    return db.prepare(`SELECT * FROM "${table}" LIMIT ?`).all(limit);
}

function selectWhereEquals(table, col, value, limit = 2000) {
    if (!tableExists(table)) return [];
    try {
        return db
            .prepare(
                `SELECT * FROM "${table}" WHERE "${col}" = ? LIMIT ?`
            )
            .all(value, limit);
    } catch {
        return [];
    }
}

function selectWhereIn(table, col, values, limit = 5000) {
    if (!tableExists(table) || !Array.isArray(values) || !values.length) return [];

    const uniqueValues = Array.from(
        new Set(values.filter((value) => value !== null && value !== undefined))
    );

    if (!uniqueValues.length) return [];

    const placeholders = uniqueValues.map(() => "?").join(", ");
    const sql = `SELECT * FROM "${table}" WHERE "${col}" IN (${placeholders}) LIMIT ?`;

    try {
        return db.prepare(sql).all(...uniqueValues, limit);
    } catch {
        return [];
    }
}

function countAll(table) {
    if (!tableExists(table)) return 0;
    const row = db
        .prepare(`SELECT COUNT(*) as count FROM "${table}"`)
        .get();
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
