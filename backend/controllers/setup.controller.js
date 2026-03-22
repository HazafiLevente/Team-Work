const { supabase } = require("../services/supabase");

/**
 * Stabil children scan:
 * - amiben nincs setup_id, azt nem kérdezzük le (előre blacklist + auto blacklist)
 * - cache + limit + concurrency -> nem terheli túl a Supabase-t
 * - PC builder működik (pcbuilds + pcparts)
 * - ✅ Cars: car-options + cars list + cars add (Car_setup[Setup])
 * - ✅ NEW: Car_setup details (egy Car_setup sorhoz tartozó autó adatok)
 */

const SETUP_TABLE = "setup[Setup]";
const PC_BUILDS_TABLE = "pc_details[Setup]";
const CAR_SETUP_TABLE = "Car_setup[Setup]";

/* =========================================================
   ✅ FIX: előre blacklisteljük az összes eddig logolt táblát,
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
const carDetailsCache = new Map(); // carSetupId -> { exp, value }  ✅ NEW

const CHILDREN_TTL_MS = 30_000;
const PCPARTS_TTL_MS = 10 * 60_000;
const CAROPTIONS_TTL_MS = 10 * 60_000;
const CARDETAILS_TTL_MS = 30_000; // ✅ NEW (kicsi TTL, de védi a Supabase-t)

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

async function fetchItemWithSetup(tableName, itemId) {
    let query = await supabase
        .from(tableName)
        .select("*")
        .eq("id", itemId)
        .single();

    if (!query.error && query.data) {
        return { data: query.data, idColumn: "id" };
    }

    query = await supabase
        .from(tableName)
        .select("*")
        .eq("ID", itemId)
        .single();

    if (!query.error && query.data) {
        return { data: query.data, idColumn: "ID" };
    }

    return { data: null, idColumn: null };
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

        const { data: setupData, error: setupErr } = await q;
        if (setupErr) throw setupErr;

        const { data: posData } = await supabase
            .from("setup_rooms[Coordinates]")
            .select("setup_id, x, y");

        const normalized = (setupData || []).map((s) => {
            const pos = (posData || []).find(p => String(p.setup_id) === String(s.id));
            return {
                ...s,
                setup_name: s.setup_name ?? s.name ?? "Névtelen setup",
                x: pos?.x ?? null,
                y: pos?.y ?? null,
            };
        });

        res.json({ setups: normalized });
    } catch (err) {
        console.error("❌ Setup list hiba:", err);
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

        const { data: existing } = await supabase
            .from("setup_rooms[Coordinates]")
            .select("id")
            .eq("setup_id", setupId)
            .single();

        let result;
        if (existing) {
            result = await supabase
                .from("setup_rooms[Coordinates]")
                .update({ x: Number(x), y: Number(y) })
                .eq("id", existing.id);
        } else {
            result = await supabase
                .from("setup_rooms[Coordinates]")
                .insert({
                    setup_id: setupId,
                    x: Number(x),
                    y: Number(y)
                });
        }

        if (result.error) throw result.error;
        res.json({ success: true });
    } catch (err) {
        console.error("❌ upsertRoomPosition fatal:", err);
        res.status(500).json({ error: "Update failed" });
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

            const { data, error } = await supabase.from(tableName).select("*").eq("setup_id", setupId).limit(PER_TABLE_LIMIT);

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

        if (!setupId) {
            return res.status(400).json({ error: "Missing setup id" });
        }

        const updateData = {};

        if (setup_name !== undefined) {
            const trimmedName = String(setup_name || "").trim();
            updateData.setup_name = trimmedName;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "Nothing to update" });
        }

        const { data, error } = await supabase
            .from(SETUP_TABLE)
            .update(updateData)
            .eq("id", setupId)
            .eq("user_id", userId)
            .select("*")
            .single();

        if (error) {
            console.error("❌ Supabase setup update error:", error);
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
                setup_name: data.setup_name ?? data.name ?? "Névtelen setup",
            },
        });
    } catch (err) {
        console.error("❌ Setup update hiba:", err);
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

        const setup_name = (req.body?.setup_name || "").trim();
        if (!setup_name) return res.status(400).json({ error: "setup_name required" });

        const isFavorite = req.body?.isFavorite === true;
        const x = Number(req.body?.x ?? 0);
        const y = Number(req.body?.y ?? 0);

        // ✅ FONTOS: a setup[Setup] táblába csak létező oszlopokat írunk
        const insertPayload = {
            setup_name,
            user_id: userId,
            isFavorite
        };

        const { data, error } = await supabase
            .from(SETUP_TABLE)
            .insert([insertPayload])
            .select("*")
            .single();

        if (error) {
            console.error("❌ Supabase insert error:", error);
            return res.status(500).json({
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
            });
        }

        // ✅ pozíció külön táblába megy
        const { error: posErr } = await supabase
            .from("setup_rooms[Coordinates]")
            .insert([{
                setup_id: data.id,
                x,
                y
            }]);

        if (posErr) {
            console.error("⚠️ setup position insert error:", posErr);
            // a setup létrejött, ezért itt nem dobjuk el az egészet
        }

        return res.json({
            setup: {
                ...data,
                setup_name: data.setup_name ?? data.name ?? "Névtelen setup",
                x,
                y
            }
        });
    } catch (err) {
        console.error("❌ create setup error:", err);
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

        const TABLE_MAP = {
            speakers: "front_speaker[Setup]",
            receivers: "reciever_setup[Setup]",
            processors: "audio_processor[Setup]",
            subwoofers: "subwoofer[Setup]",
            televisions: "televisions[Setup]",
            projectors: "projectors[Setup]",
            routers: "router[Setup]",
            switches: "switches[Setup]",
            laptops: "laptops[Setup]",
            desktop_pcs: "pc_details[Setup]",
        };

        const targetTable = TABLE_MAP[source_table] || source_table;

        const insertPayload = {
            setup_id: setupId,
            product_id: Number(product_id),
            display_name: display_name || "Eszköz",
            manufacturer: manufacturer || "",
        };

        const { data, error } = await supabase
            .from(targetTable)
            .insert([insertPayload])
            .select("*")
            .single();

        if (error) {
            console.error("❌ addDevice insert error:", error);
            return res.status(500).json({ error: error.message });
        }

        childrenCache.delete(String(setupId));

        return res.json({ ok: true, device: { ...data, category: targetTable, display_name } });
    } catch (err) {
        console.error("❌ addDevice fatal:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

exports.remove = async (req, res) => {
    try {
        const userId = req.user?.id;
        const setupId = req.params.id;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { error: connErr } = await supabase
            .from("connections[Connects]")
            .delete()
            .or(`from_setup_id.eq.${setupId},to_setup_id.eq.${setupId}`);

        if (connErr) {
            console.error("❌ connection delete error:", connErr);
            return res.status(500).json({ error: connErr.message });
        }

        const { data, error } = await supabase
            .from(SETUP_TABLE)
            .delete()
            .eq("id", setupId)
            .eq("user_id", userId)
            .select("*");

        if (error) {
            console.error("❌ Supabase delete error:", error);
            return res.status(500).json({ error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Setup not found" });
        }

        childrenCache.delete(setupId);

        return res.json({ ok: true });
    } catch (err) {
        console.error("❌ Setup delete hiba:", err);
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

exports.pcParts = async (req, res) => {
    try {
        const cacheKey = "pcparts:v2";
        const cached = cacheGet(pcPartsCache, cacheKey);
        if (cached) return res.json({ parts: cached });

        const safeSelect = async (table) => {
            const { data, error } = await supabase.from(table).select("*");
            if (error) {
                console.error(`❌ pcParts select error in ${table}:`, error.message);
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
        console.error("❌ pcParts hiba:", err);
        return res.json({ parts: [] });
    }
};

/* =========================================================
   ✅ CARS
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

        childrenCache.delete(setupId);

        return res.json({ car: data });
    } catch (err) {
        console.error("❌ carsAdd hiba:", err);
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
            .from(CAR_SETUP_TABLE)
            .select("*")
            .eq("id", carSetupId)
            .single();

        if (csErr || !carSetupRow) {
            return res.status(404).json({ error: "Car setup row not found" });
        }

        const ok = await assertSetupOwnedByUser(carSetupRow.setup_id, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const link = pickFirstCarLink(carSetupRow);

        const base = {
            car_setup_id: Number(carSetupId),
            setup_id: Number(carSetupRow.setup_id),
            setup_name: carSetupRow.setup_name ?? "Autó",
            source_table: link?.table ?? null,
            car_id: link?.id ?? null,
            fields: {
                "Manufacturer": "—",
                "Model": "—",
                "Price": "—",
                "Body Type": "—",
                "Horsepower": "—",
                "Acceleration (s)": "—",
                "Seats": "—",
                "Fuel Type": "—",
                "Year": "—",
                "Transmission": "—",
                "category": "—",
            }
        };

        if (!link) {
            cacheSet(carDetailsCache, String(carSetupId), base, CARDETAILS_TTL_MS);
            return res.json(base);
        }

        const { data: carRow, error: carErr } = await supabase
            .from(link.table)
            .select("*")
            .eq("ID", link.id)
            .single();

        if (carErr || !carRow) {
            cacheSet(carDetailsCache, String(carSetupId), base, CARDETAILS_TTL_MS);
            return res.json(base);
        }

        const manufacturer = pick(carRow, ["Manufacturer", "manufacturer", "Brand", "brand"]) ?? "—";
        const model = pick(carRow, ["Model", "model"]) ?? "—";
        const price = pick(carRow, ["Price", "price"]) ?? "—";
        const bodyType = pick(carRow, ["Body Type", "BodyType", "body_type", "bodyType"]) ?? "—";
        const hp = pick(carRow, ["Horsepower", "horsepower", "HP", "hp"]) ?? "—";
        const acc = pick(carRow, ["Acceleration (s)", "Acceleration", "acceleration", "acceleration_s"]) ?? "—";
        const seats = pick(carRow, ["Seats", "seats"]) ?? "—";
        const fuel = pick(carRow, ["Fuel Type", "FuelType", "fuel_type", "fuelType"]) ?? "—";
        const year = pick(carRow, ["Year", "year"]) ?? "—";
        const trans = pick(carRow, ["Transmission", "transmission"]) ?? "—";
        const category = pick(carRow, ["category", "Category"]) ?? "—";

        const response = {
            ...base,
            setup_name: (String(manufacturer).trim() || "—") + " " + (String(model).trim() || "—"),
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
                "category": category,
            }
        };

        cacheSet(carDetailsCache, String(carSetupId), response, CARDETAILS_TTL_MS);
        return res.json(response);
    } catch (err) {
        console.error("❌ carSetupDetails hiba:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/* =========================================================
   ✅ CONNECTIONS
   ========================================================= */
const typeToTableMap = {
    "pc": "pc_details[Setup]",
    "switch": "switches[Setup]",
    "router": "router[Setup]",
    "modem": "modem[Setup]",
    "ht": "home_theater_setups[Setup]",
    "audiop": "audio_processor[Setup]",
    "mixer": "mixer[Setup]"
};

exports.connections = async (req, res) => {
    const setupId = req.params.id;
    const userId = req.user.id;

    if (!setupId) return res.json([]);

    try {
        const ok = await assertSetupOwnedByUser(setupId, userId);
        if (!ok) return res.json([]);

        const { data: rawConns, error: connErr } = await supabase
            .from("connections[Connects]")
            .select(`
                *,
                from_setup:from_setup_id(setup_name),
                to_setup:to_setup_id(setup_name)
            `)
            .or(`from_setup_id.eq.${setupId},to_setup_id.eq.${setupId}`);

        if (connErr) throw connErr;
        if (!rawConns || rawConns.length === 0) return res.json([]);

        const allConnections = rawConns.map(row => {
            const sourceTable = typeToTableMap[row.from_device_type] || `${row.from_device_type}[Setup]`;
            const targetTable = typeToTableMap[row.to_device_type] || `${row.to_device_type}[Setup]`;
            const crossSetup = String(row.from_setup_id) !== String(row.to_setup_id);

            return {
                id: row.id,
                source: { category: sourceTable, id: row.from_device_id },
                target: { category: targetTable, id: row.to_device_id },
                crossSetup,
                from_setup_id: row.from_setup_id,
                to_setup_id: row.to_setup_id,
                from_setup: row.from_setup,
                to_setup: row.to_setup
            };
        });

        return res.json(allConnections);
    } catch (err) {
        console.error("❌ connections fatal:", err);
        return res.json([]);
    }
};

exports.connectionsCreate = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            from_setup_id,
            to_setup_id,
            from_device_type,
            from_device_id,
            to_device_type,
            to_device_id,
            utp_id
        } = req.body;

        const okFrom = await assertSetupOwnedByUser(from_setup_id, userId);
        const okTo = await assertSetupOwnedByUser(to_setup_id, userId);

        if (!okFrom || !okTo) {
            return res.status(403).json({ error: "Forbidden: You don't own one of these setups" });
        }

        const payload = {
            from_setup_id,
            to_setup_id,
            from_device_type,
            from_device_id,
            to_device_type,
            to_device_id,
            utp_id: utp_id || 1
        };

        const { data, error } = await supabase
            .from("connections[Connects]")
            .insert([payload])
            .select("*")
            .single();

        if (error) throw error;

        childrenCache.delete(String(from_setup_id));
        if (from_setup_id !== to_setup_id) {
            childrenCache.delete(String(to_setup_id));
        }

        res.json({ success: true, connection: data });
    } catch (err) {
        console.error("❌ connectionsCreate fatal:", err);
        res.status(500).json({ error: "Failed to create connection" });
    }
};

exports.connectionsRemove = async (req, res) => {
    try {
        const userId = req.user.id;
        const connId = req.params.id;

        const { data: conn, error: findErr } = await supabase
            .from("connections[Connects]")
            .select("from_setup_id")
            .eq("id", connId)
            .single();

        if (findErr || !conn) return res.status(404).json({ error: "Connection not found" });

        const ok = await assertSetupOwnedByUser(conn.from_setup_id, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const { error: delErr } = await supabase
            .from("connections[Connects]")
            .delete()
            .eq("id", connId);

        if (delErr) throw delErr;

        childrenCache.delete(String(conn.from_setup_id));

        res.json({ success: true });
    } catch (err) {
        console.error("❌ connectionsRemove fatal:", err);
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
            console.error("❌ renameItem update error:", error);
            return res.status(500).json({ error: "Rename failed", details: error.message });
        }

        childrenCache.delete(String(item.setup_id));

        return res.json({
            success: true,
            item: mapDisplay(data, tableName)
        });
    } catch (err) {
        console.error("❌ renameItem fatal:", err);
        return res.status(500).json({ error: "Rename failed" });
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

        childrenCache.delete(String(item.setup_id));

        res.json({ success: true });
    } catch (err) {
        console.error("❌ removeItem fatal:", err);
        res.status(500).json({ error: "Failed to remove item" });
    }
};

exports.allConnections = async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: setups, error: setupErr } = await supabase
            .from(SETUP_TABLE)
            .select("id")
            .eq("user_id", userId);

        if (setupErr || !setups) throw setupErr;
        const setupIds = setups.map(s => s.id);
        if (setupIds.length === 0) return res.json([]);

        const { data: rawConns, error: connErr } = await supabase
            .from("connections[Connects]")
            .select(`
                *,
                from_setup:from_setup_id(setup_name),
                to_setup:to_setup_id(setup_name)
            `)
            .or(`from_setup_id.in.(${setupIds.join(",")}),to_setup_id.in.(${setupIds.join(",")})`);

        if (connErr) throw connErr;

        const allConnections = (rawConns || []).map(row => {
            const sourceTable = typeToTableMap[row.from_device_type] || `${row.from_device_type}[Setup]`;
            const targetTable = typeToTableMap[row.to_device_type] || `${row.to_device_type}[Setup]`;
            const crossSetup = String(row.from_setup_id) !== String(row.to_setup_id);

            return {
                id: row.id,
                source: { category: sourceTable, id: row.from_device_id },
                target: { category: targetTable, id: row.to_device_id },
                crossSetup,
                from_setup_id: row.from_setup_id,
                to_setup_id: row.to_setup_id,
                from_setup: row.from_setup,
                to_setup: row.to_setup
            };
        });

        res.json(allConnections);
    } catch (err) {
        console.error("❌ allConnections fatal:", err);
        res.json([]);
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

exports.deviceConnections = async (req, res) => {
    try {
        const { deviceId, deviceType } = req.query;

        if (!deviceId || !deviceType) {
            return res.json([]);
        }

        const { data, error } = await supabase
            .from("connections[Connects]")
            .select(`
                *,
                from_setup:from_setup_id(setup_name),
                to_setup:to_setup_id(setup_name)
            `)
            .or(
                `and(from_device_type.eq.${deviceType},from_device_id.eq.${deviceId}),` +
                `and(to_device_type.eq.${deviceType},to_device_id.eq.${deviceId})`
            );

        if (error) throw error;

        return res.json(data || []);
    } catch (err) {
        console.error("❌ deviceConnections fatal:", err);
        return res.json([]);
    }
};