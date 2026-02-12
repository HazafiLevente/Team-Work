const { supabase } = require("../services/supabase");

// ⚠️ CSAK OLYAN TÁBLÁK, AMIK TÉNYLEG setup-hoz kötöttek
const SETUP_CHILD_TABLES = [
    "pc_details[Setup]",
    "home_theater_setups[Setup]",
    "setup_rooms[Setup]",
    "studio_monitor_setup[Setup]",
    "reciever_setup[Setup]",
    "Car_setup[Setup]"
];

// ======================
// SETUP LIST
// ======================
exports.list = async (req, res) => {
    try {
        const userId = req.user.id;

        const { data, error } = await supabase
            .from("setup[Setup]")
            .select("*")
            .eq("user_id", userId);

        if (error) throw error;

        res.json({
            setups: (data || []).map(s => ({
                ...s,
                setup_name: s.setup_name ?? s.name ?? "Névtelen setup"
            }))
        });
    } catch (err) {
        console.error("❌ Setup list error:", err);
        res.status(500).json({ setups: [] });
    }
};

// ======================
// SETUP CHILDREN
// ======================
exports.children = async (req, res) => {
    const setupId = req.params.id;
    if (!setupId) return res.json([]);

    try {
        const allItems = [];

        for (const table of SETUP_CHILD_TABLES) {
            const { data, error } = await supabase
                .from(table)
                .select("*")
                .eq("setup_id", setupId);

            if (error) {
                console.warn(`⚠️ ${table} skipped:`, error.message);
                continue;
            }

            if (Array.isArray(data)) {
                allItems.push(
                    ...data.map(item => ({
                        ...item,
                        category: table,
                        display_name:
                            item.setup_name ||
                            item.name ||
                            item.product_name ||
                            `Elem #${item.id ?? "?"}`
                    }))
                );
            }
        }

        res.json(allItems);
    } catch (err) {
        console.error("❌ Setup children fatal error:", err);
        res.status(500).json([]);
    }
};

// ======================
// CREATE
// ======================
exports.create = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const setup_name = (req.body?.setup_name || "").trim();
        if (!setup_name) {
            return res.status(400).json({ error: "setup_name required" });
        }

        const { data, error } = await supabase
            .from("setup[Setup]")
            .insert([{ setup_name, user_id: userId }])
            .select("*")
            .single();

        if (error) throw error;

        res.json({ setup: data });
    } catch (err) {
        console.error("❌ Setup create error:", err);
        res.status(500).json({ error: "Create failed" });
    }
};

// ======================
// UPDATE
// ======================
exports.update = async (req, res) => {
    try {
        const userId = req.user.id;
        const setupId = req.params.id;
        const name = (req.body?.setup_name || "").trim();

        if (!name) {
            return res.status(400).json({ error: "setup_name required" });
        }

        const { data, error } = await supabase
            .from("setup[Setup]")
            .update({ setup_name: name })
            .eq("id", setupId)
            .eq("user_id", userId)
            .select("*")
            .single();

        if (error) throw error;

        res.json({ setup: data });
    } catch (err) {
        console.error("❌ Setup update error:", err);
        res.status(500).json({ error: "Update failed" });
    }
};

// ======================
// DELETE
// ======================
exports.remove = async (req, res) => {
    try {
        const userId = req.user.id;
        const setupId = req.params.id;

        const { data, error } = await supabase
            .from("setup[Setup]")
            .delete()
            .eq("id", setupId)
            .eq("user_id", userId)
            .select("*")
            .single();

        if (error) throw error;

        res.json({ ok: true, deleted: data });
    } catch (err) {
        console.error("❌ Setup delete error:", err);
        res.status(500).json({ error: "Delete failed" });
    }
};
