const router = require("express").Router();
const { supabase } = require("../services/supabase");

router.get("/all", async (req, res) => {
    const { data, error } = await supabase.rpc("get_all_tables");
    if (error) return res.status(500).json({ error: error.message });

    const excluded = ["auth", "profiles"];
    const cleaned = (data || [])
        .map(t => t.table_name)
        .filter(name => name && !excluded.includes(name));

    res.json({ tables: cleaned });
});

module.exports = router;
