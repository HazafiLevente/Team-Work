const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const { supabase } = require("../services/supabase");
const verifyAdmin = require("../middlewares/verifyAdmin");
const { resolveRole } = require("../services/control");


router.get("/stats", verifyAdmin, async (req, res) => {
    // Middleware handles auth & role check


    // 📦 tables.runtime.json (for Product Tables & Products calculation)
    const file = path.join(
        __dirname,
        "../../datas/Jsons/tables.runtime.json"
    );

    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    const runtimeTableNames = Object.keys(json.tables || {});

    // Filter product tables from runtime config
    const productTables = runtimeTableNames.filter(
        t => !t.includes("[")
    );

    // 🗂 ÖSSZES TÁBLA (DB Actual Count) - User requested "all tables" (approx 92)
    const { data: allTables } = await supabase.rpc("get_all_tables");
    const realTableCount = allTables ? allTables.length : runtimeTableNames.length;

    // 👤 user[Auth] count
    const { count: usersCount } = await supabase
        .from("user[Auth]")
        .select("*", { count: "exact", head: true });

    // 📦 Összes termék (Explicit Counts from ALL product tables)
    // The user requested to strictly count rows from all "product tables" (no []).
    // existing 'products_home' might miss tables without manufacturer/model columns.
    const productCountPromises = productTables.map(table =>
        supabase
            .from(table)
            .select("*", { count: "exact", head: true })
            .then(({ count, error }) => {
                if (error) {
                    console.error(`Error counting ${table}:`, error.message);
                    return 0;
                }
                return count || 0;
            })
    );

    const counts = await Promise.all(productCountPromises);
    const totalProducts = counts.reduce((sum, c) => sum + c, 0);

    // ... existing stats logic ...
    res.json({
        users: usersCount || 0,
        tables: realTableCount,           // Real DB count
        productTables: productTables.length, // Runtime Filtered Config count
        products: totalProducts           // Sum of rows from all product tables
    });
});

router.get("/users", verifyAdmin, async (req, res) => {

    // 1️⃣ user[Auth]
    const { data: users, error: userError } = await supabase
        .from("user[Auth]")
        .select("ID, UserName, Email");

    if (userError) {
        console.error(userError);
        return res.status(500).json({ error: userError.message });
    }

    // 2️⃣ user_more[Auth]
    const { data: more, error: moreError } = await supabase
        .from("user_more[Auth]")
        .select("user_id, city, age, phone_number");

    if (moreError) {
        console.error(moreError);
        return res.status(500).json({ error: moreError.message });
    }

    // 3️⃣ MERGE
    const usersWithMore = users.map(u => {
        const extra = more.find(m => m.user_id === u.ID);

        return {
            id: u.ID,
            username: u.UserName,
            email: u.Email,
            role: resolveRole(u.ID), // saját logikád
            city: extra?.city ?? "",
            age: extra?.age ?? null,
            phone: extra?.phone_number ?? ""
        };
    });

    res.json({ users: usersWithMore });
});





// 💾 UPDATE USER
router.patch("/users/:id", verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { username, city, age, phone, role } = req.body;

    const updateData = {
        UserName: username,
        City: city,
        Age: age,
        Phone: phone,
        Role: role
    };

    const { error } = await supabase
        .from("user[Auth]")
        .update(updateData)
        .eq("ID", id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true });
});

module.exports = router;
