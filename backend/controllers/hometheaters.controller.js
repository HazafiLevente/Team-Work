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

        const HT_TABLES = [
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
            .from("home_theater_devices[Setup]")
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
            .from("home_theater_devices[Setup]")
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
            .from("home_theater_connections[Setup]")
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
            .from("home_theater_connections[Setup]")
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
            .from("home_theater_connections[Setup]")
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
            .from("home_theater_config[Setup]")
            .delete()
            .eq("home_setup_id", home_setup_id);

        const { error } = await supabase
            .from("home_theater_config[Setup]")
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
        const { setup_id, id: buildId, layout, title, devices } = req.body;
        const userId = req.user.id;

        console.log('--- saveHtBuild ---');
        console.log('Body:', JSON.stringify(req.body));
        console.log('User ID:', userId);

        if (!setup_id) {
            console.log('Missing setup_id in request body');
            return res.status(400).json({ error: "setup_id is required" });
        }

        // 🔐 ownership check
        const ok = await assertSetupOwnedByUser(setup_id, userId);
        if (!ok) {
            console.log('Ownership check failed for setup_id:', setup_id);
            return res.status(403).json({ error: "Forbidden" });
        }

        let build;

        if (buildId) {
            // ✏️ UPDATE meglévő build esetén
            console.log('Updating existing build:', buildId);
            const { data, error } = await supabase
                .from("home_theater_setups[Setup]")
                .update({
                    layout,
                    setup_name: title
                })
                .eq("id", buildId)
                .select()
                .single();

            if (error) {
                console.error('Update error:', error);
                throw error;
            }
            build = data;
        } else {
            // ➕ INSERT új build esetén
            console.log('Inserting new build for setup_id:', setup_id);
            const { data, error } = await supabase
                .from("home_theater_setups[Setup]")
                .insert([{
                    setup_id: setup_id,
                    layout: layout,
                    setup_name: title,
                    setup_type: "home_theater"
                }])
                .select()
                .single();

            if (error) {
                console.error('Insert error:', error);
                throw error;
            }
            build = data;
        }

        // 🧹 Régi device-ok törlése
        if (build && build.id) {
            console.log('Cleaning up old devices for build.id:', build.id);
            const { error: deleteError } = await supabase
                .from("home_theater_devices[Setup]")
                .delete()
                .eq("home_setup_id", build.id);

            if (deleteError) {
                console.error('Delete old devices error:', deleteError);
                // Nem dobunk hibát, ha nincs mit törölni, de Supabase-nél ez nem is hiba általában
            }

            // ➕ Új device-ok beszúrása
            const deviceEntries = Object.entries(devices || {})
                .filter(([_, value]) => value);

            console.log('Inserting new devices count:', deviceEntries.length);

            if (deviceEntries.length > 0) {
                const inserts = deviceEntries.map(([type, refId]) => ({
                    home_setup_id: build.id,
                    device_type: type,
                    device_ref_id: refId
                }));

                const { error: insertError } = await supabase
                    .from("home_theater_devices[Setup]")
                    .insert(inserts);

                if (insertError) {
                    console.error('Insert devices error:', insertError);
                    throw insertError;
                }
            }
        }

        res.json({ success: true, build });

    } catch (err) {
        console.error("HT BUILD SAVE ERROR:", err);
        res.status(500).json({ error: err.message });
    }
}
async function getHtBuild(req, res) {
    try {
        const { setupId } = req.params;
        const buildId = req.query.id; // Lehetővé tesszük konkrét build lekérését is
        const userId = req.user.id;

        const ok = await assertSetupOwnedByUser(setupId, userId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        let query = supabase
            .from("home_theater_setups[Setup]")
            .select("*")
            .eq("setup_id", setupId);

        if (buildId) {
            query = query.eq("id", buildId);
        } else {
            // Ha nincs ID, alapértelmezetten a legutóbbit adjuk vissza,
            // vagy egy üres sablont az újhoz.
            query = query.order('id', { ascending: false }).limit(1);
        }

        const { data: builds, error: buildErr } = await query;

        if (buildErr) throw buildErr;

        const build = builds && builds.length > 0 ? builds[0] : null;

        res.json(build || { setup_id: setupId, layout: "[]", setup_name: "Új Házimozi" });

    } catch (err) {
        console.error("HT GET BUILD ERROR:", err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    saveHtBuild,
    saveHtConfig,
    getHtCatalog,
    getHtBuild,
    list,
    listDevices,
    createDevice,
    listConnections,
    createConnection,
    deleteConnection
};