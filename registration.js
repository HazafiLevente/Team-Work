const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");
const { sendWelcomeEmail } = require("./mailer");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function registerUser(req, res) {
    try {
        const { fullname, username, email, password } = req.body;

        if (!fullname || !username || !email || !password) {
            return res.status(400).json({ error: "Missing fields" });
        }

        // 🔍 email / username ütközés ellenőrzés (AJÁNLOTT)
        const { data: exists } = await supabase
            .from("user[Auth]")
            .select("ID")
            .or(`Email.eq.${email},UserName.eq.${username}`);

        if (exists && exists.length > 0) {
            return res.status(409).json({
                error: "Email vagy felhasználónév már létezik"
            });
        }

        const hashed = await bcrypt.hash(password, 10);

        const { error } = await supabase
            .from("user[Auth]")
            .insert([{
                Name: fullname,
                UserName: username,
                Email: email,
                password: hashed
            }]);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // 📧 EMAIL KÜLDÉS
        await sendWelcomeEmail(email, username);

        res.json({ message: "Registration successful" });

    } catch (err) {
        console.error("❌ REGISTRATION ERROR:", err);
        res.status(500).json({ error: "Registration failed" });
    }
}

module.exports = { registerUser };
