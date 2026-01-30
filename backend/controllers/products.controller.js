const { supabase } = require("../services/supabase");

async function list(req, res) {
    const q = (req.query.q ?? "").trim() || null;

    const { data, error } = await supabase.rpc("products_home", { q });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ items: data || [] });
}

async function brands(req, res) {
    const { data, error } = await supabase.rpc("products_brands");
    if (error) return res.status(500).json({ error: error.message });

    res.json({ brands: (data || []).map(b => b.brand) });
}

module.exports = { list, brands };
