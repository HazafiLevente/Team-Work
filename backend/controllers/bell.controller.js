const { supabase } = require("../services/supabase");

exports.list = async (req, res) => {
    const role = req.user.role.toLowerCase();
    const userId = String(req.user.id);

    const tables = [
        { table: "system_message[System]", type: "system" },
        { table: "news_message[System]", type: "news" },
        { table: "register_message[System]", type: "register" }
    ];

    let all = [];

    for (const t of tables) {
        const { data } = await supabase
            .from(t.table)
            .select("id, title, message, created_at, target")
            .order("created_at", { ascending: false })
            .limit(20);

        const filtered = (data || []).filter(m => {
            // 1️⃣ ha VAN target → csak annak
            if (m.target !== null && m.target !== undefined) {
                const trg = String(m.target).toLowerCase();
                return (
                    trg === "all" ||
                    trg === role ||
                    trg === userId
                );
            }

            // 2️⃣ ha NINCS target → típus alapú fallback
            if (t.type === "register") {
                // register mindig user-specifikus
                return false;
            }

            // system / news target nélkül → mindenkinek
            return true;
        });

        all.push(
            ...filtered.map(m => ({
                ...m,
                type: t.type
            }))
        );
    }

    all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const ids = all.map(m => m.id);

    const { data: reads } = await supabase
        .from("system_reads[System]")
        .select("message_id")
        .eq("user_id", userId)
        .in("message_id", ids);

    const readSet = new Set((reads || []).map(r => r.message_id));

    res.json(
        all.map(m => ({
            ...m,
            read: readSet.has(m.id)
        }))
    );
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
exports.getOne = async (req, res) => {
    const { type, id } = req.params;

    const tableMap = {
        system: "system_message[System]",
        news: "news_message[System]",
        register: "register_message[System]"
    };

    const table = tableMap[type];
    if (!table) {
        return res.status(400).json({ error: "Invalid message type" });
    }

    const { data } = await supabase
        .from(table)
        .select("*")
        .eq("id", id)
        .single();

    if (!data) {
        return res.status(404).json({ error: "Message not found" });
    }

    let senderName = "System";

    if (data.sender) {
        const { data: user } = await supabase
            .from("user[Auth]")
            .select("UserName")
            .eq("ID", data.sender)
            .single();

        if (user?.UserName) {
            senderName = user.UserName;
        }
    }

    res.json({
        ...data,
        type,
        sender_name: senderName
    });
};


exports.conversations = async (req, res) => {
    const userId = String(req.user.id);
    const role = req.user.role.toLowerCase();

    const tables = [
        { table: "system_message[System]", type: "system" },
        { table: "news_message[System]", type: "news" },
        { table: "register_message[System]", type: "register" }
    ];

    let conversations = new Map();

    for (const t of tables) {
        const { data } = await supabase
            .from(t.table)
            .select("id, title, created_at, target, sender_name")
            .order("created_at", { ascending: false });

        for (const m of data || []) {

            // 🔐 target szűrés
            if (m.target && !["all", role, userId].includes(String(m.target).toLowerCase())) {
                continue;
            }

            let key;
            let label;

            if (t.type === "system") {
                key = "system";
                label = "System";
            } else if (t.type === "news") {
                key = "news";
                label = "News";
            } else if (t.type === "register") {
                key = `register:${userId}`;
                label = "Regisztráció";
            }

            if (!conversations.has(key)) {
                conversations.set(key, {
                    key,
                    type: t.type,
                    title: label,
                    lastMessage: m.title,
                    lastAt: m.created_at
                });
            }
        }
    }

    res.json(Array.from(conversations.values()));
};


exports.conversation = async (req, res) => {
    const { key } = req.params;
    const userId = String(req.user.id);

    if (key === "system") {
        const { data } = await supabase
            .from("system_message[System]")
            .select("*")
            .order("created_at");
        return res.json(data);
    }

    if (key === "news") {
        const { data } = await supabase
            .from("news_message[System]")
            .select("*")
            .order("created_at");
        return res.json(data);
    }

    if (key.startsWith("register")) {
        const { data } = await supabase
            .from("register_message[System]")
            .select("*")
            .eq("target", userId)
            .order("created_at");
        return res.json(data);
    }

    res.status(400).json({ error: "Invalid conversation key" });
};



