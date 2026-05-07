const { supabase } = require("../services/supabase");
const { listProducts, clampLimit } = require("../services/products/productCatalog.service");






exports.getHtCatalog = async (req, res) => {
    try {
        // NOTE: productCatalog.service derives "type" from EAV properties.type (e.g. receiver/front_speaker),
        // so filtering for type === "ht" would incorrectly return an empty list.
        // Use the shared category alias matching instead.
        const items = await listProducts({ limit: 5000, category: "ht" });

        const catalog = {
            reciever: [],
            audio_processor: [],
            front_speaker: [],
            center_speaker: [],
            side_speaker: [],
            back_speaker: [],
            subwoofer: [],
            speaker: []
        };

        for (const item of items) {
            const bucket = inferHtCatalogBucket(item);
            if (!catalog[bucket]) catalog[bucket] = [];
            catalog[bucket].push(item);
        }

        res.json(catalog);
    } catch (err) {
        console.error("FATAL: getHtCatalog", err);
        res.status(500).json({ error: "Failed to fetch catalog" });
    }
};




exports.listBuildsForSetup = async (req, res) => {
    try {
        const { setupId } = req.params;
        const userId = req.user.id;

        if (!await assertSetupOwnedByUser(setupId, userId)) {
            return res.status(403).json({ error: "Access denied" });
        }

        const { data, error } = await supabase
            .from("setups")
            .select("*")
            .eq("room_id", setupId)
            .eq("type", "home_theater")
            .order("created_at", { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error("ERROR: listBuildsForSetup", err);
        res.status(500).json({ error: err.message });
    }
};


exports.getBuildById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { data: build, error } = await supabase
            .from("setups")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !build) return res.status(404).json({ error: "Build not found" });

        if (!await assertSetupOwnedByUser(build.room_id, userId)) {
            return res.status(403).json({ error: "Access denied" });
        }

        res.json(build);
    } catch (err) {
        console.error("ERROR: getBuildById", err);
        res.status(500).json({ error: err.message });
    }
};


exports.saveBuild = async (req, res) => {
    try {
        const { id, setup_id, layout, title, devices } = req.body;
        const userId = req.user.id;

        if (!await assertSetupOwnedByUser(setup_id, userId)) {
            return res.status(403).json({ error: "Access denied" });
        }

        let build;
        const buildData = {
            room_id: Number(setup_id),
            name: title || "Hazimozi",
            type: "home_theater",
            pos_x: 0,
            pos_y: 0
        };

        if (id) {

            const { data, error } = await supabase
                .from("setups")
                .update(buildData)
                .eq("id", id)
                .select()
                .single();
            if (error) throw error;
            build = data;
        } else {

            const { data, error } = await supabase
                .from("setups")
                .insert([buildData])
                .select()
                .single();
            if (error) throw error;
            build = data;
        }


        await syncDevices(build.id, devices, layout);

        res.json(build);
    } catch (err) {
        console.error("ERROR: saveBuild", err);
        res.status(500).json({ error: err.message });
    }
};


exports.deleteBuild = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { data: build } = await supabase
            .from("setups")
            .select("room_id")
            .eq("id", id)
            .single();

        if (!build || !await assertSetupOwnedByUser(build.room_id, userId)) {
            return res.status(403).json({ error: "Access denied" });
        }


        await supabase.from("setup_devices").delete().eq("setup_id", id);

        const { error } = await supabase.from("setups").delete().eq("id", id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error("ERROR: deleteBuild", err);
        res.status(500).json({ error: "Deletion failed" });
    }
};



async function assertSetupOwnedByUser(setupId, userId) {
    const { data, error } = await supabase
        .from("setup_room")
        .select("user_id")
        .eq("id", setupId)
        .single();
    if (error || !data) return false;
    return String(data.user_id) === String(userId);
}

function normalizeHtRole(role = "", category = "") {
    const value = String(role || category || "").trim().toLowerCase();

    if (!value) return "device";
    if (["receiver", "receivers", "reciever", "recievers", "avr", "av_receiver"].includes(value)) return "receiver";
    if (["audio_processor", "audio_processors", "processor"].includes(value)) return "audio_processor";
    if (["bassamplifier", "bass_amplifier", "bass-amplifier", "bassamplifiers"].includes(value)) return "bass_amplifier";
    if (["subwoofer", "subwoofers"].includes(value)) return "subwoofer";
    if (["front_speaker", "frontspeakers", "front_speakers"].includes(value)) return "front_speaker";
    if (["center", "centerspeaker", "center_speaker", "centerspeakers"].includes(value)) return "center";
    if (["side_speaker", "side_speakers"].includes(value)) return "side_speaker";
    if (["back_speaker", "back_speakers"].includes(value)) return "back_speaker";
    if (["speaker", "speakers"].includes(value)) return "speaker";
    if (["front_left", "frontleft"].includes(value)) return "front_left";
    if (["front_right", "frontright"].includes(value)) return "front_right";
    if (["back_left", "backleft"].includes(value)) return "back_left";
    if (["back_right", "backright"].includes(value)) return "back_right";
    if (["surround_left", "surroundleft", "side_left"].includes(value)) return "surround_left";
    if (["surround_right", "surroundright", "side_right"].includes(value)) return "surround_right";

    return value;
}

function inferHtCatalogBucket(item = {}) {
    const category = String(item?.data?.category || item?.category || "").trim().toLowerCase();
    const byCategory = {
        reciever: "reciever",
        recievers: "reciever",
        receiver: "reciever",
        receivers: "reciever",
        audio_processor: "audio_processor",
        audio_processors: "audio_processor",
        front_speaker: "front_speaker",
        center_speaker: "center_speaker",
        center_speakers: "center_speaker",
        side_speaker: "side_speaker",
        back_speaker: "back_speaker",
        subwoofer: "subwoofer",
        subwoofers: "subwoofer",
        speaker: "speaker",
        speakers: "speaker"
    };

    return byCategory[category] || "speaker";
}

async function syncDevices(buildId, devices, layout = null) {
    await supabase.from("setup_devices").delete().eq("setup_id", buildId);

    let inserts = [];

    const parsedLayout = typeof layout === "string" ? (() => {
        try {
            return JSON.parse(layout);
        } catch {
            return null;
        }
    })() : layout;

    if (Array.isArray(parsedLayout) && parsedLayout.length > 0) {
        inserts = parsedLayout
            .filter((item) => item?.ref_id)
            .map((item) => ({
                setup_id: buildId,
                device_id: Number(item.ref_id),
                role: normalizeHtRole(item?.role, item?.category),
                pos_x: Number(item?.x ?? 0),
                pos_y: Number(item?.y ?? 0),
                rotation: Number(item?.rotation ?? 0)
            }));
    } else {
        const deviceEntries = Object.entries(devices || {}).filter(([_, val]) => val);
        inserts = deviceEntries.map(([type, refId]) => ({
            setup_id: buildId,
            device_id: Number(refId),
            role: normalizeHtRole(type),
            pos_x: 0,
            pos_y: 0,
            rotation: 0
        }));
    }

    if (inserts.length > 0) {
        const { error } = await supabase.from("setup_devices").insert(inserts);
        if (error) console.error("Error syncing devices:", error.message);
    }
}


exports.saveHtBuild = exports.saveBuild;
exports.getHtBuild = async (req, res) => {

    const { setupId } = req.params;
    const userId = req.user.id;
    if (!await assertSetupOwnedByUser(setupId, userId)) return res.status(403).json({ error: "Access denied" });

    const { data } = await supabase.from("setups").select("*").eq("room_id", setupId).eq("type", "home_theater").order("created_at", { ascending: false });
    res.json(data?.[0] || { room_id: setupId, name: "Uj Hazimozi", type: "home_theater" });
};
exports.updateHtBuild = (req, res) => { req.params.id = req.body.id; return exports.saveBuild(req, res); };
exports.deleteHtBuild = exports.deleteBuild;
exports.getHtBuildById = exports.getBuildById;
exports.list = async (req, res) => {
    const limit = clampLimit(req.query.limit, 200, 2000);

    try {
        const items = await listProducts({ limit, category: "ht" });

        res.json({ items });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.listDevices = async (req, res) => {
    const { setupId } = req.params;
    const { data, error } = await supabase
        .from("setup_devices")
        .select("*")
        .eq("setup_id", setupId)
        .order("id", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    const devices = data || [];
    const productIds = [...new Set(devices.map((item) => Number(item?.device_id)).filter(Boolean))];

    if (productIds.length === 0) {
        return res.json([]);
    }

    const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, type, category")
        .in("id", productIds);

    if (productsError) return res.status(500).json({ error: productsError.message });

    const productMap = new Map((products || []).map((product) => [Number(product.id), product]));

    const { data: propertyRows, error: propertyError } = await supabase
        .from("properties")
        .select("id, property");

    if (propertyError) return res.status(500).json({ error: propertyError.message });

    const propertyMap = new Map((propertyRows || []).map((row) => [Number(row.id), String(row.property || "").trim()]));

    const { data: valueRows, error: valuesError } = await supabase
        .from("values")
        .select("products_id, properties_id, value")
        .in("products_id", productIds);

    if (valuesError) return res.status(500).json({ error: valuesError.message });

    const valuesByProduct = new Map();
    for (const row of valueRows || []) {
        const productId = Number(row.products_id);
        const propertyName = propertyMap.get(Number(row.properties_id));
        if (!productId || !propertyName) continue;

        if (!valuesByProduct.has(productId)) {
            valuesByProduct.set(productId, {});
        }

        valuesByProduct.get(productId)[propertyName] = row.value;
    }

    const enriched = devices.map((device) => {
        const productId = Number(device?.device_id);
        const product = productMap.get(productId) || {};
        const productValues = valuesByProduct.get(productId) || {};

        return {
            ...device,
            product_id: productId,
            name: product.name || productValues.model || productValues.name || "",
            product_type: product.type || "",
            product_category: product.category || "",
            category: product.category || device.category || device.role || "",
            manufacturer: productValues.manufacturer || "",
            model: productValues.model || "",
            fields: productValues
        };
    });

    res.json(enriched);
};
exports.createDevice = async (req, res) => {
    const { setup_id, home_setup_id, device_type, device_ref_id } = req.body;
    const targetSetupId = Number(setup_id ?? home_setup_id);
    const { data, error } = await supabase
        .from("setup_devices")
        .insert([{
            setup_id: targetSetupId,
            device_id: Number(device_ref_id),
            role: String(device_type || "").trim(),
            pos_x: 0,
            pos_y: 0,
            rotation: 0
        }])
        .select("*")
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
};
exports.listConnections = async (req, res) => {
    const { setupId } = req.params;
    const { data, error } = await supabase.from("setup_connections").select("*").eq("setup_id", setupId).order("id", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
};
exports.createConnection = async (req, res) => {
    const { setup_id, from_setup_device_id, to_setup_device_id, type } = req.body;
    const { data, error } = await supabase
        .from("setup_connections")
        .insert([{
            setup_id: Number(setup_id),
            from_setup_device_id: Number(from_setup_device_id),
            to_setup_device_id: Number(to_setup_device_id),
            type: String(type || "default")
        }])
        .select("*")
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
};
exports.deleteConnection = async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from("setup_connections").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
};
exports.saveHtConfig = async (req, res) => {  res.json({ success: true }); };


