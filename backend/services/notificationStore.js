const { supabase } = require("./supabase");

const NEWS_TABLE = "news[System]";
const PROPERTIES_TABLE = "news_properties[System]";
const VALUES_TABLE = "news_values[System]";

function normalizeCategory(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return normalized || "system";
}

async function loadPropertyMap() {
    const { data, error } = await supabase
        .from(PROPERTIES_TABLE)
        .select("id, property");

    if (error) throw error;

    const byName = new Map();
    for (const row of data || []) {
        const name = String(row.property || "").trim().toLowerCase();
        if (name) byName.set(name, row.id);
    }
    return byName;
}

async function ensurePropertyIds(names) {
    const map = await loadPropertyMap();
    const missing = names
        .map(name => String(name || "").trim().toLowerCase())
        .filter(name => name && !map.has(name));

    if (missing.length) {
        const inserts = missing.map(property => ({ property }));
        const { data, error } = await supabase
            .from(PROPERTIES_TABLE)
            .insert(inserts)
            .select("id, property");

        if (error) throw error;

        for (const row of data || []) {
            const name = String(row.property || "").trim().toLowerCase();
            if (name) map.set(name, row.id);
        }
    }

    return map;
}

function buildNotification(baseRow, values = {}) {
    const category = normalizeCategory(values.category);

    return {
        id: baseRow.id,
        source_table: NEWS_TABLE,
        title: baseRow.title || "",
        created_at: baseRow.created_at,
        message: values.message || "",
        target: values.target || "all",
        sender: values.sender != null && values.sender !== "" ? Number(values.sender) : null,
        category,
        type: category
    };
}

async function listNotifications({ category } = {}) {
    const { data: newsRows, error: newsError } = await supabase
        .from(NEWS_TABLE)
        .select("id, title, created_at")
        .order("created_at", { ascending: false });

    if (newsError) throw newsError;

    const items = newsRows || [];
    if (!items.length) return [];

    const propertyMap = await loadPropertyMap();
    const propertyIds = Array.from(propertyMap.values());

    if (!propertyIds.length) {
        return items.map(row => buildNotification(row));
    }

    const newsIds = items.map(row => row.id);
    const { data: valueRows, error: valueError } = await supabase
        .from(VALUES_TABLE)
        .select("news_id, property_id, value")
        .in("news_id", newsIds)
        .in("property_id", propertyIds);

    if (valueError) throw valueError;

    const propertyById = new Map();
    for (const [name, id] of propertyMap.entries()) {
        propertyById.set(id, name);
    }

    const valuesByNewsId = new Map();
    for (const row of valueRows || []) {
        const propertyName = propertyById.get(row.property_id);
        if (!propertyName) continue;

        if (!valuesByNewsId.has(row.news_id)) valuesByNewsId.set(row.news_id, {});
        valuesByNewsId.get(row.news_id)[propertyName] = row.value;
    }

    const normalizedFilter = category ? normalizeCategory(category) : null;

    return items
        .map(row => buildNotification(row, valuesByNewsId.get(row.id)))
        .filter(row => !normalizedFilter || row.category === normalizedFilter);
}

async function createNotification({ title, message, target, sender, category }) {
    const propertyIds = await ensurePropertyIds(["message", "target", "sender", "category"]);

    const { data: newsRow, error: newsError } = await supabase
        .from(NEWS_TABLE)
        .insert({
            title: String(title || "").trim(),
            created_at: new Date().toISOString()
        })
        .select("id, title, created_at")
        .single();

    if (newsError) throw newsError;

    const values = [
        { news_id: newsRow.id, property_id: propertyIds.get("message"), value: String(message || "").trim() },
        { news_id: newsRow.id, property_id: propertyIds.get("target"), value: String(target || "all").trim().toLowerCase() },
        { news_id: newsRow.id, property_id: propertyIds.get("sender"), value: String(sender) },
        { news_id: newsRow.id, property_id: propertyIds.get("category"), value: normalizeCategory(category) }
    ];

    const { error: valuesError } = await supabase
        .from(VALUES_TABLE)
        .insert(values);

    if (valuesError) throw valuesError;

    return buildNotification(newsRow, {
        message,
        target,
        sender,
        category
    });
}

async function deleteNotification(id) {
    const notificationId = Number(id);

    const { error: valuesError } = await supabase
        .from(VALUES_TABLE)
        .delete()
        .eq("news_id", notificationId);

    if (valuesError) throw valuesError;

    const { error: newsError } = await supabase
        .from(NEWS_TABLE)
        .delete()
        .eq("id", notificationId);

    if (newsError) throw newsError;
}

module.exports = {
    listNotifications,
    createNotification,
    deleteNotification,
    normalizeCategory
};
