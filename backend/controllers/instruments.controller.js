const { supabase } = require("../services/supabase");

async function list(req, res) {
    // A korábban létrehozott SQL View-ból kérdezzük le az adatokat
    const { data, error } = await supabase
        .from("instrument_items_view")
        .select("*");

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    // A többi kontrolleredhez hasonlóan "items" kulcs alatt küldjük vissza
    res.json({ items: data || [] });
}

module.exports = { list };