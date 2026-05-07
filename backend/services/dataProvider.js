const fs = require("fs");
const path = require("path");

const { db } = require("./localDb");
const { shouldExclude } = require("./tableFilter");
const { supabase } = require("./supabase");

/* =========================================================================
   SEARCH FILTER CONFIG
   ========================================================================= */

// Cached manufacturer/brand source file
const FILTER_PATH = path.join(
    __dirname,
    "..",
    "..",
    "datas",
    "Jsons",
    "search-filter.json"
);

/* =========================================================================
   DATABASE ACCESS LAYER
   ========================================================================= */

/**
 * Attempts to load data from Supabase first.
 *
 * If Supabase fails:
 *   -> fallback to local SQLite database
 *
 * Useful for:
 *   - offline mode
 *   - Supabase outages
 *   - development environments
 */
async function selectWithFallback({
                                      supabaseName,
                                      sqliteName,
                                      select = "*",
                                      orderBy = "id",
                                      ascending = true,
                                      limit = 200
                                  }) {

    /* ---------------------------------------------------------------------
       PRIMARY SOURCE: SUPABASE
       --------------------------------------------------------------------- */

    try {

        let query = supabase
            .from(supabaseName)
            .select(select);

        // Optional sorting
        if (orderBy) {
            query = query.order(orderBy, { ascending });
        }

        // Optional limit
        if (limit) {
            query = query.limit(limit);
        }

        const { data, error } = await query;

        // Return Supabase result if successful
        if (!error && data) {
            return data;
        }

        console.warn(
            `⚠️ Supabase error (${supabaseName}), falling back to SQLite:`,
            error?.message
        );

    } catch (e) {

        console.warn(
            `⚠️ Supabase exception (${supabaseName}), falling back to SQLite:`,
            e.message
        );
    }

    /* ---------------------------------------------------------------------
       FALLBACK SOURCE: SQLITE
       --------------------------------------------------------------------- */

    try {

        // Verify table exists locally
        const exists = db.prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type='table'
            AND name=?
        `).get(sqliteName || supabaseName);

        if (!exists) return [];

        const table = sqliteName || supabaseName;
        const sortDir = ascending ? "ASC" : "DESC";

        const rows = db.prepare(`
            SELECT ${select === "*" ? "*" : select}
            FROM "${table}"
            ORDER BY "${orderBy}" ${sortDir}
            LIMIT ?
        `).all(limit);

        return rows;

    } catch (e) {

        console.error(
            "❌ selectWithFallback SQLite error:",
            e.message
        );

        return [];
    }
}

/* =========================================================================
   SMALL HELPERS
   ========================================================================= */

/**
 * Returns the first valid field from a list of keys.
 *
 * Example:
 *   pick(row, ["manufacturer", "brand"])
 */
function pick(obj, keys) {

    for (const k of keys) {

        const v = obj?.[k];

        if (
            v !== undefined &&
            v !== null &&
            v !== ""
        ) {
            return v;
        }
    }

    return null;
}

/**
 * Normalizes strings for fuzzy matching.
 *
 * Removes:
 *   - accents
 *   - special chars
 *   - duplicate dashes
 *
 * Converts to lowercase.
 */
function normalize(str = "") {

    return String(str)

        .toLowerCase()

        .normalize("NFD")

        .replace(/[\u0300-\u036f]/g, "")

        .replace(/[^a-z0-9-]/g, "")

        .replace(/-+/g, "-")

        .replace(/^-|-$/g, "");
}

/**
 * Converts an entire row into searchable lowercase text.
 */
function rowText(row) {

    return Object.values(row)

        .filter(v => typeof v === "string")

        .join(" ")

        .toLowerCase();
}

/**
 * Tokenizes normalized text.
 *
 * Example:
 *   "Ryzen 7800X3D"
 *   -> ["ryzen", "7800", "x3d"]
 */
function tokens(str = "") {

    return normalize(str).match(/[a-z]+|\d+/g) || [];
}

/* =========================================================================
   AI SEARCH MATCHING
   ========================================================================= */

/**
 * Token-based fuzzy model matcher.
 *
 * Returns true if enough model tokens
 * exist inside the question.
 */
function tokenMatch(model, question) {

    const mTokens = tokens(model);
    const qTokens = tokens(question);

    if (!mTokens.length) return false;

    let hits = 0;

    for (const t of mTokens) {
        if (qTokens.includes(t)) hits++;
    }

    return hits >= Math.ceil(mTokens.length * 0.6);
}

/**
 * Attempts to extract CPU-style model names.
 *
 * Example:
 *   "Ryzen 7 7800X3D"
 */
function extractModelToken(question = "") {

    const q = question.toLowerCase();

    const m = q.match(
        /(ryzen\s*\d+\s*\d+x3d|ryzen\s*\d+\s*\d+x|ryzen\s*\d+\s*\d+|\d{4}x3d|\d{4}x)/i
    );

    return m ? normalize(m[1]) : null;
}

/**
 * Detects whether the user is asking
 * for a product LIST rather than
 * a single product.
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

/* =========================================================================
   MANUFACTURER CACHE
   ========================================================================= */

let MANUFACTURERS_CACHE = null;

/**
 * Loads known manufacturers/brands
 * from search-filter.json
 */
function loadManufacturersFromFilter() {

    // Return cached version if available
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

    if (Array.isArray(json)) {
        list = json;
    }

    else if (Array.isArray(json.manufacturers)) {
        list = json.manufacturers;
    }

    else if (Array.isArray(json.brands)) {
        list = json.brands;
    }

    /**
     * Normalize and deduplicate manufacturers.
     */
    MANUFACTURERS_CACHE = Array.from(
        new Set(
            list.map(x =>
                typeof x === "string"
                    ? x.trim()
                    : x?.name || x?.label || ""
            ).filter(Boolean)
        )
    )

        // Longer brand names first
        .sort((a, b) => b.length - a.length);

    return MANUFACTURERS_CACHE;
}

/**
 * Attempts to detect a brand
 * inside a user question.
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

/* =========================================================================
   MAIN AI PRODUCT SEARCH
   ========================================================================= */

/**
 * Main product retrieval pipeline for AI.
 *
 * Supports:
 *   - product lookup
 *   - fuzzy matching
 *   - table matching
 *   - list queries
 *   - brand filtering
 */
function getProductsForAI(question = "") {

    const listIntent = isListQuestion(question);

    const brand = extractBrand(question);

    const modelToken = extractModelToken(question);

    /* ---------------------------------------------------------------------
       Load all searchable tables
       --------------------------------------------------------------------- */

    const tables = db

        .prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type='table'
        `)

        .all()

        .map(r => r.name)

        .filter(name => !shouldExclude(name));

    const exact = [];
    const list = [];

    /* ---------------------------------------------------------------------
       Iterate all tables + rows
       --------------------------------------------------------------------- */

    for (const table of tables) {

        let rows;

        try {

            rows = db
                .prepare(`SELECT * FROM "${table}"`)
                .all();

        } catch {

            continue;
        }

        for (const r of rows) {

            // Manufacturer detection
            let manufacturer = pick(r, [
                "manufacturer",
                "brand",
                "maker"
            ]);

            // Model detection
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

            // Fallback manufacturer extraction
            if (!manufacturer && model) {
                manufacturer = model.split(" ")[0];
            }

            /* -------------------------------------------------------------
               Price normalization
               ------------------------------------------------------------- */

            const priceRaw = pick(r, [
                "price",
                "price_huf",
                "cost",
                "amount"
            ]);

            let price = null;

            if (
                priceRaw !== null &&
                priceRaw !== undefined
            ) {

                const cleaned = String(priceRaw)
                    .replace(/[^0-9]/g, "");

                const p = Number(cleaned);

                if (!Number.isNaN(p)) {
                    price = p;
                }
            }

            const row = {
                table,
                manufacturer,
                model,
                price
            };

            /* -------------------------------------------------------------
               Table matching logic
               ------------------------------------------------------------- */

            const qTokens = tokens(question);

            const tTokens = tokens(table);

            const tStem = normalize(table)
                .replace(/es$/, "")
                .replace(/s$/, "");

            const tableMatch =
                tTokens.some(tt =>
                    qTokens.some(qt =>
                        qt.includes(tStem) ||
                        tt.includes(qt)
                    )
                );

            /* -------------------------------------------------------------
               LIST MODE
               ------------------------------------------------------------- */

            if (listIntent && manufacturer) {

                // Brand-specific listing
                if (
                    brand &&
                    normalize(manufacturer) === normalize(brand)
                ) {

                    list.push(row);
                    continue;
                }

                // Generic table listing
                if (!brand && tableMatch) {

                    list.push(row);
                    continue;
                }
            }

            /* -------------------------------------------------------------
               EXACT PRODUCT MODE
               ------------------------------------------------------------- */

            if (model) {

                // Fuzzy token match
                if (tokenMatch(model, question)) {

                    exact.push(row);
                    continue;
                }

                // Table-category match
                if (tableMatch) {

                    exact.push(row);
                    continue;
                }

            } else if (tableMatch) {

                exact.push(row);
            }

            /* -------------------------------------------------------------
               CPU-style token matching
               ------------------------------------------------------------- */

            if (!listIntent && modelToken) {

                const text = normalize(rowText(r));

                if (text.includes(modelToken)) {
                    exact.push(row);
                }
            }
        }
    }

    /* ---------------------------------------------------------------------
       FINAL RESULT
       --------------------------------------------------------------------- */

    // List result
    if (listIntent) {

        return list.length
            ? {
                mode: "list",
                brand,
                list
            }
            : {
                mode: "none"
            };
    }

    // Product result
    if (exact.length) {

        return {
            mode: "product",
            exact
        };
    }

    // Nothing found
    return {
        mode: "none"
    };
}

/* =========================================================================
   EXPORTS
   ========================================================================= */

module.exports = {
    getProductsForAI,
    selectWithFallback
};