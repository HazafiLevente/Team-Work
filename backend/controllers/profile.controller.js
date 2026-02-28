const bcrypt = require("bcryptjs");
const { supabase } = require("../services/supabase");

exports.getProfile = async (req, res) => {
    const userId = req.user.id;

    // 1️⃣ alap user
    const { data: user, error: userError } = await supabase
        .from("user[Auth]")
        .select("ID, UserName, Name, Email")
        .eq("ID", userId)
        .single();

    if (userError) {
        return res.status(500).json({ error: userError.message });
    }

    // 2️⃣ extended profile
    let { data: more, error: moreError } = await supabase
        .from("user_more[Auth]")
        .select("age, phone_number, city")
        .eq("user_id", userId)
        .single();

    // ⬅️ HA NINCS, LÉTREHOZZUK
    if (moreError && moreError.code === 'PGRST116') {
        const { data: inserted, error: insertError } = await supabase
            .from("user_more[Auth]")
            .insert({
                user_id: userId,
                age: null,
                phone_number: null,
                city: null
            })
            .select()
            .single();

        if (insertError) {
            return res.status(500).json({ error: insertError.message });
        }

        more = inserted;
    }

    // 3️⃣ Összesített érték (Total Price)
    let totalSetupPrice = 0;
    try {
        const tablesToScan = [
            "acoustic_keyboards[Setup]", "acoustic[Setup]", "audio_processor[Setup]", "back_speaker[Setup]",
            "bass_amplifier[Setup]", "bass_shaker[Setup]", "bowed_string_instruments[Setup]", "brass_instruments[Setup]",
            "Car_setup[Setup]", "ceiling_speaker[Setup]", "center_speaker[Setup]", "digital_instruments[Setup]",
            "electric[Setup]", "electronic_keyboards[Setup]", "electronic_percussion[Setup]", "floor_speaker[Setup]",
            "front_speaker[Setup]", "home_theater_setups[Setup]", "idiophones[Setup]", "instruments[Setup]",
            "keyboard_instruments[Setup]", "membranophones[Setup]", "pc_details[Setup]", "percussion_instruments[Setup]",
            "plucked_string_instruments[Setup]", "reciever_setup[Setup]", "saxophone[Setup]", "side_speaker[Setup]",
            "sound-producing[Setup]", "string_instruments[Setup]", "struck_string_instruments[Setup]", "studio_monitor_setup[Setup]",
            "subwoofer[Setup]", "wind_instruments[Setup]", "woodwind_instruments[Setup]", "modem[Setup]",
            "router[Setup]", "switches[Setup]", "mixer[Setup]"
        ];

        // Fetch all setup IDs for this user
        const { data: setups } = await supabase
            .from("setup[Setup]")
            .select("id")
            .eq("user_id", userId);

        if (setups && setups.length > 0) {
            const setupIds = setups.map(s => s.id);

            // Parallel calculate across all mapped components
            const pricePromises = tablesToScan.map(async (tableName) => {
                const { data, error } = await supabase
                    .from(tableName)
                    .select("price, price_huf")
                    .in("setup_id", setupIds); // match any of the user's setups

                if (error || !data) return 0;
                return data.reduce((sum, item) => {
                    const p = item.price || item.price_huf || 0;
                    return sum + Number(p);
                }, 0);
            });

            const prices = await Promise.all(pricePromises);
            totalSetupPrice = prices.reduce((a, b) => a + b, 0);
        }
    } catch (err) {
        console.error("Hiba a profil összérték számításában:", err);
    }

    res.json({
        username: user.UserName,
        fullname: user.Name,
        email: user.Email,
        age: more?.age ?? null,
        phone: more?.phone_number ?? null,
        city: more?.city ?? null,
        totalSetupPrice // ✅ Új mező
    });
};


exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, fullname, phone, age, city } = req.body;

        // 1) user[Auth] frissítés
        const { error: userError } = await supabase
            .from("user[Auth]")
            .update({
                UserName: username,
                Name: fullname
            })
            .eq("ID", userId);

        if (userError) {
            return res.status(500).json({ error: userError.message });
        }

        // 2) user_more[Auth] update
        const { data: updatedRows, error: moreUpdError } = await supabase
            .from("user_more[Auth]")
            .update({
                age: age ?? null,
                phone_number: phone ?? null,
                city: city ?? null
            })
            .eq("user_id", userId)
            .select("user_id");

        if (moreUpdError) {
            return res.status(500).json({ error: moreUpdError.message });
        }

        // 3) ha nem volt még sor -> insert
        if (!updatedRows || updatedRows.length === 0) {
            const { error: moreInsError } = await supabase
                .from("user_more[Auth]")
                .insert({
                    user_id: userId,
                    age: age ?? null,
                    phone_number: phone ?? null,
                    city: city ?? null
                });

            if (moreInsError) {
                return res.status(500).json({ error: moreInsError.message });
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error("updateProfile ERROR:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        const { data: user, error: userError } = await supabase
            .from("user[Auth]")
            .select("password")
            .eq("ID", userId)
            .single();

        if (userError || !user) {
            return res.status(500).json({ error: userError?.message || "User not found" });
        }

        const ok = await bcrypt.compare(oldPassword, user.password);
        if (!ok) {
            return res.status(400).json({ error: "Wrong password" });
        }

        const hashed = await bcrypt.hash(newPassword, 10);

        const { error: updError } = await supabase
            .from("user[Auth]")
            .update({ password: hashed })
            .eq("ID", userId);

        if (updError) {
            return res.status(500).json({ error: updError.message });
        }

        res.json({ success: true });
    } catch (err) {
        console.error("changePassword ERROR:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
