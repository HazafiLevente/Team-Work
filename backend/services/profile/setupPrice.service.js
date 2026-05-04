const { supabase } = require("../../services/supabase");

async function getUserSetupIds(userId) {
    const { data: rooms } = await supabase
        .from("setup_room")
        .select("id, is_favorite, isNote")
        .eq("user_id", userId);

    if (!rooms || rooms.length === 0) return [];

    const roomIds = rooms
        .filter((room) => !toBoolean(room.is_favorite) && !toBoolean(room.isNote))
        .map((room) => room.id);

    if (roomIds.length === 0) return [];

    const { data: setups } = await supabase
        .from("setups")
        .select("id")
        .in("room_id", roomIds);

    return (setups || []).map(setup => setup.id);
}

async function getSetupProductIds(setupIds) {
    if (setupIds.length === 0) return [];

    const { data: setupDevices } = await supabase
        .from("setup_devices")
        .select("device_id")
        .in("setup_id", setupIds);

    return Array.from(new Set(
        (setupDevices || [])
            .map((row) => Number(row.device_id))
            .filter(Number.isFinite)
    ));
}

async function getPricePropertyIds() {
    const { data: properties } = await supabase
        .from("properties")
        .select("id, property");

    return new Set(
        (properties || [])
            .filter((property) => String(property.property).toLowerCase() === "price")
            .map((property) => Number(property.id))
    );
}

function toBoolean(value) {
    return value === true || value === "true" || value === 1 || value === "1";
}

function toPriceNumber(value) {
    if (value == null || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;

    const nums = String(value)
        .replace(/\s/g, "")
        .replace(/,/g, ".")
        .match(/\d+(\.\d+)?/g);

    if (!nums?.length) return 0;

    const parsed = nums.map(Number).filter(Number.isFinite);
    if (!parsed.length) return 0;
    if (parsed.length === 1) return Math.round(parsed[0]);

    return Math.round((Math.min(...parsed) + Math.max(...parsed)) / 2);
}

async function calculateUserSetupPrice(userId) {
    const setupIds = await getUserSetupIds(userId);
    const productIds = await getSetupProductIds(setupIds);

    if (productIds.length === 0) return 0;

    const [pricePropIds, valuesRes] = await Promise.all([
        getPricePropertyIds(),
        supabase
            .from("values")
            .select("products_id, properties_id, value")
            .in("products_id", productIds)
    ]);

    return (valuesRes.data || []).reduce((sum, row) => {
        if (!pricePropIds.has(Number(row.properties_id))) return sum;
        return sum + toPriceNumber(row.value);
    }, 0);
}

module.exports = {
    calculateUserSetupPrice
};
