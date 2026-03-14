const { supabase } = require("../services/supabase");

async function getHtCatalog(req, res) {
    try {
        function normalize(row) {
            return {
                ...row,
                manufacturer: row.manufacturer ?? row.Manufacturer ?? "",
                model: row.model ?? row.Model ?? ""


            };
        }

        // 🔥 Itt csak hozzáadsz ha új HT device típus jön
        const HT_TABLES = [
            { key: "receivers", table: "home_theater" },

            { key: "frontSpeakers", table: "front_speaker" },
            { key: "backSpeakers", table: "back_speaker" },
            { key: "sideSpeakers", table: "side_speaker" },
            { key: "ceilingSpeakers", table: "ceiling_speakers" },
            { key: "floorSpeakers", table: "floor_speakers" },
            { key: "centerSpeakers", table: "center_speakers" },

            { key: "subwoofers", table: "subwoofer" },
            { key: "audioProcessors", table: "audio_processor" },
            { key: "bassAmplifiers", table: "bass_amplifier" }
        ];

        const result = {};

        for (const entry of HT_TABLES) {

            const { data, error } = await supabase
                .from(entry.table)
                .select("*");

            if (error) {
                console.error(`HT catalog error on ${entry.table}:`, error.message);
                result[entry.key] = [];
            } else {
                result[entry.key] = (data || []).map(normalize);
            }
        }

        res.json(result);

    } catch (err) {
        console.error("HT CATALOG FATAL:", err);
        res.status(500).json({});
    }
}
/* ---------------------------------------------------
   Helper – ownership check (átvéve setup.controller-ből)
--------------------------------------------------- */
async function assertSetupOwnedByUser(setupId, userId) {
    const { data, error } = await supabase
        .from("setup[Setup]")
        .select("id,user_id")
        .eq("id", setupId)
        .single();

    if (error || !data) return false;
    return String(data.user_id) === String(userId);
}

/* ---------------------------------------------------
   1️⃣ Alap lista (ha kell a view)
--------------------------------------------------- */
async function list(req, res) {
    const { data, error } = await supabase
        .from("ht_items_view")
        .select("*");

    if (error) return res.status(500).json({ error: error.message });
    res.json({ items: data || [] });
}

/* ---------------------------------------------------
   2️⃣ Devices lekérése egy setuphoz
   GET /api/home-theater/:setupId/device
--------------------------------------------------- */
async function listDevices(req, res) {
    try {
        const { setupId } = req.params;
        const userId = req.user.id;

        const ok = await assertSetupOwnedByUser(setupId, userId);
        if (!ok) return res.status(403).json([]);

        const { data, error } = await supabase
            .from("home_theater_devices")
            .select("*")
            .eq("home_setup_id", setupId);

        if (error) throw error;

        res.json(data || []);
    } catch (err) {
        console.error("❌ listDevices error:", err);
        res.status(500).json([]);
    }
}

/* ---------------------------------------------------
   3️⃣ Device létrehozás
   POST /api/home-theater/device
--------------------------------------------------- */
async function createDevice(req, res) {
    try {
        const { home_setup_id, device_type, device_ref_id } = req.body;
        const userId = req.user.id;

        if (!home_setup_id || !device_type || !device_ref_id) {
            return res.status(400).json({ error: "Missing fields" });
        }

        const ok = await assertSetupOwnedByUser(home_setup_id, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const { data, error } = await supabase
            .from("home_theater_devices")
            .insert([{
                home_setup_id,
                device_type,
                device_ref_id
            }])
            .select("*")
            .single();

        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error("❌ createDevice error:", err);
        res.status(500).json({ error: "Insert failed" });
    }
}

/* ---------------------------------------------------
   4️⃣ Connections lekérése
   GET /api/home-theater/:setupId/connections
--------------------------------------------------- */
async function listConnections(req, res) {
    try {
        const { setupId } = req.params;
        const userId = req.user.id;

        const ok = await assertSetupOwnedByUser(setupId, userId);
        if (!ok) return res.status(403).json([]);

        const { data, error } = await supabase
            .from("home_theater_connections")
            .select("*")
            .eq("home_setup_id", setupId);

        if (error) throw error;

        res.json(data || []);
    } catch (err) {
        console.error("❌ listConnections error:", err);
        res.status(500).json([]);
    }
}

/* ---------------------------------------------------
   5️⃣ Connection létrehozás
   POST /api/home-theater/connection
--------------------------------------------------- */
async function createConnection(req, res) {
    try {
        const {
            home_setup_id,
            from_device_id,
            to_device_id,
            connection_type,
            channel
        } = req.body;

        const userId = req.user.id;

        if (!home_setup_id || !from_device_id || !to_device_id) {
            return res.status(400).json({ error: "Missing fields" });
        }

        const ok = await assertSetupOwnedByUser(home_setup_id, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const { data, error } = await supabase
            .from("home_theater_connections")
            .insert([{
                home_setup_id,
                from_device_id,
                to_device_id,
                connection_type,
                channel
            }])
            .select("*")
            .single();

        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error("❌ createConnection error:", err);
        res.status(500).json({ error: "Insert failed" });
    }
}

/* ---------------------------------------------------
   6️⃣ Connection törlés
   DELETE /api/home-theater/connection/:id
--------------------------------------------------- */
async function deleteConnection(req, res) {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from("home_theater_connections")
            .delete()
            .eq("id", id);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error("❌ deleteConnection error:", err);
        res.status(500).json({ error: "Delete failed" });
    }
}

async function saveHtConfig(req, res) {
    try {
        const { home_setup_id, layout, devices } = req.body;
        const userId = req.user.id;

        const ok = await assertSetupOwnedByUser(home_setup_id, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        // régi config törlés
        await supabase
            .from("home_theater_config")
            .delete()
            .eq("home_setup_id", home_setup_id);

        const { error } = await supabase
            .from("home_theater_config")
            .insert([{
                home_setup_id,
                layout,
                devices
            }]);

        if (error) throw error;

        res.json({ success: true });

    } catch (err) {
        console.error("HT SAVE ERROR:", err);
        res.status(500).json({ error: "Save failed" });
    }
}

async function saveHtBuild(req, res) {
    try {
        const { setup_id, layout, title, devices } = req.body;
        const userId = req.user.id;

        // 🔐 ownership check
        const ok = await assertSetupOwnedByUser(setup_id, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        // 🔍 Megnézzük létezik-e már build
        const { data: existing, error: findError } = await supabase
            .from("home_theater_setups[Setup]")
            .select("*")
            .eq("setup_id", setup_id)
            .maybeSingle();

        if (findError) throw findError;

        let build;

        if (existing) {
            // ✏️ UPDATE
            const { data, error } = await supabase
                .from("home_theater_setups[Setup]")
                .update({
                    layout,
                    setup_name: title
                })
                .eq("id", existing.id)
                .select()
                .single();

            if (error) throw error;
            build = data;

        } else {
            // ➕ INSERT
            const { data, error } = await supabase
                .from("home_theater_setups[Setup]")
                .insert([{
                    setup_id,
                    layout,
                    setup_name: title,
                    setup_type: "home_theater"
                }])
                .select()
                .single();

            if (error) throw error;
            build = data;
        }

        // 🧹 Régi device-ok törlése
        const { error: deleteError } = await supabase
            .from("home_theater_devices[Setup]")
            .delete()
            .eq("home_setup_id", build.id);

        if (deleteError) throw deleteError;

        // ➕ Új device-ok beszúrása
        const deviceEntries = Object.entries(devices || {})
            .filter(([_, value]) => value);

        if (deviceEntries.length > 0) {

            const inserts = deviceEntries.map(([type, refId]) => ({
                home_setup_id: build.id,
                device_type: type,
                device_ref_id: refId
            }));

            const { error: insertError } = await supabase
                .from("home_theater_devices[Setup]")
                .insert(inserts);

            if (insertError) throw insertError;
        }

        res.json({ success: true });

    } catch (err) {
        console.error("HT BUILD SAVE ERROR:", err);
        res.status(500).json({ error: err.message });
    }
}
module.exports = {
    saveHtBuild,
    saveHtConfig,
    getHtCatalog,
    list,
    listDevices,
    createDevice,
    listConnections,
    createConnection,
    deleteConnection
};