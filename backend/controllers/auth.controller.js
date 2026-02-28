const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { supabase } = require("../services/supabase");
const { resolveRole } = require("../services/control");
const { sendPasswordResetCode } = require("../services/mailer");
const { sendRegisterCode } = require("../services/mailer");
const crypto = require("crypto"); // vagy maradhat Math.random is

const JWT_SECRET = process.env.JWT_SECRET;

function setAuthCookie(res, token, rememberMe = false) {
    res.cookie("auth_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
        maxAge: rememberMe
            ? 25 * 24 * 60 * 60 * 1000
            : 12 * 60 * 60 * 1000
    });
}








exports.register = async (req, res) => {
    try {
        const { fullname, username, email, password } = req.body;
        if (!fullname || !username || !email || !password) {
            return res.status(400).json({ error: "Missing fields" });
        }

        const hashed = await bcrypt.hash(password, 10);

        const { data: user, error } = await supabase
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

        await supabase.from("user_more[Auth]").insert({ user_id: user.ID });

        const token = jwt.sign({
            id: user.ID,
            username: user.UserName,
            email: user.Email,
            role: resolveRole(user.ID, user.Role)
        }, JWT_SECRET, { expiresIn: "12h" });

        setAuthCookie(res, token);

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "register failed" });
    }
};

exports.login = async (req, res) => {
    const { email, password, rememberMe } = req.body;

    const { data: users } = await supabase
        .from("user[Auth]")
        .select("*")
        .eq("Email", email)
        .limit(1);

    if (!users?.length) return res.status(401).json({ error: "Invalid login" });

    const user = users[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid login" });

    const token = jwt.sign(
        { id: user.ID, username: user.UserName, email: user.Email, role: resolveRole(user.ID, user.Role) },
        JWT_SECRET,
        { expiresIn: rememberMe ? "25d" : "12h" }
    );

    setAuthCookie(res, token, rememberMe); // ✅ IDE JÖN BE

    res.json({ success: true });
};

exports.logout = (_, res) => {
    const isProd = process.env.NODE_ENV === "production";

    res.clearCookie("auth_token", {
        path: "/",
        sameSite: isProd ? "none" : "lax",
        secure: isProd
    });

    res.json({ success: true });
};


exports.me = (req, res) => {
    if (!req.user) return res.json({ loggedIn: false });
    res.json({ loggedIn: true, user: req.user });
};
exports.requestRegisterCode = async (req, res) => {
    try {
        const { fullname, username, email, password } = req.body;
        if (!fullname || !username || !email || !password) {
            return res.status(400).json({ error: "Missing fields" });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        const { data: inserted, error: insErr } = await supabase
            .from("user_register_code[Auth]")
            .insert({ email, code, expires_at: expires, used: false })
            .select()
            .single();

        if (insErr) {
            console.error("❌ register code insert error:", insErr);
            return res.status(500).json({ error: "Insert failed" });
        }

        console.log("✅ register code saved:", inserted);

        // 🔥 mail küldés: ha ez száll el, attól még ne legyen 500 (különben nincs code step)
        try {
            await sendRegisterCode(email, code);
        } catch (mailErr) {
            console.error("❌ sendRegisterCode failed:", mailErr);
            // opcionálisan: visszaadhatsz 200-at is, hogy a UI menjen tovább,
            // csak jelezd, hogy mail hiba volt:
            return res.status(200).json({ success: true, mailSent: false });
        }

        return res.json({ success: true, mailSent: true });
    } catch (e) {
        console.error("❌ requestRegisterCode fatal:", e);
        return res.status(500).json({ error: "requestRegisterCode failed" });
    }
};
exports.verifyRegisterCode = async (req, res) => {
    const { fullname, username, email, password, code } = req.body;

    const { data, error } = await supabase
        .from("user_register_code[Auth]")
        .select("*")
        .eq("email", email)
        .eq("code", code)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        return res.status(400).json({ error: "Invalid or expired code" });
    }

    await supabase
        .from("user_register_code[Auth]")
        .update({ used: true })
        .eq("id", data.id);

    const hashed = await bcrypt.hash(password, 10);

    const { data: user } = await supabase
        .from("user[Auth]")
        .insert({
            Name: fullname,
            UserName: username,
            Email: email,
            password: hashed
        })
        .select()
        .single();

    await supabase.from("user_more[Auth]").insert({ user_id: user.ID });

    const token = jwt.sign({
        id: user.ID,
        username: user.UserName,
        email: user.Email,
        role: resolveRole(user.ID, user.Role)
    }, JWT_SECRET, { expiresIn: "12h" });

    setAuthCookie(res, token);

    res.json({ success: true });
};
exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ error: "Missing fields" });
        }

        const { data: row, error: findErr } = await supabase
            .from("user_password_reset[Auth]")
            .select("*")
            .eq("email", email)
            .eq("code", code)
            .eq("used", false)
            .gt("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false })
            .single();

        if (findErr || !row) {
            console.error("❌ reset lookup error:", findErr);
            return res.status(400).json({ error: "Invalid or expired code" });
        }

        const hashed = await bcrypt.hash(newPassword, 10);

        // user update (ID alapján a legbiztosabb)
        const { error: upErr } = await supabase
            .from("user[Auth]")
            .update({ password: hashed })
            .eq("ID", row.user_id);

        if (upErr) {
            console.error("❌ password update error:", upErr);
            return res.status(500).json({ error: "Password update failed" });
        }

        await supabase
            .from("user_password_reset[Auth]")
            .update({ used: true })
            .eq("id", row.id);

        return res.json({ success: true });
    } catch (e) {
        console.error("❌ resetPassword fatal:", e);
        return res.status(500).json({ error: "resetPassword failed" });
    }
};
exports.requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Missing email" });

        // user lookup (nálad Email nagy E!)
        const { data: user, error: userErr } = await supabase
            .from("user[Auth]")
            .select("ID, Email")
            .eq("Email", email)
            .single();

        if (userErr || !user) return res.status(404).json({ error: "User not found" });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        const { error: insErr } = await supabase
            .from("user_password_reset[Auth]")
            .insert({
                user_id: user.ID,
                email: user.Email,
                code,
                used: false,
                expires_at: expiresAt
            });

        if (insErr) {
            console.error("❌ reset insert error:", insErr);
            return res.status(500).json({ error: "Reset insert failed" });
        }

        await sendPasswordResetCode(email, code);
        return res.json({ success: true });
    } catch (e) {
        console.error("❌ requestPasswordReset fatal:", e);
        return res.status(500).json({ error: "requestPasswordReset failed" });
    }
};