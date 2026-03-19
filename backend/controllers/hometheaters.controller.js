const { supabase } = require("../services/supabase");

/**
 * hometheaters.controller.js
 * 
 * Handles all Home Theater related operations including gear catalog,
 * setup builds, devices, and connections.
 */

/* =========================================================
   CATALOG & GEAR
   ========================================================= */

/**
 * Returns the full Home Theater product catalog grouped by equipment type.
 */
exports.getHtCatalog = async (req, res) => {
    try {
        const GEAR_TABLES = [
            { key: "receivers", table: "home_theater" },
            { key: "frontSpeakers", table: "front_speaker" },
            { key: "backSpeakers", table: "back_speaker" },
            { key: "sideSpeakers", table: "side_speaker" },
            { key: "ceilingSpeakers", table: "ceiling_speakers" },
            { key: "floorSpeakers", table: "floor_speakers" },
            { key: "centerSpeakers", table: "center_speakers" },
            { key: "subwoofers", table: "subwoofer" },
            { key: "audioProcessors", table: "audio_processors" },
            { key: "bassAmplifiers", table: "bass_amplifier" }
        ];

        const normalize = (row) => ({
            ...row,
            manufacturer: row.manufacturer ?? row.Manufacturer ?? row.brand ?? "",
            model: row.model ?? row.Model ?? row.product_model ?? ""
        });

        const catalog = {};
        for (const entry of GEAR_TABLES) {
            const { data, error } = await supabase.from(entry.table).select("*");
            if (error) {
                console.error(`Error fetching ${entry.table}:`, error.message);
                catalog[entry.key] = [];
            } else {
                catalog[entry.key] = (data || []).map(normalize);
            }
        }

        res.json(catalog);
    } catch (err) {
        console.error("FATAL: getHtCatalog", err);
        res.status(500).json({ error: "Failed to fetch catalog" });
    }
};

/* =========================================================
   BUILD MANAGEMENT (The HT Layout itself)
   ========================================================= */

/**
 * Fetches all HT builds associated with a specific room (setup_id).
 */
exports.listBuildsForSetup = async (req, res) => {
    try {
        const { setupId } = req.params;
        const userId = req.user.id;

        if (!await assertSetupOwnedByUser(setupId, userId)) {
            return res.status(403).json({ error: "Access denied" });
        }

        const { data, error } = await supabase
            .from("home_theater_setups[Setup]")
            .select("*")
            .eq("setup_id", setupId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error("ERROR: listBuildsForSetup", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Fetches a single build by its unique primary ID.
 */
exports.getBuildById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { data: build, error } = await supabase
            .from("home_theater_setups[Setup]")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !build) return res.status(404).json({ error: "Build not found" });

        if (!await assertSetupOwnedByUser(build.setup_id, userId)) {
            return res.status(403).json({ error: "Access denied" });
        }

        res.json(build);
    } catch (err) {
        console.error("ERROR: getBuildById", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Creates or updates an HT build.
 * [IMPORTANT] Requires unique setup_id constraint to be removed in DB for multiple builds per room.
 */
exports.saveBuild = async (req, res) => {
    try {
        const { id, setup_id, layout, title, devices } = req.body;
        const userId = req.user.id;

        if (!await assertSetupOwnedByUser(setup_id, userId)) {
            return res.status(403).json({ error: "Access denied" });
        }

        let build;
        const buildData = {
            setup_id,
            layout: typeof layout === 'string' ? layout : JSON.stringify(layout),
            setup_name: title || "Házimozi"
        };

        if (id) {
            // Update existing
            const { data, error } = await supabase
                .from("home_theater_setups[Setup]")
                .update(buildData)
                .eq("id", id)
                .select()
                .single();
            if (error) throw error;
            build = data;
        } else {
            // Insert new
            const { data, error } = await supabase
                .from("home_theater_setups[Setup]")
                .insert([buildData])
                .select()
                .single();
            if (error) throw error;
            build = data;
        }

        // Sync local devices
        await syncDevices(build.id, devices);

        res.json(build);
    } catch (err) {
        console.error("ERROR: saveBuild", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Deletes a build and its associated device links.
 */
exports.deleteBuild = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { data: build } = await supabase
            .from("home_theater_setups[Setup]")
            .select("setup_id")
            .eq("id", id)
            .single();

        if (!build || !await assertSetupOwnedByUser(build.setup_id, userId)) {
            return res.status(403).json({ error: "Access denied" });
        }

        // 1. Delete devices
        await supabase.from("home_theater_devices[Setup]").delete().eq("home_setup_id", id);
        // 2. Delete build
        const { error } = await supabase.from("home_theater_setups[Setup]").delete().eq("id", id);
        
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error("ERROR: deleteBuild", err);
        res.status(500).json({ error: "Deletion failed" });
    }
};

/* =========================================================
   INTERNAL HELPERS
   ========================================================= */

async function assertSetupOwnedByUser(setupId, userId) {
    const { data, error } = await supabase
        .from("setup[Setup]")
        .select("user_id")
        .eq("id", setupId)
        .single();
    if (error || !data) return false;
    return String(data.user_id) === String(userId);
}

async function syncDevices(buildId, devices) {
    // 1. Clear old links
    await supabase.from("home_theater_devices[Setup]").delete().eq("home_setup_id", buildId);

    // 2. Insert new ones
    const deviceEntries = Object.entries(devices || {}).filter(([_, val]) => val);
    if (deviceEntries.length > 0) {
        const inserts = deviceEntries.map(([type, refId]) => ({
            home_setup_id: buildId,
            device_type: type,
            device_ref_id: refId
        }));
        const { error } = await supabase.from("home_theater_devices[Setup]").insert(inserts);
        if (error) console.error("Error syncing devices:", error.message);
    }
}

// Map for backward compatibility if routes still use old names
exports.saveHtBuild = exports.saveBuild;
exports.getHtBuild = async (req, res) => {
    // Legacy support: returns latest build for a setupId
    const { setupId } = req.params;
    const userId = req.user.id;
    if (!await assertSetupOwnedByUser(setupId, userId)) return res.status(403).json({ error: "Access denied" });
    
    const { data } = await supabase.from("home_theater_setups[Setup]").select("*").eq("setup_id", setupId).order("created_at", { ascending: false });
    res.json(data?.[0] || { setup_id: setupId, layout: "[]", setup_name: "Új Házimozi" });
};
exports.updateHtBuild = (req, res) => { req.params.id = req.body.id; return exports.saveBuild(req, res); };
exports.deleteHtBuild = exports.deleteBuild;
exports.getHtBuildById = exports.getBuildById;
exports.list = async (req, res) => {
    const { data, error } = await supabase.from("ht_items_view").select("*");
    if (error) return res.status(500).json({ error: error.message });
    res.json({ items: data || [] });
};
exports.listDevices = async (req, res) => { /* Dummy */ res.json([]); };
exports.createDevice = async (req, res) => { /* Dummy */ res.json({}); };
exports.listConnections = async (req, res) => { /* Dummy */ res.json([]); };
exports.createConnection = async (req, res) => { /* Dummy */ res.json({}); };
exports.deleteConnection = async (req, res) => { /* Dummy */ res.json({ success: true }); };
exports.saveHtConfig = async (req, res) => { /* Dummy */ res.json({ success: true }); };