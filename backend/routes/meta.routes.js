const router = require("express").Router();
const { supabase } = require("../services/supabase");
const ctrl = require("../controllers/meta.controller");

/* =========================================================
   HELPERS
========================================================= */

function norm(v) {
    return String(v ?? "").trim();
}

function uniq(arr) {
    return Array.from(new Set((arr || []).map(norm).filter(Boolean)));
}

function extractNumberTokens(values) {
    const nums = [];

    for (const v of values || []) {
        const s = norm(v).replace(",", ".");
        const m = s.match(/-?\d+(\.\d+)?/g);
        if (m) nums.push(...m);
    }

    return uniq(nums).sort((a, b) => Number(a) - Number(b));
}

/* =========================================================
   /meta/all
========================================================= */

router.get("/all", async (req, res) => {
    const { data, error } = await supabase.rpc("get_all_tables");

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    const excluded = ["auth", "profiles"];
    const cleaned = (data || [])
        .map(t => t.table_name)
        .filter(name => name && !excluded.includes(name));

    res.json({ tables: cleaned });
});

/* =========================================================
   /meta/cars
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

router.get("/cars", async (req, res) => {
    try {
        const perTable = Math.min(Number(req.query.perTable) || 500, 2000);

        const results = await Promise.all(
            CAR_TABLES.map(async (tableName) => {
                const { data, error } = await supabase
                    .from(tableName)
                    .select(CAR_SELECT_COLS)
                    .limit(perTable);

                if (error) {
                    console.error("cars meta error", tableName, error);
                    return [];
                }

                return data || [];
            })
        );

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
                    { key: "price_range", kind: "range", nonNull: priceNums.length, options: priceNums, distinct: priceNums.length },
                ]
            }
        });
    } catch (e) {
        console.error("cars meta fatal", e);
        return res.status(500).json({ error: e?.message || "cars meta failed" });
    }
});

/* =========================================================
   NEW META ENDPOINTS
   Ezek menjenek a controllerből, NE view-ból
========================================================= */

router.get("/computer", ctrl.getComputerMeta);
router.get("/ht", ctrl.getHtMeta);
router.get("/instruments", ctrl.getInstrumentMeta);

module.exports = router;