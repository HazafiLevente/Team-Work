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

async function fetchPagedRows(queryBuilderFactory, pageSize) {
    const rows = [];

    for (let from = 0; ; from += pageSize) {
        const to = from + pageSize - 1;
        const { data, error } = await queryBuilderFactory(from, to);

        if (error) {
            throw new Error(error.message || "Supabase query failed");
        }

        const chunk = Array.isArray(data) ? data : [];
        rows.push(...chunk);

        if (chunk.length < pageSize) break;
    }

    return rows;
}

async function fetchAllProductsRows(tableName) {
    return fetchPagedRows(
        (from, to) => (
            supabase
                .from(tableName)
                .select("id, name, type")
                .order("id", { ascending: true })
                .range(from, to)
        ),
        PAGE_SIZE
    );
}

async function fetchValuesRows() {
    return fetchPagedRows(
        (from, to) => (
            supabase
                .from("values")
                .select(`
                    products_id,
                    value,
                    properties:properties_id (
                        id,
                        property,
                        type
                    )
                `)
                .order("id", { ascending: true })
                .range(from, to)
        ),
        VALUES_PAGE_SIZE
    );
}

function buildValuesIndex(valueRows) {
    const index = new Map();

    for (const row of valueRows) {
        const productId = row?.products_id;
        const propertyName = row?.properties?.property;

        if (productId == null || !propertyName) continue;

        if (!index.has(String(productId))) {
            index.set(String(productId), {});
        }

        const target = index.get(String(productId));
        target[String(propertyName).trim()] = row?.value ?? null;
    }

    return index;
}

function decorateProduct(baseRow, valueMap = {}) {
    const mappedTable = PRODUCT_TYPE_TO_TABLE[norm(baseRow?.type)] ?? "products";

    return normalizeProductRow(
        {
            ...valueMap,
            id: baseRow?.id ?? null,
            name: baseRow?.name ?? "",
            type: baseRow?.type ?? null,
            source_table: mappedTable,
            table_name: mappedTable,
            product_table: "products",
        },
        mappedTable
    );
}

async function buildCatalogSnapshot() {
    const tableName = await detectUnifiedProductTable();
    if (!tableName) return null;

    const [productRows, valueRows] = await Promise.all([
        fetchAllProductsRows(tableName),
        fetchValuesRows(),
    ]);

    const valuesIndex = buildValuesIndex(valueRows);
    const rows = productRows.map((row) => decorateProduct(row, valuesIndex.get(String(row.id)) || {}));

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

async function getCatalogStats() {
    const snapshot = await getCatalogSnapshot();
    const rows = snapshot?.rows ?? [];

    const uniqueTables = Array.from(
        new Set(
            rows
                .map((row) => String(row?.table_name ?? row?.table ?? "").trim())
                .filter(Boolean)
        )
    ).sort((a, b) => a.localeCompare(b, "hu"));

    return {
        totalAll: rows.length,
        categoriesAll: uniqueTables,
    };
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
        const manufacturerKey = String(
            pickCaseInsensitive(row, ["manufacturer", "brand", "maker"]) || "ismeretlen"
        ).trim() || "ismeretlen";

        if (!byType.has(typeKey)) {
            byType.set(typeKey, { type: typeKey, count: 0, samples: [] });
        }
        const typeEntry = byType.get(typeKey);
        typeEntry.count += 1;
        if (typeEntry.samples.length < 5) {
            typeEntry.samples.push({
                id: row?.id ?? null,
                name: row?.name || row?.model || "",
                manufacturer: row?.manufacturer || "",
                table_name: row?.table_name || row?.table || "",
                type: row?.type || row?.category || ""
            });
        }

        byTable.set(tableKey, (byTable.get(tableKey) || 0) + 1);
        byManufacturer.set(manufacturerKey, (byManufacturer.get(manufacturerKey) || 0) + 1);
    }

    return {
        totalProducts: rows.length,
        typeCounts: Array.from(byType.values()).sort((a, b) => b.count - a.count),
        tableCounts: Array.from(byTable.entries())
            .map(([table, count]) => ({ table, count }))
            .sort((a, b) => b.count - a.count),
        manufacturerCounts: Array.from(byManufacturer.entries())
            .map(([manufacturer, count]) => ({ manufacturer, count }))
            .sort((a, b) => b.count - a.count),
    };
}

async function getProductByRoute(tableName, id) {
    const unifiedTable = await detectUnifiedProductTable();
    if (!unifiedTable) return null;

    const normalizedTable = norm(tableName);
    const allowedTypes = TABLE_NAME_TO_PRODUCT_TYPES[normalizedTable] || null;

    let query = supabase
        .from(unifiedTable)
        .select("id, name, type")
        .eq("id", id);

    if (Array.isArray(allowedTypes) && allowedTypes.length) {
        query = query.in("type", allowedTypes);
    }

    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const { data: valueRows, error: valuesError } = await supabase
        .from("values")
        .select(`
            products_id,
            value,
            properties:properties_id (
                id,
                property,
                type
            )
        `)
        .eq("products_id", data.id);

    if (valuesError) throw valuesError;

    const valueMap = buildValuesIndex(valueRows || []).get(String(data.id)) || {};
    return decorateProduct(data, valueMap);
}

function clearCatalogCache() {
    detectedUnifiedTablePromise = null;
    catalogCache = {
        expiresAt: 0,
        rows: null,
        brands: null,
        promise: null,
    };
}

module.exports = {
    listProducts,
    listBrands,
    getCatalogStats,
    getCatalogOverview,
    clampLimit,
    normalizeProductRow,
    getProductByRoute,
    clearCatalogCache,
};
