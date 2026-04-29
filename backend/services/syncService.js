
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { supabase } = require("./supabase");
const { shouldExclude } = require("./tableFilter");




const EXTRA_CACHE_OBJECTS = [
    "bell_messages_view"
];


const NEVER_UPLOAD = new Set([
    "bell_messages_view"
]);


const ENABLE_UPLOAD_TO_SUPABASE = false;



function createLogBuffer(title) {
    return {
        title,
        lines: [],
        add(line) { this.lines.push(line); },
        flush() {
            console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log(`📊 ${this.title}`);
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            this.lines.forEach(l => console.log(l));
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        }
    };
}



const DB_DIR = path.join(__dirname, "../../datas/setup_configurator");
const DB_PATH = path.join(DB_DIR, "local_cache.db");

const TABLE_LIST_FILE = path.join(
    __dirname,
    "../../datas/Jsons/tables.list.json"
);



if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");



function qIdent(name) {
    return `"${String(name).replace(/"/g, '""')}"`;
}

function ensureTable(table, sampleRow) {
    db.prepare(`DROP TABLE IF EXISTS ${qIdent(table)}`).run();


    const seen = new Set();
    const uniqueCols = [];
    for (const col of Object.keys(sampleRow)) {
        const lower = col.toLowerCase();
        if (!seen.has(lower)) {
            seen.add(lower);
            uniqueCols.push(col);
        }
    }

    const columns = uniqueCols.map(col => `${qIdent(col)} TEXT`).join(", ");
    db.prepare(`CREATE TABLE ${qIdent(table)} (${columns})`).run();
}

function normalizeValue(value) {
    if (value === undefined || value === null) return null;

    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "1" : "0";
    if (typeof value === "bigint") return value.toString();

    if (value instanceof Date) return value.toISOString();
    if (Buffer.isBuffer(value)) return value;

    if (typeof value === "object") {
        try { return JSON.stringify(value); } catch { return null; }
    }

    return String(value);
}

function loadTableList() {
    if (!fs.existsSync(TABLE_LIST_FILE)) {
        console.warn("⚠️ tables.list.json nem létezik, sync kihagyva");
        return [];
    }

    try {
        const json = JSON.parse(fs.readFileSync(TABLE_LIST_FILE, "utf-8"));
        const base = (Array.isArray(json.tables) ? json.tables : [])
            .filter(t => !shouldExclude(t));

        for (const x of EXTRA_CACHE_OBJECTS) {
            if (!base.includes(x) && !shouldExclude(x)) base.push(x);
        }

        return base;
    } catch (e) {
        console.error("❌ tables.list.json parse error:", e.message);
        return [];
    }
}

function tableExists(table) {
    const row = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get(table);
    return !!row;
}



async function syncFromSupabase() {
    const log = createLogBuffer("LOCAL SYNC FROM SUPABASE");

    const tables = loadTableList();
    if (!tables.length) {
        log.add("⚠️ nincs szinkronizálható tábla");
        log.flush();
        return { synced: 0, empty: 0, failed: 0 };
    }

    let synced = 0, empty = 0, failed = 0;

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select("*");

        if (error) {
            failed++;
            log.add(`❌ ${table} – ${error.message}`);
            continue;
        }

        if (!data || data.length === 0) {
            empty++;
            log.add(`⚠️ ${table} – üres`);
            continue;
        }

        ensureTable(table, data[0]);
        db.prepare(`DELETE FROM ${qIdent(table)}`).run();

        const cols = Object.keys(data[0]);
        const stmt = db.prepare(`
      INSERT INTO ${qIdent(table)}
      (${cols.map(c => qIdent(c)).join(",")})
      VALUES (${cols.map(() => "?").join(",")})
    `);

        const tx = db.transaction(rows => {
            for (const row of rows) {
                stmt.run(cols.map(c => normalizeValue(row[c])));
            }
        });

        tx(data);

        synced++;
        log.add(`✅ ${table} – ${data.length} sor`);
    }

    log.add("");
    log.add(`📌 Összegzés:`);
    log.add(`   ✔ szinkronizált: ${synced}`);
    log.add(`   ⚠️ üres: ${empty}`);
    log.add(`   ❌ hibás: ${failed}`);
    log.flush();

    return { synced, empty, failed };
}



async function syncToSupabase() {
    console.log("📤 Syncing TO Supabase...");

    const tables = loadTableList();

    for (const table of tables) {
        if (NEVER_UPLOAD.has(table)) continue;
        if (!tableExists(table)) continue;

        let rows;
        try {
            rows = db.prepare(`SELECT * FROM ${qIdent(table)}`).all();
        } catch {
            continue;
        }

        if (!rows.length) continue;

        const hasId = rows[0] && Object.prototype.hasOwnProperty.call(rows[0], "id");
        if (!hasId) {
            console.warn(`⚠️ skip upload (${table}): no "id" column`);
            continue;
        }

        const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });

        if (error) console.error(`❌ Upload error (${table}):`, error.message);
        else console.log(`⬆️ ${table}: ${rows.length} sor feltöltve`);
    }
}

async function syncOnce({ upload = false } = {}) {
    const result = await syncFromSupabase();
    if (upload && ENABLE_UPLOAD_TO_SUPABASE) {
        await syncToSupabase();
    }
    return result;
}

module.exports = {
    syncFromSupabase,
    syncToSupabase,
    syncOnce
};
