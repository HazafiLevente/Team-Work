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
let ADMIN_IDS = [1,2,5];

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
        req.user.isAdmin = ADMIN_IDS.includes(Number(req.user.id));

        /*console.log("ADMIN CHECK:", {
            tokenId: req.user.id,
            tokenIdType: typeof req.user.id,
            ADMIN_IDS,
            isAdmin: req.user.isAdmin
        });
        */

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
app.get("/admin", verifyAdmin, (_, res) => {
    res.sendFile(path.join(__dirname, "webs/Admin.html"));
});
app.get("/setup", (_, res) => {
    res.sendFile(path.join(__dirname, "webs/Mysetup.html"));
});



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
    const { data, error } = await supabase.from("coupe_cars").select("*");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get("/api/admin/users", verifyAdmin, async (req, res) => {
    const { data, error } = await supabase
        .from("user[Auth]")
        .select("ID, Name, UserName, Email, created_at")
        .order("created_at", { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    const usersWithAdminFlag = data.map(u => ({
        Name: u.Name,
        UserName: u.UserName,
        Email: u.Email,
        created_at: u.created_at,
        isAdmin: ADMIN_IDS.includes(Number(u.ID))
    }));

    res.json(usersWithAdminFlag);
});
app.get("/api/table/:name", verifyAdmin, async (req, res) => {
    const table = req.params.name;

    const { data, error } = await supabase
        .from(table)
        .select("*")
        .limit(100);

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.json(data);
});
app.get("/api/public/table/:name", async (req, res) => {
    const table = req.params.name;
    const { data, error } = await supabase
        .from(table)
        .select("*");


    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.json(data);
});
app.get("/api/products/tables", async (_, res) => {
    const { data, error } = await supabase.rpc("get_all_tables");

    if (error) return res.status(500).json({ error: error.message });
    if (!Array.isArray(data)) return res.json({ tables: [] });

    // ✅ termék = nincs benne [
    const productTables = data
        .map(t => t.table_name)
        .filter(name => name && !name.includes("["));

    res.json({ tables: productTables });
});

app.get("/api/admin/tables", verifyAdmin, async (_, res) => {
    const { data, error } = await supabase.rpc("get_all_tables");

    if (error) return res.status(500).json({ error: error.message });
    if (!Array.isArray(data)) return res.json({ tables: [] });

    // ✅ admin-only = van benne [
    const adminTables = data
        .map(t => t.table_name)
        .filter(name => name && name.includes("["));

    res.json({ tables: adminTables });
});

app.get("/api/admin/users", verifyAdmin, async (req, res) => {
    const { data, error } = await supabase
        .from("user[Auth]") // ✅ EZ
        .select("ID, Name, UserName, Email, created_at")
        .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const usersWithAdminFlag = data.map(u => ({
        Name: u.Name,
        UserName: u.UserName,
        Email: u.Email,
        created_at: u.created_at,
        isAdmin: ADMIN_IDS.includes(Number(u.ID))
    }));

    res.json(usersWithAdminFlag);
});





/* ======================================================
   META API
====================================================== */
app.get("/api/all", async (_, res) => {
    const { data, error } = await supabase.rpc("get_all_tables");

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    const excluded = ["auth", "profiles"];

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

app.get("/api/images", async (_, res) => {
    try {
        const filePath = path.join(__dirname, "images.json");
        const raw = fs.readFileSync(filePath, "utf8");
        const json = JSON.parse(raw);
        res.json(json);
    } catch (err) {
        console.error("❌ images.json load error:", err);
        res.status(500).json({});
    }
});
app.get("/meta/filler", (_, res) => {
    res.sendFile(path.join(__dirname, "filler.json"));
});



app.post("/api/admin/sql/run", verifyAdmin, async (req, res) => {
    const { sql } = req.body;
    if (!sql) {
        return res.status(400).json({ error: "Missing SQL" });
    }

    const { data, error } = await supabase
        .rpc("execute_sql", { sql });

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.json(data);
});


/* ======================================================
   SETUP / PC API
====================================================== */
app.get("/api/my-first-setup", verifyUser, async (req, res) => {
    const userId = req.user.id;

    // 1️⃣ megkeressük a user setupjait (legkisebb ID elöl)
    const { data: setups, error: setupErr } = await supabase
        .from("setup[Setup]")
        .select("id, setup_name")
        .eq("user_id", userId)
        .order("id", { ascending: true });

    if (setupErr) {
        return res.status(500).json({ error: setupErr.message });
    }

    if (!setups || setups.length === 0) {
        return res.json({ setup: null });
    }

    const setupIds = setups.map(s => s.id);

    // 2️⃣ megkeressük a legelső pc_details rekordot ezekhez a setupokhoz
    const { data: pc, error: pcErr } = await supabase
        .from("pc_details[Setup]")
        .select(`
            *,
            setup:setup_id(id, setup_name),
            processor:processors(*),
            motherboard:motherboard(*),
            ram:ram(*),
            videocard:video_cards(*),
            psu:psu(*)
        `)
        .in("setup_id", setupIds)
        .order("id", { ascending: true })
        .limit(1)
        .single();

    if (pcErr) {
        return res.status(500).json({ error: pcErr.message });
    }

    // 3️⃣ visszaadjuk pontosan azt a formátumot,
    // amit a frontend már MOST is vár
    res.json({
        setup: pc.setup,
        details: pc
    });
});

app.post("/api/update-setup-name", verifyUser, async (req, res) => {
    const { setupId, newName } = req.body;

    if (!setupId || !newName) {
        return res.status(400).json({ error: "Missing data" });
    }

    const { error } = await supabase
        .from("setup[Setup]")
        .update({ setup_name: newName })
        .eq("id", setupId)
        .eq("user_id", req.user.id); // 🔒 csak a sajátját

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
});
app.get("/api/my-setups", verifyUser, async (req, res) => {
    const userId = req.user.id;

    const { data, error } = await supabase
        .from("setup[Setup]")
        .select("id, setup_name")
        .eq("user_id", userId)
        .order("id", { ascending: true });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ setups: data || [] });
});

app.post("/api/my-setups", verifyUser, async (req, res) => {
    const userId = req.user.id;
    const { name } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ error: "Missing setup name" });
    }

    const { data, error } = await supabase
        .from("setup[Setup]")
        .insert([{
            user_id: userId,
            setup_name: name.trim()
        }])
        .select()
        .single();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ setup: data });
});



/* ======================================================
   SETUP CHILDREN (PC + HOME THEATER)
====================================================== */
app.get("/api/setup/:id/children", verifyUser, async (req, res) => {
    const setupId = Number(req.params.id);

    console.log("🔍 [CHILDREN] setupId =", setupId);

    const { data: pcs, error: pcErr } = await supabase
        .from("pc_details[Setup]")
        .select("id, setup_name, setup_id")
        .eq("setup_id", setupId);

    console.log("🖥 PCs:", pcs);
    if (pcErr) console.error("❌ PC ERROR:", pcErr);

    const { data: hts, error: htErr } = await supabase
        .from("home_theater_setups[Setups]") // ✅ FIX
        .select("id, setup_name, setup_id")
        .eq("setup_id", setupId);

    console.log("🎬 HOME THEATERS:", hts);
    if (htErr) console.error("❌ HT ERROR:", htErr);

    const children = [
        ...(pcs || []).map(p => ({
            id: p.id,
            setup_name: p.setup_name ?? "Gaming PC",
            type: "pc"
        })),
        ...(hts || []).map(h => ({
            id: h.id,
            setup_name: h.setup_name ?? "Házimozi",
            type: "home_theater"
        }))
    ];

    console.log("📦 FINAL CHILDREN:", children);

    res.json({ children });
});




/* ======================================================
   SETUP DETAILS (PC OR HOME THEATER)
====================================================== */
/* ======================================================
   SETUP DETAILS (PC OR HOME THEATER)
====================================================== */
app.get("/api/setup/details", verifyUser, async (req, res) => {
    const { type, id } = req.query;
    const childId = Number(id);

    console.log("🔍 [DETAILS] type =", type, "id =", childId);

    if (!type || !childId) {
        return res.status(400).json({ error: "Missing type or id" });
    }

    /* ===================== PC ===================== */
    if (type === "pc") {
        const { data: pc, error } = await supabase
            .from("pc_details[Setup]")
            .select(`
                setup:setup_id(id, setup_name),
                processor:processors(Model),
                motherboard:motherboard(Model),
                ram:ram(model),
                videocard:video_cards(model),
                psu:psu(model)
            `)
            .eq("id", childId)
            .maybeSingle();

        console.log("🖥 PC DETAILS:", pc);
        if (error) console.error("❌ PC DETAILS ERROR:", error);

        if (!pc) return res.status(404).json({ error: "PC not found" });

        return res.json({
            setup: pc.setup,
            items: [
                { label: "CPU", value: pc.processor?.Model },
                { label: "Alaplap", value: pc.motherboard?.Model },
                { label: "RAM", value: pc.ram?.model },
                { label: "VGA", value: pc.videocard?.model },
                { label: "Tápegység", value: pc.psu?.model }
            ]
        });
    }

    /* ================= HOME THEATER ================= */
    if (type === "home_theater") {
        const { data: ht, error } = await supabase
            .from("home_theater_setups[Setups]") // ✅ FONTOS
            .select(`
                *,
                setup:setup_id(id, setup_name)
            `)
            .eq("id", childId)
            .maybeSingle();

        console.log("🎬 HT DETAILS:", ht);
        if (error) console.error("❌ HT DETAILS ERROR:", error);

        if (!ht) return res.status(404).json({ error: "Home theater not found" });

        const items = Object.entries(ht)
            .filter(([k]) =>
                !["id", "setup_id", "created_at", "setup"].includes(k)
            )
            .map(([k, v]) => ({
                label: k.replaceAll("_", " "),
                value: v ?? "—"
            }));

        return res.json({
            setup: ht.setup,
            items
        });
    }

    res.status(400).json({ error: "Invalid type" });
});





/* ======================================================
   AUTH API
====================================================== */
app.post("/api/register", async (req, res) => {
    const { fullname, username, email, password } = req.body;
    if (!fullname || !username || !email || !password)
        return res.status(400).json({ error: "Missing fields" });

    const hashed = await bcrypt.hash(password, 10);

    const { error } = await supabase.from("user[Auth]").insert([{
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
        .from("user[Auth]")
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


