const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = "setupconfigurator06";

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Supabase ---
const supabaseUrl = "https://ecjufuhmmehhzusicghh.supabase.co";
const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjanVmdWhtbWVoaHp1c2ljZ2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NjIzNjksImV4cCI6MjA3NTMzODM2OX0.U3cIRqeSrWTyjvxwKTI2LoIwcB2sHiSlEccYHQd9Ow8";

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.static(path.join(__dirname, "webs")));

// --- Oldalak ---
app.get("/", (req, res) => {
    console.log(" / hívás érkezett!");
    res.sendFile(path.join(__dirname, "webs/Home.html"));
});
app.get("/home", (req, res) => {
    console.log(" /home hívás érkezett!");
    res.sendFile(path.join(__dirname, "webs/Home.html"));
});
app.get("/regist", (req, res) => {
    console.log("✏️ /regist hívás érkezett!");
    res.sendFile(path.join(__dirname, "webs/Regist.html"));
});
app.get("/profile", (req, res) => {
    console.log("✏️ /profile hívás érkezett!");
    res.sendFile(path.join(__dirname, "webs/Profile.html"));
});

function verifyUser(req, res, next) {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: "Not logged in" });

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(403).json({ error: "Invalid token" });
    }
}


// --- Token ellenőrzés ---
function verifyToken(req, res, next) {
    const token =
        req.cookies.auth_token ||
        (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (!token) return res.status(401).json({ error: "Hiányzó token!" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: "Érvénytelen token!" });
    }
}

// --- Admin ellenőrzés ---
function verifyAdmin(req, res, next) {
    verifyToken(req, res, () => {
        if (!req.user.isAdmin) {
            return res
                .status(403)
                .json({ error: "Nincs jogosultság! Csak admin férhet hozzá." });
        }
        next();
    });
}
function apiSecretBrowser(req, res, next) {
    const fetchMode = req.headers["sec-fetch-mode"];

    // Böngésző URL-ből való megnyitás → navigate = NEM fetch
    if (!fetchMode || fetchMode === "navigate") {
        return res.status(404).sendFile(path.join(__dirname, "webs/404.html"));
    }

    // Fetch() hívás → engedjük
    next();
}





// --- API endpointok ---
app.get("/api/guitars",apiSecretBrowser, async (req, res) => {
    console.log("🎸 /api/guitars hívás érkezett!");
    const { data, error } = await supabase.from("electric_guitars").select("*");
    if (error)
        return res.status(500).json({ error: "Supabase hiba: " + error.message });
    if (!data || data.length === 0)
        return res.status(404).json({ message: "Nincs adat a táblában" });
    res.json(data);
});

app.get("/api/cpu",apiSecretBrowser, async (req, res) => {
    console.log("🧠 /api/cpu hívás érkezett!");
    const { data, error } = await supabase.from("processors").select("*");
    if (error)
        return res.status(500).json({ error: "Supabase hiba: " + error.message });
    if (!data || data.length === 0)
        return res.status(404).json({ message: "Nincs adat a táblában" });
    res.json(data);
});

// --- MOTHERBOARDS (nyilvános lekérés) ---
app.get("/api/motherboard",apiSecretBrowser, async (req, res) => {
    console.log("🧩 /api/motherboard hívás érkezett!");
    const { data, error } = await supabase.from("motherboard").select("*");

    if (error) {
        console.error("❌ Supabase hiba:", error.message);
        return res.status(500).json({ error: "Supabase hiba: " + error.message });
    }

    if (!data || data.length === 0) {
        console.warn("⚠️ Nincs adat az alaplapok táblában!");
        return res.status(404).json({ message: "Nincs adat a táblában" });
    }

    console.log(`✅ ${data.length} alaplap betöltve.`);
    res.json(data);
});


app.get("/api/saxophone/alt",apiSecretBrowser, async (req, res) => {
    console.log("🎷 /api/saxophone/alt hívás érkezett!");
    const { data, error } = await supabase.from("alt_saxophone").select("*");
    if (error)
        return res.status(500).json({ error: "Supabase hiba: " + error.message });
    if (!data || data.length === 0)
        return res.status(404).json({ message: "Nincs adat a táblában" });
    res.json(data);
});

app.get("/api/bassers",apiSecretBrowser, async (req, res) => {
    console.log("🎸 /api/bassers hívás érkezett!");
    const { data, error } = await supabase.from("bassers").select("*");
    if (error)
        return res.status(500).json({ error: "Supabase hiba: " + error.message });
    if (!data || data.length === 0)
        return res.status(404).json({ message: "Nincs adat a táblában" });
    res.json(data);
});

app.get("/api/coupe", apiSecretBrowser, async (req, res) => {
    console.log("🚗 /api/coupe hívás érkezett!");
    const { data, error } = await supabase.from("coupe_car").select("*");
    if (error)
        return res.status(500).json({ error: "Supabase hiba: " + error.message });
    if (!data || data.length === 0)
        return res.status(404).json({ message: "Nincs adat a táblában" });
    res.json(data);
});
app.get("/api/all", apiSecretBrowser, async (req, res) => {
    console.log("🌍 /api/all – összes tábla lekérése");

    try {
        const { data, error } = await supabase.rpc("get_all_tables");

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        const excluded = ["users", "user", "auth", "profiles"];

        // RPC: [{table_name:"processors"}, ...]
        const cleaned = data
            .map(t => t.table_name)
            .filter(name => !excluded.includes(name));

        res.json({ tables: cleaned });

    } catch (err) {
        console.error("❌ /api/all hiba:", err);
        res.status(500).json({ error: "Szerverhiba." });
    }
});

app.get("/api/latest", verifyUser, async (req, res) => {
    const table = req.query.table;

    if (!table) {
        return res.status(400).json({ error: "Missing table" });
    }

    const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("id", { ascending: false })
        .limit(5);

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    const formatted = data.map(row => ({
        name: row.Model || row.model || row.Name || row.name || row.title || "Unknown",
        table: table
    }));


    res.json(formatted);
});





// --- Register ---
app.post("/api/register", async (req, res) => {
    try {
        const { fullname, username, email, password } = req.body;
        if (!fullname || !username || !email || !password)
            return res.status(400).json({ error: "Hiányzó adatok!" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const { error } = await supabase.from("user").insert([
            {
                Name: fullname,
                UserName: username,
                Email: email,
                password: hashedPassword,
                isAdmin: false,
            },
        ]);

        if (error) throw error;

        console.log("✅ Felhasználó létrehozva:", username);
        res.status(201).json({ message: "Sikeres regisztráció!" });
    } catch (err) {
        console.error("❌ Szerver hiba:", err);
        res.status(500).json({ error: "Belső szerverhiba." });
    }
});

// --- Login ---
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: "Hiányzó email vagy jelszó!" });

        const { data: users, error } = await supabase
            .from("user")
            .select("*")
            .eq("Email", email)
            .limit(1);

        if (error || !users || users.length === 0)
            return res.status(400).json({ error: "Hibás email vagy jelszó!" });

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword)
            return res.status(401).json({ error: "Hibás email vagy jelszó!" });

        const token = jwt.sign(
            {
                id: user.ID,
                name: user.Name,
                username: user.UserName,
                email: user.Email,
                isAdmin: user.isAdmin,
            },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        // 🍪 cookie mentés
        res.cookie("auth_token", token, {
            httpOnly: true,
            secure: false, // https esetén true
            sameSite: "lax",
            maxAge: 60 * 60 * 1000,
        });

        console.log(`✅ Bejelentkezett: ${user.UserName} (${user.Email})`);

        res.json({
            message: `Sikeres bejelentkezés! Üdv, ${user.Name}!`,
            user: {
                id: user.ID,
                name: user.Name,
                username: user.UserName,
                email: user.Email,
                isAdmin: user.isAdmin,
            },
        });
    } catch (err) {
        console.error("❌ Login hiba:", err);
        res.status(500).json({ error: "Belső szerverhiba." });
    }
});

// --- Logout ---
app.post("/api/logout", (req, res) => {
    res.clearCookie("auth_token");
    res.json({ message: "Kijelentkezés sikeres." });
});

// --- Login státusz ellenőrzés ---
app.get("/api/me",verifyUser, (req, res) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ loggedIn: false });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ loggedIn: true, user: decoded });
    } catch (err) {
        res.status(403).json({ loggedIn: false });
    }
});

// --- Indítás ---
app.listen(PORT, () => {
    app.listen(PORT, () => {
        console.clear();

        console.log(`
\x1b[35m╔══════════════════════════════════════════════════════╗
║                                                      ║
║    \x1b[36m💫  S E T U P   C O N F I G U R A T O R  💫\x1b[35m     ║
║                                                      ║
║          🚀  Server is running successfully!          ║
║             🌐  http://localhost:${PORT}               ║
║                                                      ║
╚══════════════════════════════════════════════════════╝\x1b[0m
    `);
    });
});
