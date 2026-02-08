const { supabase } = require("../services/supabase");

async function list(req, res) {
    const q = (req.query.q ?? "").trim() || null;

    const { data, error } = await supabase.rpc("products_home", { q });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ products: data || [] });
}

async function getOne(req, res) {
    const { table, id } = req.params;

    const { data, error } = await supabase.rpc("admin_product_full", {
        p_table: table,
        p_id: Number(id)
    });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ product: data });
}

module.exports = {
    list,
    getOne
};
