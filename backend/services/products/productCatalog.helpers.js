const { PRODUCT_TYPE_TO_TABLE, CATEGORY_ALIASES } = require("./productCatalog.constants");

function norm(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function clampLimit(limit, fallback = 200, max = 5000) {
    const parsed = Number(limit);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(parsed, max);
}

function pickCaseInsensitive(obj, keys) {
    if (!obj || typeof obj !== "object") return null;

    const entries = Object.entries(obj);
    for (const key of keys) {
        const found = entries.find(([candidate]) => candidate.toLowerCase() === key.toLowerCase());
        if (!found) continue;

        const value = found[1];
        if (value !== undefined && value !== null && value !== "") {
            return value;
        }
    }

    return null;
}

function toNumericPrice(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : null;

    const digits = String(value).replace(/\s/g, "").replace(/,/g, ".").match(/\d+(\.\d+)?/g);
    if (!digits?.length) return null;

    const numbers = digits.map(Number).filter(Number.isFinite);
    if (!numbers.length) return null;
    if (numbers.length === 1) return Math.round(numbers[0]);

    return Math.round((Math.min(...numbers) + Math.max(...numbers)) / 2);
}

function inferManufacturerFromName(name = "") {
    const trimmed = String(name ?? "").trim();
    if (!trimmed) return "";

    const knownTwoWordBrands = ["tc electronic", "bowers & wilkins", "be quiet!", "line 6"];
    const lower = trimmed.toLowerCase();
    const matched = knownTwoWordBrands.find((brand) => lower.startsWith(brand));
    if (matched) return matched;

    return trimmed.split(/\s+/)[0] || "";
}

function inferCategoryFromType(type = "") {
    const normalized = norm(type);

    if (["cpu_desktop", "gpu", "motherboard", "ram", "psu", "cpu_cooler", "soundcard", "server_desktop"].some((x) => normalized.includes(x))) {
        return "computer";
    }

    if (normalized.includes("speaker") || normalized.includes("receiver") || normalized.includes("audio_processor") || normalized.includes("subwoofer") || normalized.includes("soundbar") || normalized.includes("bass_")) {
        return "ht";
    }

    if (normalized.includes("drum") || normalized.includes("guitar") || normalized.includes("trumpet") || normalized.includes("saxophone")) {
        return "instrument";
    }

    if (["car", "cars", "auto", "autos", "automobile", "vehicle"].includes(normalized)) {
        return "car";
    }

    if (normalized.includes("switch")) {
        return "network";
    }

    return normalized || null;
}

function normalizeProductRow(row, fallbackTableName = "products") {
    const rawName = pickCaseInsensitive(row, ["name", "product_name", "title", "series"]) ?? "";
    const manufacturer = pickCaseInsensitive(row, ["manufacturer", "brand", "maker"]) ?? inferManufacturerFromName(rawName);
    const model = pickCaseInsensitive(row, ["model", "product_name", "name", "title", "series"]) ?? rawName;
    const rawType = pickCaseInsensitive(row, ["type", "product_type", "category"]) ?? null;
    const mappedTable = PRODUCT_TYPE_TO_TABLE[norm(rawType)] ?? null;
    const tableName = String(
        pickCaseInsensitive(row, ["table_name", "table", "source_table"]) ??
        mappedTable ??
        fallbackTableName
    ).trim();

    return {
        ...row,
        id: pickCaseInsensitive(row, ["id", "ID"]) ?? row.id ?? row.ID ?? null,
        manufacturer: String(manufacturer).trim(),
        model: String(model).trim() || rawName,
        price: toNumericPrice(pickCaseInsensitive(row, ["price", "price_huf", "price_range", "Price Range (Ft)", "Price"])),
        table: tableName,
        table_name: tableName,
        source_table: mappedTable ?? tableName,
        product_table: pickCaseInsensitive(row, ["product_table"]) ?? "products",
        category: pickCaseInsensitive(row, ["category", "type", "product_type"]) ?? inferCategoryFromType(rawType) ?? row.category ?? null,
        type: rawType,
        data: row.data && typeof row.data === "object" ? row.data : row,
    };
}

function matchesCategory(row, categoryKey) {
    if (!categoryKey || categoryKey === "all") return true;

    const aliases = CATEGORY_ALIASES[categoryKey] || [categoryKey];
    const haystacks = [
        pickCaseInsensitive(row, ["category", "type", "product_type", "main_category"]),
        pickCaseInsensitive(row, ["table_name", "table", "source_table"]),
        pickCaseInsensitive(row, ["subcategory", "sub_category"]),
    ].map(norm).filter(Boolean);

    if (!haystacks.length) return false;
    return aliases.some((alias) => haystacks.some((value) => value.includes(norm(alias))));
}

function matchesSearch(row, query) {
    const q = norm(query);
    if (!q) return true;

    const searchable = [
        pickCaseInsensitive(row, ["manufacturer", "brand", "maker"]),
        pickCaseInsensitive(row, ["model", "product_name", "name", "title", "series"]),
        pickCaseInsensitive(row, ["name"]),
        pickCaseInsensitive(row, ["table_name", "table", "source_table"]),
        pickCaseInsensitive(row, ["category", "type", "product_type"]),
    ].map(norm).filter(Boolean).join(" ");

    return searchable.includes(q);
}

module.exports = {
    norm,
    clampLimit,
    pickCaseInsensitive,
    toNumericPrice,
    normalizeProductRow,
    matchesCategory,
    matchesSearch,
};
