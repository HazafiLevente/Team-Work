const { supabase } = require("../../services/supabase");

async function getUserSetupIds(userId) {
    const { data: rooms } = await supabase
        .from("setup_room")
        .select("id")
        .eq("user_id", userId);

    if (!rooms || rooms.length === 0) return [];

    const roomIds = rooms.map(room => room.id);
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
        return sum + Number(row.value || 0);
    }, 0);
}

module.exports = {
    calculateUserSetupPrice
};
