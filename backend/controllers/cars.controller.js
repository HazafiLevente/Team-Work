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

function mapCarRow(table, r) {
    return {
        table_name: table,
        id: r.ID ?? r.id ?? null,
        manufacturer: r.Manufacturer ?? r.manufacturer ?? null,
        model: r.Model ?? r.model ?? null,

        // ezek string range mezők lesznek, pl "100000-499999" vagy "500+"
        price_range: r["Price Range (Ft)"] ?? r.price_range ?? null,
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

async function getCarDetails(req, res) {
    const { table, id } = req.params;

    if (!CAR_TABLES.includes(table)) {
        return res.status(400).json({ error: "invalid car table" });
    }

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
      "category",
      "Avgprice"
    `)
        .eq("ID", id)
        .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ item: mapCarRow(table, data) });
}


module.exports = { listCars, getCarDetails };

