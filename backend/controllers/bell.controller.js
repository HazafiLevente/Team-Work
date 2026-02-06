const { selectWithFallback } = require("../services/dataProvider");
const { supabase } = require("../services/supabase");

/**
 * GET /api/bell
 * -> { items: [...] }
 */
exports.list = async (req, res) => {
    try {
        const items = await selectWithFallback({
            supabaseName: "bell_messages_view",
            sqliteName: "bell_messages_view",
            select: "*",
            orderBy: "created_at",
            ascending: false,
            limit: 50
        });

        return res.json({ items: items || [] });
    } catch (e) {
        return res.status(500).json({ error: e.message, items: [] });
    }
};

/**
 * POST /api/bell/read
 * body: { system_id: number }
 * (csak a system_message típushoz értelmezett nálatok)
 */
exports.read = async (req, res) => {
    try {
        const system_id = Number(req.body?.system_id);
        if (!system_id) return res.status(400).json({ error: "Missing system_id" });

        // system_reads[System] oszlopok: system_id, user_id (+ created_at)
        const { error } = await supabase
            .from('system_reads[System]')
            .insert({
                system_id,
                user_id: Number(req.user.id),
                created_at: new Date().toISOString()
            });

        if (error) return res.status(500).json({ error: error.message });

        return res.json({ success: true });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

/**
 * GET /api/bell/:source_table/:id
 */
exports.getOne = async (req, res) => {
    try {
        const { source_table, id } = req.params;

        const rows = await selectWithFallback({
            supabaseName: "bell_messages_view",
            sqliteName: "bell_messages_view",
            select: "*",
            orderBy: "created_at",
            ascending: false,
            limit: 2000
        });

        const found = (rows || []).find(r =>
            String(r.source_table) === String(source_table) && String(r.id) === String(id)
        );

        return res.json(found || null);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

exports.conversations = async (req, res) => {
    try {
        const rows = await selectWithFallback({
            supabaseName: "bell_messages_view",
            sqliteName: "bell_messages_view",
            select: "conversation_key,conversation_title,created_at",
            orderBy: "created_at",
            ascending: false,
            limit: 500
        });

        const map = new Map();
        for (const r of rows || []) {
            if (!r?.conversation_key) continue;
            if (!map.has(r.conversation_key)) {
                map.set(r.conversation_key, {
                    key: r.conversation_key,
                    title: r.conversation_title || r.conversation_key
                });
            }
        }

        return res.json({ conversations: Array.from(map.values()) });
    } catch (e) {
        return res.status(500).json({ error: e.message, conversations: [] });
    }
};

exports.conversation = async (req, res) => {
    try {
        const key = String(req.params.key);

        const rows = await selectWithFallback({
            supabaseName: "bell_messages_view",
            sqliteName: "bell_messages_view",
            select: "*",
            orderBy: "created_at",
            ascending: false,
            limit: 200
        });

        const items = (rows || []).filter(r => String(r.conversation_key) === key);
        return res.json({ items });
    } catch (e) {
        return res.status(500).json({ error: e.message, items: [] });
    }
};
