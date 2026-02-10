const router = require("express").Router();
const { supabase } = require("../services/supabase");

/**
 * GET /meta/all
 * -> táblák listája (ez megmaradt)
 */
router.get("/all", async (req, res) => {
    const { data, error } = await supabase.rpc("get_all_tables");
    if (error) return res.status(500).json({ error: error.message });

    const excluded = ["auth", "profiles"];
    const cleaned = (data || [])
        .map(t => t.table_name)
        .filter(name => name && !excluded.includes(name));

    res.json({ tables: cleaned });
});

/**
 * Segédfüggvény: 1 soros meta view lekérés
 */
async function readSingleMeta(viewName) {
    // 1) próbáljuk single() módon
    let { data, error } = await supabase.from(viewName).select("*").limit(1);

    if (error) return { data: null, error };

    // data tömb lesz, vegyük az első sort
    const row = Array.isArray(data) ? data[0] : data;

    if (!row) {
        return { data: null, error: { message: `No rows in ${viewName}` } };
    }

    return { data: row, error: null };
}

/**
 * GET /meta/instruments
 * -> instrument_filter_meta_v1 view-ból olvas
 */
router.get("/instruments", async (req, res) => {
    const { data, error } = await readSingleMeta("instrument_filter_meta_v1");
    if (error) return res.status(500).json({ error: error.message || String(error) });
    res.json(data);
});

/**
 * GET /meta/ht
 * -> ht_filter_meta_v1 view-ból olvas
 */
router.get("/ht", async (req, res) => {
    const { data, error } = await readSingleMeta("ht_filter_meta_v1");
    if (error) return res.status(500).json({ error: error.message || String(error) });
    res.json(data);
});

module.exports = router;
