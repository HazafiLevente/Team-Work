const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { supabase } = require("./supabase");

const DB_DIR = path.join(__dirname, "../../datas/setup_configurator");
const DB_PATH = path.join(DB_DIR, "local_cache.db");

// Biztosítjuk, hogy a mappa létezzen
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

async function initLocalDb() {
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    // Itt inicializálhatod a táblákat, ha üres az adatbázis
    // Példa: szinkronizált táblák listája (fk-k és adatok)
    return db;
}

async function syncFromSupabase() {
    console.log("Syncing FROM Supabase...");
    const db = await initLocalDb();

    // Példa egy tábla szinkronizálására (ismételd meg minden szükséges táblára)
    const tables = ["hometheaters", "computers", "cars"];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select("*");

        if (error) {
            console.error(`Error fetching ${table}:`, error);
            continue;
        }

        // Lokális tábla létrehozása (egyszerűsített sémával)
        if (data.length > 0) {
            const columns = Object.keys(data[0]);
            await db.exec(`CREATE TABLE IF NOT EXISTS ${table} (${columns.join(" TEXT, ")} )`);

            // Töröljük a régit, berakjuk az újat (Full Sync)
            await db.run(`DELETE FROM ${table}`);
            for (const row of data) {
                const keys = Object.keys(row);
                const values = Object.values(row).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
                const placeholders = keys.map(() => "?").join(",");
                await db.run(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${placeholders})`, values);
                // A syncFromSupabase függvényen belül:
                const { data, error } = await supabase.from(table).select("*");
                if (data) {
                    console.log(`📥 [SYNC] ${table} tábla: ${data.length} sor letöltve.`);
                }
            }
        }
    }

    console.log("✅ Sync from Supabase finished.");
}

async function syncToSupabase() {
    // Itt a logika fordítva: lokális DB módosítások feltöltése
    // Ez komplexebb (kell egy 'updated_at' vagy 'is_dirty' flag),
    // de egy alap felülírást meg lehet oldani:
    console.log("Checking for local updates to upload...");
    // Ide jön a feltöltési logika...
}

function startSyncInterval() {
    console.log("🚀 Sync Service started (5s intervals)");
    setInterval(async () => {
        try {
            await syncFromSupabase();
            await syncToSupabase();
        } catch (err) {
            console.error("Sync error:", err);
        }
    }, 5000);
}

module.exports = { startSyncInterval };