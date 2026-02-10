const fs = require("fs");
const path = require("path");
const { db } = require("./localDb");

/* ----------------------------------
   search-filter.json
---------------------------------- */
const FILTER_PATH = path.join(
    __dirname,
    "..",
    "..",
    "datas",
    "Jsons",
    "search-filter.json"
);

/* ----------------------------------
   HELPERS
---------------------------------- */
function pick(obj, keys) {
    for (const k of keys) {
        const v = obj?.[k];
        if (v !== undefined && v !== null && v !== "") return v;
    }
    return null;
}

function normalize(str = "") {
    return String(str)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
}
function rowText(row) {
    return Object.values(row)
        .filter(v => typeof v === "string")
        .join(" ")
        .toLowerCase();
}

/* ----------------------------------
   MODEL TOKEN (EZ A KULCS!)
---------------------------------- */
function extractModelToken(question = "") {
    const q = question.toLowerCase();

    const m = q.match(
        /(ryzen\s*\d+\s*\d+x3d|ryzen\s*\d+\s*\d+x|ryzen\s*\d+\s*\d+|\d{4}x3d|\d{4}x)/i
    );

    return m ? normalize(m[1]) : null;
}

/* ----------------------------------
   LIST INTENT
---------------------------------- */
function isListQuestion(q) {
    return /(listaz|listazd|irj|ird|sorold|mutasd|milyen|talalhato|termekek)/.test(
        normalize(q)
    );
}

/* ----------------------------------
   MANUFACTURERS FROM JSON
---------------------------------- */
let MANUFACTURERS_CACHE = null;

function loadManufacturersFromFilter() {
    if (MANUFACTURERS_CACHE) return MANUFACTURERS_CACHE;
    if (!fs.existsSync(FILTER_PATH)) return [];

    let json;
    try {
        json = JSON.parse(fs.readFileSync(FILTER_PATH, "utf8"));
    } catch {
        return [];
    }

    let list = [];
    if (Array.isArray(json)) list = json;
    else if (Array.isArray(json.manufacturers)) list = json.manufacturers;
    else if (Array.isArray(json.brands)) list = json.brands;

    MANUFACTURERS_CACHE = Array.from(
        new Set(
            list.map(x =>
                typeof x === "string"
                    ? x.trim()
                    : x?.name || x?.label || ""
            ).filter(Boolean)
        )
    ).sort((a, b) => b.length - a.length);

    return MANUFACTURERS_CACHE;
}

function extractBrand(question) {
    const brands = loadManufacturersFromFilter();
    const qNorm = normalize(question);

    for (const b of brands) {
        if (qNorm.includes(normalize(b))) return b;
    }
    return null;
}

/* ----------------------------------
   MAIN
---------------------------------- */
function getProductsForAI(question = "") {
    const modelToken = extractModelToken(question);
    const listIntent = isListQuestion(question);
    const brand = extractBrand(question);

    const tables = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
        .all()
        .map(r => r.name);

    const exact = [];
    const list = [];

    for (const table of tables) {
        let rows;
        try {
            rows = db.prepare(`SELECT * FROM "${table}"`).all();
        } catch {
            continue;
        }

        for (const r of rows) {
            const manufacturer = pick(r, ["manufacturer", "brand", "maker"]);
            const model = pick(r, [
                "model",
                "model_name",
                "full_name",
                "cpu_model",
                "product",
                "name",
                "product_name",
                "title"
            ]);
            const priceRaw = pick(r, ["price", "price_huf", "cost", "amount"]);
            const socket = pick(r, ["socket", "cpu_socket"]);

            if (!manufacturer && !model) continue;

            let price = null;
            if (priceRaw !== null && priceRaw !== undefined) {
                const cleaned = String(priceRaw).replace(/[^0-9]/g, "");
                const p = Number(cleaned);
                if (!Number.isNaN(p)) price = p;
            }

            const row = { table, manufacturer, model, price, socket };

            /* 🎯 PRODUCT FIRST */
            if (modelToken) {
                const text = normalize(rowText(r));

                if (text.includes(modelToken)) {
                    exact.push(row);
                    continue;
                }
            }


            /* 📋 LIST */
            if (!exact.length && listIntent && brand && manufacturer) {
                if (normalize(manufacturer) === normalize(brand)) {
                    list.push(row);
                }
            }
        }
    }

    if (exact.length) {
        return { mode: "product", exact: exact.slice(0, 3), similar: [] };
    }

    if (list.length) {
        return { mode: "list", brand, list: list.slice(0, 20) };
    }

    return { mode: "none" };
}

module.exports = { getProductsForAI };
