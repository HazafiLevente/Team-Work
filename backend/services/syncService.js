const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const { supabase } = require("./supabase");
const { shouldExclude } = require("./tableFilter");

/**
 * Extra database objects that should always
 * be included in the local cache sync.
 */
const EXTRA_CACHE_OBJECTS = [
    "bell_messages_view"
];

/**
 * Tables/views that must NEVER be uploaded
 * back to Supabase.
 */
const NEVER_UPLOAD = new Set([
    "bell_messages_view"
]);

/**
 * Global upload toggle.
 *
 * false:
 * -> local DB only downloads from Supabase
 *
 * true:
 * -> local DB can also upload changes
 */
const ENABLE_UPLOAD_TO_SUPABASE = false;

/**
 * Creates a buffered logger object.
 *
 * Useful for collecting logs during sync
 * and printing them all at once in a clean format.
 */
function createLogBuffer(title) {
    return {
        title,
        lines: [],

        add(line) {
            this.lines.push(line);
        },

        flush() {
            console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log(`📊 ${this.title}`);
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

            this.lines.forEach(l => console.log(l));

            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        }
    };
}

/**
 * Local SQLite database location.
 */
const DB_DIR = path.join(
    __dirname,
    "../../datas/setup_configurator"
);

const DB_PATH = path.join(DB_DIR, "local_cache.db");

/**
 * JSON file containing the list
 * of tables to synchronize.
 */
const TABLE_LIST_FILE = path.join(
    __dirname,
    "../../datas/Jsons/tables.list.json"
);

/**
 * Create DB folder if missing.
 */
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

/**
 * Initialize local SQLite database.
 */
const db = new Database(DB_PATH);

/**
 * Enable foreign key support in SQLite.
 */
db.pragma("foreign_keys = ON");

/**
 * Safely escapes SQLite identifiers
 * such as table names or column names.
 */
function qIdent(name) {
    return `"${String(name).replace(/"/g, '""')}"`;
}

/**
 * Recreates a table based on a sample row.
 *
 * All columns are stored as TEXT
 * for maximum compatibility.
 */
function ensureTable(table, sampleRow) {

    // Remove existing table completely
    db.prepare(`DROP TABLE IF EXISTS ${qIdent(table)}`).run();

    /**
     * Remove duplicate column names
     * ignoring letter case.
     */
    const seen = new Set();
    const uniqueCols = [];

    for (const col of Object.keys(sampleRow)) {
        const lower = col.toLowerCase();

        if (!seen.has(lower)) {
            seen.add(lower);
            uniqueCols.push(col);
        }
    }

    // Build CREATE TABLE statement
    const columns = uniqueCols
        .map(col => `${qIdent(col)} TEXT`)
        .join(", ");

    db.prepare(`
        CREATE TABLE ${qIdent(table)} (${columns})
    `).run();
}

/**
 * Converts values into a SQLite-safe format.
 */
function normalizeValue(value) {

    // Null/undefined handling
    if (value === undefined || value === null) {
        return null;
    }

    // Primitive values
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "1" : "0";
    if (typeof value === "bigint") return value.toString();

    // Date handling
    if (value instanceof Date) {
        return value.toISOString();
    }

    // Buffer handling
    if (Buffer.isBuffer(value)) {
        return value;
    }

    // Serialize objects/arrays into JSON
    if (typeof value === "object") {
        try {
            return JSON.stringify(value);
        } catch {
            return null;
        }
    }

    return String(value);
}

/**
 * Loads the table list from JSON config.
 */
function loadTableList() {

    // Missing config file
    if (!fs.existsSync(TABLE_LIST_FILE)) {
        console.warn("⚠️ tables.list.json nem létezik, sync kihagyva");
        return [];
    }

    try {
        const json = JSON.parse(
            fs.readFileSync(TABLE_LIST_FILE, "utf-8")
        );

        /**
         * Base table list filtered
         * through exclusion rules.
         */
        const base = (
            Array.isArray(json.tables)
                ? json.tables
                : []
        ).filter(t => !shouldExclude(t));

        /**
         * Add extra objects manually.
         */
        for (const x of EXTRA_CACHE_OBJECTS) {
            if (!base.includes(x) && !shouldExclude(x)) {
                base.push(x);
            }
        }

        return base;

    } catch (e) {
        console.error(
            "❌ tables.list.json parse error:",
            e.message
        );

        return [];
    }
}

/**
 * Checks whether a SQLite table exists.
 */
function tableExists(table) {
    const row = db
        .prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type='table'
              AND name=?
        `)
        .get(table);

    return !!row;
}

/**
 * Downloads all configured tables
 * from Supabase into local SQLite cache.
 */
async function syncFromSupabase() {

    const log = createLogBuffer(
        "LOCAL SYNC FROM SUPABASE"
    );

    const tables = loadTableList();

    // No tables configured
    if (!tables.length) {
        log.add("⚠️ nincs szinkronizálható tábla");
        log.flush();

        return {
            synced: 0,
            empty: 0,
            failed: 0
        };
    }

    let synced = 0;
    let empty = 0;
    let failed = 0;

    // Process tables one-by-one
    for (const table of tables) {

        // Fetch all rows from Supabase
        const { data, error } = await supabase
            .from(table)
            .select("*");

        // Query failed
        if (error) {
            failed++;

            log.add(`❌ ${table} – ${error.message}`);

            continue;
        }

        // Empty table
        if (!data || data.length === 0) {
            empty++;

            log.add(`⚠️ ${table} – üres`);

            continue;
        }

        // Recreate local table structure
        ensureTable(table, data[0]);

        // Clear previous local data
        db.prepare(`
            DELETE FROM ${qIdent(table)}
        `).run();

        const cols = Object.keys(data[0]);

        /**
         * Prepared INSERT statement
         * for better performance.
         */
        const stmt = db.prepare(`
            INSERT INTO ${qIdent(table)}
                (${cols.map(c => qIdent(c)).join(",")})
            VALUES (${cols.map(() => "?").join(",")})
        `);

        /**
         * Transaction improves insert speed massively.
         */
        const tx = db.transaction(rows => {
            for (const row of rows) {
                stmt.run(
                    cols.map(c => normalizeValue(row[c]))
                );
            }
        });

        tx(data);

        synced++;

        log.add(`✅ ${table} – ${data.length} sor`);
    }

    // Summary section
    log.add("");
    log.add(`📌 Összegzés:`);
    log.add(`   ✔ szinkronizált: ${synced}`);
    log.add(`   ⚠️ üres: ${empty}`);
    log.add(`   ❌ hibás: ${failed}`);

    log.flush();

    return {
        synced,
        empty,
        failed
    };
}

/**
 * Uploads local SQLite tables
 * back to Supabase.
 */
async function syncToSupabase() {

    console.log("📤 Syncing TO Supabase...");

    const tables = loadTableList();

    for (const table of tables) {

        // Skip protected tables
        if (NEVER_UPLOAD.has(table)) {
            continue;
        }

        // Skip non-existing local tables
        if (!tableExists(table)) {
            continue;
        }

        let rows;

        try {

            // Read all local rows
            rows = db.prepare(`
                SELECT * FROM ${qIdent(table)}
            `).all();

        } catch {

            // Skip invalid tables
            continue;
        }

        // Skip empty tables
        if (!rows.length) continue;

        /**
         * Upsert requires an ID column.
         */
        const hasId =
            rows[0] &&
            Object.prototype.hasOwnProperty.call(
                rows[0],
                "id"
            );

        if (!hasId) {
            console.warn(
                `⚠️ skip upload (${table}): no "id" column`
            );

            continue;
        }

        /**
         * Upsert rows into Supabase.
         *
         * onConflict: "id"
         * -> update existing rows if IDs match
         */
        const { error } = await supabase
            .from(table)
            .upsert(rows, {
                onConflict: "id"
            });

        if (error) {
            console.error(
                `❌ Upload error (${table}):`,
                error.message
            );
        } else {
            console.log(
                `⬆️ ${table}: ${rows.length} sor feltöltve`
            );
        }
    }
}

/**
 * Performs a full synchronization cycle.
 *
 * Default:
 * -> download only
 *
 * Optional:
 * -> upload local changes too
 */
async function syncOnce({ upload = false } = {}) {

    // Download latest data from Supabase
    const result = await syncFromSupabase();

    // Upload local changes if enabled
    if (upload && ENABLE_UPLOAD_TO_SUPABASE) {
        await syncToSupabase();
    }

    return result;
}

/**
 * Export sync service API.
 */
module.exports = {
    syncFromSupabase,
    syncToSupabase,
    syncOnce
};