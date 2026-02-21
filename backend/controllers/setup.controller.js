
const { supabase } = require("../services/supabase");

/**
 * Stabil children scan:
 * - amiben nincs setup_id, azt nem kérdezzük le (előre blacklist + auto blacklist)
 * - cache + limit + concurrency -> nem terheli túl a Supabase-t
 * - PC builder működik (pcbuilds + pcparts)
 * - ✅ Cars: car-options + cars list + cars add (Car_setup[Setup])
 */

const SETUP_TABLE = "setup[Setup]";
const PC_BUILDS_TABLE = "pc_details[Setup]";
const CAR_SETUP_TABLE = "Car_setup[Setup]";

/* =========================================================
   ✅ FIX: előre blacklisteljük az összes eddig logolt táblát,
   amiben biztosan nincs setup_id
   ========================================================= */
const NO_SETUPID_TABLES = new Set([
    // --- korábbi logok ---
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

    // --- mostani 15 hiba ---
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
 * Teljes táblalista maradhat, mert a children úgyis skippeli a NO_SETUPID_TABLES-t.
 * FONTOS: "setup[Setup]" nem children tábla, ezért nincs itt.
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
    "setup_rooms[Setup]",
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

const CHILDREN_TTL_MS = 30_000;
const PCPARTS_TTL_MS = 10 * 60_000;
const CAROPTIONS_TTL_MS = 10 * 60_000;

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

/* -----------------------------
   Helpers
   ----------------------------- */
async function assertSetupOwnedByUser(setupId, userId) {
    const { data, error } = await supabase
        .from(SETUP_TABLE)
        .select("id,user_id")
        .eq("id", setupId)
        .single();

    if (error || !data) return false;
    return String(data.user_id) === String(userId);
}

function mapDisplay(item, tableName) {
    const manufacturer = item.Manufacturer || item.manufacturer || item.brand || item.Brand || "";
    const model = item.Model || item.model || item.product_model || item.type || "";
    const name = item.product_name || item.setup_name || item.name || item.Name || item.title || "";

    const isNetwork = tableName === "router[Setup]" || tableName === "switches[Setup]" || tableName === "modem[Setup]";
    return {
        ...item,
        category: tableName,
        isNetwork,
        display_name:
            manufacturer && model
                ? `${manufacturer} ${model}`
                : manufacturer && name
                    ? `${manufacturer} ${name}`
                    : model
                        ? model
                        : name
                            ? name
                            : `Ismeretlen termék (#${item.id ?? "?"})`,
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

/* =========================================================
   SETUP LISTA
   - ✅ query param: ?favorite=true/false (ha nincs -> mind)
   ========================================================= */
exports.list = async (req, res) => {
    try {
        const userId = req.user.id;

        const favoriteParam = req.query?.favorite;
        const hasFav = favoriteParam === "true" || favoriteParam === "false";
        const favBool = favoriteParam === "true";

        let q = supabase.from(SETUP_TABLE).select("*").eq("user_id", userId);
        if (hasFav) q = q.eq("isFavorite", favBool);

        const { data, error } = await q;
        if (error) throw error;

        const normalized = (data || []).map((s) => ({
            ...s,
            setup_name: s.setup_name ?? s.name ?? "Névtelen setup",
        }));

        res.json({ setups: normalized });
    } catch (err) {
        console.error("❌ Setup list hiba:", err);
        res.json({ setups: [] });
    }
};

/* =========================================================
   SETUP GYEREKEK
   ========================================================= */
exports.children = async (req, res) => {
    const setupId = req.params.id;
    if (!setupId) return res.json([]);

    const cached = cacheGet(childrenCache, setupId);
    if (cached) return res.json(cached);

    try {
        let allItems = [];

        const PER_TABLE_LIMIT = 200;
        const TOTAL_CAP = 1500;
        const CONCURRENCY = 4;

        await runWithConcurrency(tablesToScan, CONCURRENCY, async (tableName) => {
            if (allItems.length >= TOTAL_CAP) return;

            // ✅ biztosan nincs setup_id -> skip (nem lesz error)
            if (NO_SETUPID_TABLES.has(tableName)) return;

            const { data, error } = await supabase.from(tableName).select("*").eq("setup_id", setupId).limit(PER_TABLE_LIMIT);

            if (error) {
                const msg = String(error.message || "");

                // ✅ ha mégis belefutunk: azonnal blacklist
                if (msg.includes("setup_id") && msg.includes("does not exist")) {
                    NO_SETUPID_TABLES.add(tableName);
                    console.log(`🚫 blacklist: ${tableName} (no setup_id)`);
                    return;
                }

                console.log(`⚠️ ${tableName} skip:`, msg);
                return;
            }

            if (Array.isArray(data) && data.length > 0) {
                const mapped = data.map((item) => mapDisplay(item, tableName));
                allItems.push(...mapped);

                if (allItems.length > TOTAL_CAP) {
                    allItems = allItems.slice(0, TOTAL_CAP);
                }
            }
        });

        cacheSet(childrenCache, setupId, allItems, CHILDREN_TTL_MS);
        return res.json(allItems);
    } catch (err) {
        console.error("❌ children fatal:", err);
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
        const { setup_name } = req.body;

        if (!setupId) return res.status(400).json({ error: "Missing setup id" });

        const name = (setup_name || "").trim();
        if (!name) return res.status(400).json({ error: "setup_name is required" });

        const { data, error } = await supabase
            .from(SETUP_TABLE)
            .update({ setup_name: name })
            .eq("id", setupId)
            .eq("user_id", userId)
            .select("*")
            .single();

        if (error) throw error;

        childrenCache.delete(setupId);

        res.json({ setup: { ...data, setup_name: data.setup_name ?? name } });
    } catch (err) {
        console.error("❌ Setup update hiba:", err);
        res.status(500).json({ error: "Update failed" });
    }
};

exports.create = async (req, res) => {
    try {
        const userId = req.user?.id ?? req.user?.user_id ?? req.userId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const setup_name = (req.body?.setup_name || "").trim();
        if (!setup_name) return res.status(400).json({ error: "setup_name required" });

        const { data, error } = await supabase.from(SETUP_TABLE).insert([{ setup_name, user_id: userId }]).select("*").single();

        if (error) {
            console.error("❌ Supabase insert error:", error);
            return res.status(500).json({
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
            });
        }

        return res.json({ setup: data });
    } catch (err) {
        console.error("❌ create setup error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

exports.remove = async (req, res) => {
    try {
        const userId = req.user?.id;
        const setupId = req.params.id;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (!setupId) return res.status(400).json({ error: "Missing setup id" });

        const { data, error } = await supabase.from(SETUP_TABLE).delete().eq("id", setupId).eq("user_id", userId).select("*").single();

        if (error) {
            console.error("❌ Supabase delete error:", error);
            return res.status(500).json({
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
            });
        }

        childrenCache.delete(setupId);

        return res.json({ ok: true, deleted: data });
    } catch (err) {
        console.error("❌ Setup delete hiba:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/* =========================================================
   PC BUILDER
   ========================================================= */

// GET /api/setup/:id/pcbuilds
exports.pcBuildsList = async (req, res) => {
    try {
        const userId = req.user.id;
        const setupId = req.params.id;

        const ok = await assertSetupOwnedByUser(setupId, userId);
        if (!ok) return res.status(403).json({ pcs: [] });

        const { data, error } = await supabase
            .from(PC_BUILDS_TABLE)
            .select("*")
            .eq("setup_id", setupId)
            .order("id", { ascending: false })
            .limit(200);

        if (error) throw error;

        const pcs = (data || []).map((r) => ({
            ...r,
            setup_name: r.setup_name ?? r.pc_name ?? r.name ?? "Névtelen PC",
        }));

        return res.json({ pcs });
    } catch (err) {
        console.error("❌ pcBuildsList hiba:", err);
        return res.status(500).json({ pcs: [] });
    }
};

// POST /api/setup/:id/pcbuilds
exports.pcBuildsCreate = async (req, res) => {
    try {
        const userId = req.user.id;
        const setupId = req.params.id;

        const ok = await assertSetupOwnedByUser(setupId, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const pc_name = (req.body?.pc_name || "").trim();
        if (!pc_name) return res.status(400).json({ error: "pc_name required" });

        const payload = {
            setup_id: setupId,
            setup_name: pc_name,
            setup_type: "pc",
            processor_id: null,
            videocard_id: null,
            motherboard_id: null,
            ram_id: null,
            psu_id: null,
        };

        const { data, error } = await supabase.from(PC_BUILDS_TABLE).insert([payload]).select("*").single();
        if (error) throw error;

        return res.json({ pc: data });
    } catch (err) {
        console.error("❌ pcBuildsCreate hiba:", err);
        return res.status(500).json({ error: "Create failed" });
    }
};

// PATCH /api/setup/pcbuilds/:pcId
exports.pcBuildsUpdate = async (req, res) => {
    try {
        const userId = req.user.id;
        const pcId = req.params.pcId;

        if (!pcId) return res.status(400).json({ error: "Missing pcId" });

        const { data: pcRow, error: pcErr } = await supabase.from(PC_BUILDS_TABLE).select("id,setup_id").eq("id", pcId).single();
        if (pcErr || !pcRow) return res.status(404).json({ error: "PC not found" });

        const ok = await assertSetupOwnedByUser(pcRow.setup_id, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const payload = {
            processor_id: req.body?.processor_id ?? null,
            videocard_id: req.body?.videocard_id ?? null,
            motherboard_id: req.body?.motherboard_id ?? null,
            ram_id: req.body?.ram_id ?? null,
            psu_id: req.body?.psu_id ?? null,
        };

        const { data, error } = await supabase.from(PC_BUILDS_TABLE).update(payload).eq("id", pcId).select("*").single();
        if (error) throw error;

        return res.json({ pc: data });
    } catch (err) {
        console.error("❌ pcBuildsUpdate hiba:", err);
        return res.status(500).json({ error: "Update failed" });
    }
};

// GET /api/setup/:id/pcparts
exports.pcParts = async (req, res) => {
    try {
        const cacheKey = "pcparts:v1";
        const cached = cacheGet(pcPartsCache, cacheKey);
        if (cached) return res.json({ parts: cached });

        const safeSelect = async (table, select) => {
            const { data, error } = await supabase.from(table).select(select);
            if (error) return [];
            return Array.isArray(data) ? data : [];
        };

        const toStr = (v) => (v === null || v === undefined ? "" : String(v).trim());
        const parts = [];

        const cpus = await safeSelect("processors", "ID, manufacturer, Model");
        for (const r of cpus) {
            const id = r.ID ?? r.id;
            if (id == null) continue;
            const manufacturer = toStr(r.manufacturer);
            const model = toStr(r.Model ?? r.model);
            parts.push({
                id: Number(id),
                slot: "cpu",
                source_table: "processors",
                display_name: manufacturer && model ? `${manufacturer} ${model}` : model || manufacturer || `CPU #${id}`,
            });
        }

        const gpus = await safeSelect("video_cards", "ID, manufacturer, model, series, variant");
        for (const r of gpus) {
            const id = r.ID ?? r.id;
            if (id == null) continue;
            const manufacturer = toStr(r.manufacturer);
            const main = toStr(r.model) || toStr(r.series) || toStr(r.variant);
            parts.push({
                id: Number(id),
                slot: "gpu",
                source_table: "video_cards",
                display_name: manufacturer && main ? `${manufacturer} ${main}` : main || manufacturer || `GPU #${id}`,
            });
        }

        const mobs = await safeSelect("motherboard", "ID, manufacturer, Model");
        for (const r of mobs) {
            const id = r.ID ?? r.id;
            if (id == null) continue;
            const manufacturer = toStr(r.manufacturer);
            const model = toStr(r.Model ?? r.model);
            parts.push({
                id: Number(id),
                slot: "motherboard",
                source_table: "motherboard",
                display_name: manufacturer && model ? `${manufacturer} ${model}` : model || manufacturer || `Motherboard #${id}`,
            });
        }

        const rams = await safeSelect("ram", "ID, manufacturer, model, capacity_gb, sticks, speed_mhz");
        for (const r of rams) {
            const id = r.ID ?? r.id;
            if (id == null) continue;
            const manufacturer = toStr(r.manufacturer);
            const model = toStr(r.model);
            const cap = r.capacity_gb != null ? `${r.capacity_gb}GB` : "";
            const sticks = r.sticks != null ? `${r.sticks}x` : "";
            const speed = r.speed_mhz != null ? `${r.speed_mhz}MHz` : "";
            const extra = [sticks && cap ? `${sticks}${cap}` : cap, speed].filter(Boolean).join(" ");
            const base = manufacturer && model ? `${manufacturer} ${model}` : model || manufacturer;

            parts.push({
                id: Number(id),
                slot: "ram",
                source_table: "ram",
                display_name: base && extra ? `${base} (${extra})` : base || (extra ? `RAM (${extra})` : `RAM #${id}`),
            });
        }

        const psus = await safeSelect("psu", "ID, manufacturer, model, wattage, efficiency");
        for (const r of psus) {
            const id = r.ID ?? r.id;
            if (id == null) continue;
            const manufacturer = toStr(r.manufacturer);
            const model = toStr(r.model);
            const watt = r.wattage != null ? `${r.wattage}W` : "";
            const eff = toStr(r.efficiency);
            const extra = [watt, eff].filter(Boolean).join(" ");
            const base = manufacturer && model ? `${manufacturer} ${model}` : model || manufacturer;

            parts.push({
                id: Number(id),
                slot: "psu",
                source_table: "psu",
                display_name: base && extra ? `${base} (${extra})` : base || (extra ? `PSU (${extra})` : `PSU #${id}`),
            });
        }

        const order = { cpu: 1, gpu: 2, motherboard: 3, ram: 4, psu: 5, other: 9 };
        parts.sort((a, b) => (order[a.slot] ?? 99) - (order[b.slot] ?? 99));

        cacheSet(pcPartsCache, cacheKey, parts, PCPARTS_TTL_MS);
        return res.json({ parts });
    } catch (err) {
        console.error("❌ pcParts hiba:", err);
        return res.json({ parts: [] });
    }
};

/* =========================================================
   ✅ CARS (dropdown + hozzáadás mint PC, de 1 dropdown)
   ========================================================= */

const CAR_SOURCES = [
    { table: "cabrio_cars", fk: "cabrio_id" },
    { table: "coupe_cars", fk: "coupe_id" },
    { table: "crossover_cars", fk: "crossover_id" },
    { table: "hatchback_cars", fk: "hatchback_id" },
    { table: "mpv_cars", fk: "mpv_id" },
    { table: "pickup_cars", fk: "pickup_id" },
    { table: "wagon_cars", fk: "wagon_id" },
];

// GET /api/setup/car-options
exports.carOptions = async (req, res) => {
    try {
        const cacheKey = "car-options:v1";
        const cached = cacheGet(carOptionsCache, cacheKey);
        if (cached) return res.json({ cars: cached });

        const safeSelect = async (table, select) => {
            const { data, error } = await supabase.from(table).select(select).limit(5000);
            if (error) return [];
            return Array.isArray(data) ? data : [];
        };

        const toStr = (v) => (v === null || v === undefined ? "" : String(v).trim());

        const cars = [];
        for (const src of CAR_SOURCES) {
            const rows = await safeSelect(src.table, "ID, Manufacturer, Model");
            for (const r of rows) {
                const id = r.ID ?? r.id;
                if (id == null) continue;

                const manufacturer = toStr(r.Manufacturer ?? r.manufacturer);
                const model = toStr(r.Model ?? r.model);
                const display_name = [manufacturer, model].filter(Boolean).join(" ").trim() || `${src.table} #${id}`;

                cars.push({
                    id: Number(id),
                    source_table: src.table,
                    fk_column: src.fk,
                    Manufacturer: manufacturer,
                    Model: model,
                    display_name,
                });
            }
        }

        cars.sort((a, b) => a.display_name.localeCompare(b.display_name, "hu"));

        cacheSet(carOptionsCache, cacheKey, cars, CAROPTIONS_TTL_MS);
        return res.json({ cars });
    } catch (err) {
        console.error("❌ carOptions hiba:", err);
        return res.json({ cars: [] });
    }
};

// GET /api/setup/:id/cars  -> Car_setup[Setup] rows
exports.carsList = async (req, res) => {
    try {
        const userId = req.user.id;
        const setupId = req.params.id;

        const ok = await assertSetupOwnedByUser(setupId, userId);
        if (!ok) return res.status(403).json({ cars: [] });

        const { data, error } = await supabase
            .from(CAR_SETUP_TABLE)
            .select("*")
            .eq("setup_id", setupId)
            .order("id", { ascending: false })
            .limit(300);

        if (error) throw error;

        const cars = (data || []).map((r) => ({
            ...r,
            setup_name: r.setup_name ?? r.name ?? "Névtelen autó",
        }));

        return res.json({ cars });
    } catch (err) {
        console.error("❌ carsList hiba:", err);
        return res.status(500).json({ cars: [] });
    }
};

// POST /api/setup/:id/cars  body: { source_table, car_id }
exports.carsAdd = async (req, res) => {
    try {
        const userId = req.user.id;
        const setupId = req.params.id;

        const ok = await assertSetupOwnedByUser(setupId, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const source_table = String(req.body?.source_table || "").trim();
        const car_id_raw = req.body?.car_id;
        const car_id = car_id_raw == null ? null : Number(car_id_raw);

        if (!source_table || !car_id || Number.isNaN(car_id)) {
            return res.status(400).json({ error: "source_table és car_id kötelező" });
        }

        const src = CAR_SOURCES.find((s) => s.table === source_table);
        if (!src) return res.status(400).json({ error: "Ismeretlen car source_table" });

        // megpróbáljuk lekérni a nevet a setup_name mezőhöz
        const { data: carRow } = await supabase.from(source_table).select("ID, Manufacturer, Model").eq("ID", car_id).single();

        const manufacturer = (carRow?.Manufacturer ?? "").toString().trim();
        const model = (carRow?.Model ?? "").toString().trim();
        const setup_name = [manufacturer, model].filter(Boolean).join(" ").trim() || `Car #${car_id}`;

        const payload = {
            setup_id: setupId,
            setup_name,
            cabrio_id: null,
            hatchback_id: null,
            coupe_id: null,
            wagon_id: null,
            mpv_id: null,
            crossover_id: null,
            pickup_id: null,
            [src.fk]: car_id,
        };

        const { data, error } = await supabase.from(CAR_SETUP_TABLE).insert([payload]).select("*").single();
        if (error) throw error;

        // children cache invalidálás (ha detail view-ben vagy)
        childrenCache.delete(setupId);

        return res.json({ car: data });
    } catch (err) {
        console.error("❌ carsAdd hiba:", err);
        return res.status(500).json({ error: "Create failed" });
    }
};

/* =========================================================
   ✅ CONNECTIONS (Network device links)
   ========================================================= */
const connectionTables = [
    "connects_modem_audiop_utp[Connects]",
    "connects_modem_ht_utp[Connects]",
    "connects_modem_modem_utp[Connects]",
    "connects_modem_pc_utp[Connects]",
    "connects_modem_router_utp[Connects]",
    "connects_modem_switch_utp[Connects]",
    "connects_router_audiop_utp[Connects]",
    "connects_router_ht_utp[Connects]",
    "connects_router_pc_utp[Connects]",
    "connects_router_router_utp[Connects]",
    "connects_router_switch_utp[Connects]",
    "connects_switch_audiop_utp[Connects]",
    "connects_switch_ht_utp[Connects]",
    "connects_switch_mixer_utp[Connects]",
    "connects_switch_pc_utp[Connects]",
    "connects_switch_switch_utp[Connects]",
];

const catMap = {
    "audio_processor": "audiop",
    "home_theater_setups": "ht",
    "pc_details": "pc",
    "switches": "switch",
    "audio_processors": "audiop"
};

const colMap = {
    "ht": "home_theater",
    "audiop": "audiop",
    "pc": "pc",
    "switch": "switch",
    "router": "router",
    "modem": "modem",
    "mixer": "mixer"
};

exports.connections = async (req, res) => {
    const setupId = req.params.id;
    if (!setupId) return res.json([]);

    try {
        const children = await exports.childrenInternal(setupId);
        const deviceIdsByCategory = {};
        children.forEach(c => {
            let cat = c.category.replace("[Setup]", "").replace("[Connects]", "").toLowerCase();
            // Apply mapping
            if (catMap[cat]) cat = catMap[cat];

            if (!deviceIdsByCategory[cat]) deviceIdsByCategory[cat] = new Set();
            deviceIdsByCategory[cat].add(String(c.id));
        });

        const allConnections = [];
        const CONCURRENCY = 4;

        await runWithConcurrency(connectionTables, CONCURRENCY, async (tableName) => {
            const { data, error } = await supabase.from(tableName).select("*");
            if (error) return;

            if (Array.isArray(data)) {
                const parts = tableName.replace("[Connects]", "").split("_");
                const sourceCat = parts[1];
                const destCat = parts[2];

                // Column name overrides or defaults
                let sourceCol = (colMap[sourceCat] || sourceCat) + "_id";
                let destCol = (colMap[destCat] || destCat) + "_id";

                if (sourceCat === "modem" && destCat === "modem") {
                    sourceCol = "modem1_id";
                    destCol = "modem2_id";
                } else if (sourceCat === "router" && destCat === "router") {
                    sourceCol = "router1_id";
                    destCol = "router2_id";
                } else if (sourceCat === "switch" && destCat === "switch") {
                    sourceCol = "switch1_id";
                    destCol = "switch2_id";
                }

                data.forEach(row => {
                    const sId = row[sourceCol];
                    const dId = row[destCol];

                    if (sId == null || dId == null) return;

                    const sIn = deviceIdsByCategory[sourceCat]?.has(String(sId));
                    const dIn = deviceIdsByCategory[destCat]?.has(String(dId));

                    if (sIn && dIn) {
                        const sourceChild = children.find(c => {
                            let cCat = c.category.replace("[Setup]", "").toLowerCase();
                            return (catMap[cCat] || cCat) === sourceCat && String(c.id) === String(sId);
                        });
                        const targetChild = children.find(c => {
                            let cCat = c.category.replace("[Setup]", "").toLowerCase();
                            return (catMap[cCat] || cCat) === destCat && String(c.id) === String(dId);
                        });

                        allConnections.push({
                            id: row.id,
                            table: tableName,
                            source: {
                                category: sourceChild?.category || `${sourceCat}[Setup]`,
                                id: sId
                            },
                            target: {
                                category: targetChild?.category || `${destCat}[Setup]`,
                                id: dId
                            }
                        });
                    }
                });
            }
        });

        return res.json(allConnections);
    } catch (err) {
        console.error("❌ connections fatal:", err);
        return res.json([]);
    }
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
;