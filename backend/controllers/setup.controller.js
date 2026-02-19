const { supabase } = require("../services/supabase");

/**
 * Stabil children scan:
 * - amiben nincs setup_id, azt nem kérdezzük le (előre blacklist + auto blacklist)
 * - cache + limit + concurrency -> nem terheli túl a Supabase-t
 * - PC builder működik (pcbuilds + pcparts)
 */

const SETUP_TABLE = "setup[Setup]";
const PC_BUILDS_TABLE = "pc_details[Setup]";

/* =========================================================
   ✅ NO setup_id tables (blacklist)
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
    "brass_instruments[Setup]"
]);

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
    "woodwind_instruments[Setup]"
];

/* -----------------------------
   In-memory cache
   ----------------------------- */
const childrenCache = new Map(); // setupId -> { exp, value }
const pcPartsCache = new Map();  // global -> { exp, value }

const CHILDREN_TTL_MS = 30_000;
const PCPARTS_TTL_MS = 10 * 60_000;

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
    const manufacturer =
        item.Manufacturer ||
        item.manufacturer ||
        item.brand ||
        item.Brand ||
        "";

    const model =
        item.Model ||
        item.model ||
        item.product_model ||
        item.type ||
        "";

    const name =
        item.product_name ||
        item.setup_name ||
        item.name ||
        item.Name ||
        item.title ||
        "";

    return {
        ...item,
        category: tableName,
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
        manufacturer
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
   ✅ SETUP LISTA
   GET /api/setup
   - default: isFavorite = false (MySetups)
   - /api/setup?favorite=true -> isFavorite = true (Favorite)
   ========================================================= */
exports.list = async (req, res) => {
    try {
        const userId = req.user.id;

        const favoriteParam = String(req.query.favorite ?? "").toLowerCase();
        const wantFavorite =
            favoriteParam === "true" || favoriteParam === "1" || favoriteParam === "yes";

        // MySetups = NOT favorite, Favorite = favorite
        const { data, error } = await supabase
            .from(SETUP_TABLE)
            .select("*")
            .eq("user_id", userId)
            .eq("isFavorite", wantFavorite);

        if (error) throw error;

        const normalized = (data || []).map((s) => ({
            ...s,
            setup_name: s.setup_name ?? s.name ?? "Névtelen setup",
            isFavorite: !!s.isFavorite,
            isNetwork: !!s.isNetwork
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

            if (NO_SETUPID_TABLES.has(tableName)) return;

            const { data, error } = await supabase
                .from(tableName)
                .select("*")
                .eq("setup_id", setupId)
                .limit(PER_TABLE_LIMIT);

            if (error) {
                const msg = String(error.message || "");

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

        // ⬇️ új mezők: isFavorite + isNetwork
        const isFavorite = !!req.body?.isFavorite;
        const isNetwork = !!req.body?.isNetwork;

        const { data, error } = await supabase
            .from(SETUP_TABLE)
            .insert([{ setup_name, user_id: userId, isFavorite, isNetwork }])
            .select("*")
            .single();

        if (error) {
            console.error("❌ Supabase insert error:", error);
            return res.status(500).json({
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
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

        const { data, error } = await supabase
            .from(SETUP_TABLE)
            .delete()
            .eq("id", setupId)
            .eq("user_id", userId)
            .select("*")
            .single();

        if (error) {
            console.error("❌ Supabase delete error:", error);
            return res.status(500).json({
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
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
            setup_name: r.setup_name ?? r.pc_name ?? r.name ?? "Névtelen PC"
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
            psu_id: null
        };

        const { data, error } = await supabase
            .from(PC_BUILDS_TABLE)
            .insert([payload])
            .select("*")
            .single();

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

        const { data: pcRow, error: pcErr } = await supabase
            .from(PC_BUILDS_TABLE)
            .select("id,setup_id")
            .eq("id", pcId)
            .single();

        if (pcErr || !pcRow) return res.status(404).json({ error: "PC not found" });

        const ok = await assertSetupOwnedByUser(pcRow.setup_id, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const payload = {
            processor_id: req.body?.processor_id ?? null,
            videocard_id: req.body?.videocard_id ?? null,
            motherboard_id: req.body?.motherboard_id ?? null,
            ram_id: req.body?.ram_id ?? null,
            psu_id: req.body?.psu_id ?? null
        };

        const { data, error } = await supabase
            .from(PC_BUILDS_TABLE)
            .update(payload)
            .eq("id", pcId)
            .select("*")
            .single();

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
                display_name: manufacturer && model ? `${manufacturer} ${model}` : (model || manufacturer || `CPU #${id}`)
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
                display_name: manufacturer && main ? `${manufacturer} ${main}` : (main || manufacturer || `GPU #${id}`)
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
                display_name: manufacturer && model ? `${manufacturer} ${model}` : (model || manufacturer || `Motherboard #${id}`)
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
            const base = manufacturer && model ? `${manufacturer} ${model}` : (model || manufacturer);

            parts.push({
                id: Number(id),
                slot: "ram",
                source_table: "ram",
                display_name: base && extra ? `${base} (${extra})` : (base || (extra ? `RAM (${extra})` : `RAM #${id}`))
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
            const base = manufacturer && model ? `${manufacturer} ${model}` : (model || manufacturer);

            parts.push({
                id: Number(id),
                slot: "psu",
                source_table: "psu",
                display_name: base && extra ? `${base} (${extra})` : (base || (extra ? `PSU (${extra})` : `PSU #${id}`))
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
