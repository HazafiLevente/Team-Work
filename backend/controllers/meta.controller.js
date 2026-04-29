const { supabase } = require("../services/supabase");
const { listProducts } = require("../services/products/productCatalog.service");

const CAR_TABLES = [
    "cabrio_cars",
    "coupe_cars",
    "crossover_cars",
    "hatchback_cars",
    "mpv_cars",
    "pickup_cars",
    "wagon_cars",
];

const CAR_SELECT_COLS = `
  "Manufacturer",
  "Model",
  "Price Range (Ft)",
  "Body Type",
  "Horsepower",
  "Acceleration (s)",
  "Seats",
  "Fuel Type",
  "Year",
  "Transmission",
  "category",
  "Avgprice"
`;

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

function extractNumberTokens(values) {
    const nums = [];

    for (const v of values || []) {
        const matches = s(v).replace(",", ".").match(/-?\d+(\.\d+)?/g);
        if (matches) nums.push(...matches);
    }

    return uniqSorted(nums).sort((a, b) => Number(a) - Number(b));
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

exports.getAllTables = async (req, res) => {
    const { data, error } = await supabase.rpc("get_all_tables");

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    const excluded = ["auth", "profiles"];
    const cleaned = (data || [])
        .map(t => t.table_name)
        .filter(name => name && !excluded.includes(name));

    res.json({ tables: cleaned });
};

exports.getCarMeta = async (req, res) => {
    try {
        const perTable = Math.min(Number(req.query.perTable) || 500, 2000);

        const results = await Promise.all(
            CAR_TABLES.map(async (tableName) => {
                const { data, error } = await supabase
                    .from(tableName)
                    .select(CAR_SELECT_COLS)
                    .limit(perTable);

                if (error) {
                    console.error("cars meta error", tableName, error);
                    return [];
                }

                return data || [];
            })
        );

        const rows = results.flat();
        const manufacturers = uniqSorted(rows.map(r => r["Manufacturer"]));
        const bodyTypes = uniqSorted(rows.map(r => r["Body Type"]));
        const fuelTypes = uniqSorted(rows.map(r => r["Fuel Type"]));
        const transmissions = uniqSorted(rows.map(r => r["Transmission"]));
        const horsepowerNums = extractNumberTokens(rows.map(r => r["Horsepower"]));
        const accelNums = extractNumberTokens(rows.map(r => r["Acceleration (s)"]));
        const seatsNums = extractNumberTokens(rows.map(r => r["Seats"]));
        const yearNums = extractNumberTokens(rows.map(r => r["Year"]));
        const priceNums = extractNumberTokens(rows.map(r => r["Price Range (Ft)"]));

        return res.json({
            car_filter_meta_v1: {
                table_names: CAR_TABLES,
                manufacturers,
                dynamic: [
                    { key: "body_type", kind: "select", nonNull: bodyTypes.length, options: bodyTypes, distinct: bodyTypes.length },
                    { key: "fuel_type", kind: "select", nonNull: fuelTypes.length, options: fuelTypes, distinct: fuelTypes.length },
                    { key: "transmission", kind: "select", nonNull: transmissions.length, options: transmissions, distinct: transmissions.length },
                    { key: "horsepower", kind: "range", nonNull: horsepowerNums.length, options: horsepowerNums, distinct: horsepowerNums.length },
                    { key: "acceleration", kind: "range", nonNull: accelNums.length, options: accelNums, distinct: accelNums.length },
                    { key: "seats", kind: "range", nonNull: seatsNums.length, options: seatsNums, distinct: seatsNums.length },
                    { key: "year", kind: "range", nonNull: yearNums.length, options: yearNums, distinct: yearNums.length },
                    { key: "price_range", kind: "range", nonNull: priceNums.length, options: priceNums, distinct: priceNums.length },
                ]
            }
        });
    } catch (error) {
        console.error("cars meta fatal", error);
        return res.status(500).json({ error: error?.message || "cars meta failed" });
    }
};

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
