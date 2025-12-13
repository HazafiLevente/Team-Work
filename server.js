require("dotenv").config();
console.log("ENV CHECK:", {
    SUPABASE_URL: process.env.SUPABASE_URL,
    HAS_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
});
const express = require("express");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { createClient } = require("@supabase/supabase-js");

/* ======================================================
   APP + CONFIG
====================================================== */
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

/* ======================================================
   LOAD ADMINS FROM JSON
====================================================== */
const adminFilePath = path.join(__dirname, "admin.json");
let ADMIN_IDS = [];

try {
    const raw = fs.readFileSync(adminFilePath, "utf8");
    const parsed = JSON.parse(raw);
    ADMIN_IDS = Object.values(parsed).map(Number);
    console.log("✅ Admin IDs loaded:", ADMIN_IDS);
} catch (err) {
    console.error("❌ admin.json betöltési hiba!", err);
}

/* ======================================================
   SUPABASE (SERVICE ROLE – NO RLS)
====================================================== */
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* ======================================================
   MIDDLEWARE
====================================================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "webs")));

/* ======================================================
   AUTH MIDDLEWARE
====================================================== */
function verifyUser(req, res, next) {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: "Not logged in" });

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        req.user.isAdmin = ADMIN_IDS.includes(req.user.id);
        next();
    } catch {
        return res.status(403).json({ error: "Invalid token" });
    }
}

function verifyAdmin(req, res, next) {
    verifyUser(req, res, () => {
        if (!req.user.isAdmin) {
            return res.status(403).json({ error: "Admin only" });
        }
        next();
    });
}

/* ======================================================
   PAGE ROUTES
====================================================== */
app.get("/", (_, res) =>
    res.sendFile(path.join(__dirname, "webs/Home.html"))
);

app.get("/home", (_, res) =>
    res.sendFile(path.join(__dirname, "webs/Home.html"))
);

app.get("/regist", (_, res) =>
    res.sendFile(path.join(__dirname, "webs/Regist.html"))
);

app.get("/profile", (_, res) =>
    res.sendFile(path.join(__dirname, "webs/Profile.html"))
);

/* ======================================================
   PUBLIC DATA API
====================================================== */
app.get("/api/guitars", async (_, res) => {
    const { data, error } = await supabase.from("electric_guitars").select("*");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get("/api/cpu", async (_, res) => {
    const { data, error } = await supabase.from("processors").select("*");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get("/api/motherboard", async (_, res) => {
    const { data, error } = await supabase.from("motherboard").select("*");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get("/api/saxophone/alt", async (_, res) => {
    const { data, error } = await supabase.from("alt_saxophone").select("*");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get("/api/bassers", async (_, res) => {
    const { data, error } = await supabase.from("bassers").select("*");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get("/api/coupe", async (_, res) => {
    const { data, error } = await supabase.from("coupe_car").select("*");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

/* ======================================================
   META API
====================================================== */
app.get("/api/all", async (_, res) => {
    const { data, error } = await supabase.rpc("get_all_tables");
    if (error) return res.status(500).json({ error: error.message });

    const excluded = ["users", "user", "auth", "profiles"];
    const cleaned = data
        .map(t => t.table_name)
        .filter(name => !excluded.includes(name));

    res.json({ tables: cleaned });
});

app.get("/api/latest", verifyUser, async (req, res) => {
    const table = req.query.table;
    if (!table) return res.status(400).json({ error: "Missing table" });

    const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("id", { ascending: false })
        .limit(5);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

/* ======================================================
   SETUP / PC API
====================================================== */
app.get("/api/my-first-setup", verifyUser, async (req, res) => {
    const userId = req.user.id;

    const { data: setup } = await supabase
        .from("setup")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

    if (!setup) return res.json({ setup: null });

    const { data: details } = await supabase
        .from("pc_details")
        .select(`
            *,
            processor:processors(*),
            motherboard:motherboard(*),
            ram:ram(*),
            videocard:video_cards(*),
            psu:psu(*)
        `)
        .eq("setup_id", setup.id)
        .single();

    res.json({ setup, details });
});
app.post("/api/update-setup-name", verifyUser, async (req, res) => {
    const { setupId, newName } = req.body;

    if (!setupId || !newName) {
        return res.status(400).json({ error: "Missing data" });
    }

    const { error } = await supabase
        .from("setup")
        .update({ setup_name: newName })
        .eq("id", setupId)
        .eq("user_id", req.user.id); // 🔒 csak a sajátját

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
});


/* ======================================================
   AUTH API
====================================================== */
app.post("/api/register", async (req, res) => {
    const { fullname, username, email, password } = req.body;
    if (!fullname || !username || !email || !password)
        return res.status(400).json({ error: "Missing fields" });

    const hashed = await bcrypt.hash(password, 10);

    const { error } = await supabase.from("user").insert([{
        Name: fullname,
        UserName: username,
        Email: email,
        password: hashed,
        isAdmin: false
    }]);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Registration successful" });
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    const { data: users } = await supabase
        .from("user")
        .select("*")
        .eq("Email", email)
        .limit(1);

    if (!users || !users.length)
        return res.status(401).json({ error: "Invalid credentials" });

    const user = users[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const isAdmin = ADMIN_IDS.includes(user.ID);

    const token = jwt.sign({
        id: user.ID,
        name: user.Name,
        username: user.UserName,
        email: user.Email,
        isAdmin
    }, JWT_SECRET, { expiresIn: "1h" });

    res.cookie("auth_token", token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 1000
    });

    res.json({ message: "Login successful", isAdmin });
});

app.post("/api/logout", (_, res) => {
    res.clearCookie("auth_token");
    res.json({ message: "Logged out" });
});

app.get("/api/me", verifyUser, (req, res) => {
    res.json({ loggedIn: true, user: req.user });
});

/* ======================================================
   SERVER START
====================================================== */
app.listen(PORT, () => {
    console.clear();
    console.log(`
╔══════════════════════════════════════════════╗
║  💫 SETUP CONFIGURATOR – SERVER RUNNING 💫   ║
║  🌐 http://localhost:${PORT}                     ║
║  👑 Admin IDs: ${ADMIN_IDS.join(", ")}            ║
╚══════════════════════════════════════════════╝
`);
});
