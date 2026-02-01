const { supabase } = require("../services/supabase");

exports.list = async (req, res) => {
    try {
        const userId = req.user.id; // A verifyUser middleware-ből jön

        const { data, error } = await supabase
            .from("setup[Setup]")
            .select("*")
            .eq("user_id", userId);

        if (error) throw error;

        res.json({ setups: data || [] });
    } catch (err) {
        console.error("Setup lekérdezési hiba:", err);
        res.status(500).json({ error: "Szerver hiba" });
    }
};

exports.create = async (req, res) => {
    res.json({ ok: true });
};

exports.children = async (req, res) => {
    res.json([]);
};
