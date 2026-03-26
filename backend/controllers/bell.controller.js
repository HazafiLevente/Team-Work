const { selectWithFallback } = require("../services/dataProvider");
const { supabase } = require("../services/supabase");
const { listNotifications } = require("../services/notificationStore");

/**
 * GET /api/bell
 * -> { items: [...] }
 */
exports.list = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const userRole = req.user.role;
        const all = await listNotifications();

        // 🔥 TARGET SZŰRÉS
        const filtered = all.filter(m => {

            const target = String(m.target || '').toLowerCase().trim();
            const userIdStr = String(userId);

            if (target === 'all') return true;
            if (target === userIdStr) return true;

            if (target === 'owner' && userRole === 'owner') return true;
            if (target === 'admin' && ['admin','admin+','owner'].includes(userRole)) return true;
            if (target === 'admin+' && ['admin+','owner'].includes(userRole)) return true;

            return false;
        });

        // idő szerint rendezés
        filtered.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

        return res.json({ items: filtered });

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

exports.conversation = async (req, res) => {
    try {
        const key = String(req.params.key);
        const userId = Number(req.user.id);
        const userRole = req.user.role;

        const rows = await selectWithFallback({
            supabaseName: "bell_messages_view",
            sqliteName: "bell_messages_view",
            select: "*",
            orderBy: "created_at",
            ascending: false,
            limit: 200
        });

        const items = (rows || []).filter(r => {
            if (String(r.conversation_key) !== key) return false;

            const targetRaw = String(r.target || '').toLowerCase().trim();
            const userIdStr = String(userId);

            const allowed =
                targetRaw === 'all' ||
                targetRaw === userIdStr ||
                (targetRaw === 'owner' && userRole === 'owner') ||
                (targetRaw === 'admin' && (userRole === 'admin' || userRole === 'admin+' || userRole === 'owner')) ||
                (targetRaw === 'admin+' && (userRole === 'admin+' || userRole === 'owner'));

            return allowed;
        });

        return res.json({ items });
    } catch (e) {
        return res.status(500).json({ error: e.message, items: [] });
    }
};


exports.conversations = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const userRole = req.user.role;

        const rows = await selectWithFallback({
            supabaseName: "bell_messages_view",
            sqliteName: "bell_messages_view",
            select: "*",
            orderBy: "created_at",
            ascending: false,
            limit: 500
        });

        const map = new Map();

        for (const r of rows || []) {

            const targetRaw = String(r.target || '').toLowerCase().trim();
            const userIdStr = String(userId);

            // 🔥 target szűrés
            const allowed =
                targetRaw === 'all' ||
                targetRaw === userIdStr ||
                (targetRaw === 'owner' && userRole === 'owner') ||
                (targetRaw === 'admin' && (userRole === 'admin' || userRole === 'admin+' || userRole === 'owner')) ||
                (targetRaw === 'admin+' && (userRole === 'admin+' || userRole === 'owner'));

            if (!allowed) continue;
            if (!r?.conversation_key) continue;

            if (!map.has(r.conversation_key)) {
                map.set(r.conversation_key, {
                    key: r.conversation_key,
                    title: r.conversation_title || r.conversation_key,
                    lastAt: r.created_at,
                    lastMessage: r.message
                });
            }
        }

        return res.json(Array.from(map.values()));

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

