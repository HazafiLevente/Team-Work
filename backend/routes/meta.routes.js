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
    let { data, error } = await supabase.from(viewName).select("*").limit(1);
    if (error) return { data: null, error };

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



/* =========================================================
   ✅ CARS META (NEW)
   GET /meta/cars
   -> car táblákból épít meta-t (options listák)
========================================================= */

const CAR_TABLES = [
    "cabrio_cars",
    "coupe_cars",
    "crossover_cars",
    "hatchback_cars",
    "mpv_cars",
    "pickup_cars",
    "wagon_cars",
];

const CAR_SELECT_COLS = `
  "Manufacturer",
  "Model",
  "Price Range (Ft)",
  "Body Type",
  "Horsepower",
  "Acceleration (s)",
  "Seats",
  "Fuel Type",
  "Year",
  "Transmission",
  "category",
  "Avgprice"
`;

function norm(v) {
    return String(v ?? "").trim();
}

function uniq(arr) {
    return Array.from(new Set((arr || []).map(norm).filter(Boolean)));
}

function extractNumberTokens(values) {
    // "120-160" "500+" "7.5" "7,5" -> számok listája stringként
    const nums = [];
    for (const v of values || []) {
        const s = norm(v).replace(",", ".");
        const m = s.match(/-?\d+(\.\d+)?/g);
        if (m) nums.push(...m);
    }
    return uniq(nums).sort((a, b) => Number(a) - Number(b));
}

router.get("/cars", async (req, res) => {
    try {
        // meta-hoz nem kell minden sor: elég párszáz sor / tábla
        const perTable = Math.min(Number(req.query.perTable) || 500, 2000);

        const results = await Promise.all(
            CAR_TABLES.map(async (t) => {
                const { data, error } = await supabase
                    .from(t)
                    .select(CAR_SELECT_COLS)
                    .limit(perTable);

                if (error) {
                    console.error("cars meta error", t, error);
                    return [];
                }
                return data || [];
            })
        );

        // meta.routes.js végére
        router.get("/cars", async (req, res) => {
            const { data, error } = await readSingleMeta("car_filter_meta_v1");
            if (error) return res.status(500).json({ error: error.message || String(error) });
            res.json(data);
        });


        const rows = results.flat();

        const manufacturers = uniq(rows.map(r => r["Manufacturer"]))
            .sort((a, b) => a.localeCompare(b, "hu"));

        const bodyTypes = uniq(rows.map(r => r["Body Type"])).sort();
        const fuelTypes = uniq(rows.map(r => r["Fuel Type"])).sort();
        const transmissions = uniq(rows.map(r => r["Transmission"])).sort();

        const horsepowerNums = extractNumberTokens(rows.map(r => r["Horsepower"]));
        const accelNums = extractNumberTokens(rows.map(r => r["Acceleration (s)"]));
        const seatsNums = extractNumberTokens(rows.map(r => r["Seats"]));
        const yearNums = extractNumberTokens(rows.map(r => r["Year"]));
        const priceNums = extractNumberTokens(rows.map(r => r["Price Range (Ft)"]));

        return res.json({
            car_filter_meta_v1: {
                table_names: CAR_TABLES,
                manufacturers,
                dynamic: [
                    { key: "body_type", kind: "select", nonNull: bodyTypes.length, options: bodyTypes, distinct: bodyTypes.length },
                    { key: "fuel_type", kind: "select", nonNull: fuelTypes.length, options: fuelTypes, distinct: fuelTypes.length },
                    { key: "transmission", kind: "select", nonNull: transmissions.length, options: transmissions, distinct: transmissions.length },

                    { key: "horsepower", kind: "range", nonNull: horsepowerNums.length, options: horsepowerNums, distinct: horsepowerNums.length },
                    { key: "acceleration", kind: "range", nonNull: accelNums.length, options: accelNums, distinct: accelNums.length },
                    { key: "seats", kind: "range", nonNull: seatsNums.length, options: seatsNums, distinct: seatsNums.length },
                    { key: "year", kind: "range", nonNull: yearNums.length, options: yearNums, distinct: yearNums.length },

                    // opcionális: ha akarod min/max szerűen használni
                    { key: "price_range", kind: "range", nonNull: priceNums.length, options: priceNums, distinct: priceNums.length },
                ]
            }
        });
    } catch (e) {
        console.error("cars meta fatal", e);
        return res.status(500).json({ error: "cars meta failed" });
    }
});


module.exports = router;
