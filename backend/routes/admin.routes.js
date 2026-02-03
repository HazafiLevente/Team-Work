const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const { supabase } = require("../services/supabase");
const verifyAdmin = require("../middlewares/verifyAdmin");

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

    res.json({
        users: usersCount || 0,
        tables: realTableCount,           // Real DB count
        productTables: productTables.length, // Runtime Filtered Config count
        products: totalProducts           // Sum of rows from all product tables
    });
});

module.exports = router;
