// controllers/products.controller.js
const { supabase } = require("../services/supabase");

exports.list = async (req, res) => {
    const q = (req.query.q ?? "").trim() || null;
    const limit = Number(req.query.limit || 200);

    const { data, error } = await supabase.rpc("products_home", { q });

    if (error) return res.status(500).json({ error: error.message });

    res.json({ items: (data || []).slice(0, limit) });
};


exports.brands = async (_, res) => {
    const { data, error } = await supabase.rpc("products_brands");
    if (error) return res.status(500).json({ error: error.message });

    res.json({ brands: (data || []).map(b => b.brand) });
};
