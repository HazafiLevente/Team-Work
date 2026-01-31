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

    res.json({
        username: user.UserName,
        fullname: user.Name,
        email: user.Email,
        age: more?.age ?? null,
        phone: more?.phone_number ?? null,
        city: more?.city ?? null
    });
};


exports.updateProfile = async (req, res) => {
    const userId = req.user.id;
    const { username, fullname, phone, age, city } = req.body;

    const { error } = await supabase
        .from("user[Auth]")
        .update({
            UserName: username,
            Name: fullname,
            phone,
            age,
            city
        })
        .eq("ID", userId);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
};

exports.changePassword = async (req, res) => {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    const { data: user } = await supabase
        .from("user[Auth]")
        .select("password")
        .eq("ID", userId)
        .single();

    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) {
        return res.status(400).json({ error: "Wrong password" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await supabase
        .from("user[Auth]")
        .update({ password: hashed })
        .eq("ID", userId);

    res.json({ success: true });
};
