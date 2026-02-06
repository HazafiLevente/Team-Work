const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { supabase } = require("./supabase");

/* ----------------------------------
   CONFIG
---------------------------------- */

// extra cache-elt nevek (view-k is lehetnek)
const EXTRA_CACHE_OBJECTS = [
    "bell_messages_view"
];

// ezeket SOHA ne próbáljuk visszatölteni Supabase-be
const NEVER_UPLOAD = new Set([
    "bell_messages_view"
]);

// upload alapból OFF (mert a SQLite TEXT-esít, és sok táblád nem kompatibilis upsertre)
const ENABLE_UPLOAD_TO_SUPABASE = false;

// intervallum (ms)
const INTERVAL_MS = 5000;


/* ----------------------------------
   LOG BUFFER
---------------------------------- */

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

/* ----------------------------------
   PATHS
---------------------------------- */

const DB_DIR = path.join(__dirname, "../../datas/setup_configurator");
const DB_PATH = path.join(DB_DIR, "local_cache.db");

const TABLE_LIST_FILE = path.join(
    __dirname,
    "../../datas/Jsons/tables.list.json"
);

/* ----------------------------------
   INIT DIR + DB
---------------------------------- */

if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");

/* ----------------------------------
   HELPERS
---------------------------------- */

function qIdent(name) {
    // SQLite identifier escaping: " -> ""
    return `"${String(name).replace(/"/g, '""')}"`;
}

function ensureTable(table, sampleRow) {
    const columns = Object.keys(sampleRow)
        .map(col => `${qIdent(col)} TEXT`)
        .join(", ");

    const sql = `
    CREATE TABLE IF NOT EXISTS ${qIdent(table)} (
      ${columns}
    )
  `;

    db.prepare(sql).run();
}

function normalizeValue(value) {
    if (value === undefined) return null;
    if (value === null) return null;

    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);      // ✅ mindig string, hogy ne csússzon a típus
    if (typeof value === "boolean") return value ? "1" : "0"; // ✅ string
    if (typeof value === "bigint") return value.toString();

    if (value instanceof Date) return value.toISOString();
    if (Buffer.isBuffer(value)) return value;

    if (typeof value === "object") {
        try {
            return JSON.stringify(value);
        } catch {
            return null;
        }
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
        const base = Array.isArray(json.tables) ? json.tables : [];

        // ✅ extra cache objects mindig legyenek benne
        for (const x of EXTRA_CACHE_OBJECTS) {
            if (!base.includes(x)) base.push(x);
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

/* ----------------------------------
   SYNC FROM SUPABASE  (Supabase -> SQLite)
---------------------------------- */

async function syncFromSupabase() {
    const log = createLogBuffer("LOCAL SYNC FROM SUPABASE");

    const tables = loadTableList();
    if (!tables.length) {
        log.add("⚠️ nincs szinkronizálható tábla");
        log.flush();
        return;
    }

    let synced = 0;
    let empty = 0;
    let failed = 0;

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
}

/* ----------------------------------
   SYNC TO SUPABASE  (SQLite -> Supabase)
   ⚠️ erősen opcionális, mert a SQLite TEXT-esít.
---------------------------------- */

async function syncToSupabase() {
    console.log("📤 Syncing TO Supabase...");

    const tables = loadTableList();

    for (const table of tables) {
        if (NEVER_UPLOAD.has(table)) continue; // ✅ view / tiltott object skip

        if (!tableExists(table)) continue;

        let rows;
        try {
            rows = db.prepare(`SELECT * FROM ${qIdent(table)}`).all();
        } catch {
            continue;
        }

        if (!rows.length) continue;

        // ⚠️ ha nincs id, nem upsertelünk
        const hasId = rows[0] && Object.prototype.hasOwnProperty.call(rows[0], "id");
        if (!hasId) {
            console.warn(`⚠️ skip upload (${table}): no "id" column`);
            continue;
        }

        const { error } = await supabase
            .from(table)
            .upsert(rows, { onConflict: "id" });

        if (error) {
            console.error(`❌ Upload error (${table}):`, error.message);
        } else {
            console.log(`⬆️ ${table}: ${rows.length} sor feltöltve`);
        }
    }
}

/* ----------------------------------
   INTERVAL
---------------------------------- */

function startSyncInterval() {
    console.log(`🚀 Sync Service started (${INTERVAL_MS}ms interval)`);
    console.log(`📌 Upload to Supabase: ${ENABLE_UPLOAD_TO_SUPABASE ? "ON" : "OFF"}`);

    syncFromSupabase().catch(console.error);

    setInterval(async () => {
        try {
            await syncFromSupabase();

            if (ENABLE_UPLOAD_TO_SUPABASE) {
                await syncToSupabase();
            }
        } catch (err) {
            console.error("❌ Sync error:", err.message);
        }
    }, INTERVAL_MS);
}

module.exports = { startSyncInterval };
