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

async function create(req, res) {
    const { table } = req.params;
    const { data, error } = await supabase.rpc("admin_create_product", {
        p_table: table,
        p_data: req.body || {}
    });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data });
}

async function remove(req, res) {
    const { table, id } = req.params;
    const { error } = await supabase.rpc("admin_delete_product", {
        p_table: table,
        p_id: Number(id)
    });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
}

async function update(req, res) {
    const { table, id } = req.params;
    const dataToSend = req.body;

    const { error } = await supabase.rpc("admin_update_product", {
        p_table: table,
        p_id: Number(id),
        p_data: dataToSend
    });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
}

module.exports = {
    list,
    getOne,
    update,
    create,
    remove
};
