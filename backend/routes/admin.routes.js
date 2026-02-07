const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const { supabase } = require("../services/supabase");
const verifyAdmin = require("../middlewares/verifyAdmin");
const { resolveRole } = require("../services/control");
const localDb = require("../services/localDb");


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

    // 🗂 ÖSSZES TÁBLA (Local DB Count)
    const realTableCount = localDb.db.prepare("SELECT count(*) as c FROM sqlite_master WHERE type='table'").get().c;

    // 👤 user[Auth] count (Local)
    const usersCount = localDb.countAll("user[Auth]");

    // 📦 Összes termék (Local Counts)
    let totalProducts = 0;
    for (const table of productTables) {
        totalProducts += localDb.countAll(table);
    }

    // ... existing stats logic ...
    res.json({
        users: usersCount || 0,
        tables: realTableCount,           // Local Cache DB count
        productTables: productTables.length, // Runtime Filtered Config count
        products: totalProducts           // Sum of rows from locally cached product tables
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
