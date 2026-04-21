const { supabase } = require("../services/supabase");

/**
 * Stabil children scan:
 * - amiben nincs setup_id, azt nem kĂ©rdezzĂĽk le (elĹ‘re blacklist + auto blacklist)
 * - cache + limit + concurrency -> nem terheli tĂşl a Supabase-t
 * - PC builder mĹ±kĂ¶dik (pcbuilds + pcparts)
 * - âś… Cars: car-options + cars list + cars add (Car_setup[Setup])
 * - âś… NEW: Car_setup details (egy Car_setup sorhoz tartozĂł autĂł adatok)
 */

const ROOMS_TABLE = "setup_room";
const SETUPS_TABLE = "setups";
const SETUP_DEVICES_TABLE = "setup_devices";
const SETUP_CONNECTIONS_TABLE = "setup_connections";
const SETUP_DEVICE_PORTS_TABLE = "setup_device_ports";
const PORT_TYPES_TABLE = "port_types";
const CABLES_TABLE = "cables_info[Cables]";
const SETUP_TABLE = SETUPS_TABLE;
const CHILD_SETUPS_TABLE = SETUPS_TABLE;
const SETUP_VALUES_TABLE = "setup_values";
const SETUP_PROPERTIES_TABLE = "setup_properties";
const PC_BUILDS_TABLE = "pc_details[Setup]";
const CAR_SETUP_TABLE = "Car_setup[Setup]";

exports.pcParts = async (req, res) => {
    try {
        const cacheKey = "pcparts:v5";
        const cached = cacheGet(pcPartsCache, cacheKey);
        if (cached) return res.json({ parts: cached });

        const { data, error } = await supabase
            .from("products")
            .select("id, name, type, category")
            .ilike("type", "pc%")
            .order("name", { ascending: true })
            .limit(5000);

        if (error) throw error;

        const productRows = Array.isArray(data) ? data : [];
        const valuesIndex = await getProductValuesIndex(productRows.map((row) => row.id));

        const parts = productRows
            .map((row) => {
                const valueMap = valuesIndex.get(String(row.id)) || {};
                const slot = resolvePcSlotFromRow(row, valueMap);
                if (!slot) return null;

                const manufacturer = toCleanString(
                    pickFirstValue(valueMap, ["manufacturer", "Manufacturer", "brand", "Brand"])
                ) || inferManufacturerFromName(row?.name);
                const model = toCleanString(
                    pickFirstValue(valueMap, ["model", "Model", "product_name", "name", "Name"])
                ) || toCleanString(row?.name);
                const socket = normalizeSocket(
                    pickTypedValue(valueMap, ["processors", "motherboard"], [
                        "socket",
                        "Socket",
                        "cpu_socket",
                        "CPU Socket",
                        "CPU socket",
                        "socket_type",
                        "Socket Type",
                        "processor_socket",
                        "Processor Socket",
                        "cpu_foglalat",
                        "CPU foglalat",
                        "foglalat",
                        "platform",
                        "Platform"
                    ])
                );
                const ram_type = normalizeRamType(
                    pickTypedValue(valueMap, ["motherboard", "ram"], [
                        "ram_type",
                        "RAM Type",
                        "Ram Type",
                        "memory_type",
                        "Memory Type",
                        "memory",
                        "Memory",
                        "memory_standard",
                        "Memory Standard",
                        "ddr_type",
                        "DDR Type",
                        "ddr",
                        "DDR"
                    ])
                );
                const wattage = toCleanString(
                    pickTypedValue(valueMap, ["psu"], ["wattage", "Wattage", "power", "Power"])
                );
                const efficiency = toCleanString(
                    pickTypedValue(valueMap, ["psu"], ["efficiency", "Efficiency", "80_plus", "80 Plus"])
                );
                const price = pickFirstValue(valueMap, ["price", "Price", "price_huf", "Price Range (Ft)"]);

                const extras = [];
                if (slot === "motherboard" && socket) extras.push(socket);
                if (slot === "motherboard" && ram_type) extras.push(ram_type);
                if (slot === "ram" && ram_type) extras.push(ram_type);
                if (slot === "psu" && wattage) extras.push(`${wattage}W`);
                if (slot === "psu" && efficiency) extras.push(efficiency);

                const rawName = toCleanString(row?.name);
                const displayBase = manufacturer && model && !model.toLowerCase().startsWith(manufacturer.toLowerCase())
                    ? `${manufacturer} ${model}`
                    : (model || manufacturer || rawName || `PC part #${row?.id}`);

                return {
                    id: Number(row.id),
                    slot,
                    source_table: "products",
                    category: toCleanString(row?.category),
                    manufacturer,
                    model,
                    socket,
                    ram_type,
                    wattage,
                    efficiency,
                    price,
                    display_name: extras.length ? `${displayBase} (${extras.join(", ")})` : displayBase
                };
            })
            .filter(Boolean);

        const order = { cpu: 1, gpu: 2, motherboard: 3, ram: 4, psu: 5, other: 9 };
        parts.sort((a, b) => {
            const slotDiff = (order[a.slot] ?? 99) - (order[b.slot] ?? 99);
            if (slotDiff !== 0) return slotDiff;
            return String(a.display_name || "").localeCompare(String(b.display_name || ""), "hu");
        });

        cacheSet(pcPartsCache, cacheKey, parts, PCPARTS_TTL_MS);
        return res.json({ parts });
    } catch (err) {
        console.error("Ă˘ĹĄĹš pcParts hiba:", err);
        return res.json({ parts: [] });
    }
};

/* =========================================================
   âś… FIX: elĹ‘re blacklisteljĂĽk az Ă¶sszes eddig logolt tĂˇblĂˇt,
   amiben biztosan nincs setup_id
   ========================================================= */
const NO_SETUPID_TABLES = new Set([
    "bass_shaker[Setup]",
    "bass_amplifier[Setup]",
    "acoustic_keyboards[Setup]",
    "audio_processor[Setup]",
    "back_speaker[Setup]",
    "acoustic[Setup]",

    "woodwind_instruments[Setup]",
    "wind_instruments[Setup]",
    "subwoofer[Setup]",
    "struck_string_instruments[Setup]",
    "string_instruments[Setup]",
    "sound-producing[Setup]",
    "side_speaker[Setup]",
    "saxophone[Setup]",
    "reciever_setup[Setup]",

    "plucked_string_instruments[Setup]",
    "percussion_instruments[Setup]",
    "membranophones[Setup]",
    "keyboard_instruments[Setup]",
    "idiophones[Setup]",
    "electronic_percussion[Setup]",
    "floor_speaker[Setup]",
    "front_speaker[Setup]",
    "electronic_keyboards[Setup]",
    "electric[Setup]",
    "center_speaker[Setup]",
    "digital_instruments[Setup]",
    "bowed_string_instruments[Setup]",
    "ceiling_speaker[Setup]",
    "brass_instruments[Setup]",
]);

/**
 * Teljes tĂˇblalista maradhat, mert a children Ăşgyis skippeli a NO_SETUPID_TABLES-t.
 * FONTOS: "setup[Setup]" nem children tĂˇbla, ezĂ©rt nincs itt.
 */
const tablesToScan = [
    "acoustic_keyboards[Setup]",
    "acoustic[Setup]",
    "audio_processor[Setup]",
    "back_speaker[Setup]",
    "bass_amplifier[Setup]",
    "bass_shaker[Setup]",
    "bowed_string_instruments[Setup]",
    "brass_instruments[Setup]",
    "Car_setup[Setup]",
    "ceiling_speaker[Setup]",
    "center_speaker[Setup]",
    "digital_instruments[Setup]",
    "electric[Setup]",
    "electronic_keyboards[Setup]",
    "electronic_percussion[Setup]",
    "floor_speaker[Setup]",
    "front_speaker[Setup]",
    "home_theater_setups[Setup]",
    "idiophones[Setup]",
    "instruments[Setup]",
    "keyboard_instruments[Setup]",
    "membranophones[Setup]",
    "pc_details[Setup]",
    "percussion_instruments[Setup]",
    "plucked_string_instruments[Setup]",
    "reciever_setup[Setup]",
    "saxophone[Setup]",
    "side_speaker[Setup]",
    "sound-producing[Setup]",
    "string_instruments[Setup]",
    "struck_string_instruments[Setup]",
    "studio_monitor_setup[Setup]",
    "subwoofer[Setup]",
    "wind_instruments[Setup]",
    "woodwind_instruments[Setup]",
    "modem[Setup]",
    "router[Setup]",
    "switches[Setup]",
    "mixer[Setup]",
];

/* -----------------------------
   In-memory cache
   ----------------------------- */
const childrenCache = new Map(); // setupId -> { exp, value }
const pcPartsCache = new Map(); // global -> { exp, value }
const carOptionsCache = new Map(); // global -> { exp, value }
const carDetailsCache = new Map(); // carSetupId -> { exp, value  }  âś… NEW
const instrumentOptionsCache = new Map();

const CHILDREN_TTL_MS = 30_000;
const PCPARTS_TTL_MS = 10 * 60_000;
const CAROPTIONS_TTL_MS = 10 * 60_000;
const CARDETAILS_TTL_MS = 30_000; // âś… NEW (kicsi TTL, de vĂ©di a Supabase-t)
const INSTRUMENTOPTIONS_TTL_MS = 10 * 60_000;

function cacheGet(map, key) {
    const hit = map.get(key);
    if (!hit) return null;
    if (Date.now() > hit.exp) {
        map.delete(key);
        return null;
    }
    return hit.value;
}
function cacheSet(map, key, value, ttlMs) {
    map.set(key, { value, exp: Date.now() + ttlMs });
}

let setupPropertyCache = null;

async function getSetupProperties() {
    if (setupPropertyCache) return setupPropertyCache;

    const { data, error } = await supabase
        .from(SETUP_PROPERTIES_TABLE)
        .select("*");

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    const byKey = new Map();

    for (const row of rows) {
        const property = String(row?.property || "").trim();
        const type = String(row?.type || "").trim().toLowerCase();
        if (!property) continue;

        byKey.set(`${type}:${property}`, Number(row.id));
        byKey.set(`:${property}`, Number(row.id));
    }

    setupPropertyCache = { rows, byKey };
    return setupPropertyCache;
}

async function getPropertyId(property, type = "") {
    const props = await getSetupProperties();
    return props.byKey.get(`${String(type || "").toLowerCase()}:${property}`) ?? props.byKey.get(`:${property}`) ?? null;
}

async function getValuesForSetupIds(setupIds) {
    const ids = (setupIds || []).map(Number).filter((id) => Number.isFinite(id));
    if (!ids.length) return [];

    const { data, error } = await supabase
        .from(SETUP_VALUES_TABLE)
        .select("*")
        .in("setup_id", ids);

    if (error) throw error;
    return Array.isArray(data) ? data : [];
}

function groupValuesBySetupId(rows) {
    const map = new Map();

    for (const row of rows || []) {
        const key = String(row?.setup_id ?? "");
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(row);
    }

    return map;
}

function pickValue(rows, propertyId, fallback = null) {
    if (!propertyId) return fallback;
    const row = (rows || []).find((item) => Number(item?.property_id) === Number(propertyId));
    return row?.value ?? fallback;
}

function pickAllValues(rows, propertyId) {
    if (!propertyId) return [];
    return (rows || [])
        .filter((item) => Number(item?.property_id) === Number(propertyId))
        .map((item) => item?.value)
        .filter((value) => value !== undefined && value !== null && String(value) !== "");
}

async function upsertSetupValue(setupId, propertyId, value) {
    if (!propertyId) return;

    const { data: existing, error: existingError } = await supabase
        .from(SETUP_VALUES_TABLE)
        .select("id")
        .eq("setup_id", setupId)
        .eq("property_id", propertyId)
        .limit(1)
        .maybeSingle();

    if (existingError) throw existingError;

    const payload = {
        setup_id: Number(setupId),
        property_id: Number(propertyId),
        value: value == null ? null : String(value)
    };

    if (existing?.id) {
        const { error } = await supabase
            .from(SETUP_VALUES_TABLE)
            .update({ value: payload.value })
            .eq("id", existing.id);

        if (error) throw error;
        return;
    }

    const { error } = await supabase
        .from(SETUP_VALUES_TABLE)
        .insert([payload]);

    if (error) throw error;
}

const PC_ROLE_TO_FIELD = {
    cpu: "processor_id",
    gpu: "videocard_id",
    motherboard: "motherboard_id",
    ram: "ram_id",
    psu: "psu_id",
};

const PC_FIELD_TO_ROLE = Object.entries(PC_ROLE_TO_FIELD).reduce((acc, [role, field]) => {
    acc[field] = role;
    return acc;
}, {});

const PC_CATEGORY_TO_SLOT = {
    cpu: "cpu",
    processor: "cpu",
    processors: "cpu",
    gpu: "gpu",
    videocard: "gpu",
    videocards: "gpu",
    video_card: "gpu",
    video_cards: "gpu",
    graphics_card: "gpu",
    motherboard: "motherboard",
    motherboards: "motherboard",
    mainboard: "motherboard",
    mainboards: "motherboard",
    mobo: "motherboard",
    mobos: "motherboard",
    mb: "motherboard",
    alaplap: "motherboard",
    alaplapok: "motherboard",
    systemboard: "motherboard",
    logicboard: "motherboard",
    ram: "ram",
    rams: "ram",
    memory: "ram",
    memories: "ram",
    dram: "ram",
    ddr: "ram",
    psu: "psu",
    psus: "psu",
    power_supply: "psu",
};

function toCleanString(value) {
    return value == null ? "" : String(value).trim();
}

function normalizeKey(value) {
    return toCleanString(value).toLowerCase();
}

function resolvePcSlot(categoryValue) {
    const normalized = normalizeKey(categoryValue);
    if (!normalized) return null;

    if (PC_CATEGORY_TO_SLOT[normalized]) {
        return PC_CATEGORY_TO_SLOT[normalized];
    }

    if (
        normalized.includes("cooler") ||
        normalized.includes("cooling") ||
        normalized.includes("fan") ||
        normalized.includes("heatsink") ||
        normalized.includes("water")
    ) {
        return null;
    }

    if (normalized.includes("mother")) return "motherboard";
    if (normalized.includes("mainboard")) return "motherboard";
    if (normalized.includes("mobo")) return "motherboard";
    if (normalized === "mb") return "motherboard";
    if (normalized.includes("alaplap")) return "motherboard";
    if (normalized.includes("systemboard")) return "motherboard";
    if (normalized.includes("logicboard")) return "motherboard";
    if (normalized.includes("board")) return "motherboard";
    if (normalized.includes("video") || normalized.includes("vga") || normalized.includes("gpu") || normalized.includes("graphic")) return "gpu";
    if (normalized.includes("power") || normalized.includes("psu") || normalized.includes("tap")) return "psu";
    if (normalized.includes("cpu") || normalized.includes("processor")) return "cpu";
    if (normalized.includes("ram") || normalized.includes("memory") || normalized.includes("dram") || normalized.includes("ddr")) return "ram";

    return null;
}

function resolvePcSlotFromRow(row, valueMap = {}) {
    const typedSlot = resolvePcSlotFromValueMap(valueMap);
    if (typedSlot) return typedSlot;

    return (
        resolvePcSlot(row?.category) ||
        resolvePcSlot(row?.name) ||
        resolvePcSlot(valueMap?.category) ||
        resolvePcSlot(valueMap?.subcategory) ||
        resolvePcSlot(valueMap?.sub_category) ||
        resolvePcSlot(valueMap?.product_type) ||
        resolvePcSlot(valueMap?.type) ||
        null
    );
}

function resolvePcSlotFromValueMap(valueMap = {}) {
    const typed = valueMap?.__byType || {};
    const typeKeys = Object.keys(typed).map((key) => normalizeKey(key));

    if (typeKeys.includes("motherboard")) return "motherboard";
    if (typeKeys.includes("processors") || typeKeys.includes("processor")) return "cpu";
    if (typeKeys.includes("ram")) return "ram";
    if (typeKeys.includes("psu") || typeKeys.includes("power_supply")) return "psu";
    if (typeKeys.includes("video_cards") || typeKeys.includes("gpu") || typeKeys.includes("videocard")) return "gpu";

    return null;
}

function normalizeSocket(value) {
    const raw = toCleanString(value).toUpperCase();
    if (!raw) return "";
    return raw.replace(/\s+/g, "").replace(/SOCKET/g, "");
}

function normalizeRamType(value) {
    const raw = toCleanString(value).toUpperCase();
    if (!raw) return "";
    if (raw.includes("DDR5")) return "DDR5";
    if (raw.includes("DDR4")) return "DDR4";
    if (raw.includes("DDR3")) return "DDR3";
    return raw;
}

function pickFirstValue(source, keys) {
    for (const key of keys) {
        if (!source) continue;

        if (source[key] !== undefined && source[key] !== null && String(source[key]).trim() !== "") {
            return source[key];
        }

        const foundKey = Object.keys(source).find((candidate) => candidate.toLowerCase() === String(key).toLowerCase());
        if (!foundKey) continue;

        const value = source[foundKey];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            return value;
        }
    }

    return null;
}

function pickTypedValue(valueMap, typeKeys, propertyKeys) {
    const typed = valueMap?.__byType || {};

    for (const typeKey of typeKeys || []) {
        const normalizedType = normalizeKey(typeKey);
        const actualTypeKey = Object.keys(typed).find((candidate) => normalizeKey(candidate) === normalizedType);
        if (!actualTypeKey) continue;

        const hit = pickFirstValue(typed[actualTypeKey], propertyKeys);
        if (hit !== null && hit !== undefined && String(hit).trim() !== "") {
            return hit;
        }
    }

    return pickFirstValue(valueMap, propertyKeys);
}

function inferManufacturerFromName(name = "") {
    const trimmed = toCleanString(name);
    if (!trimmed) return "";
    return trimmed.split(/\s+/)[0] || "";
}

function toNumericId(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function buildPcSelectionFields(deviceRows = []) {
    const selection = {
        processor_id: null,
        videocard_id: null,
        motherboard_id: null,
        ram_id: null,
        psu_id: null,
    };

    for (const row of deviceRows) {
        const role = normalizeKey(row?.role);
        const field = PC_ROLE_TO_FIELD[role];
        if (!field || selection[field] != null) continue;
        selection[field] = toNumericId(row?.device_id);
    }

    return selection;
}

async function getPcSetupDeviceRows(setupIds) {
    const ids = (setupIds || []).map(Number).filter((id) => Number.isFinite(id));
    if (!ids.length) return [];

    const roles = Object.keys(PC_ROLE_TO_FIELD);

    const { data, error } = await supabase
        .from(SETUP_DEVICES_TABLE)
        .select("*")
        .in("setup_id", ids)
        .in("role", roles);

    if (error) throw error;
    return Array.isArray(data) ? data : [];
}

function groupPcSetupDevicesBySetupId(rows = []) {
    const grouped = new Map();

    for (const row of rows) {
        const key = String(row?.setup_id ?? "");
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(row);
    }

    return grouped;
}

async function enrichPcSetupRows(rows = []) {
    const pcRows = (rows || []).filter((row) => normalizeKey(row?.type ?? row?.setup_type) === "pc");
    if (!pcRows.length) return rows;

    const deviceRows = await getPcSetupDeviceRows(pcRows.map((row) => row?.id ?? row?.setup_id));
    const grouped = groupPcSetupDevicesBySetupId(deviceRows);

    return rows.map((row) => {
        if (normalizeKey(row?.type ?? row?.setup_type) !== "pc") return row;
        const key = String(row?.id ?? row?.setup_id ?? "");
        return {
            ...row,
            ...buildPcSelectionFields(grouped.get(key) || []),
        };
    });
}

function buildProductValuesIndex(rows = []) {
    const index = new Map();

    for (const row of rows) {
        const productId = row?.products_id;
        const propertyName = row?.properties?.property;
        const propertyType = row?.properties?.type;

        if (productId == null || !propertyName) continue;

        const key = String(productId);
        if (!index.has(key)) {
            index.set(key, { __byType: {} });
        }

        const target = index.get(key);
        const cleanPropertyName = String(propertyName).trim();
        target[cleanPropertyName] = row?.value ?? null;

        if (propertyType) {
            const cleanType = String(propertyType).trim();
            if (!target.__byType[cleanType]) {
                target.__byType[cleanType] = {};
            }
            target.__byType[cleanType][cleanPropertyName] = row?.value ?? null;
        }
    }

    return index;
}

async function getProductValuesIndex(productIds) {
    const ids = (productIds || []).map(Number).filter((id) => Number.isFinite(id));
    if (!ids.length) return new Map();

    const rows = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
        const { data, error } = await supabase
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
            .in("products_id", ids)
            .range(from, from + pageSize - 1);

        if (error) throw error;

        const page = Array.isArray(data) ? data : [];
        rows.push(...page);

        if (page.length < pageSize) {
            break;
        }

        from += pageSize;
    }

    return buildProductValuesIndex(rows);
}

async function syncPcSetupDevices(setupId, payload = {}) {
    const roles = Object.keys(PC_ROLE_TO_FIELD);
    const { data, error } = await supabase
        .from(SETUP_DEVICES_TABLE)
        .select("*")
        .eq("setup_id", Number(setupId))
        .in("role", roles)
        .order("id", { ascending: true });

    if (error) throw error;

    const existingRows = Array.isArray(data) ? data : [];

    for (const [field, role] of Object.entries(PC_FIELD_TO_ROLE)) {
        const desiredProductId = toNumericId(payload[field]);
        const existingForRole = existingRows.filter((row) => normalizeKey(row?.role) === role);
        const primary = existingForRole[0] || null;
        const duplicateIds = existingForRole.slice(1).map((row) => row?.id).filter((id) => id != null);

        if (duplicateIds.length) {
            const { error: duplicateDeleteError } = await supabase
                .from(SETUP_DEVICES_TABLE)
                .delete()
                .in("id", duplicateIds);

            if (duplicateDeleteError) throw duplicateDeleteError;
        }

        if (!desiredProductId) {
            if (primary?.id != null) {
                const { error: deleteError } = await supabase
                    .from(SETUP_DEVICES_TABLE)
                    .delete()
                    .eq("id", primary.id);

                if (deleteError) throw deleteError;
            }
            continue;
        }

        if (primary?.id != null) {
            if (Number(primary.device_id) !== desiredProductId) {
                const { error: updateError } = await supabase
                    .from(SETUP_DEVICES_TABLE)
                    .update({ device_id: desiredProductId })
                    .eq("id", primary.id);

                if (updateError) throw updateError;
            }
            continue;
        }

        const { error: insertError } = await supabase
            .from(SETUP_DEVICES_TABLE)
            .insert([{
                setup_id: Number(setupId),
                device_id: desiredProductId,
                role,
                pos_x: 0,
                pos_y: 0,
                rotation: 0
            }]);

        if (insertError) throw insertError;
    }
}

/* -----------------------------
   Helpers
   ----------------------------- */
async function assertRoomOwnedByUser(roomId, userId) {
    const { data, error } = await supabase
        .from(ROOMS_TABLE)
        .select("user_id")
        .eq("id", roomId)
        .limit(1)
        .maybeSingle();

    if (error || !data) return false;
    return String(data.user_id) === String(userId);
}

async function findSetupById(setupId) {
    const { data, error } = await supabase
        .from(SETUPS_TABLE)
        .select("*")
        .eq("id", setupId)
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data || null;
}

async function findDeviceById(deviceId) {
    const { data, error } = await supabase
        .from(SETUP_DEVICES_TABLE)
        .select("*")
        .eq("id", deviceId)
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data || null;
}

async function assertSetupOwnedByUser(setupId, userId) {
    if (await assertRoomOwnedByUser(setupId, userId)) return true;

    const setup = await findSetupById(setupId);
    if (!setup?.room_id) return false;
    return assertRoomOwnedByUser(setup.room_id, userId);
}

async function assertDeviceOwnedByUser(deviceId, userId) {
    const device = await findDeviceById(deviceId);
    if (!device?.setup_id) return false;
    return assertSetupOwnedByUser(device.setup_id, userId);
}

async function countPortConnections(portId) {
    const { count, error } = await supabase
        .from(SETUP_CONNECTIONS_TABLE)
        .select("*", { count: "exact", head: true })
        .or(`from_setup_device_port_id.eq.${portId},to_setup_device_port_id.eq.${portId}`);

    if (error) throw error;
    return Number(count || 0);
}

async function validatePortCapacity(portId) {
    const { data: port, error } = await supabase
        .from(SETUP_DEVICE_PORTS_TABLE)
        .select("*")
        .eq("id", portId)
        .limit(1)
        .maybeSingle();

    if (error || !port) {
        return { ok: false, error: "Port not found", port: null };
    }

    const currentCount = await countPortConnections(portId);
    const maxConnections = Number(port.max_connections ?? 1);

    if (currentCount >= maxConnections) {
        return { ok: false, error: "Port capacity exceeded", port };
    }

    return { ok: true, port };
}

function mapDisplay(item, tableName) {
    const manufacturer = item.Manufacturer || item.manufacturer || item.brand || item.Brand || "";
    const model = item.Model || item.model || item.product_model || item.type || "";
    const name = item.product_name || item.setup_name || item.name || item.Name || item.title || "";

    const isNetwork = tableName === "router[Setup]" || tableName === "switches[Setup]" || tableName === "modem[Setup]";
    const childSetupLabel = tableName === CHILD_SETUPS_TABLE
        ? (item.name || item.title || item.setup_name || item.product_name || "")
        : "";
    return {
        ...item,
        category: tableName,
        isNetwork,
        display_name:
            childSetupLabel
                ? childSetupLabel
                : manufacturer && model
                    ? `${manufacturer} ${model}`
                    : manufacturer && name
                        ? `${manufacturer} ${name}`
                        : name
                            ? name
                            : model
                                ? model
                                : `Ismeretlen termek (#${item.id ?? "?"})`,
        manufacturer,
    };
}

async function runWithConcurrency(items, limit, worker) {
    let idx = 0;
    const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
        while (idx < items.length) {
            const cur = items[idx++];
            await worker(cur);
        }
    });
    await Promise.all(runners);
}

async function fetchItemWithSetup(tableName, itemId) {
    let query = await supabase
        .from(tableName)
        .select("*")
        .eq("id", itemId)
        .single();

    if (!query.error && query.data) {
        const data = query.data;
        if (String(tableName).toLowerCase() === String(SETUPS_TABLE).toLowerCase()) {
            data.setup_id = Number(data.room_id ?? 0);
            data.x = Number(data.pos_x ?? 0);
            data.y = Number(data.pos_y ?? 0);
            data.type = String(data.type ?? "");
        } else if (String(tableName).toLowerCase() === String(SETUP_DEVICES_TABLE).toLowerCase()) {
            data.setup_id = Number(data.setup_id ?? 0);
            data.x = Number(data.pos_x ?? 0);
            data.y = Number(data.pos_y ?? 0);
            data.type = String(data.role ?? data.type ?? "device");
        }

        return { data, idColumn: "id" };
    }

    query = await supabase
        .from(tableName)
        .select("*")
        .eq("ID", itemId)
        .single();

    if (!query.error && query.data) {
        const data = query.data;
        if (String(tableName).toLowerCase() === String(SETUPS_TABLE).toLowerCase()) {
            data.setup_id = Number(data.room_id ?? 0);
            data.x = Number(data.pos_x ?? 0);
            data.y = Number(data.pos_y ?? 0);
            data.type = String(data.type ?? "");
        } else if (String(tableName).toLowerCase() === String(SETUP_DEVICES_TABLE).toLowerCase()) {
            data.setup_id = Number(data.setup_id ?? 0);
            data.x = Number(data.pos_x ?? 0);
            data.y = Number(data.pos_y ?? 0);
            data.type = String(data.role ?? data.type ?? "device");
        }

        return { data, idColumn: "ID" };
    }

    return { data: null, idColumn: null };
}

function isChildSetupTable(tableName) {
    const normalized = String(tableName || "").toLowerCase();
    return normalized === String(CHILD_SETUPS_TABLE).toLowerCase()
        || normalized === String(SETUP_DEVICES_TABLE).toLowerCase()
        || normalized === "setups[setup]"
        || normalized === "setup[setup]";
}

function resolveRenameColumn(item) {
    const candidates = [
        "display_name",
        "setup_name",
        "product_name",
        "name",
        "model"
    ];

    for (const key of candidates) {
        if (Object.prototype.hasOwnProperty.call(item || {}, key)) {
            return key;
        }
    }

    return null;
}

/* =========================================================
   SETUP LISTA
   - âś… query param: ?favorite=true/false (ha nincs -> mind)
   ========================================================= */
exports.list = async (req, res) => {
    try {
        const userId = req.user.id;

        const favoriteParam = req.query?.favorite;
        const hasFav = favoriteParam === "true" || favoriteParam === "false";
        const favBool = favoriteParam === "true";

        const { data: setupData, error: setupErr } = await supabase
            .from(ROOMS_TABLE)
            .select("*");
        if (setupErr) throw setupErr;

        const normalized = (setupData || [])
            .map((s) => ({
                ...s,
                setup_name: s.name ?? "Nevtelen setup",
                x: Number(s.pos_x ?? 0),
                y: Number(s.pos_y ?? 0),
                isFavorite: Boolean(s.is_favorite),
                user_id: s.user_id == null ? null : Number(s.user_id),
                type: "room"
            }))
            .filter((room) => String(room.user_id) === String(userId))
            .filter((room) => !hasFav || room.isFavorite === favBool);

        res.json({ setups: normalized });
    } catch (err) {
        console.error("Setup list hiba:", err);
        res.json({ setups: [] });
    }
};

exports.upsertRoomPosition = async (req, res) => {
    try {
        const userId = req.user.id;
        const setupId = req.params.setupId;
        const { x, y } = req.body;

        if (!setupId) return res.status(400).json({ error: "Missing setupId" });

        const ok = await assertSetupOwnedByUser(setupId, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const { error } = await supabase
            .from(ROOMS_TABLE)
            .update({ pos_x: Math.round(Number(x)), pos_y: Math.round(Number(y)) })
            .eq("id", setupId);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error("upsertRoomPosition fatal:", err);
        res.status(500).json({ error: "Update failed" });
    }
};

/* =========================================================
   SETUP GYEREKEK
   ========================================================= */
exports.children = async (req, res) => {
    const setupId = req.params.id;
    if (!setupId) return res.json([]);

    const pageRaw = Number.parseInt(String(req.query?.page ?? ""), 10);
    const limitRaw = Number.parseInt(String(req.query?.limit ?? ""), 10);
    const isPaginated = Number.isFinite(pageRaw) && Number.isFinite(limitRaw);
    const page = isPaginated ? Math.max(pageRaw, 1) : 1;
    const limit = isPaginated ? Math.min(Math.max(limitRaw, 1), 100) : null;

    const cached = cacheGet(childrenCache, setupId);
    if (cached) {
        if (!isPaginated) return res.json(cached);

        const total = cached.length;
        const totalPages = Math.max(Math.ceil(total / limit), 1);
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * limit;

        return res.json({
            items: cached.slice(start, start + limit),
            pagination: {
                page: safePage,
                limit,
                total,
                totalPages,
                hasPrev: safePage > 1,
                hasNext: safePage < totalPages,
            },
        });
    }

    try {
        const { data: roomRow } = await supabase
            .from(ROOMS_TABLE)
            .select("id")
            .eq("id", setupId)
            .limit(1)
            .maybeSingle();

        let allItems = [];

        if (roomRow?.id) {
            if (isPaginated) {
                const from = (page - 1) * limit;
                const to = from + limit - 1;
                const { data, error, count } = await supabase
                    .from(SETUPS_TABLE)
                    .select("*", { count: "exact" })
                    .eq("room_id", setupId)
                    .order("id", { ascending: true })
                    .range(from, to);

                if (error) throw error;

                const items = (data || []).map((item) => mapDisplay({
                    ...item,
                    setup_id: Number(item.room_id ?? 0),
                    setup_name: item.name ?? "Nevtelen setup",
                    setup_type: item.type ?? "setup",
                    x: Number(item.pos_x ?? 0),
                    y: Number(item.pos_y ?? 0)
                }, SETUPS_TABLE));

                const enrichedItems = await enrichPcSetupRows(items);
                const total = Number(count ?? 0);
                const totalPages = Math.max(Math.ceil(total / limit), 1);
                const safePage = Math.min(page, totalPages);

                return res.json({
                    items: enrichedItems,
                    pagination: {
                        page: safePage,
                        limit,
                        total,
                        totalPages,
                        hasPrev: safePage > 1,
                        hasNext: safePage < totalPages,
                    },
                });
            }

            const { data, error } = await supabase
                .from(SETUPS_TABLE)
                .select("*")
                .eq("room_id", setupId)
                .order("id", { ascending: true });

            if (error) throw error;

            allItems = (data || []).map((item) => mapDisplay({
                ...item,
                setup_id: Number(item.room_id ?? 0),
                setup_name: item.name ?? "Nevtelen setup",
                setup_type: item.type ?? "setup",
                x: Number(item.pos_x ?? 0),
                y: Number(item.pos_y ?? 0)
            }, SETUPS_TABLE));

            allItems = await enrichPcSetupRows(allItems);
        } else {
            if (isPaginated) {
                const from = (page - 1) * limit;
                const to = from + limit - 1;
                const { data, error, count } = await supabase
                    .from(SETUP_DEVICES_TABLE)
                    .select("*", { count: "exact" })
                    .eq("setup_id", setupId)
                    .order("id", { ascending: true })
                    .range(from, to);

                if (error) throw error;

                const items = (data || []).map((item) => mapDisplay({
                    ...item,
                    type: item.role ?? "device",
                    setup_type: item.role ?? "device",
                    product_id: Number(item.device_id ?? 0),
                    x: Number(item.pos_x ?? 0),
                    y: Number(item.pos_y ?? 0),
                    rotation: Number(item.rotation ?? 0)
                }, SETUP_DEVICES_TABLE));

                const total = Number(count ?? 0);
                const totalPages = Math.max(Math.ceil(total / limit), 1);
                const safePage = Math.min(page, totalPages);

                return res.json({
                    items,
                    pagination: {
                        page: safePage,
                        limit,
                        total,
                        totalPages,
                        hasPrev: safePage > 1,
                        hasNext: safePage < totalPages,
                    },
                });
            }

            const { data, error } = await supabase
                .from(SETUP_DEVICES_TABLE)
                .select("*")
                .eq("setup_id", setupId)
                .order("id", { ascending: true });

            if (error) throw error;

            allItems = (data || []).map((item) => mapDisplay({
                ...item,
                type: item.role ?? "device",
                setup_type: item.role ?? "device",
                product_id: Number(item.device_id ?? 0),
                x: Number(item.pos_x ?? 0),
                y: Number(item.pos_y ?? 0),
                rotation: Number(item.rotation ?? 0)
            }, SETUP_DEVICES_TABLE));
        }

        cacheSet(childrenCache, setupId, allItems, CHILDREN_TTL_MS);
        return res.json(allItems);
    } catch (err) {
        console.error("children fatal:", err);
        return res.json([]);
    }
};

/* =========================================================
   UPDATE / CREATE / DELETE
   ========================================================= */
exports.update = async (req, res) => {
    try {
        const userId = req.user.id;
        const setupId = req.params.id;
        const setup_name = req.body?.setup_name ?? req.body?.name;

        if (!setupId) {
            return res.status(400).json({ error: "Missing setup id" });
        }

        const updateData = {};

        if (setup_name !== undefined) {
            const trimmedName = String(setup_name || "").trim();
            updateData.name = trimmedName;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "Nothing to update" });
        }

        const ok = await assertSetupOwnedByUser(setupId, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const { data, error } = await supabase
            .from(ROOMS_TABLE)
            .update(updateData)
            .eq("id", setupId)
            .select("*")
            .single();

        if (error) {
            console.error("âťŚ Supabase setup update error:", error);
            return res.status(500).json({
                error: "Update failed",
                details: error.message,
            });
        }

        if (!data) {
            return res.status(404).json({ error: "Setup not found" });
        }

        childrenCache.delete(String(setupId));

        return res.json({
            setup: {
                ...data,
                setup_name: data.name ?? "Nevtelen setup",
                name: data.name ?? setup_name,
            },
        });
    } catch (err) {
        console.error("âťŚ Setup update hiba:", err);
        return res.status(500).json({
            error: "Update failed",
            details: err.message,
        });
    }
};

exports.create = async (req, res) => {
    try {
        const userId = req.user?.id ?? req.user?.user_id ?? req.userId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const setup_name = String(req.body?.setup_name ?? req.body?.name ?? "").trim();
        if (!setup_name) return res.status(400).json({ error: "setup_name required" });

        const isFavorite = req.body?.isFavorite === true;
        const x = Math.round(Number(req.body?.x ?? 0));
        const y = Math.round(Number(req.body?.y ?? 0));

        const { data, error } = await supabase
            .from(ROOMS_TABLE)
            .insert([{
                user_id: Number(userId),
                name: setup_name,
                pos_x: x,
                pos_y: y,
                is_favorite: isFavorite
            }])
            .select("*")
            .single();

        if (error) {
            console.error("Create room error:", error);
            return res.status(500).json({
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
            });
        }

        return res.json({
            setup: {
                ...data,
                setup_name: data.name ?? setup_name,
                name: data.name ?? setup_name,
                setup_type: "room",
                type: "room",
                x: Number(data.pos_x ?? x),
                y: Number(data.pos_y ?? y),
                isFavorite: Boolean(data.is_favorite),
                user_id: Number(data.user_id ?? userId)
            }
        });
    } catch (err) {
        console.error("Create setup error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/* =========================================================
   ADD GENERIC DEVICE TO A SETUP
   POST /api/setup/:id/add-device
   body: { product_id, source_table, display_name, manufacturer }
   ========================================================= */
exports.addDevice = async (req, res) => {
    try {
        const userId = req.user?.id;
        const setupId = req.params.id;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (!setupId) return res.status(400).json({ error: "Missing setupId" });

        const { product_id, source_table, display_name, manufacturer } = req.body;

        if (!product_id || !source_table) {
            return res.status(400).json({ error: "product_id and source_table are required" });
        }

        const ok = await assertSetupOwnedByUser(setupId, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const normalizeType = (value) => {
            const raw = String(value || "").toLowerCase();
            if (raw.includes("router")) return "router";
            if (raw.includes("switch")) return "switch";
            if (raw.includes("modem")) return "modem";
            if (raw.includes("home_theater")) return "home_theater";
            if (raw.includes("audio_processor")) return "audiop";
            if (raw.includes("subwoofer")) return "subwoofer";
            if (raw.includes("speaker")) return "speaker";
            if (raw.includes("projector")) return "projector";
            if (raw.includes("television")) return "television";
            return raw.replace("[setup]", "").trim() || "device";
        };

        const itemName = String(display_name || manufacturer || "Eszkoz").trim() || "Eszkoz";
        const itemType = normalizeType(source_table);

        const { data, error } = await supabase
            .from(SETUP_DEVICES_TABLE)
            .insert([{
                setup_id: Number(setupId),
                device_id: Number(product_id),
                role: itemType,
                pos_x: 0,
                pos_y: 0,
                rotation: 0
            }])
            .select("*")
            .single();

        if (error) {
            console.error("addDevice insert error:", error);
            return res.status(500).json({ error: error.message });
        }

        childrenCache.delete(String(setupId));

        return res.json({
            ok: true,
            device: mapDisplay({
                ...data,
                name: itemName,
                type: itemType,
                setup_type: itemType,
                product_id: Number(product_id),
                x: Number(data.pos_x ?? 0),
                y: Number(data.pos_y ?? 0)
            }, SETUP_DEVICES_TABLE)
        });
    } catch (err) {
        console.error("addDevice fatal:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.remove = async (req, res) => {
    try {
        const userId = req.user?.id;
        const setupId = req.params.id;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const ok = await assertSetupOwnedByUser(setupId, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const { data: roomSetups, error: setupsErr } = await supabase
            .from(SETUPS_TABLE)
            .select("id")
            .eq("room_id", setupId);

        if (setupsErr) {
            return res.status(500).json({ error: setupsErr.message });
        }

        const setupIds = (roomSetups || []).map((row) => Number(row.id)).filter(Number.isFinite);

        if (setupIds.length) {
            const { error: deviceConnErr } = await supabase
                .from(SETUP_CONNECTIONS_TABLE)
                .delete()
                .in("setup_id", setupIds);
            if (deviceConnErr) return res.status(500).json({ error: deviceConnErr.message });

            const { error: deviceErr } = await supabase
                .from(SETUP_DEVICES_TABLE)
                .delete()
                .in("setup_id", setupIds);
            if (deviceErr) return res.status(500).json({ error: deviceErr.message });

            const { error: setupErr } = await supabase
                .from(SETUPS_TABLE)
                .delete()
                .in("id", setupIds);
            if (setupErr) return res.status(500).json({ error: setupErr.message });
        }

        const { data, error } = await supabase
            .from(ROOMS_TABLE)
            .delete()
            .eq("id", setupId)
            .select("*");

        if (error) {
            console.error("âťŚ Supabase delete error:", error);
            return res.status(500).json({ error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Setup not found" });
        }

        childrenCache.delete(setupId);

        return res.json({ ok: true });
    } catch (err) {
        console.error("âťŚ Setup delete hiba:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/* =========================================================
   PC BUILDER
   ========================================================= */
exports.pcBuildsList = async (req, res) => {
    try {
        const userId = req.user.id;
        const setupId = req.params.id;

        const ok = await assertSetupOwnedByUser(setupId, userId);
        if (!ok) return res.status(403).json({ pcs: [] });

        const { data, error } = await supabase
            .from(SETUPS_TABLE)
            .select("*")
            .eq("room_id", setupId)
            .eq("type", "pc")
            .order("id", { ascending: false })
            .limit(200);

        if (error) throw error;

        const pcs = (data || []).map((r) => ({
            ...r,
            setup_name: r.name ?? "Nevtelen PC",
            setup_type: "pc",
            x: Number(r.pos_x ?? 0),
            y: Number(r.pos_y ?? 0)
        }));

        return res.json({ pcs: await enrichPcSetupRows(pcs) });
    } catch (err) {
        console.error("âťŚ pcBuildsList hiba:", err);
        return res.status(500).json({ pcs: [] });
    }
};

exports.pcBuildsCreate = async (req, res) => {
    try {
        const userId = req.user.id;
        const setupId = req.params.id;

        const ok = await assertSetupOwnedByUser(setupId, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const pc_name = (req.body?.pc_name || "").trim();
        if (!pc_name) return res.status(400).json({ error: "pc_name required" });

        const { data, error } = await supabase
            .from(SETUPS_TABLE)
            .insert([{
                room_id: Number(setupId),
                name: pc_name,
                type: "pc",
                pos_x: 0,
                pos_y: 0
            }])
            .select("*")
            .single();
        if (error) throw error;

        childrenCache.delete(String(setupId));

        return res.json({
            pc: {
                ...data,
                setup_name: data.name ?? pc_name,
                setup_type: "pc",
                x: Number(data.pos_x ?? 0),
                y: Number(data.pos_y ?? 0)
            }
        });
    } catch (err) {
        console.error("âťŚ pcBuildsCreate hiba:", err);
        return res.status(500).json({ error: "Create failed" });
    }
};

exports.pcBuildsUpdate = async (req, res) => {
    try {
        const userId = req.user.id;
        const pcId = req.params.pcId;

        if (!pcId) return res.status(400).json({ error: "Missing pcId" });

        const { data: pcRow, error: pcErr } = await supabase
            .from(SETUPS_TABLE)
            .select("*")
            .eq("id", pcId)
            .eq("type", "pc")
            .limit(1)
            .maybeSingle();

        if (pcErr || !pcRow) return res.status(404).json({ error: "PC not found" });

        const ok = await assertRoomOwnedByUser(pcRow.room_id, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const payload = {
            processor_id: toNumericId(req.body?.processor_id),
            videocard_id: toNumericId(req.body?.videocard_id),
            motherboard_id: toNumericId(req.body?.motherboard_id),
            ram_id: toNumericId(req.body?.ram_id),
            psu_id: toNumericId(req.body?.psu_id)
        };

        await syncPcSetupDevices(pcId, payload);
        childrenCache.delete(String(pcRow.room_id));
        childrenCache.delete(String(pcId));

        return res.json({
            pc: {
                ...pcRow,
                setup_name: pcRow.name ?? "Nevtelen PC",
                setup_type: "pc",
                ...payload,
                x: Number(pcRow.pos_x ?? 0),
                y: Number(pcRow.pos_y ?? 0)
            }
        });
    } catch (err) {
        console.error("âťŚ pcBuildsUpdate hiba:", err);
        return res.status(500).json({ error: "Update failed" });
    }
};

exports.pcPartsLegacy = async (req, res) => {
    try {
        const cacheKey = "pcparts:v2";
        const cached = cacheGet(pcPartsCache, cacheKey);
        if (cached) return res.json({ parts: cached });

        const safeSelect = async (table) => {
            const { data, error } = await supabase.from(table).select("*");
            if (error) {
                console.error(`âťŚ pcParts select error in ${table}:`, error.message);
                return [];
            }
            return Array.isArray(data) ? data : [];
        };

        const toStr = (v) => (v === null || v === undefined ? "" : String(v).trim());

        const normalizeSocket = (value) => {
            const v = toStr(value).toUpperCase();
            if (!v) return "";
            return v.replace(/\s+/g, "").replace(/SOCKET/g, "");
        };

        const normalizeRamType = (value) => {
            const v = toStr(value).toUpperCase();
            if (!v) return "";
            if (v.includes("DDR5")) return "DDR5";
            if (v.includes("DDR4")) return "DDR4";
            if (v.includes("DDR3")) return "DDR3";
            return v;
        };

        const pickFirst = (obj, keys) => {
            for (const key of keys) {
                if (obj && obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== "") {
                    return obj[key];
                }
            }
            return null;
        };

        const parts = [];

        const cpus = await safeSelect("processors");
        for (const r of cpus) {
            const id = r.ID ?? r.id;
            if (id == null) continue;

            const manufacturer = toStr(pickFirst(r, ["manufacturer", "Manufacturer", "brand", "Brand"]));
            const model = toStr(pickFirst(r, ["Model", "model", "name", "Name"]));
            const socket = normalizeSocket(
                pickFirst(r, ["socket", "Socket", "cpu_socket", "CPU_Socket", "platform", "Platform"])
            );

            parts.push({
                id: Number(id),
                slot: "cpu",
                source_table: "processors",
                manufacturer,
                model,
                socket,
                display_name: manufacturer && model ? `${manufacturer} ${model}` : model || manufacturer || `CPU #${id}`,
            });
        }

        const gpus = await safeSelect("video_cards");
        for (const r of gpus) {
            const id = r.ID ?? r.id;
            if (id == null) continue;

            const manufacturer = toStr(pickFirst(r, ["manufacturer", "Manufacturer", "brand", "Brand"]));
            const main = toStr(pickFirst(r, ["model", "Model", "series", "Series", "variant", "Variant", "name", "Name"]));

            parts.push({
                id: Number(id),
                slot: "gpu",
                source_table: "video_cards",
                manufacturer,
                model: main,
                display_name: manufacturer && main ? `${manufacturer} ${main}` : main || manufacturer || `GPU #${id}`,
            });
        }

        const mobs = await safeSelect("motherboard");
        for (const r of mobs) {
            const id = r.ID ?? r.id;
            if (id == null) continue;

            const manufacturer = toStr(pickFirst(r, ["manufacturer", "Manufacturer", "brand", "Brand"]));
            const model = toStr(pickFirst(r, ["Model", "model", "name", "Name"]));
            const socket = normalizeSocket(
                pickFirst(r, ["socket", "Socket", "cpu_socket", "CPU_Socket", "platform", "Platform"])
            );
            const ram_type = normalizeRamType(
                pickFirst(r, ["ram_type", "RAMType", "RamType", "memory_type", "MemoryType", "ddr_type", "DDRType"])
            );

            parts.push({
                id: Number(id),
                slot: "motherboard",
                source_table: "motherboard",
                manufacturer,
                model,
                socket,
                ram_type,
                display_name: manufacturer && model ? `${manufacturer} ${model}` : model || manufacturer || `Motherboard #${id}`,
            });
        }

        const rams = await safeSelect("ram");
        for (const r of rams) {
            const id = r.ID ?? r.id;
            if (id == null) continue;

            const manufacturer = toStr(pickFirst(r, ["manufacturer", "Manufacturer", "brand", "Brand"]));
            const model = toStr(pickFirst(r, ["model", "Model", "name", "Name"]));
            const cap = r.capacity_gb != null ? `${r.capacity_gb}GB` : "";
            const sticks = r.sticks != null ? `${r.sticks}x` : "";
            const speed = r.speed_mhz != null ? `${r.speed_mhz}MHz` : "";
            const extra = [sticks && cap ? `${sticks}${cap}` : cap, speed].filter(Boolean).join(" ");
            const base = manufacturer && model ? `${manufacturer} ${model}` : model || manufacturer;
            const ram_type = normalizeRamType(
                pickFirst(r, ["ram_type", "RAMType", "RamType", "memory_type", "MemoryType", "ddr_type", "DDRType"])
            );

            parts.push({
                id: Number(id),
                slot: "ram",
                source_table: "ram",
                manufacturer,
                model,
                ram_type,
                display_name: base && extra ? `${base} (${extra})` : base || (extra ? `RAM (${extra})` : `RAM #${id}`),
            });
        }

        const psus = await safeSelect("psu");
        for (const r of psus) {
            const id = r.ID ?? r.id;
            if (id == null) continue;

            const manufacturer = toStr(pickFirst(r, ["manufacturer", "Manufacturer", "brand", "Brand"]));
            const model = toStr(pickFirst(r, ["model", "Model", "name", "Name"]));
            const watt = pickFirst(r, ["wattage", "Wattage"]) != null ? `${pickFirst(r, ["wattage", "Wattage"])}W` : "";
            const eff = toStr(pickFirst(r, ["efficiency", "Efficiency"]));
            const extra = [watt, eff].filter(Boolean).join(" ");
            const base = manufacturer && model ? `${manufacturer} ${model}` : model || manufacturer;

            parts.push({
                id: Number(id),
                slot: "psu",
                source_table: "psu",
                manufacturer,
                model,
                wattage: toStr(pickFirst(r, ["wattage", "Wattage"])),
                efficiency: eff,
                display_name: base && extra ? `${base} (${extra})` : base || (extra ? `PSU (${extra})` : `PSU #${id}`),
            });
        }

        const order = { cpu: 1, gpu: 2, motherboard: 3, ram: 4, psu: 5, other: 9 };
        parts.sort((a, b) => (order[a.slot] ?? 99) - (order[b.slot] ?? 99));

        cacheSet(pcPartsCache, cacheKey, parts, PCPARTS_TTL_MS);
        return res.json({ parts });
    } catch (err) {
        console.error("âťŚ pcParts hiba:", err);
        return res.json({ parts: [] });
    }
};

/* =========================================================
   âś… CARS
   ========================================================= */
exports.carOptions = async (req, res) => {
    try {
        const cacheKey = "car-options:v2";
        const cached = cacheGet(carOptionsCache, cacheKey);
        if (cached) return res.json({ cars: cached });

        const { data, error } = await supabase
            .from("products")
            .select("id, name, type")
            .order("name", { ascending: true })
            .limit(5000);

        if (error) throw error;

        const cars = (Array.isArray(data) ? data : [])
            .filter((row) => String(row?.type || "").trim().toLowerCase() === "car")
            .map((row) => ({
                id: Number(row.id),
                name: String(row.name || "").trim(),
                type: String(row.type || "").trim(),
                display_name: String(row.name || "").trim() || `Autó #${row.id}`
            }));

        cars.sort((a, b) => a.display_name.localeCompare(b.display_name, "hu"));

        cacheSet(carOptionsCache, cacheKey, cars, CAROPTIONS_TTL_MS);
        return res.json({ cars });
    } catch (err) {
        console.error("âťŚ carOptions hiba:", err);
        return res.json({ cars: [] });
    }
};

exports.carsList = async (req, res) => {
    try {
        const userId = req.user.id;
        const setupId = req.params.id;

        const ok = await assertSetupOwnedByUser(setupId, userId);
        if (!ok) return res.status(403).json({ cars: [] });

        const { data, error } = await supabase
            .from(SETUPS_TABLE)
            .select("*")
            .eq("room_id", setupId)
            .eq("type", "car")
            .order("id", { ascending: false })
            .limit(300);

        if (error) throw error;

        const cars = (data || []).map((r) => ({
            ...r,
            setup_name: r.name ?? "Nevtelen auto",
            setup_type: "car",
            x: Number(r.pos_x ?? 0),
            y: Number(r.pos_y ?? 0)
        }));

        return res.json({ cars });
    } catch (err) {
        console.error("âťŚ carsList hiba:", err);
        return res.status(500).json({ cars: [] });
    }
};

exports.carsAdd = async (req, res) => {
    try {
        const userId = req.user.id;
        const setupId = req.params.id;

        const ok = await assertSetupOwnedByUser(setupId, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const car_id_raw = req.body?.car_id;
        const car_id = car_id_raw == null ? null : Number(car_id_raw);

        if (!car_id || Number.isNaN(car_id)) {
            return res.status(400).json({ error: "A car_id kötelező" });
        }

        const { data: product, error: productError } = await supabase
            .from("products")
            .select("id, name, type")
            .eq("id", car_id)
            .limit(1)
            .maybeSingle();

        if (productError) throw productError;
        if (!product) {
            return res.status(404).json({ error: "Autó termék nem található" });
        }

        const productType = String(product.type || "").trim().toLowerCase();
        if (productType !== "car") {
            return res.status(400).json({ error: "A kiválasztott termék nem autó típusú" });
        }

        const setup_name = String(product.name || "").trim() || `Autó #${car_id}`;

        const { data, error } = await supabase
            .from(SETUPS_TABLE)
            .insert([{
                room_id: Number(setupId),
                name: setup_name,
                type: "car",
                pos_x: 0,
                pos_y: 0
            }])
            .select("*")
            .single();
        if (error) throw error;

        const { data: createdDevice, error: deviceError } = await supabase
            .from(SETUP_DEVICES_TABLE)
            .insert([{
                setup_id: Number(data.id),
                device_id: Number(car_id),
                role: "car",
                pos_x: Number(data.pos_x ?? 0),
                pos_y: Number(data.pos_y ?? 0),
                rotation: 0
            }])
            .select("*")
            .single();

        if (deviceError) {
            await supabase
                .from(SETUPS_TABLE)
                .delete()
                .eq("id", data.id);
            throw deviceError;
        }

        childrenCache.delete(String(setupId));
        childrenCache.delete(String(data.id));

        return res.json({
            car: {
                ...data,
                setup_name: data.name ?? setup_name,
                setup_type: "car",
                car_id,
                product_id: car_id,
                device: createdDevice ?? null,
                x: Number(data.pos_x ?? 0),
                y: Number(data.pos_y ?? 0)
            }
        });
    } catch (err) {
        console.error("âťŚ carsAdd hiba:", err);
        return res.status(500).json({ error: "Create failed" });
    }
};

exports.instrumentOptions = async (req, res) => {
    try {
        const cacheKey = "instrument-options:v1";
        const cached = cacheGet(instrumentOptionsCache, cacheKey);
        if (cached) return res.json({ instruments: cached });

        const { data, error } = await supabase
            .from("products")
            .select("id, name, type")
            .order("name", { ascending: true })
            .limit(5000);

        if (error) throw error;

        const instruments = (Array.isArray(data) ? data : [])
            .filter((row) => String(row?.type || "").trim().toLowerCase() === "inst")
            .map((row) => ({
                id: Number(row.id),
                name: String(row.name || "").trim(),
                type: String(row.type || "").trim(),
                display_name: String(row.name || "").trim() || `Hangszer #${row.id}`
            }));

        instruments.sort((a, b) => a.display_name.localeCompare(b.display_name, "hu"));

        cacheSet(instrumentOptionsCache, cacheKey, instruments, INSTRUMENTOPTIONS_TTL_MS);
        return res.json({ instruments });
    } catch (err) {
        console.error("❌ instrumentOptions hiba:", err);
        return res.json({ instruments: [] });
    }
};

exports.instrumentsList = async (req, res) => {
    try {
        const userId = req.user.id;
        const setupId = req.params.id;

        const ok = await assertSetupOwnedByUser(setupId, userId);
        if (!ok) return res.status(403).json({ instruments: [] });

        const { data, error } = await supabase
            .from(SETUPS_TABLE)
            .select("*")
            .eq("room_id", setupId)
            .eq("type", "instrument")
            .order("id", { ascending: false })
            .limit(300);

        if (error) throw error;

        const instruments = (data || []).map((r) => ({
            ...r,
            setup_name: r.name ?? "Nevtelen hangszer",
            setup_type: "instrument",
            x: Number(r.pos_x ?? 0),
            y: Number(r.pos_y ?? 0)
        }));

        return res.json({ instruments });
    } catch (err) {
        console.error("❌ instrumentsList hiba:", err);
        return res.status(500).json({ instruments: [] });
    }
};

exports.instrumentsAdd = async (req, res) => {
    try {
        const userId = req.user.id;
        const setupId = req.params.id;

        const ok = await assertSetupOwnedByUser(setupId, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const instrument_id_raw = req.body?.instrument_id;
        const instrument_id = instrument_id_raw == null ? null : Number(instrument_id_raw);

        if (!instrument_id || Number.isNaN(instrument_id)) {
            return res.status(400).json({ error: "A instrument_id kötelező" });
        }

        const { data: product, error: productError } = await supabase
            .from("products")
            .select("id, name, type")
            .eq("id", instrument_id)
            .limit(1)
            .maybeSingle();

        if (productError) throw productError;
        if (!product) {
            return res.status(404).json({ error: "Hangszer termék nem található" });
        }

        const productType = String(product.type || "").trim().toLowerCase();
        if (productType !== "inst") {
            return res.status(400).json({ error: "A kiválasztott termék nem hangszer típusú" });
        }

        const setup_name = String(product.name || "").trim() || `Hangszer #${instrument_id}`;

        const { data, error } = await supabase
            .from(SETUPS_TABLE)
            .insert([{
                room_id: Number(setupId),
                name: setup_name,
                type: "instrument",
                pos_x: 0,
                pos_y: 0
            }])
            .select("*")
            .single();
        if (error) throw error;

        const { data: createdDevice, error: deviceError } = await supabase
            .from(SETUP_DEVICES_TABLE)
            .insert([{
                setup_id: Number(data.id),
                device_id: Number(instrument_id),
                role: "instrument",
                pos_x: Number(data.pos_x ?? 0),
                pos_y: Number(data.pos_y ?? 0),
                rotation: 0
            }])
            .select("*")
            .single();

        if (deviceError) {
            await supabase
                .from(SETUPS_TABLE)
                .delete()
                .eq("id", data.id);
            throw deviceError;
        }

        childrenCache.delete(String(setupId));
        childrenCache.delete(String(data.id));

        return res.json({
            instrument: {
                ...data,
                setup_name: data.name ?? setup_name,
                setup_type: "instrument",
                instrument_id,
                product_id: instrument_id,
                device: createdDevice ?? null,
                x: Number(data.pos_x ?? 0),
                y: Number(data.pos_y ?? 0)
            }
        });
    } catch (err) {
        console.error("❌ instrumentsAdd hiba:", err);
        return res.status(500).json({ error: "Create failed" });
    }
};

function pickFirstCarLink(row) {
    if (!row) return null;

    const map = [
        { fk: "cabrio_id", table: "cabrio_cars" },
        { fk: "hatchback_id", table: "hatchback_cars" },
        { fk: "coupe_id", table: "coupe_cars" },
        { fk: "wagon_id", table: "wagon_cars" },
        { fk: "mpv_id", table: "mpv_cars" },
        { fk: "crossover_id", table: "crossover_cars" },
        { fk: "pickup_id", table: "pickup_cars" },
    ];

    for (const m of map) {
        const raw = row[m.fk];
        const id = raw == null ? null : Number(raw);

        if (id != null && !Number.isNaN(id) && id > 0) {
            return { table: m.table, id };
        }
    }

    return null;
}

function pick(obj, keys) {
    for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return null;
}

exports.carSetupDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const carSetupId = req.params.carSetupId;

        if (!carSetupId) return res.status(400).json({ error: "Missing carSetupId" });

        const cached = cacheGet(carDetailsCache, String(carSetupId));
        if (cached) return res.json(cached);

        const { data: carSetupRow, error: csErr } = await supabase
            .from(SETUPS_TABLE)
            .select("*")
            .eq("id", carSetupId)
            .limit(1)
            .maybeSingle();

        if (csErr || !carSetupRow) {
            return res.status(404).json({ error: "Car setup row not found" });
        }

        const ok = await assertSetupOwnedByUser(carSetupRow.id, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const { data: setupDevice, error: deviceErr } = await supabase
            .from(SETUP_DEVICES_TABLE)
            .select("*")
            .eq("setup_id", carSetupId)
            .eq("role", "car")
            .order("id", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (deviceErr) throw deviceErr;
        if (!setupDevice?.device_id) {
            return res.status(404).json({ error: "Car device not found for setup" });
        }

        const productId = Number(setupDevice.device_id);

        const [{ data: product, error: productErr }, { data: valueRows, error: valuesErr }] = await Promise.all([
            supabase
                .from("products")
                .select("id, name, type")
                .eq("id", productId)
                .limit(1)
                .maybeSingle(),
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
                .eq("products_id", productId)
        ]);

        if (productErr) throw productErr;
        if (valuesErr) throw valuesErr;

        const valueMap = {};
        for (const row of Array.isArray(valueRows) ? valueRows : []) {
            const propertyName = String(row?.properties?.property || "").trim();
            if (!propertyName) continue;
            valueMap[propertyName] = row?.value ?? null;
        }

        const manufacturer = pick(valueMap, ["manufacturer", "Manufacturer", "brand", "Brand"]) ?? "—";
        const model = pick(valueMap, ["model", "Model"]) ?? String(product?.name || "").trim() ?? "—";
        const price = pick(valueMap, ["price", "Price"]) ?? "—";
        const bodyType = pick(valueMap, ["body_type", "Body Type", "BodyType", "bodyType"]) ?? "—";
        const hp = pick(valueMap, ["horsepower", "Horsepower", "hp", "HP"]) ?? "—";
        const acc = pick(valueMap, ["acceleration", "Acceleration", "Acceleration (s)", "acceleration_s"]) ?? "—";
        const seats = pick(valueMap, ["seats", "Seats"]) ?? "—";
        const fuel = pick(valueMap, ["fuel_type", "Fuel Type", "FuelType", "fuel"]) ?? "—";
        const year = pick(valueMap, ["year", "Year"]) ?? "—";
        const trans = pick(valueMap, ["transmission", "Transmission"]) ?? "—";

        const response = {
            car_setup_id: Number(carSetupId),
            setup_id: Number(carSetupRow.id),
            room_id: Number(carSetupRow.room_id ?? 0),
            product_id: productId,
            setup_name: String(carSetupRow.name || product?.name || "Autó").trim(),
            car: {
                id: productId,
                name: String(product?.name || "").trim(),
                type: String(product?.type || "").trim()
            },
            manufacturer,
            model,
            price,
            body_type: bodyType,
            horsepower: hp,
            acceleration: acc,
            seats,
            fuel_type: fuel,
            year,
            transmission: trans,
            fields: {
                "Manufacturer": manufacturer,
                "Model": model,
                "Price": price,
                "Body Type": bodyType,
                "Horsepower": hp,
                "Acceleration (s)": acc,
                "Seats": seats,
                "Fuel Type": fuel,
                "Year": year,
                "Transmission": trans,
            }
        };

        cacheSet(carDetailsCache, String(carSetupId), response, CARDETAILS_TTL_MS);
        return res.json(response);
    } catch (err) {
        console.error("âťŚ carSetupDetails hiba:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/* =========================================================
   âś… CONNECTIONS
   ========================================================= */
const typeToTableMap = {
    "pc": "setup",
    "switch": "setup",
    "router": "setup",
    "modem": "setup",
    "ht": "setup",
    "home_theater": "setup",
    "audiop": "setup",
    "mixer": "setup",
    "speaker": "setup",
    "subwoofer": "setup",
    "car": "setup"
};

exports.connections = async (req, res) => {
    return res.json([]);
};

exports.connectionsCreate = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            from_device_id,
            to_device_id,
            from_setup_device_port_id,
            to_setup_device_port_id,
            cable_id,
            setup_id,
            type
        } = req.body;

        if (!setup_id || !from_device_id || !to_device_id || !from_setup_device_port_id || !to_setup_device_port_id) {
            return res.status(400).json({ error: "Missing required port connection fields" });
        }

        const setupOwned = await assertSetupOwnedByUser(setup_id, userId);
        const fromOwned = await assertDeviceOwnedByUser(from_device_id, userId);
        const toOwned = await assertDeviceOwnedByUser(to_device_id, userId);

        if (!setupOwned || !fromOwned || !toOwned) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const fromCapacity = await validatePortCapacity(from_setup_device_port_id);
        if (!fromCapacity.ok) return res.status(400).json({ error: fromCapacity.error });

        const toCapacity = await validatePortCapacity(to_setup_device_port_id);
        if (!toCapacity.ok) return res.status(400).json({ error: toCapacity.error });

        const fromPortType = Number(fromCapacity.port?.port_type ?? 0);
        const toPortType = Number(toCapacity.port?.port_type ?? 0);
        if (fromPortType && toPortType && fromPortType !== toPortType) {
            return res.status(400).json({ error: "Incompatible port types" });
        }

        const payload = {
            setup_id: Number(setup_id),
            from_setup_device_id: Number(from_device_id),
            to_setup_device_id: Number(to_device_id),
            from_setup_device_port_id: Number(from_setup_device_port_id),
            to_setup_device_port_id: Number(to_setup_device_port_id),
            cable_id: cable_id == null ? null : Number(cable_id),
            type: type == null ? null : type
        };

        const { data, error } = await supabase
            .from(SETUP_CONNECTIONS_TABLE)
            .insert([payload])
            .select("*")
            .single();

        if (error) throw error;

        childrenCache.delete(String(setup_id));

        res.json({ success: true, connection: data });
    } catch (err) {
        console.error("âťŚ connectionsCreate fatal:", err);
        res.status(500).json({ error: "Failed to create connection" });
    }
};

exports.connectionsRemove = async (req, res) => {
    try {
        const userId = req.user.id;
        const connId = req.params.id;

        const { data: conn, error: findErr } = await supabase
            .from(SETUP_CONNECTIONS_TABLE)
            .select("setup_id")
            .eq("id", connId)
            .single();

        if (findErr || !conn) return res.status(404).json({ error: "Connection not found" });

        const ok = await assertSetupOwnedByUser(conn.setup_id, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const { error: delErr } = await supabase
            .from(SETUP_CONNECTIONS_TABLE)
            .delete()
            .eq("id", connId);

        if (delErr) throw delErr;

        childrenCache.delete(String(conn.setup_id));

        res.json({ success: true });
    } catch (err) {
        console.error("âťŚ connectionsRemove fatal:", err);
        res.status(500).json({ error: "Failed to remove connection" });
    }
};

exports.renameItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId, tableName, newName } = req.body;

        if (!itemId || !tableName || !String(newName || "").trim()) {
            return res.status(400).json({ error: "Missing itemId, tableName or newName" });
        }

        const { data: item, idColumn } = await fetchItemWithSetup(tableName, itemId);

        if (!item || !idColumn) {
            return res.status(404).json({ error: "Item not found" });
        }

        const ok = await assertSetupOwnedByUser(item.setup_id, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const renameColumn = resolveRenameColumn(item);
        if (!renameColumn) {
            return res.status(400).json({ error: "This item cannot be renamed" });
        }

        const value = String(newName).trim();

        const { data, error } = await supabase
            .from(tableName)
            .update({ [renameColumn]: value })
            .eq(idColumn, itemId)
            .select("*")
            .single();

        if (error) {
            console.error("âťŚ renameItem update error:", error);
            return res.status(500).json({ error: "Rename failed", details: error.message });
        }

        childrenCache.delete(String(item.setup_id));

        return res.json({
            success: true,
            item: mapDisplay(data, tableName)
        });
    } catch (err) {
        console.error("âťŚ renameItem fatal:", err);
        return res.status(500).json({ error: "Rename failed" });
    }
};

exports.updateItemPosition = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId, tableName, x, y } = req.body;

        if (!itemId || !tableName) {
            return res.status(400).json({ error: "Missing itemId or tableName" });
        }

        if (!isChildSetupTable(tableName)) {
            return res.status(400).json({ error: "Position update supported only for child setups" });
        }

        const { data: item, idColumn } = await fetchItemWithSetup(tableName, itemId);

        if (!item || !idColumn) {
            return res.status(404).json({ error: "Item not found" });
        }

        const ok = await assertSetupOwnedByUser(item.setup_id, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const payload = String(tableName).toLowerCase() === String(SETUPS_TABLE).toLowerCase()
            ? { pos_x: Math.round(Number(x)), pos_y: Math.round(Number(y)) }
            : { pos_x: Math.round(Number(x)), pos_y: Math.round(Number(y)) };

        const { error } = await supabase
            .from(tableName)
            .update(payload)
            .eq(idColumn, itemId);

        if (error) throw error;

        childrenCache.delete(String(item.setup_id));

        return res.json({
            success: true,
            item: mapDisplay({
                ...item,
                x: Number(x),
                y: Number(y)
            }, tableName)
        });
    } catch (err) {
        console.error("updateItemPosition fatal:", err);
        return res.status(500).json({ error: "Position update failed" });
    }
};

exports.removeItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId, tableName } = req.body;

        if (!itemId || !tableName) {
            return res.status(400).json({ error: "Missing itemId or tableName" });
        }

        const { data: item, idColumn } = await fetchItemWithSetup(tableName, itemId);

        if (!item || !idColumn) {
            return res.status(404).json({ error: "Item not found" });
        }

        const ok = await assertSetupOwnedByUser(item.setup_id, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const { error: delErr } = await supabase
            .from(tableName)
            .delete()
            .eq(idColumn, itemId);

        if (delErr) throw delErr;

        if (String(tableName).toLowerCase() === String(SETUPS_TABLE).toLowerCase()) {
            const { error: connErr } = await supabase
                .from(SETUP_CONNECTIONS_TABLE)
                .delete()
                .eq("setup_id", itemId);
            if (connErr) throw connErr;

            const { error: deviceErr } = await supabase
                .from(SETUP_DEVICES_TABLE)
                .delete()
                .eq("setup_id", itemId);
            if (deviceErr) throw deviceErr;
        }

        childrenCache.delete(String(item.setup_id));

        res.json({ success: true });
    } catch (err) {
        console.error("âťŚ removeItem fatal:", err);
        res.status(500).json({ error: "Failed to remove item" });
    }
};

exports.allConnections = async (req, res) => {
    return res.json([]);
};

exports.childrenInternal = async (setupId) => {
    let allItems = [];
    const PER_TABLE_LIMIT = 200;
    const TOTAL_CAP = 1500;
    const CONCURRENCY = 4;

    await runWithConcurrency(tablesToScan, CONCURRENCY, async (tableName) => {
        if (allItems.length >= TOTAL_CAP) return;
        if (NO_SETUPID_TABLES.has(tableName)) return;
        const { data, error } = await supabase.from(tableName).select("*").eq("setup_id", setupId).limit(PER_TABLE_LIMIT);
        if (!error && Array.isArray(data)) {
            const mapped = data.map((item) => mapDisplay(item, tableName));
            allItems.push(...mapped);
        }
    });
    return allItems;
};

exports.deviceConnections = async (req, res) => {
    try {
        const { deviceId } = req.query;

        if (!deviceId) {
            return res.json([]);
        }

        const { data, error } = await supabase
            .from(SETUP_CONNECTIONS_TABLE)
            .select("*")
            .or(
                `from_setup_device_id.eq.${deviceId},to_setup_device_id.eq.${deviceId}`
            );

        if (error) throw error;

        return res.json(data || []);
    } catch (err) {
        console.error("âťŚ deviceConnections fatal:", err);
        return res.json([]);
    }
};


