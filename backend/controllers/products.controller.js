const { supabase } = require("../services/supabase");

exports.list = async (req, res) => {
    const limit = Number(req.query.limit || 20);

    const { data, error } = await supabase
        .rpc("products_home", { limit });

    if (error) return res.status(500).json({ error: error.message });

    res.json({ items: data || [] });
};

exports.brands = async (_, res) => {
    const { data, error } = await supabase.rpc("products_brands");
    if (error) return res.status(500).json({ error: error.message });
    res.json({ brands: data.map(b => b.brand) });
};
