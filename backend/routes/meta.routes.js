const router = require("express").Router();
const { supabase } = require("../services/supabase");

// meglévő: /all, /instruments, /ht ... maradhat

router.get("/cars", async (req, res) => {
    const CAR_TABLES = [
        "cabrio_cars",
        "coupe_cars",
        "crossover_cars",
        "hatchback_cars",
        "mpv_cars",
        "pickup_cars",     // FIGYELJ: pickup_cars vagy pickup_car nálad?
        "wagon_cars",
    ];

    const uniq = (arr) =>
        Array.from(new Set((arr || [])
            .filter(Boolean)
            .map(x => String(x).trim())
            .filter(x => x.length)));

    async function colValues(table, col) {
        const { data, error } = await supabase
            .from(table)
            .select(`"${col}"`)   // <- fontos: szóközös oszlopok miatt idézőjel
            .limit(2000);

        if (error) {
            console.error("❌ meta/cars error:", table, col, error);
            throw error;
        }

        return uniq((data || []).map(r => r[col]));
    }

    try {
        const results = await Promise.all(
            CAR_TABLES.map(async (t) => {
                const [m, b, f, tr] = await Promise.all([
                    colValues(t, "Manufacturer"),
                    colValues(t, "Body Type"),
                    colValues(t, "Fuel Type"),
                    colValues(t, "Transmission"),
                ]);
                return { m, b, f, tr };
            })
        );

        res.json({
            table_names: CAR_TABLES,
            manufacturers: uniq(results.flatMap(x => x.m)).sort(),
            body_types: uniq(results.flatMap(x => x.b)).sort(),
            fuel_types: uniq(results.flatMap(x => x.f)).sort(),
            transmissions: uniq(results.flatMap(x => x.tr)).sort(),
        });
    } catch (e) {
        return res.status(500).json({
            error: e?.message ?? String(e),
        });
    }
});



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
