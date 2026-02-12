const fs = require("fs");
const path = require("path");
const { db } = require("./localDb");

/* =====================================================
   FILTER JSON
===================================================== */

const FILTER_PATH = path.join(
    __dirname,
    "..",
    "..",
    "datas",
    "Jsons",
    "search-filter.json"
);

/* =====================================================
   HELPERS
===================================================== */

function normalize(str = "") {
    return String(str)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
}

function tokens(str = "") {
    return normalize(str).match(/[a-z]+|\d+/g) || [];
}

function pick(obj, keys) {
    if (!obj) return null;
    const objKeys = Object.keys(obj);

    for (const k of keys) {
        const realKey = objKeys.find(ok => ok.toLowerCase() === k.toLowerCase());
        if (!realKey) continue;
        const v = obj[realKey];
        if (v !== undefined && v !== null && v !== "") return v;
    }

    return null;
}

function parsePrice(priceRaw) {
    if (priceRaw === null || priceRaw === undefined) return null;

    const cleaned = String(priceRaw).replace(/[^0-9]/g, "");
    const p = Number(cleaned);

    return Number.isNaN(p) ? null : p;
}

/* =====================================================
   INTENT DETECTION
===================================================== */

function isListQuestion(q) {
    const n = normalize(q);

    const listWords = [
        "listaz",
        "listazd",
        "irj",
        "ird",
        "sorold",
        "mutasd",
        "milyen",
        "talalhato",
        "termek",
        "termekek",
        "eszkoz",
        "eszkozok",
        "osszes",
        "osszest"
    ];

    return listWords.some(w => n.includes(w));
}

function isPriceQuestion(q) {
    const n = normalize(q);

    return (
        n.includes("mennyibe") ||
        n.includes("ar") ||
        n.includes("kerul") ||
        n.includes("ft")
    );
}

/* =====================================================
   MANUFACTURERS
===================================================== */

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
            list
                .map(x =>
                    typeof x === "string"
                        ? x.trim()
                        : x?.name || x?.label || ""
                )
                .filter(Boolean)
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

/* =====================================================
   TOKEN MATCH LOGIC
===================================================== */

function tokenMatch(model, question) {
    const mTokens = tokens(model);
    const qTokens = tokens(question);

    if (!mTokens.length) return false;

    let hits = 0;

    for (const t of mTokens) {
        if (qTokens.includes(t)) hits++;
    }

    // legalább 60% token egyezés kell
    return hits >= Math.ceil(mTokens.length * 0.6);
}

/* =====================================================
   MAIN SEARCH
===================================================== */

function getProductsForAI(question = "") {
    const listIntent = isListQuestion(question);
    const priceIntent = isPriceQuestion(question);
    const brand = extractBrand(question);

    const tables = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
        .all()
        .map(r => r.name);

    const exact = [];
    const similar = [];
    const list = [];

    for (const table of tables) {
        let rows;

        try {
            rows = db.prepare(`SELECT * FROM "${table}"`).all();
        } catch {
            continue;
        }

        for (const r of rows) {
            let manufacturer = pick(r, ["manufacturer", "brand", "maker"]);

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

            if (!manufacturer && model) {
                manufacturer = model.split(" ")[0];
            }

            if (!manufacturer && !model) continue;

            const priceRaw = pick(r, ["price", "price_huf", "cost", "amount"]);
            const price = parsePrice(priceRaw);
            const socket = pick(r, ["socket", "cpu_socket"]);

            const row = {
                table,
                manufacturer,
                model,
                price,
                socket
            };

            /* =============================
               LIST MODE (PRIORITY)
            ============================= */

            if (listIntent && brand && manufacturer) {
                if (normalize(manufacturer) === normalize(brand)) {
                    list.push(row);
                }
                continue;
            }

            /* =============================
               PRODUCT MODE
            ============================= */

            if (!listIntent && model) {
                if (tokenMatch(model, question)) {
                    exact.push(row);
                    continue;
                }

                // lazább similar match
                const modelNorm = normalize(model);
                const qNorm = normalize(question);

                if (modelNorm.length > 5 && qNorm.includes(modelNorm.slice(0, 6))) {
                    similar.push(row);
                }
            }
        }
    }

    /* =============================
       RESULT PRIORITY
    ============================= */

    if (listIntent) {
        return list.length
            ? { mode: "list", brand, list: list.slice(0, 30) }
            : { mode: "none" };
    }

    if (exact.length) {
        return {
            mode: "product",
            exact: exact.slice(0, 3),
            priceIntent
        };
    }

    if (similar.length) {
        return {
            mode: "product",
            similar: similar.slice(0, 5),
            priceIntent
        };
    }

    return { mode: "none" };
}

module.exports = { getProductsForAI };
