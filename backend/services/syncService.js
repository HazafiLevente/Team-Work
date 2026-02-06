const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { supabase } = require("./supabase");


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

function ensureTable(table, sampleRow) {
    const columns = Object.keys(sampleRow)
        .map(col => `"${col}" TEXT`)
        .join(", ");

    const sql = `
        CREATE TABLE IF NOT EXISTS "${table}" (
            ${columns}
        )
    `;

    db.prepare(sql).run();
}

function normalizeValue(value) {
    if (value === undefined) return null;
    if (value === null) return null;

    if (typeof value === "string") return value;
    if (typeof value === "number") return value;
    if (typeof value === "boolean") return value ? 1 : 0;
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

    return null;
}

function loadTableList() {
    if (!fs.existsSync(TABLE_LIST_FILE)) {
        console.warn("⚠️ tables.list.json nem létezik, sync kihagyva");
        return [];
    }

    try {
        const json = JSON.parse(fs.readFileSync(TABLE_LIST_FILE, "utf-8"));
        return Array.isArray(json.tables) ? json.tables : [];
    } catch (e) {
        console.error("❌ tables.list.json parse error:", e.message);
        return [];
    }
}

/* ----------------------------------
   SYNC FROM SUPABASE
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
        db.prepare(`DELETE FROM "${table}"`).run();

        const cols = Object.keys(data[0]);
        const stmt = db.prepare(`
            INSERT INTO "${table}"
            (${cols.map(c => `"${c}"`).join(",")})
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
   SYNC TO SUPABASE (ALAP VERZIÓ)
---------------------------------- */

async function syncToSupabase() {
    console.log("📤 Syncing TO Supabase...");

    const tables = loadTableList();

    for (const table of tables) {
        let rows;
        try {
            rows = db.prepare(`SELECT * FROM "${table}"`).all();
        } catch {
            continue;
        }

        if (!rows.length) continue;

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
    console.log("🚀 Sync Service started (5s interval)");

    syncFromSupabase().catch(console.error);

    setInterval(async () => {
        try {
            await syncFromSupabase();
            await syncToSupabase();
        } catch (err) {
            console.error("❌ Sync error:", err.message);
        }
    }, 5000);
}

module.exports = { startSyncInterval };
