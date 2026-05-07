const { supabase } = require("../services/supabase");

exports.table = async (req, res) => {
    const table = req.params.name;

    const { data, error } = await supabase.from(table).select("*");
    if (error) return res.status(400).json({ error: error.message });

    res.json(data || []);
};
