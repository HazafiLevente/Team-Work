const fs = require("fs");
const path = require("path");

const { db } = require("./localDb");
const { shouldExclude } = require("./tableFilter");

/**
 * --------------------------------------------------------------------------
 *  PRODUCT PROVIDER
 * --------------------------------------------------------------------------
 *  Lightweight AI-oriented product search provider.
 *
 *  Responsibilities:
 *   - Parse user questions
 *   - Detect list/product/price intent
 *   - Extract manufacturers
 *   - Search across all SQLite product tables
 *   - Return best matching products for AI responses
 * --------------------------------------------------------------------------
 */

/**
 * Path to cached manufacturer filter JSON.
 * Used for brand extraction.
 */
const FILTER_PATH = path.join(
    __dirname,
    "..",
    "..",
    "datas",
    "Jsons",
    "search-filter.json"
);

/* ==========================================================================
   NORMALIZATION HELPERS
========================================================================== */

/**
 * Converts text into normalized searchable format.
 *
 * Example:
 *   "Árvíztűrő ASUS RTX-4090"
 * becomes:
 *   "arvizturo-asus-rtx-4090"
 */
function normalize(str = "") {
    return String(str)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9-]/g, "")      // keep alphanumeric only
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

/**
 * Splits normalized text into tokens.
 */
function tokens(str = "") {
    return normalize(str).match(/[a-z]+|\d+/g) || [];
}

/* ==========================================================================
   OBJECT FIELD HELPERS
========================================================================== */

/**
 * Case-insensitive field picker.
 *
 * Tries multiple possible field names and returns the first valid value.
 */
function pick(obj, keys) {
    if (!obj) return null;

    const objKeys = Object.keys(obj);

    for (const k of keys) {

        // Find matching key ignoring case
        const realKey = objKeys.find(
            ok => ok.toLowerCase() === k.toLowerCase()
        );

        if (!realKey) continue;

        const v = obj[realKey];

        if (v !== undefined && v !== null && v !== "") {
            return v;
        }
    }

    return null;
}

/**
 * Converts various price formats into clean numeric values.
 *
 * Example:
 *   "599 990 Ft" -> 599990
 */
function parsePrice(priceRaw) {
    if (priceRaw === null || priceRaw === undefined) {
        return null;
    }

    const cleaned = String(priceRaw).replace(/[^0-9]/g, "");
    const p = Number(cleaned);

    return Number.isNaN(p) ? null : p;
}

/* ==========================================================================
   QUESTION / INTENT DETECTION
========================================================================== */

/**
 * Detects if user wants a product listing.
 */
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

/**
 * Detects if user is asking about pricing.
 */
function isPriceQuestion(q) {

    const n = normalize(q);

    return (
        n.includes("mennyibe") ||
        n.includes("ar") ||
        n.includes("kerul") ||
        n.includes("ft")
    );
}

/* ==========================================================================
   MANUFACTURER CACHE
========================================================================== */

let MANUFACTURERS_CACHE = null;

/**
 * Loads manufacturer names from filter JSON.
 * Result is cached in memory.
 */
function loadManufacturersFromFilter() {

    if (MANUFACTURERS_CACHE) {
        return MANUFACTURERS_CACHE;
    }

    if (!fs.existsSync(FILTER_PATH)) {
        return [];
    }

    let json;

    try {
        json = JSON.parse(
            fs.readFileSync(FILTER_PATH, "utf8")
        );
    } catch {
        return [];
    }

    let list = [];

    // Flexible JSON structure handling
    if (Array.isArray(json)) {
        list = json;
    }
    else if (Array.isArray(json.manufacturers)) {
        list = json.manufacturers;
    }
    else if (Array.isArray(json.brands)) {
        list = json.brands;
    }

    // Normalize and deduplicate
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
    )
        // Longer names first improves matching quality
        .sort((a, b) => b.length - a.length);

    return MANUFACTURERS_CACHE;
}

/**
 * Extracts brand/manufacturer from user question.
 */
function extractBrand(question) {

    const brands = loadManufacturersFromFilter();
    const qNorm = normalize(question);

    for (const b of brands) {

        if (qNorm.includes(normalize(b))) {
            return b;
        }
    }

    return null;
}

/* ==========================================================================
   TOKEN MATCHING
========================================================================== */

/**
 * Fuzzy token matcher for product names/models.
 *
 * Requires at least 60% token overlap.
 */
function tokenMatch(model, question) {

    const mTokens = tokens(model);
    const qTokens = tokens(question);

    if (!mTokens.length) {
        return false;
    }

    let hits = 0;

    for (const t of mTokens) {
        if (qTokens.includes(t)) {
            hits++;
        }
    }

    return hits >= Math.ceil(mTokens.length * 0.6);
}

/* ==========================================================================
   MAIN AI PRODUCT SEARCH
========================================================================== */

/**
 * Searches all local product tables and returns AI-friendly results.
 */
function getProductsForAI(question = "") {

    const listIntent = isListQuestion(question);
    const priceIntent = isPriceQuestion(question);
    const brand = extractBrand(question);

    /**
     * Load all SQLite tables except excluded ones.
     */
    const tables = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
        .all()
        .map(r => r.name)
        .filter(name => !shouldExclude(name));

    const exact = [];
    const similar = [];
    const list = [];

    /* ----------------------------------------------------------------------
       Iterate through every product table
    ---------------------------------------------------------------------- */

    for (const table of tables) {

        let rows;

        try {
            rows = db.prepare(`SELECT * FROM "${table}"`).all();
        } catch {
            continue;
        }

        /* ------------------------------------------------------------------
           Iterate through every row/product
        ------------------------------------------------------------------ */

        for (const r of rows) {

            /**
             * Attempt to resolve manufacturer field dynamically.
             */
            let manufacturer = pick(r, [
                "manufacturer",
                "brand",
                "maker"
            ]);

            /**
             * Attempt to resolve product/model name dynamically.
             */
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

            /**
             * Fallback:
             * Infer manufacturer from first word of model.
             */
            if (!manufacturer && model) {
                manufacturer = model.split(" ")[0];
            }

            // Skip unusable rows
            if (!manufacturer && !model) {
                continue;
            }

            /**
             * Parse additional metadata.
             */
            const priceRaw = pick(r, [
                "price",
                "price_huf",
                "cost",
                "amount"
            ]);

            const price = parsePrice(priceRaw);

            const socket = pick(r, [
                "socket",
                "cpu_socket"
            ]);

            /**
             * Standardized AI result row.
             */
            const row = {
                table,
                manufacturer,
                model,
                price,
                socket
            };

            /* ------------------------------------------------------------------
               TABLE / CATEGORY MATCHING
            ------------------------------------------------------------------ */

            const qTokens = tokens(question);
            const qNorm = normalize(question);

            const tTokens = tokens(table);

            // crude singularization
            const tStem = normalize(table)
                .replace(/es$/, "")
                .replace(/s$/, "");

            const tableMatch = tTokens.some(tt =>
                qTokens.some(qt =>
                    qt.includes(tStem) || tt.includes(qt)
                )
            );

            /* ------------------------------------------------------------------
               LIST MODE
            ------------------------------------------------------------------ */

            if (listIntent && manufacturer) {

                // Brand-specific listing
                if (
                    brand &&
                    normalize(manufacturer) === normalize(brand)
                ) {
                    list.push(row);
                    continue;
                }

                // Generic category listing
                if (!brand && tableMatch) {
                    list.push(row);
                    continue;
                }
            }

            /* ------------------------------------------------------------------
               EXACT MATCH DETECTION
            ------------------------------------------------------------------ */

            if (model) {

                // Strong token similarity
                if (tokenMatch(model, question)) {
                    exact.push(row);
                    continue;
                }

                // Category/table match
                if (tableMatch) {
                    exact.push(row);
                    continue;
                }

                /* --------------------------------------------------------------
                   WEAKER SIMILAR MATCH
                -------------------------------------------------------------- */

                const modelNorm = normalize(model);

                if (
                    modelNorm.length > 5 &&
                    qNorm.includes(modelNorm.slice(0, 6))
                ) {
                    similar.push(row);
                }

            } else if (tableTokenMatch || isCategoryMatch) {

                // Fallback category match
                exact.push(row);
            }
        }
    }

    /* ======================================================================
       FINAL RESPONSE BUILDING
    ====================================================================== */

    // LIST MODE
    if (listIntent) {

        return list.length
            ? {
                mode: "list",
                brand,
                list: list.slice(0, 30)
            }
            : {
                mode: "none"
            };
    }

    // EXACT PRODUCT MATCHES
    if (exact.length) {

        return {
            mode: "product",
            exact: exact.slice(0, 3),
            priceIntent
        };
    }

    // SIMILAR PRODUCT MATCHES
    if (similar.length) {

        return {
            mode: "product",
            similar: similar.slice(0, 5),
            priceIntent
        };
    }

    // NOTHING FOUND
    return {
        mode: "none"
    };
}

module.exports = {
    getProductsForAI
};