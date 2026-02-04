const { supabase } = require("../services/supabase");

async function list(req, res) {
    const { data, error } = await supabase
        .from("ht_items_view")
        .select("*");

    if (error) return res.status(500).json({ error: error.message });
    res.json({ items: data || [] });
}

module.exports = { list };
