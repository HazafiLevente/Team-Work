const { supabase } = require("../services/supabase");

// 1. Setupok listázása
exports.list = async (req, res) => {
    try {
        const userId = req.user.id;
        const { data, error } = await supabase
            .from("setup[Setup]")
            .select("*")
            .eq("user_id", userId);

        if (error) throw error;
        res.json({ setups: data || [] });
    } catch (err) {
        console.error("List hiba:", err);
        res.status(500).json({ error: "Hiba a setupok listázásakor" });
    }
};

exports.create = async (req, res) => {
    res.json({ ok: true });
};

// 2. GYEREK ELEMEK LEKÉRÉSE (JAVÍTOTT!)
exports.children = async (req, res) => {
    const setupId = req.params.id;
    console.log(`\n🚀 Setup keresése (ID: ${setupId})...`);

    try {
        // A) Kapcsolótábla lekérdezése
        // JAVÍTÁS: Kivettük a hibás .or() részt! Csak 'setup_id'-t keresünk.
        const { data: relations, error: relError } = await supabase
            .from("setup_rooms[Setup]")
            .select("*")
            .eq("setup_id", setupId);

        if (relError) {
            console.error("❌ Hiba a setup_rooms olvasásakor:", relError.message);
            return res.status(500).json({ error: relError.message });
        }

        // Ha üres, jelezzük a konzolon, de visszaküldünk egy üres tömböt (NEM HIBÁT!)
        if (!relations || relations.length === 0) {
            console.log("⚠️ A setup_rooms tábla nem tartalmaz sort ehhez az ID-hoz.");
            return res.json([]);
        }

        console.log(`✅ Találtunk ${relations.length} kapcsolatot.`);
        let resultItems = [];

        // B) Végigmegyünk a sorokon és lekérjük az adatokat a táblákból
        for (const relation of relations) {
            const tableName = relation.table_name || relation.Table_Name;
            const itemId = relation.item_id || relation.Item_ID;

            if (!tableName || !itemId) {
                console.warn("   ⚠️ Hiányos sor az adatbázisban:", relation);
                continue;
            }

            // Lekérjük a terméket a saját táblájából
            const { data: item } = await supabase
                .from(tableName)
                .select("*")
                // Itt marad a védelem, mert az ID lehet nagybetűs a régi tábláknál
                .or(`ID.eq.${itemId},id.eq.${itemId}`)
                .maybeSingle();

            if (item) {
                resultItems.push({
                    ...item,
                    category: tableName,
                    display_name: item.Model || item.model || item.Name || item.name || "Névtelen",
                    manufacturer: item.Manufacturer || item.manufacturer || ""
                });
            }
        }

        console.log(`🏁 Küldés a frontendnek: ${resultItems.length} db elem.`);
        res.json(resultItems);

    } catch (err) {
        console.error("Végzetes hiba:", err);
        res.status(500).json({ error: "Szerver hiba" });
    }
};