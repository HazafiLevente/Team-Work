const fs = require("fs");
const path = require("path");
const { supabase } = require("../services/supabase");

/**
 * A control.js által generált runtime file helye.
 * process.cwd() = backend mappa (ha onnan indítod a servert)
 */
const TABLES_FILE = path.join(
    process.cwd(),
    "datas",
    "Jsons",
    "tables.runtime.json"
);

console.log("TABLES_FILE:", TABLES_FILE);

/**
 * Betölti az engedélyezett táblákat (allowlist)
 * Ha nem olvasható a runtime file, üres Set-et adunk vissza.
 */
function loadAllowedTables() {
    try {
        const raw = fs.readFileSync(TABLES_FILE, "utf8");
        const json = JSON.parse(raw);
        return new Set(Object.keys(json.tables || {}));
    } catch (e) {
        console.warn("⚠️ tables.runtime.json not readable, allowlist DISABLED");
        return new Set();
    }
}

/**
 * GET /api/items/:table/:id
 * Egyetlen termék teljes sorának lekérése
 */
exports.getOne = async (req, res) => {
    const table = String(req.params.table || "").trim();
    const idRaw = String(req.params.id || "").trim();

    if (!table || !idRaw) {
        return res.status(400).json({ error: "Missing table or id" });
    }

    // alap SQL-injection védelem a táblanévre
    if (!/^[a-z0-9_]+$/i.test(table)) {
        return res.status(400).json({ error: "Invalid table name" });
    }

    const allowed = loadAllowedTables();

    // ha van allowlist → ellenőrzünk; ha nincs → nem blokkolunk
    if (allowed.size > 0 && !allowed.has(table)) {
        return res.status(400).json({ error: "Table not allowed" });
    } else if (allowed.size === 0) {
        console.warn("⚠️ allowlist is EMPTY -> table check skipped");
    }

    // id lehet number vagy string
    const id = /^\d+$/.test(idRaw) ? Number(idRaw) : idRaw;

    try {
        // 1) Próbáljuk a standard "id" oszloppal
        let { data, error } = await supabase
            .from(table)
            .select("*")
            .eq("id", id)
            .maybeSingle();

        // 2) Ha nincs "id" oszlop, próbáljuk "ID"-vel is
        if (
            error &&
            typeof error.message === "string" &&
            error.message.toLowerCase().includes("column") &&
            error.message.toLowerCase().includes("id")
        ) {
            console.warn(`⚠️ "${table}" has no "id" column, retry with "ID"...`);

            const retry = await supabase
                .from(table)
                .select("*")
                .eq("ID", id)
                .maybeSingle();

            data = retry.data;
            error = retry.error;
        }

        if (error) {
            console.error("SUPABASE ERROR:", error);
            return res.status(500).json({
                error: error.message,
                table,
                id: idRaw
            });
        }

        if (!data) {
            return res.status(404).json({ error: "Not found", table, id: idRaw });
        }

        res.json({ item: data });
    } catch (err) {
        console.error("UNEXPECTED ERROR:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * (placeholderek – nálad nem használjuk most)
 */
exports.list = async (req, res) => {
    res.json({ results: [] });
};

exports.search = async (req, res) => {
    res.json({ results: [] });
};
