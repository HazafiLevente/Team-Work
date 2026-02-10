const fs = require("fs");
const path = require("path");
const { db } = require("./localDb");

/* ----------------------------------
   PATH: search-filter.json
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
    if (!obj) return null;
    const objKeys = Object.keys(obj);
    for (const k of keys) {
        // Keressük meg azt a kulcsot az objektumban, ami megegyezik a kért kulccsal (case-insensitive)
        const realKey = objKeys.find(ok => ok.toLowerCase() === k.toLowerCase());
        const v = realKey ? obj[realKey] : null;
        if (v !== undefined && v !== null && v !== "") return v;
    }
    return null;
}

function modelMatchesQuestion(model, question) {
    const mTokens = normalize(model).match(/[a-z]+|\d+/g) || [];
    const qNorm = normalize(question);

    let hits = 0;
    for (const t of mTokens) {
        if (qNorm.includes(t)) hits++;
    }

    return hits >= Math.ceil(mTokens.length * 0.7);
}


// lazább normalizálás: ékezet OK, de egyezéshez mindent összehúzunk
function normalize(str = "") {
    return String(str)
        .toLowerCase()
        // ékezetek egyszerűsítése (hogy "kerül" / "kerul" mindegy legyen)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        // csak betű/szám marad
        .replace(/[^a-z0-9]/g, "");
}

// listázás intent (többféle forma)
function isListQuestion(q) {
    return /(listaz|listazd|irj|ird|sorold|mutasd|milyen|talalhato|termekek)/.test(
        normalize(q)
    );
}

// CPU/GPU jellegű model token (bővíthető)
function extractModelToken(question) {
    const q = question.toLowerCase();

    // pl: ryzen 7 9800x3d, 9800x3d, ryzen 7 5800x
    const m = q.match(
        /(ryzen\s*\d+\s*\d+x3d|ryzen\s*\d+\s*\d+x|ryzen\s*\d+\s*\d+|\d{4}x3d|\d{4}x)/i
    );
    return m ? normalize(m[1]) : null;
}

/* ----------------------------------
   MANUFACTURERS LOADER (dynamic)
---------------------------------- */
let MANUFACTURERS_CACHE = null;

function loadManufacturersFromFilter() {
    if (MANUFACTURERS_CACHE) return MANUFACTURERS_CACHE;

    let json;
    try {
        if (!fs.existsSync(FILTER_PATH)) {
            console.warn("[AI] search-filter.json not found at:", FILTER_PATH);
            MANUFACTURERS_CACHE = [];
            return MANUFACTURERS_CACHE;
        }
        json = JSON.parse(fs.readFileSync(FILTER_PATH, "utf8"));
    } catch (e) {
        console.warn("[AI] search-filter.json parse error:", e.message);
        MANUFACTURERS_CACHE = [];
        return MANUFACTURERS_CACHE;
    }

    // Rugalmas: lehet manufacturers, brands, manufacturer, stb.
    // Ha nem talál semmit, üres.
    let list = [];
    if (Array.isArray(json)) list = json;
    else if (Array.isArray(json.manufacturers)) list = json.manufacturers;
    else if (Array.isArray(json.brands)) list = json.brands;
    else if (Array.isArray(json.brand)) list = json.brand;

    // Ha objektumok (pl. {label:"ASUS"}) akkor szedd ki belőle
    const out = [];
    for (const x of list) {
        if (typeof x === "string") out.push(x);
        else if (x && typeof x === "object") {
            out.push(x.name || x.label || x.value || "");
        }
    }

    // tisztítás, duplikátum eldobás
    const uniq = Array.from(
        new Set(out.map(s => String(s).trim()).filter(Boolean))
    );

    // longest-first (hogy "be quiet" előbb kapjon match-et mint "be")
    uniq.sort((a, b) => b.length - a.length);

    MANUFACTURERS_CACHE = uniq;
    return MANUFACTURERS_CACHE;
}

/**
 * Brand felismerés a kérdésből úgy, hogy
 * - a filter.json-ben lévő gyártókat keressük benne
 * - normalizált szöveggel (ékezet/kötőjel/rag ne számítson)
 */
function extractBrandDynamic(question) {
    const manufacturers = loadManufacturersFromFilter();
    if (!manufacturers.length) return null;

    const qNorm = normalize(question);

    for (const brand of manufacturers) {
        const bNorm = normalize(brand);
        if (!bNorm) continue;

        // ha a kérdés tartalmazza a brand normalizált alakját
        if (qNorm.includes(bNorm)) return brand;
    }

    return null;
}

/* ----------------------------------
   MAIN
---------------------------------- */
function getProductsForAI(question = "") {
    const qNorm = normalize(question);

    const tables = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
        .all()
        .map(r => r.name);

    const exact = [];
    const similar = [];
    const list = [];

    const listIntent = isListQuestion(question);
    const brand = extractBrandDynamic(question);

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
                "models",
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

            const mNorm = normalize(manufacturer);
            const modelNorm = normalize(model);

            let price = null;
            if (priceRaw !== null && priceRaw !== undefined && priceRaw !== "") {
                const cleaned = String(priceRaw).replace(/[^0-9]/g, "");
                const p = Number(cleaned);
                if (!Number.isNaN(p)) price = p;
            }

            const row = {
                table,
                manufacturer,
                model,
                price,
                socket
            };

            /* 📋 LIST */
            if (listIntent && brand && normalize(brand) === mNorm) {
                list.push(row);
                continue;
            }

            /* 🎯 EXACT MATCH */
            if (modelNorm && qNorm.replace(/[^a-z0-9]/g, "").includes(modelNorm)) {
                exact.push(row);
                continue;
            }

            /* 🟡 SIMILAR */
            if (modelNorm && qNorm.includes(modelNorm.slice(0, 6))) {
                similar.push(row);
            }
        }
    }

    if (exact.length || similar.length) {
        return {
            mode: "product",
            exact: exact.slice(0, 3),
            similar: similar.slice(0, 5)
        };
    }

    if (list.length) {
        return {
            mode: "list",
            brand,
            list: list.slice(0, 20)
        };
    }

    return { mode: "none" };
}


module.exports = { getProductsForAI };
