/**
 * --------------------------------------------------------------------------
 *  SETUP PRICE VALUATION SERVICE
 * --------------------------------------------------------------------------
 *  Calculates the total monetary value of a user's setups by traversing
 *  rooms, devices, and their associated EAV price properties.
 */

const { supabase } = require("../../services/supabase");

// --- CORE CALCULATION LOGIC ---

/**
 * Orchestrates the full valuation process for a user.
 *
 * @param {string|number} userId - The unique identifier of the user.
 * @returns {Promise<number>} - The total calculated price.
 */
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

// --- DATABASE TRAVERSAL HELPERS ---

/**
 * Finds all active setup IDs belonging to a user, filtering out non-physical rooms.
 */
async function getUserSetupIds(userId) {
    const { data: rooms } = await supabase
        .from("setup_room")
        .select("*")
        .eq("user_id", userId);

    if (!rooms || rooms.length === 0) return [];

    const roomIds = rooms
        .filter(isRegularSetupRoom)
        .map((room) => room.id);

    if (roomIds.length === 0) return [];

    const { data: setups } = await supabase
        .from("setups")
        .select("id")
        .in("room_id", roomIds);

    return (setups || []).map(setup => setup.id);
}

/**
 * Maps setup IDs to unique product IDs across the setup_devices relation.
 */
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

/**
 * Retrieves the property IDs that represent 'price' in the EAV model.
 */
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

// --- DATA NORMALIZATION & VALIDATION ---

function toBoolean(value) {
    return value === true || value === "true" || value === 1 || value === "1";
}

/**
 * Filters out plans, notes, and favorites to ensure only real hardware is counted.
 */
function isRegularSetupRoom(room) {
    const setupType = String(room?.setup_type ?? room?.type ?? "").trim().toLowerCase();
    return !toBoolean(room?.is_plan ?? room?.is_favorite ?? room?.isFavorite)
        && !toBoolean(room?.isNote ?? room?.is_note ?? room?.isnote)
        && !["favorite", "plan", "note"].includes(setupType);
}

/**
 * Safely converts price strings or ranges into a single numeric value.
 */
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

    // Handle price ranges by taking the median
    return Math.round((Math.min(...parsed) + Math.max(...parsed)) / 2);
}

module.exports = {
    calculateUserSetupPrice
};