const { supabase } = require("../services/supabase");

const tablesToScan = [
    "acoustic_keyboards[Setup]",
    "acoustic[Setup]",
    "audio_processor[Setup]",
    "back_speaker[Setup]",
    "bass_amplifier[Setup]",
    "bass_shaker[Setup]",
    "bowed_string_instruments[Setup]",
    "brass_instruments[Setup]",
    "Car_setup[Setup]",
    "ceiling_speaker[Setup]",
    "center_speaker[Setup]",
    "digital_instruments[Setup]",
    "electric[Setup]",
    "electronic_keyboards[Setup]",
    "electronic_percussion[Setup]",
    "floor_speaker[Setup]",
    "front_speaker[Setup]",
    "home_theater_setups[Setup]",
    "idiophones[Setup]",
    "instruments[Setup]",
    "keyboard_instruments[Setup]",
    "membranophones[Setup]",
    "pc_details[Setup]",
    "percussion_instruments[Setup]",
    "plucked_string_instruments[Setup]",
    "reciever_setup[Setup]",
    "saxophone[Setup]",
    "setup_rooms[Setup]",
    "setup[Setup]",
    "side_speaker[Setup]",
    "sound-producing[Setup]",
    "string_instruments[Setup]",
    "struck_string_instruments[Setup]",
    "studio_monitor_setup[Setup]",
    "subwoofer[Setup]",
    "wind_instruments[Setup]",
    "woodwind_instruments[Setup]"
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

        // ✅ UI kompat: ha nálad "name" van, adunk mellé "setup_name"-t is
        const normalized = (data || []).map(s => ({
            ...s,
            setup_name: s.setup_name ?? s.name ?? "Névtelen setup",
        }));

        res.json({ setups: normalized });
    } catch (err) {
        console.error("❌ Setup list hiba:", err);
        res.json({ setups: [] });
    }
};

// SETUP GYEREKEK
exports.children = async (req, res) => {
    const setupId = req.params.id; // ✅ STRING/UUID/NUMBER mind ok

    if (!setupId) return res.json([]);

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

                const mapped = data.map(item => {
                    const manufacturer =
                        item.Manufacturer ||
                        item.manufacturer ||
                        item.brand ||
                        item.Brand ||
                        "";

                    const model =
                        item.Model ||
                        item.model ||
                        item.product_model ||
                        item.type ||
                        "";

                    const name =
                        item.product_name ||
                        item.setup_name ||
                        item.name ||
                        item.Name ||
                        item.title ||
                        "";

                    return {
                        ...item,
                        category: tableName,

                        // 🔥 IGAZI TERMÉKNÉV LOGIKA
                        display_name:
                            manufacturer && model
                                ? `${manufacturer} ${model}`
                                : manufacturer && name
                                    ? `${manufacturer} ${name}`
                                    : model
                                        ? model
                                        : name
                                            ? name
                                            : `Ismeretlen termék (#${item.id ?? "?"})`,

                        manufacturer
                    };
                });

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
