const { supabase } = require("../services/supabase");

const CAR_TABLES = [
    "cabrio_cars",
    "coupe_cars",
    "crossover_cars",
    "hatchback_cars",
    "mpv_cars",
    "pickup_cars",
    "wagon_cars",
];

function parseAveragePrice(value) {
    if (value == null) return null;

    const s = String(value)
        .trim()
        .replace(/\s/g, "")
        .replace(/,/g, ".");

    if (!s) return null;

    const nums = (s.match(/\d+(\.\d+)?/g) || [])
        .map(Number)
        .filter(Number.isFinite);

    if (!nums.length) return null;

    // pl. "500+" -> 500
    if (nums.length === 1) return Math.round(nums[0]);

    // pl. "100000-499999" -> átlag
    const min = Math.min(...nums);
    const max = Math.max(...nums);

    return Math.round((min + max) / 2);
}

function mapCarRow(table, r) {
    const priceRange = r["Price Range (Ft)"] ?? r.price_range ?? null;
    const avgPrice = parseAveragePrice(priceRange);

    return {
        table_name: table,
        id: r.ID ?? r.id ?? null,
        manufacturer: r.Manufacturer ?? r.manufacturer ?? null,
        model: r.Model ?? r.model ?? null,

        // ✅ frontend ezt fogja tudni használni
        price: avgPrice,

        // ✅ range is marad, ha később kell
        price_range: priceRange,

        body_type: r["Body Type"] ?? r.body_type ?? null,
        horsepower: r.Horsepower ?? r.horsepower ?? null,
        acceleration: r["Acceleration (s)"] ?? r.acceleration ?? null,
        seats: r.Seats ?? r.seats ?? null,
        fuel_type: r["Fuel Type"] ?? r.fuel_type ?? null,
        year: r.Year ?? r.year ?? null,
        transmission: r.Transmission ?? r.transmission ?? null,
        category: r.category ?? "car",
    };
}

async function listCars(req, res) {
    const limit = Math.min(Number(req.query.limit) || 200, 2000);

    try {
        const perTable = Math.ceil(limit / CAR_TABLES.length);

        const results = await Promise.all(
            CAR_TABLES.map(async (table) => {
                const { data, error } = await supabase
                    .from(table)
                    .select(`
            "ID",
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
            "category"
          `)
                    .limit(perTable);

                if (error) {
                    console.error("cars fetch error", table, error);
                    return [];
                }

                return (data || []).map((r) => mapCarRow(table, r));
            })
        );

        const items = results.flat().slice(0, limit);
        return res.json({ items });
    } catch (e) {
        console.error("listCars fatal", e);
        return res.status(500).json({ error: "cars fetch failed" });
    }
}

module.exports = { listCars };