// controllers/messages.controller.js
const { supabase } = require("../services/supabase");

exports.createPanelAndMessage = async (req, res) => {
    try {
        const user1 = Number(req.user.id);
        const user2 = Number(req.body.user2_id);
        const context = req.body.context?.trim();

        if (!user2) return res.status(400).json({ error: "Missing user2_id" });

        // 🔎 Panel keresés (mindkét irány)
        const { data: existing } = await supabase
            .from("messages_panel[Messages]")
            .select("*")
            .or(`and(user1_id.eq.${user1},user2_id.eq.${user2}),and(user1_id.eq.${user2},user2_id.eq.${user1})`)
            .limit(1);

        let panel;

        if (existing && existing.length > 0) {
            panel = existing[0];
        } else {
            // ➕ Panel létrehozás
            const { data: created, error } = await supabase
                .from("messages_panel[Messages]")
                .insert({
                    user1_id: user1,
                    user2_id: user2,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) return res.status(500).json({ error: error.message });

            panel = created;
        }

        // ✉️ Ha van üzenet, akkor insert
        if (context) {
            await supabase
                .from("messages[Messages]")
                .insert({
                    messages_panel_id: panel.id,
                    user_id: user1,
                    context,
                    created_at: new Date().toISOString()
                });
        }

        res.json({ success: true, panelId: panel.id });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};


/**
 * POST /api/messages/send
 */
exports.send = async (req, res) => {
    try {
        const user1 = Number(req.user.id);
        const user2 = Number(req.body.user2_id);
        const context = String(req.body.context || '');

        if (!user2 || !context.trim()) {
            return res.status(400).json({ error: "Missing data" });
        }

        // panel keresése (kétirányú)
        let { data: panel } = await supabase
            .from('messages_panel[Messages]')
            .select('*')
            .or(`and(user1_id.eq.${user1},user2_id.eq.${user2}),and(user1_id.eq.${user2},user2_id.eq.${user1})`)
            .limit(1);

        let panelId;

        if (panel && panel.length > 0) {
            panelId = panel[0].id;
        } else {
            const { data: created, error } = await supabase
                .from('messages_panel[Messages]')
                .insert({
                    user1_id: user1,
                    user2_id: user2,
                    title_user1: 'Chat',
                    title_user2: 'Chat',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) return res.status(500).json({ error: error.message });

            panelId = created.id;
        }

        const { error: insertError } = await supabase
            .from('messages[Messages]')
            .insert({
                messages_panel_id: panelId,
                user_id: user1,
                context,
                created_at: new Date().toISOString()
            });

        if (insertError) {
            return res.status(500).json({ error: insertError.message });
        }

        return res.json({ success: true });

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

/**
 * GET /api/messages/panels
 */
exports.getPanels = async (req, res) => {
    try {
        const userId = Number(req.user.id);

        const { data, error } = await supabase
            .from('messages_panel[Messages]')
            .select('*')
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });

        return res.json(data || []);

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

/**
 * GET /api/messages/panel/:id
 */
exports.getPanelMessages = async (req, res) => {
    try {
        const panelId = Number(req.params.id);

        const { data, error } = await supabase
            .from('messages[Messages]')
            .select('*')
            .eq('messages_panel_id', panelId)
            .order('created_at', { ascending: true });

        if (error) return res.status(500).json({ error: error.message });

        return res.json(data || []);

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
exports.conversations = async (req, res) => {
    try {

        const userId = Number(req.user.id);

        const { data: panels, error } = await supabase
            .from("messages_panel[Messages]")
            .select("*")
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
            .order("created_at", { ascending: false });

        if (error) return res.status(500).json({ error: error.message });

        const conversations = [];

        for (const p of panels) {

            const otherUserId =
                p.user1_id === userId
                    ? p.user2_id
                    : p.user1_id;

            const { data: user } = await supabase
                .from("user[Auth]")
                .select("ID, UserName")
                .eq("ID", otherUserId)
                .single();

            conversations.push({
                key: String(p.id),
                title: user?.UserName || "Ismeretlen",
                otherUserId,
                lastAt: p.created_at,
                lastMessage: ""
            });

        }

        res.json(conversations);

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.conversation = async (req, res) => {
    try {

        const panelId = Number(req.params.key);

        const { data, error } = await supabase
            .from("messages[Messages]")
            .select("*")
            .eq("messages_panel_id", panelId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }

        res.json({ items: data });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
exports.editMessage = async (req, res) => {
    try {
        const messageId = Number(req.params.id);
        const userId = Number(req.user.id);
        const newText = String(req.body.context || '').trim();

        if (!newText) {
            return res.status(400).json({ error: "Empty message" });
        }

        // Lekérjük az üzenetet
        const { data: message, error } = await supabase
            .from('messages[Messages]')
            .select('*')
            .eq('id', messageId)
            .single();

        if (error || !message) {
            return res.status(404).json({ error: "Message not found" });
        }

        // 🔒 csak saját üzenet módosítható
        if (message.user_id !== userId) {
            return res.status(403).json({ error: "Not allowed" });
        }

        const { error: updateError } = await supabase
            .from('messages[Messages]')
            .update({ context: newText })
            .eq('id', messageId);

        if (updateError) {
            return res.status(500).json({ error: updateError.message });
        }

        res.json({ success: true });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
exports.deleteMessage = async (req, res) => {
    try {
        const messageId = Number(req.params.id);
        const userId = Number(req.user.id);

        const { data: message, error } = await supabase
            .from('messages[Messages]')
            .select('*')
            .eq('id', messageId)
            .single();

        if (error || !message) {
            return res.status(404).json({ error: "Message not found" });
        }

        if (message.user_id !== userId) {
            return res.status(403).json({ error: "Not allowed" });
        }

        const { error: deleteError } = await supabase
            .from('messages[Messages]')
            .delete()
            .eq('id', messageId);

        if (deleteError) {
            return res.status(500).json({ error: deleteError.message });
        }

        res.json({ success: true });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

