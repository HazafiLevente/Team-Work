const { listProducts } = require("../services/products/productCatalog.service");

function s(v) {
    return String(v ?? "").trim();
}

function sl(v) {
    return s(v).toLowerCase();
}

function toNum(v) {
    if (v == null || v === "") return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;

    const m = String(v).trim().replace(",", ".").match(/-?\d+(\.\d+)?/);
    if (!m) return null;

    const n = Number(m[0]);
    return Number.isFinite(n) ? n : null;
}

function uniqSorted(values) {
    return [...new Set((values || []).map(s).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "hu"));
}

function isBooleanLike(values) {
    const set = new Set((values || []).map(sl).filter(Boolean));
    if (!set.size) return false;

    const allowed = new Set([
        "true", "false",
        "1", "0",
        "yes", "no",
        "igen", "nem"
    ]);

    for (const v of set) {
        if (!allowed.has(v)) return false;
    }

    return true;
}

function isNumericLike(values) {
    const nums = (values || []).map(toNum).filter(v => v != null);
    if (!nums.length) return false;
    return nums.length >= Math.max(2, Math.floor(values.length * 0.6));
}

function getItemField(item, key) {
    if (!item) return null;
    if (item[key] != null && item[key] !== "") return item[key];
    if (item.data && item.data[key] != null && item.data[key] !== "") return item.data[key];
    return null;
}

function getMergedFields(item) {
    return {
        ...(item?.data && typeof item.data === "object" ? item.data : {}),
        ...item
    };
}

function buildDynamicByTable(items, excludeKeys = []) {
    const exclude = new Set(excludeKeys.map(sl));
    const grouped = new Map();

    for (const item of items || []) {
        const tableName =
            s(getItemField(item, "table_name")) ||
            s(getItemField(item, "table")) ||
            "Egyéb";

        if (!grouped.has(tableName)) grouped.set(tableName, []);
        grouped.get(tableName).push(item);
    }

    const dynamic_by_table = {};

    for (const [tableName, rows] of grouped.entries()) {
        const rawMap = new Map();

        for (const row of rows) {
            const fields = getMergedFields(row);

            for (const [k, v] of Object.entries(fields)) {
                const key = s(k);
                if (!key) continue;
                if (exclude.has(sl(key))) continue;
                if (v == null || v === "") continue;

                if (!rawMap.has(key)) rawMap.set(key, []);
                rawMap.get(key).push(v);
            }
        }

        const booleans = [];
        const numbers = [];
        const enums = {};

        for (const [key, values] of rawMap.entries()) {
            const clean = (values || []).map(s).filter(Boolean);
            if (!clean.length) continue;

            if (isBooleanLike(clean)) {
                booleans.push(key);
                continue;
            }

            if (isNumericLike(clean)) {
                numbers.push(key);
                continue;
            }

            const distinct = uniqSorted(clean);
            if (distinct.length > 0 && distinct.length <= 40) {
                enums[key] = distinct;
            }
        }

        dynamic_by_table[tableName] = {
            booleans: booleans.sort((a, b) => a.localeCompare(b, "hu")),
            numbers: numbers.sort((a, b) => a.localeCompare(b, "hu")),
            enums: Object.fromEntries(
                Object.entries(enums).sort(([a], [b]) => a.localeCompare(b, "hu"))
            )
        };
    }

    return dynamic_by_table;
}

exports.getComputerMeta = async (req, res) => {
    try {
        const items = await listProducts({ category: "computer", limit: 5000 });

        const manufacturers = uniqSorted(
            items.map(i => getItemField(i, "manufacturer") || getItemField(i, "brand"))
        );

        const table_names = uniqSorted(
            items.map(i => getItemField(i, "table_name") || getItemField(i, "table"))
        );

        const dynamic_by_table = buildDynamicByTable(items, [
            "id",
            "name",
            "manufacturer",
            "brand",
            "model",
            "price",
            "table",
            "table_name",
            "source_table",
            "product_table",
            "type",
            "category",
            "data"
        ]);

        return res.json({
            computer_filter_meta_v1: {
                table_names,
                manufacturers,
                dynamic_by_table
            }
        });
    } catch (error) {
        console.error("getComputerMeta error:", error);
        return res.status(500).json({ error: error.message || "computer meta failed" });
    }
};

exports.getHtMeta = async (req, res) => {
    try {
        const items = await listProducts({ category: "ht", limit: 5000 });

        const manufacturers = uniqSorted(
            items.map(i => getItemField(i, "manufacturer") || getItemField(i, "brand"))
        );

        const table_names = uniqSorted(
            items.map(i => getItemField(i, "table_name") || getItemField(i, "table"))
        );

        const dynamic_by_table = buildDynamicByTable(items, [
            "id",
            "name",
            "manufacturer",
            "brand",
            "model",
            "price",
            "table",
            "table_name",
            "source_table",
            "product_table",
            "type",
            "category",
            "data"
        ]);

        return res.json({
            ht_filter_meta_v1: {
                table_names,
                manufacturers,
                dynamic_by_table
            }
        });
    } catch (error) {
        console.error("getHtMeta error:", error);
        return res.status(500).json({ error: error.message || "ht meta failed" });
    }
};

exports.getInstrumentMeta = async (req, res) => {
    try {
        const items = await listProducts({ category: "instrument", limit: 5000 });

        const manufacturers = uniqSorted(
            items.map(i =>
                getItemField(i, "manufacturer") ||
                getItemField(i, "brand") ||
                (() => {
                    const name = String(getItemField(i, "name") || getItemField(i, "model") || "").trim();
                    return name ? name.split(/\s+/)[0] : "";
                })()
            )
        );

        const table_names = uniqSorted(
            items.map(i =>
                getItemField(i, "table_name") ||
                getItemField(i, "table") ||
                getItemField(i, "source_table") ||
                getItemField(i, "product_table") ||
                getItemField(i, "type")
            )
        );

        const prices = items
            .map(i => toNum(getItemField(i, "price")))
            .filter(v => v != null);

        const usedFlags = items
            .map(i => sl(getItemField(i, "is_used") ?? getItemField(i, "condition")))
            .filter(Boolean);

        const has_used_flag = usedFlags.some(v =>
            ["true", "false", "1", "0", "yes", "no", "igen", "nem", "used", "használt"].includes(v)
        );

        return res.json({
            instrument_filter_meta_v1: {
                table_names,
                manufacturers,
                min_price: prices.length ? Math.min(...prices) : null,
                max_price: prices.length ? Math.max(...prices) : null,
                has_used_flag,
                has_price: prices.length > 0
            }
        });
    } catch (error) {
        console.error("getInstrumentMeta error:", error);
        return res.status(500).json({ error: error.message || "instrument meta failed" });
    }
};