const { supabase } = require("../services/supabase");

// ⚠️ IDE ÍRD BE AZ ÖSSZES TÁBLÁT, AMIBEN VAN setup_id
const tablesToScan = [
    "acoustic_drums",
    "acoustic_guitars",
    "alt_saxophone",
    "audio_processors",
    "back_speaker",
    "bariton_saxophone",
    "bass_amplifier",
    "bass_shaker",
    "bassers",
    "c_trumpets",
    "cabrio_cars",
    "ceiling_speakers",
    "center_speakers",
    "cleaning_brushes",
    "coupe_cars",
    "crossover_cars",
    "daws",
    "effects_pedal",
    "electric_drums",
    "electric_guitars",
    "floor_speakers",
    "front_speaker",
    "gaming_headsets",
    "guitarstrings",
    "hatchback_cars",
    "home_theater",
    "keyboards",
    "mice",
    "microphones",
    "midis",
    "mixer",
    "motherboard",
    "mpv_cars",
    "pickup_cars",
    "portable_speakers",
    "processors",
    "psu",
    "ram",
    "saxophone_cases",
    "side_speaker",
    "software_products",
    "soundcards",
    "storages",
    "studio_monitor_speakers",
    "subwoofer",
    "utp_cables",
    "video_cards",
    "wagon_cars",
    "wind_instrument_oils"
];

// SETUP LISTA
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
        console.error("❌ Setup list hiba:", err);
        res.json({ setups: [] });
    }
};

// SETUP GYEREKEK
exports.children = async (req, res) => {
    const setupId = Number(req.params.id);

    if (isNaN(setupId)) {
        console.log("❌ setupId nem szám:", req.params.id);
        return res.json([]);
    }

    console.log(`\n🔍 Setup ID keresés: ${setupId}`);

    try {
        let allItems = [];

        for (const tableName of tablesToScan) {
            const { data, error } = await supabase
                .from(tableName)
                .select("*")
                .eq("setup_id", setupId);

            if (error) {
                console.log(`⚠️ ${tableName} kihagyva:`, error.message);
                continue;
            }

            if (data && data.length > 0) {
                console.log(`✅ ${tableName}: ${data.length} elem`);

                const mapped = data.map(item => ({
                    ...item,
                    category: tableName,
                    display_name:
                        item.Model ||
                        item.model ||
                        item.Name ||
                        item.name ||
                        "Névtelen termék",
                    manufacturer:
                        item.Manufacturer ||
                        item.manufacturer ||
                        ""
                }));

                allItems.push(...mapped);
            }
        }

        console.log(`🏁 Összes item: ${allItems.length}\n`);
        res.json(allItems);

    } catch (err) {
        console.error("❌ Végzetes backend hiba:", err);
        res.json([]);
    }
};
