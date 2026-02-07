const { supabase } = require("../services/supabase");

async function list(req, res) {
    const q = (req.query.q ?? "").trim() || null;

    const { data, error } = await supabase.rpc("products_home", { q });

    if (error) {
        console.error("❌ products_home error:", error);
        return res.status(500).json({ error: error.message });
    }

    // FONTOS: items néven megy vissza (frontend ezt várja)
    res.json({
        items: (data || []).map(p => ({
            ...p,
            table: p.table ?? "products" // fallback, ha nincs
        }))
    });
}
async function brands(req, res) {
    const { data, error } = await supabase.rpc("products_brands");
    if (error) return res.status(500).json({ error: error.message });

    res.json({ brands: (data || []).map(b => b.brand) });
}

module.exports = { list, brands };