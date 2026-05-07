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
const cors = require("cors");


const app = express();
const PORT = process.env.PORT || 4200;
const JWT_SECRET = process.env.JWT_SECRET;


const adminFilePath = path.join(__dirname, "admin.json");

const TABLES_FILE = path.join(__dirname, "tables.runtime.json");

function getRuntimeTables() {
    if (!fs.existsSync(TABLES_FILE)) return {};
    const json = JSON.parse(fs.readFileSync(TABLES_FILE, "utf8"));
    return json.tables || {};
}



const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "webs")));





function verifyUser(req, res, next) {
    const token =
        req.cookies?.auth_token ||
        req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            error: "Not authenticated"
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);


        req.user = {
            id: Number(decoded.id),
            name: decoded.name,
            username: decoded.username,
            email: decoded.email,
            role: resolveRole(Number(decoded.id))
        };

        next();
    } catch (err) {
        console.error("❌ JWT verify error:", err.message);
        return res.status(401).json({
            error: "Invalid or expired token"
        });
    }
}

function verifyAdmin(req, res, next) {
    verifyUser(req, res, () => {
        if (!hasAdminAccess(req.user.role)) {
            return res.status(403).json({ error: "Admin only" });
        }
        next();
    });
}

function verifyAdminPlus(req, res, next) {
    verifyUser(req, res, () => {
        if (!hasAdminPlusAccess(req.user.role)) {
            return res.status(403).json({ error: "Admin+ only" });
        }
        next();
    });
}







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
app.get("/setup", verifyUser, (_, res) => {
    res.sendFile(path.join(__dirname, "webs/Mysetup.html"));
});

app.get("/favorite", verifyUser, (_, res) => {
    res.sendFile(path.join(__dirname, "webs/Favorite.html"));
});

app.get("/test",  async (req, res) => {
    res.json({"test":"siker!"});
})



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

    if (error) return res.status(500).json({ error: error.message });

    const users = data.map(u => {
        const id = Number(u.ID);
        return {
            id,
            Name: u.Name,
            UserName: u.UserName,
            Email: u.Email,
            created_at: u.created_at,
            role: resolveRole(id)
        };
    });

    res.json(users);
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





app.get("/api/products/tables", (_, res) => {
    const runtime = getRuntimeTables();


    const tables = Object.keys(runtime);

    res.json({ tables });
});

app.get("/api/products", async (req, res) => {
    const page = Number(req.query.page || 1);
    const q = req.query.q || null;

    const limit = 200;
    const offset = (page - 1) * limit;

    const { data, error } = await supabase
        .rpc("products_home", {
            q,
        });

    if (error) {
        console.error("❌ products_home error:", error);
        return res.status(500).json({ error: error.message });
    }

    res.json({ items: data || [] });
});

app.get("/api/products/brands", async (_, res) => {
    const { data, error } = await supabase.rpc("products_brands");
    if (error) return res.status(500).json({ error: error.message });
    res.json({ brands: data.map(b => b.brand) });
});






app.get("/api/admin/tables", verifyAdmin, async (_, res) => {
    const { data, error } = await supabase.rpc("get_all_tables");

    if (error) return res.status(500).json({ error: error.message });
    if (!Array.isArray(data)) return res.json({ tables: [] });


    const adminTables = data
        .map(t => t.table_name)
        .filter(name => name && name.includes("["));

    res.json({ tables: adminTables });
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

app.post("/api/admin/update-row", verifyAdmin, async (req, res) => {
    const { table, id, updates } = req.body;

    if (!table || !id || !updates) {
        return res.status(400).json({ error: "Missing data" });
    }


    ["id", "ID", "created_at", "password"].forEach(k => delete updates[k]);


    const idColumn = table === "user[Auth]" ? "ID" : "id";

    const { error } = await supabase
        .from(table)
        .update(updates)
        .eq(idColumn, id);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
});



app.post("/api/admin/update-user", verifyAdmin, async (req, res) => {
    const { userId, Name, UserName, Email } = req.body;

    if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
    }


    const updateData = {};
    if (Name) updateData.Name = Name;
    if (UserName) updateData.UserName = UserName;
    if (Email) updateData.Email = Email;

    const { error } = await supabase
        .from("user[Auth]")
        .update(updateData)
        .eq("ID", userId);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
});


app.post("/api/admin/insert-row", verifyAdmin, async (req, res) => {
    const { table, payload } = req.body;

    if (table === "user[Auth]") {
        return res.status(403).json({
            error: "Felhasználót csak regisztráción keresztül lehet létrehozni"
        });
    }

    if (!table || !payload || typeof payload !== "object") {
        return res.status(400).json({ error: "Invalid data" });
    }

    ["id", "ID", "created_at", "password"].forEach(k => delete payload[k]);

    const { error } = await supabase
        .from(table)
        .insert([payload]);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
});



app.post("/api/admin/delete-row", verifyAdmin, async (req, res) => {
    const { table, id } = req.body;

    if (!table || !id) {
        return res.status(400).json({ error: "Missing table or id" });
    }


    if (table === "user[Auth]" && Number(id) === req.user.id) {
        return res.status(403).json({ error: "Saját fiók nem törölhető" });
    }
    if (
        table === "user[Auth]" &&
        ROLES.owners.has(Number(id))
    ) {
        return res.status(403).json({
            error: "Owner felhasználó nem törölhető"
        });
    }


    const idColumn = table === "user[Auth]" ? "ID" : "id";

    const { error } = await supabase
        .from(table)
        .delete()
        .eq(idColumn, id);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
});




app.get("/api/my-first-setup", verifyUser, async (req, res) => {
    const userId = req.user.id;


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
        .eq("user_id", req.user.id);

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



app.get("/api/setup/details", verifyUser, async (req, res) => {
    const { type, id } = req.query;
    const childId = Number(id);

    console.log("🔍 [DETAILS] type =", type, "id =", childId);

    if (!type || !childId) {
        return res.status(400).json({ error: "Missing type or id" });
    }


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


    if (type === "home_theater") {
        const { data: ht, error } = await supabase
            .from("home_theater_setups[Setups]")
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


app.get("/api/items/list", verifyUser, async (req, res) => {
    const { type } = req.query;
    let allResults = [];

    try {

        if (type === "car") {
            const carTables = ["cabrio_cars", "coupe_cars", "hatchback_cars", "wagon_cars", "mpv_cars", "pickup_cars", "crossover_cars"];
            const results = await Promise.all(carTables.map(table => supabase.from(table).select("*")));

            results.forEach((res, index) => {
                if (res.data) {
                    res.data.forEach(item => {
                        allResults.push({
                            id: item.id,
                            name: `${item.Manufacturer} ${item.Model}`,
                            category: carTables[index].replace("_cars", ""),
                            type: "car"
                        });
                    });
                }
            });
            console.log(`Autók: ${allResults.length} db betöltve.`);
            return res.json({ results: allResults });
        }


        if (type === "pc") {
            const pcTables = ["video_cards", "ram", "psu", "processors", "motherboard"];


            const results = await Promise.all(pcTables.map(table => supabase.from(table).select("*")));

            results.forEach((res, index) => {
                const currentTable = pcTables[index];
                if (res.data) {

                    const pcOnly = res.data.filter(item => {
                        const cat = item.category || item.Category || "";
                        return cat.toString().trim().toUpperCase() === "PC";
                    });

                    pcOnly.forEach(item => {

                        const brand = item.Manufacturer || item.manufacturer || item.Brand || item.brand || "Márka";
                        const model = item.Model || item.model || "Modell";

                        allResults.push({
                            id: item.id,
                            name: `${brand} ${model}`.trim(),
                            category: currentTable,
                            type: "pc"
                        });
                    });
                }
            });
            console.log(`PC alkatrészek: ${allResults.length} db betöltve.`);
            return res.json({ results: allResults });
        }


        res.json({ results: [] });

    } catch (err) {
        console.error("Szerver hiba:", err);
        res.status(500).json({ error: "Szerver hiba" });
    }
});



app.get("/api/items/pc-list", verifyUser, async (req, res) => {
    let allResults = [];

    const pcTables = ["ram", "psu", "processors", "motherboard", "video_cards"];

    try {
        const results = await Promise.all(
            pcTables.map(table => supabase.from(table).select("*"))
        );

        results.forEach((res, index) => {
            const currentTable = pcTables[index];
            if (res.error) {
                console.error(`Hiba a(z) ${currentTable} táblánál:`, res.error.message);
            } else if (res.data) {
                res.data.forEach(item => {
                    allResults.push({
                        id: item.id,
                        name: `${item.Manufacturer} ${item.Model}`,
                        category: currentTable,
                        type: "pc"
                    });
                });
            }
        });

        console.log(`PC lista kész: ${allResults.length} alkatrész.`);
        res.json({ results: allResults });
    } catch (err) {
        console.error("PC listázási hiba:", err);
        res.status(500).json({ error: "Szerver hiba" });
    }
});



app.get("/api/setup/:id/get-children", verifyUser, async (req, res) => {

    const setupId = req.params.id;
    console.log(`--- SETUP ELEMEK LEKÉRÉSE: ID ${setupId} ---`);

    try {


        const [pcs, hts, cars, studios] = await Promise.all([
            supabase.from("pc_details[Setup]").select("*").eq("setup_id", setupId),
            supabase.from("home_theater_setups[Setup]").select("*").eq("setup_id", setupId),
            supabase.from("Car_setup[Setup]").select("*").eq("setup_id", setupId),
            supabase.from("studio_monitor_setup[Setup]").select("*").eq("setup_id", setupId)
        ]);


        if (pcs.error) console.error("PC hiba:", pcs.error.message);
        if (hts.error) console.error("Home Theater hiba:", hts.error.message);
        if (cars.error) console.error("Car hiba:", cars.error.message);
        if (studios.error) console.error("Studio hiba:", studios.error.message);



        const allItems = [
            ...(pcs.data || []).map(i => ({ ...i, type: 'pc', label: 'PC Alkatrész' })),
            ...(hts.data || []).map(i => ({ ...i, type: 'home_theater', label: 'Mozi eszköz' })),
            ...(cars.data || []).map(i => ({ ...i, type: 'car', label: 'Autó' })),
            ...(studios.data || []).map(i => ({ ...i, type: 'studio', label: 'Stúdió cucc' }))
        ];

        console.log(`Setup ${setupId}: ${allItems.length} elem megtalálva.`);


        res.json(allItems);

    } catch (err) {
        console.error("Váratlan szerver hiba a betöltéskor:", err);
        res.status(500).json({ error: "Szerver hiba az elemek betöltésekor" });
    }
});




app.post("/api/setup/:id/add-child", verifyUser, async (req, res) => {
    const setupId = Number(req.params.id);

    const { type, name, itemId, category } = req.body;

    if (!type || !name) return res.status(400).json({ error: "Missing data" });

    let tableName = "";
    let insertData = {
        setup_id: setupId,
        setup_name: name
    };

    switch (type) {

        case "pc":
            tableName = "pc_details[Setup]";



            const pcColumnMap = {
                "video_cards": "videocard_id",
                "ram": "ram_id",
                "psu": "psu_id",
                "processors": "processor_id",
                "motherboard": "motherboard_id"
            };


            const targetColumn = pcColumnMap[category];


            if (targetColumn && itemId) {
                insertData[targetColumn] = itemId;
            }
            break;


        case "home_theater":
            tableName = "home_theater_setups[Setup]";
            insertData.receiver_id = 1;
            break;

        case "car":

            tableName = "Car_setup[Setup]";
            break;

        case "studio":
            tableName = "studio_monitor_setup[Setup]";
            break;

        default:
            return res.status(400).json({ error: "Invalid type" });
    }

    const { data, error } = await supabase
        .from(tableName)
        .insert([insertData])
        .select()
        .single();

    if (error) {
        console.error("❌ Supabase Hiba:", error.message);
        return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, item: data });
});








app.post("/api/setup/:id/save-child-legacy", verifyUser, async (req, res) => {
    const setupId = req.params.id;
    const { type, name, itemId, category } = req.body;

    let tableName = "";
    let insertData = { setup_id: setupId, setup_name: name, setup_type: type };

    if (type === "car") tableName = "Car_setup[Setup]";
    else if (type === "pc") {
        tableName = "pc_details[Setup]";
        const pcMap = { "processors": "processor_id", "motherboard": "motherboard_id", "ram": "ram_id", "psu": "psu_id", "video_cards": "videocard_id" };
        if (pcMap[category]) insertData[pcMap[category]] = itemId;
    }
    else if (type === "studio") tableName = "studio_monitor_setup[Setup]";
    else if (type === "home_theater") tableName = "home_theater_setups[Setup]";

    try {
        const { data, error } = await supabase.from(tableName).insert([insertData]).select();
        if (error) throw error;
        res.json({ success: true, item: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.delete("/api/remove-child/:type/:id", verifyUser, async (req, res) => {
    const { type, id } = req.params;

    let tableName = "";


    switch (type) {
        case "pc": tableName = "pc_details[Setup]"; break;
        case "home_theater": tableName = "home_theater_setups[Setup]"; break;
        case "car": tableName = "Car_setup[Setup]"; break;
        case "studio": tableName = "studio_monitor_setup[Setup]"; break;
        default: return res.status(400).json({ error: "Invalid type" });
    }

    try {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq("id", id);



        if (error) {
            console.error("Delete error:", error);
            return res.status(500).json({ error: "Nem sikerült a törlés" });
        }

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Szerver hiba" });
    }
});


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

    const role = resolveRole(Number(user.ID));

    const token = jwt.sign({
        id: Number(user.ID),
        name: user.Name,
        username: user.UserName,
        email: user.Email
    }, JWT_SECRET, { expiresIn: "24h" });


    res.cookie("auth_token", token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ message: "Login successful", role });
});


app.post("/api/logout", (_, res) => {
    res.clearCookie("auth_token");
    res.json({ message: "Logged out" });
});

app.get("/api/me", verifyUser, (req, res) => {
    res.json({
        loggedIn: true,
        user: req.user
    });
});




app.get("/api/runtime/tables", (_, res) => {
    const json = JSON.parse(
        fs.readFileSync(
            path.join(__dirname, "tables.runtime1.json"),
            "utf8"
        )
    );
    res.json(json);
});



app.listen(PORT, () => {
    console.clear();
    console.log(`
╔══════════════════════════════════════════════╗
║  💫 SETUP CONFIGURATOR – SERVER RUNNING 💫
║  🌐 http://localhost:${PORT}
╚══════════════════════════════════════════════╝
`);
});
