const { supabase } = require("../services/supabase");

// GET /api/bell/
exports.list = async (req, res) => {
    try {
        const userId = Number(req.user.id);

        const { data: items, error } = await supabase
            .from("bell_messages_view")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) return res.status(500).json({ error: error.message });

        const { data: reads, error: rErr } = await supabase
            .from("system_reads[System]")
            .select("source_table, message_id")
            .eq("user_id", userId);

        if (rErr) return res.status(500).json({ error: rErr.message });

        const readSet = new Set((reads || []).map(r => `${r.source_table}:${r.message_id}`));

        const merged = (items || []).map(x => ({
            ...x,
            read: readSet.has(`${x.source_table}:${x.id}`)
        }));

        res.json(merged);
    } catch (e) {
        res.status(500).json({ error: String(e) });
    }
};

// POST /api/bell/read
exports.read = async (req, res) => {
    try {
        const userId = Number(req.user.id);

        const source_table = req.body.source_table ?? req.body.sourceTable;
        const message_id = req.body.message_id ?? req.body.messageId;

        if (!source_table || !message_id) {
            return res.status(400).json({ error: "Missing source_table or message_id" });
        }

        const { error } = await supabase
            .from("system_reads[System]")
            .insert({
                user_id: userId,
                source_table,
                message_id: Number(message_id),
                created_at: new Date().toISOString()
            });

        if (error) return res.status(500).json({ error: error.message });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: String(e) });
    }
};

// GET /api/bell/:type/:id  (ha kell még)
exports.getOne = async (req, res) => {
    try {
        const { type, id } = req.params;

        const { data, error } = await supabase
            .from("bell_messages_view")
            .select("*")
            .eq("type", type)
            .eq("id", Number(id))
            .limit(1)
            .maybeSingle();

        if (error) return res.status(500).json({ error: error.message });

        res.json(data || null);
    } catch (e) {
        res.status(500).json({ error: String(e) });
    }
};

// GET /api/bell/conversations
exports.conversations = async (req, res) => {
    try {
        const userId = Number(req.user.id);

        const { data: items, error } = await supabase
            .from("bell_messages_view")
            .select("source_table,id,title,message,created_at,conversation_key,conversation_title")
            .order("created_at", { ascending: false });

        if (error) return res.status(500).json({ error: error.message });

        const { data: reads, error: rErr } = await supabase
            .from("system_reads[System]")
            .select("source_table, message_id")
            .eq("user_id", userId);

        if (rErr) return res.status(500).json({ error: rErr.message });

        const readSet = new Set((reads || []).map(r => `${r.source_table}:${r.message_id}`));

        const map = new Map();

        for (const row of (items || [])) {
            const isRead = readSet.has(`${row.source_table}:${row.id}`);

            if (!map.has(row.conversation_key)) {
                map.set(row.conversation_key, {
                    key: row.conversation_key,
                    title: row.conversation_title,
                    lastAt: row.created_at,
                    lastMessage: row.title || row.message || "",
                    unreadCount: isRead ? 0 : 1
                });
            } else {
                const cur = map.get(row.conversation_key);
                if (!isRead) cur.unreadCount += 1;
            }
        }

        res.json([...map.values()]);
    } catch (e) {
        res.status(500).json({ error: String(e) });
    }
};

// GET /api/bell/conversation/:key
exports.conversation = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const key = req.params.key;

        const { data: items, error } = await supabase
            .from("bell_messages_view")
            .select("source_table,id,title,message,created_at,conversation_key,conversation_title,type")
            .eq("conversation_key", key)
            .order("created_at", { ascending: true });

        if (error) return res.status(500).json({ error: error.message });

        const { data: reads, error: rErr } = await supabase
            .from("system_reads[System]")
            .select("source_table, message_id")
            .eq("user_id", userId);

        if (rErr) return res.status(500).json({ error: rErr.message });

        const readSet = new Set((reads || []).map(r => `${r.source_table}:${r.message_id}`));

        const merged = (items || []).map(x => ({
            id: x.id,
            title: x.title,
            message: x.message,
            created_at: x.created_at,
            type: x.type,
            source_table: x.source_table,
            read: readSet.has(`${x.source_table}:${x.id}`)
        }));

        res.json(merged);
    } catch (e) {
        res.status(500).json({ error: String(e) });
    }
};
