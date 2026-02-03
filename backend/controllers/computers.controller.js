const { supabase } = require("../services/supabase");

async function list(req, res) {
    const q = (req.query.q ?? "").trim() || null;

    // ✅ ugyanaz a minta mint products_home / cars
    const { data, error } = await supabase.rpc("computers_home", { q });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ items: data || [] });
}

module.exports = { list };
