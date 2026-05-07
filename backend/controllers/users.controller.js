const { supabase } = require("../services/supabase");

exports.list = async (req, res) => {
    try {
        const currentUserId = Number(req.user.id);

        const { data, error } = await supabase
            .from('users')
            .select('id, username')
            .neq('id', currentUserId)
            .order('username', { ascending: true });

        if (error) return res.status(500).json({ error: error.message });

        return res.json(data || []);

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
