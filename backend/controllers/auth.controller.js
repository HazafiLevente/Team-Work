const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { supabase } = require("../services/supabase");
const { resolveRole } = require("../services/control");

const JWT_SECRET = process.env.JWT_SECRET;

function setAuthCookie(res, token, rememberMe = false) {
    res.cookie("auth_token", token, {
        httpOnly: true,
        sameSite: "none",   // 🔥 KÖTELEZŐ cross-site-hoz
        secure: true,       // 🔥 KÖTELEZŐ (HTTPS!)
        path: "/",
        maxAge: 12 * 60 * 60 * 1000
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
            role: resolveRole(user.ID)
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

    const token = jwt.sign({
        id: user.ID,
        username: user.UserName,
        email: user.Email,
        role: resolveRole(user.ID)
    }, JWT_SECRET, { expiresIn: rememberMe ? "25d" : "12h" });


    setAuthCookie(res, token, rememberMe);

    res.json({ success: true });
};

exports.logout = (_, res) => {
    res.clearCookie("auth_token", { path: "/" });
    res.json({ success: true });
};

exports.me = (req, res) => {
    if (!req.user) return res.json({ loggedIn: false });
    res.json({ loggedIn: true, user: req.user });
};
exports.requestRegisterCode = async (req, res) => {
    const { fullname, username, email, password } = req.body;
    if (!fullname || !username || !email || !password) {
        return res.status(400).json({ error: "Missing fields" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    await supabase.from("user_register_code").insert({
        email,
        code,
        expires_at: expires
    });

    await sendRegisterCode(email, code);

    res.json({ success: true });
};
exports.verifyRegisterCode = async (req, res) => {
    const { fullname, username, email, password, code } = req.body;

    const { data, error } = await supabase
        .from("user_register_code")
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
        .from("user_register_code")
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
        role: resolveRole(user.ID)
    }, JWT_SECRET, { expiresIn: "12h" });

    setAuthCookie(res, token);

    res.json({ success: true });
};
