/**
 * --------------------------------------------------------------------------
 *  PRODUCT CATALOG SERVICE
 * --------------------------------------------------------------------------
 *  Orchestrates data retrieval, EAV (Entity-Attribute-Value) mapping,
 *  and memory-efficient caching for the unified product ecosystem.
 */

const { supabase } = require("../supabase");
const {
    UNIFIED_PRODUCT_TABLES,
    PRODUCT_TYPE_TO_TABLE,
    TABLE_NAME_TO_PRODUCT_TYPES,
} = require("./productCatalog.constants");
const {
    norm,
    clampLimit,
    pickCaseInsensitive,
    normalizeProductRow,
    matchesCategory,
    matchesSearch,
} = require("./productCatalog.helpers");

// --- CONFIGURATION & STATE ---

const CATALOG_TTL_MS = 60_000;
const PAGE_SIZE = 1000;
const VALUES_PAGE_SIZE = 1000;

let detectedUnifiedTablePromise = null;
let catalogCache = {
    expiresAt: 0,
    rows: null,
    brands: null,
    promise: null,
};

// --- SCHEMA DISCOVERY & CORE FETCHING ---

/**
 * Probes the database to find the active unified product table (e.g., 'products' vs 'porducts').
 */
async function detectUnifiedProductTable() {
    if (!detectedUnifiedTablePromise) {
        detectedUnifiedTablePromise = (async () => {
            for (const tableName of UNIFIED_PRODUCT_TABLES) {
                try {
                    const { error } = await supabase.from(tableName).select("id").limit(1);
                    if (!error) return tableName;
                } catch (error) {}
            }
            return null;
        })();
    }
    return detectedUnifiedTablePromise;
}

/**
 * Generic helper to handle keyset/offset pagination for large datasets.
 */
async function fetchPagedRows(queryBuilderFactory, pageSize) {
    const rows = [];
    for (let from = 0; ; from += pageSize) {
        const to = from + pageSize - 1;
        const { data, error } = await queryBuilderFactory(from, to);

        if (error) throw new Error(error.message || "Supabase query failed");

        const chunk = Array.isArray(data) ? data : [];
        rows.push(...chunk);

        if (chunk.length < pageSize) break;
    }
    return rows;
}

// --- EAV MAPPING & DECORATION ---

/**
 * Indexes raw EAV values for O(1) retrieval during product decoration.
 */
function buildValuesIndex(valueRows) {
    const index = new Map();
    const typeIndex = new Map(); // productId -> most frequent properties.type
    const typeCounts = new Map(); // productId -> Map(type -> count)
    const ignoreProps = new Set(["manufacturer", "model"]);

    for (const row of valueRows) {
        const productId = row?.products_id;
        const propertyName = row?.properties?.property;
        const propertyType = row?.properties?.type;

        if (productId == null || !propertyName) continue;
        if (!index.has(String(productId))) index.set(String(productId), {});

        const target = index.get(String(productId));
        target[String(propertyName).trim()] = row?.value ?? null;

        const pn = String(propertyName).trim().toLowerCase();
        const pt = String(propertyType ?? "").trim();
        if (pn && !ignoreProps.has(pn) && pt) {
            const pid = String(productId);
            if (!typeCounts.has(pid)) typeCounts.set(pid, new Map());
            const m = typeCounts.get(pid);
            m.set(pt, (m.get(pt) || 0) + 1);
        }
    }

    for (const [pid, counts] of typeCounts.entries()) {
        let best = null;
        let bestCount = -1;
        for (const [t, c] of counts.entries()) {
            if (c > bestCount) {
                best = t;
                bestCount = c;
            }
        }
        if (best) typeIndex.set(pid, best);
    }

    return { valuesIndex: index, typeIndex };
}

/**
 * Combines base product data with its mapped attributes and normalizes the output.
 */
function decorateProduct(baseRow, valueMap = {}) {
    // We treat the product "type" as coming from EAV properties.type, not products.type.
    const inferredType = valueMap?.__inferred_type ?? null;
    const effectiveType = inferredType || null;
    const mappedTable = PRODUCT_TYPE_TO_TABLE[norm(effectiveType)] ?? "products";

    return normalizeProductRow(
        {
            ...valueMap,
            id: baseRow?.id ?? null,
            name: baseRow?.name ?? "",
            type: effectiveType,
            category: baseRow?.category ?? valueMap?.category ?? null,
            source_table: mappedTable,
            table_name: mappedTable,
            product_table: "products",
        },
        mappedTable
    );
}

// --- CATALOG LIFECYCLE MANAGEMENT ---

/**
 * Builds the entire catalog snapshot by joining products and EAV attributes.
 */
async function buildCatalogSnapshot() {
    const tableName = await detectUnifiedProductTable();
    if (!tableName) return null;

    const [productRows, valueRows] = await Promise.all([
        fetchPagedRows(
            (from, to) => supabase.from(tableName).select("id, name, type, category").order("id", { ascending: true }).range(from, to),
            PAGE_SIZE
        ),
        fetchPagedRows(
            (from, to) => supabase.from("values").select(`products_id, value, properties:properties_id (id, property, type)`).order("id", { ascending: true }).range(from, to),
            VALUES_PAGE_SIZE
        ),
    ]);

    const { valuesIndex, typeIndex } = buildValuesIndex(valueRows);
    const rows = productRows.map((row) => {
        const pid = String(row.id);
        const valueMap = valuesIndex.get(pid) || {};
        const inferredType = typeIndex.get(pid) || null;
        return decorateProduct(row, { ...valueMap, __inferred_type: inferredType });
    });

    const brands = Array.from(
        new Set(
            rows
                .map((row) => pickCaseInsensitive(row, ["manufacturer", "brand", "maker"]))
                .map((value) => String(value ?? "").trim())
                .filter(Boolean)
        )
    ).sort((a, b) => a.localeCompare(b, "hu"));

    return { rows, brands };
}

/**
 * Returns the cached snapshot or triggers a new build with request collapsing.
 */
async function getCatalogSnapshot() {
    const now = Date.now();
    if (catalogCache.rows && catalogCache.expiresAt > now) {
        return { rows: catalogCache.rows, brands: catalogCache.brands };
    }

    if (!catalogCache.promise) {
        catalogCache.promise = buildCatalogSnapshot()
            .then((snapshot) => {
                catalogCache.rows = snapshot?.rows ?? null;
                catalogCache.brands = snapshot?.brands ?? null;
                catalogCache.expiresAt = Date.now() + CATALOG_TTL_MS;
                catalogCache.promise = null;
                return snapshot;
            })
            .catch((error) => {
                catalogCache.promise = null;
                throw error;
            });
    }
    return catalogCache.promise;
}

// --- PUBLIC API ---

async function listProducts(options = {}, fallback) {
    const safeLimit = clampLimit(options.limit, 200);
    const snapshot = await getCatalogSnapshot();

    if (snapshot?.rows) {
        return snapshot.rows
            .filter((row) => matchesCategory(row, options.category || "all"))
            .filter((row) => matchesSearch(row, options.q || ""))
            .slice(0, safeLimit);
    }
    return fallback ? fallback() : [];
}

async function listBrands(fallback) {
    const snapshot = await getCatalogSnapshot();
    if (snapshot?.brands) return snapshot.brands;
    return fallback ? fallback() : [];
}

async function getCatalogOverview() {
    const snapshot = await getCatalogSnapshot();
    const rows = snapshot?.rows ?? [];

    const byType = new Map();
    const byTable = new Map();
    const byManufacturer = new Map();

    for (const row of rows) {
        const typeKey = norm(row?.type || row?.category || "unknown");
        const tableKey = String(row?.table_name || row?.table || "products").trim() || "products";
        const manufacturerKey = String(pickCaseInsensitive(row, ["manufacturer", "brand", "maker"]) || "ismeretlen").trim();

        if (!byType.has(typeKey)) byType.set(typeKey, { type: typeKey, count: 0, samples: [] });
        const typeEntry = byType.get(typeKey);
        typeEntry.count += 1;
        if (typeEntry.samples.length < 5) {
            typeEntry.samples.push({
                id: row?.id, name: row?.name || row?.model, manufacturer: row?.manufacturer,
                table_name: row?.table_name, type: row?.type
            });
        }

        byTable.set(tableKey, (byTable.get(tableKey) || 0) + 1);
        byManufacturer.set(manufacturerKey, (byManufacturer.get(manufacturerKey) || 0) + 1);
    }

    return {
        totalProducts: rows.length,
        typeCounts: Array.from(byType.values()).sort((a, b) => b.count - a.count),
        tableCounts: Array.from(byTable.entries()).map(([table, count]) => ({ table, count })).sort((a, b) => b.count - a.count),
        manufacturerCounts: Array.from(byManufacturer.entries()).map(([m, count]) => ({ manufacturer: m, count })).sort((a, b) => b.count - a.count),
    };
}

async function getProductByRoute(tableName, id) {
    const unifiedTable = await detectUnifiedProductTable();
    if (!unifiedTable) return null;

    const normalizedTable = norm(tableName);
    const allowedTypes = TABLE_NAME_TO_PRODUCT_TYPES[normalizedTable] || null;

    // We do not filter by products.type; types are derived from EAV properties.type.
    let query = supabase.from(unifiedTable).select("id, name, type, category").eq("id", id);

    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const { data: valueRows, error: valuesError } = await supabase
        .from("values")
        .select(`products_id, value, properties:properties_id (id, property, type)`)
        .eq("products_id", data.id);

    if (valuesError) throw valuesError;

    const { valuesIndex, typeIndex } = buildValuesIndex(valueRows || []);
    const pid = String(data.id);
    const valueMap = valuesIndex.get(pid) || {};
    const inferredType = typeIndex.get(pid) || null;
    return decorateProduct(data, { ...valueMap, __inferred_type: inferredType });
}

function clearCatalogCache() {
    detectedUnifiedTablePromise = null;
    catalogCache = { expiresAt: 0, rows: null, brands: null, promise: null };
}

module.exports = {
    listProducts,
    listBrands,
    getCatalogStats: async () => {
        const s = await getCatalogSnapshot();
        const rows = s?.rows ?? [];
        const tables = Array.from(new Set(rows.map(r => String(r?.table_name || "").trim()).filter(Boolean))).sort();
        return { totalAll: rows.length, categoriesAll: tables };
    },
    getCatalogOverview,
    clampLimit,
    normalizeProductRow,
    getProductByRoute,
    clearCatalogCache,
};