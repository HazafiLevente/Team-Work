const { supabase } = require("../services/supabase");

exports.list = async (req, res) => {
    const role = req.user.role.toLowerCase();
    const userId = req.user.id;

    const { data, error } = await supabase
        .from("system_message[System]")
        .select("id, title, message, created_at, target")
        .order("created_at", { ascending: false })
        .limit(10);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    const filtered = (data || []).filter(m => {
        const t = m.target?.toLowerCase();
        return t === "all" || t === role;
    });

    const ids = filtered.map(m => m.id);

    const { data: reads } = await supabase
        .from("system_reads[System]")
        .select("message_id")
        .eq("user_id", userId)
        .in("message_id", ids);

    const readSet = new Set((reads || []).map(r => r.message_id));

    const result = filtered.map(m => ({
        ...m,
        read: readSet.has(m.id)
    }));

    res.json(result);
};

exports.read = async (req, res) => {
    const userId = req.user.id;
    const { messageId } = req.body;

    if (!messageId) {
        return res.status(400).json({ error: "Missing messageId" });
    }

    const { data: exists } = await supabase
        .from("system_reads[System]")
        .select("id")
        .eq("user_id", userId)
        .eq("message_id", messageId)
        .limit(1);

    if (exists?.length) {
        return res.json({ success: true });
    }

    const { error } = await supabase
        .from("system_reads[System]")
        .insert([{
            user_id: userId,
            message_id: messageId,
            read_at: new Date().toISOString()
        }]);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
};
