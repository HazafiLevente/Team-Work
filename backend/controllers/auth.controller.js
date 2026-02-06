const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { supabase } = require("../services/supabase");
const { resolveRole } = require("../services/control");

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res) => {
    try {
        const { fullname, username, email, password } = req.body;

        if (!fullname || !username || !email || !password) {
            return res.status(400).json({ error: "Missing fields" });
        }

        const hashed = await bcrypt.hash(password, 10);

        const { data: users, error } = await supabase
            .from("user[Auth]")
            .insert([{
                Name: fullname,
                UserName: username,
                Email: email,
                password: hashed
            }])
            .select()
            .single();

        if (error) return res.status(500).json({ error: error.message });

        // user_more
        await supabase
            .from("user_more[Auth]")
            .insert({
                user_id: users.ID,
                age: null,
                phone_number: null,
                city: null
            });

        // bell reg message
        await supabase
            .from("register_message[System]")
            .insert([{
                title: "Sikeres regisztráció 🎉",
                message: `Üdv ${username}! A fiókod sikeresen létrejött.`,
                target: String(users.ID),
                created_at: new Date().toISOString()
            }]);

        return res.json({ success: true });
    } catch (e) {
        console.error("❌ register error:", e);
        return res.status(500).json({ error: "register failed" });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;

        const { data: users, error } = await supabase
            .from("user[Auth]")
            .select("*")
            .eq("Email", email)
            .limit(1);

        if (error) return res.status(500).json({ error: error.message });
        if (!users?.length) return res.status(401).json({ error: "Invalid login" });

        const user = users[0];

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ error: "Invalid login" });

        if (!JWT_SECRET) return res.status(500).json({ error: "JWT_SECRET missing" });

        const expiresIn = rememberMe ? "25d" : "12h";

        const token = jwt.sign({
            id: Number(user.ID),
            username: user.UserName,
            email: user.Email,
            role: user.role ?? resolveRole(Number(user.ID))
        }, JWT_SECRET, { expiresIn });

        res.cookie("auth_token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            maxAge: rememberMe
                ? 25 * 24 * 60 * 60 * 1000
                : 12 * 60 * 60 * 1000
        });

        return res.json({ success: true });
    } catch (e) {
        console.error("❌ login error:", e);
        return res.status(500).json({ error: "login failed" });
    }
};

exports.logout = (_, res) => {
    res.clearCookie("auth_token");
    res.json({ success: true });
};

exports.me = async (req, res) => {
    try {
        if (!req.user?.id) return res.status(401).json({ loggedIn: false });

        return res.json({
            loggedIn: true,
            user: {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                role: req.user.role
            }
        });
    } catch (e) {
        console.error("❌ /auth/me error:", e);
        return res.status(500).json({ error: "me failed" });
    }
};
