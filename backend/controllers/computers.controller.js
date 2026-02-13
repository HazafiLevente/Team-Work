const { supabase } = require("../services/supabase");

async function list(req, res) {
    // ha kell q, később ráteszünk ILIKE szűrést RPC-ben, de most egyszerű:
    const { data, error } = await supabase
        .from("pc_items_view")
        .select("*");

    if (error) return res.status(500).json({ error: error.message });
    res.json({ items: data || [] });
}

module.exports = { list };