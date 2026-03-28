const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const { supabase } = require("../services/supabase");
const verifyAdmin = require("../middlewares/verifyAdmin");
const { resolveRole, updateUserEnvRole, isBanned, updateUserBanStatus } = require("../services/control");
const localDb = require("../services/localDb");
const { shouldExclude } = require("../services/tableFilter");
const activeUsersTracker = require("../services/activeUsers");
const { getCatalogStats } = require("../services/products/productCatalog.service");
const { listNotifications, createNotification, deleteNotification, normalizeCategory } = require("../services/notificationStore");


router.get("/stats", verifyAdmin, async (req, res) => {
    // Middleware handles auth & role check


    // 📦 tables.runtime.json (for Product Tables & Products calculation)
    // 🗂 ÖSSZES TÁBLA (Local DB Count)
    const allTables = localDb.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const realTableCount = allTables.filter(t => !shouldExclude(t.name)).length;

    // 👤 user[Auth] count (Local)
    const usersCount = localDb.countAll("user[Auth]");

    // 📦 Összes termék (Local Counts)
    const catalogStats = await getCatalogStats();

    // ... existing stats logic ...
    res.json({
        users: usersCount || 0,
        tables: realTableCount,           // Local Cache DB count
        productTables: catalogStats.categoriesAll.length,
        products: catalogStats.totalAll,
        onlineUsers: activeUsersTracker.getActiveCount()
    });
});

// ========================================
//  👥 ACTIVE USERS (detail + daily history)
// ========================================
router.get("/active-users", verifyAdmin, (req, res) => {
    res.json({
        online: activeUsersTracker.getActiveUsers(),
        onlineCount: activeUsersTracker.getActiveCount(),
        daily: activeUsersTracker.getDailyHistory()
    });
});

router.get("/users", verifyAdmin, async (req, res) => {

    // 1️⃣ user[Auth]
    const { data: users, error: userError } = await supabase
        .from("user[Auth]")
        .select("ID, UserName, Email, created_at"); // REMOVED role, banned

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
            created_at: u.created_at,
            role: resolveRole(u.ID, u.Role), // Use control.js resolution
            banned: isBanned(u.ID), // Check local set
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

    try {
        const numId = Number(id);
        console.log(`👤 Admin updating user ID: ${numId}`, { username, role, city, age, phone });

        // 1. Update user[Auth]
        const { error: authError } = await supabase
            .from("user[Auth]")
            .update({ UserName: username })
            .eq("ID", numId);

        if (authError) {
            console.error("❌ Step 1 (user[Auth]) failed:", authError);
            throw authError;
        }

        // 2. Update Roles in .env
        try {
            const { updateUserEnvRole } = require("../services/control");
            updateUserEnvRole(numId, role);
            console.log("✅ Step 2 (.env role) updated");
        } catch (envErr) {
            console.error("❌ Step 2 (.env role) failed:", envErr);
            // Non-critical, but let's log it
        }

        // 3. Upsert user_more[Auth]
        console.log(`🔍 Checking user_more for user_id: ${numId}`);
        const { data: existingMore, error: findError } = await supabase
            .from("user_more[Auth]")
            .select("id")
            .eq("user_id", numId)
            .maybeSingle();

        if (findError) {
            console.error("❌ Step 3 (find user_more) failed:", findError);
            throw findError;
        }

        if (existingMore) {
            console.log(`📝 Updating existing user_more entry ID: ${existingMore.id}`);
            const { error: moreError } = await supabase
                .from("user_more[Auth]")
                .update({
                    city: city,
                    age: age,
                    phone_number: phone
                })
                .eq("user_id", numId);
            if (moreError) {
                console.error("❌ Step 3 (update user_more) failed:", moreError);
                throw moreError;
            }
        } else {
            console.log(`➕ Creating new user_more entry for user_id: ${numId}`);
            const { error: moreError } = await supabase
                .from("user_more[Auth]")
                .insert({
                    user_id: numId,
                    city: city,
                    age: age,
                    phone_number: phone
                });
            if (moreError) {
                console.error("❌ Step 3 (insert user_more) failed:", moreError);
                throw moreError;
            }
        }

        console.log("🎊 User update completed successfully");
        res.json({ success: true });
    } catch (err) {
        console.error("💥 CRITICAL: Admin user update fatal error:", err);
        res.status(500).json({ error: err.message || "Internal Server Error" });
    }
});

// 🚫 BAN USER
router.post("/users/:id/ban", verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const adminRole = resolveRole(req.user.id);

    if (adminRole !== "admin+" && adminRole !== "owner") {
        return res.status(403).json({ error: "Only Admin+ or Owner can ban users." });
    }

    try {
        updateUserBanStatus(id, true);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ UNBAN USER
router.post("/users/:id/unban", verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const adminRole = resolveRole(req.user.id);

    if (adminRole !== "admin+" && adminRole !== "owner") {
        return res.status(403).json({ error: "Only Admin+ or Owner can unban users." });
    }

    try {
        updateUserBanStatus(id, false);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/admin/users/:id/setups
 * Returns all setups for a specific user with price summary.
 */
router.get("/users/:id/setups", verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        // 1. All setups
        const { data: setups, error: setupsError } = await supabase
            .from("setup_room")
            .select("*")
            .eq("user_id", id);

        if (setupsError) throw setupsError;
        // 3. Price calculation setup
        // We'll use the tables.runtime.json to know which tables to scan
        const runtimeFile = path.join(__dirname, "../../datas/Jsons/tables.runtime.json");
        const runtimeJson = JSON.parse(fs.readFileSync(runtimeFile, "utf8"));
        const productTables = Object.keys(runtimeJson.tables || {});

        const result = [];
        for (const s of (setups || [])) {
                        // Calculate total price for THIS setup
            const { data: roomSetups } = await supabase
                .from("setups")
                .select("id")
                .eq("room_id", s.id);

            const setupIds = (roomSetups || []).map((row) => row.id);

            let totalPrice = 0;
            if (setupIds.length > 0) {
                const { data: setupDevices } = await supabase
                    .from("setup_devices")
                    .select("device_id")
                    .in("setup_id", setupIds);

                const productIds = Array.from(new Set((setupDevices || []).map((row) => Number(row.device_id)).filter(Number.isFinite)));

                if (productIds.length > 0) {
                    const valueRows = await Promise.all(productIds.map(async (productId) => {
                        const { data } = await supabase
                            .from("values")
                            .select("value, properties_id")
                            .eq("products_id", productId);
                        return data || [];
                    }));

                    const { data: props } = await supabase.from("properties").select("id, property");
                    const pricePropIds = new Set((props || []).filter((p) => String(p.property).toLowerCase() === "price").map((p) => Number(p.id)));

                    totalPrice = valueRows.flat().reduce((sum, row) => {
                        if (!pricePropIds.has(Number(row.properties_id))) return sum;
                        return sum + Number(row.value || 0);
                    }, 0);
                }
            }

            result.push({
                ...s,
                setup_name: s.setup_name ?? s.name ?? "Névtelen setup",
                x: s?.pos_x ?? 0,
                y: s?.pos_y ?? 0,
                total_price: totalPrice
            });
        }

        res.json({ setups: result });
    } catch (err) {
        console.error("❌ Admin user setups error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ========================================
//  📢 SYSTEM MESSAGES
// ========================================

/**
 * GET /api/admin/system-messages
 * Returns all system messages (for the admin list)
 */
router.get("/system-messages", verifyAdmin, async (req, res) => {
    try {
        const category = req.query.category ? normalizeCategory(req.query.category) : undefined;
        const messages = await listNotifications({ category });
        res.json({ messages });
    } catch (e) {
        console.error("❌ system-messages list:", e);
        res.status(500).json({ error: e.message, messages: [] });
    }
});

/**
 * POST /api/admin/system-message
 * body: { title, message, target }
 * target: "all" | "admin" | "admin+" | "owner" | <userId>
 */
router.post("/system-message", verifyAdmin, async (req, res) => {
    try {
        const { title, message, target, category } = req.body;

        if (!title || !message || !target) {
            return res.status(400).json({ error: "Missing title, message, or target" });
        }

        const senderId = Number(req.user.id);
        const created = await createNotification({
            title,
            message,
            target,
            sender: senderId,
            category: category || "system"
        });

        res.json({ success: true, message: created });
    } catch (e) {
        console.error("❌ system-message create:", e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * DELETE /api/admin/system-message/:id
 */
router.delete("/system-message/:id", verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await deleteNotification(id);
        res.json({ success: true });
    } catch (e) {
        console.error("❌ system-message delete:", e);
        res.status(500).json({ error: e.message });
    }
});

// ========================================
//  📋 SERVER LOGS
// ========================================

const logger = require("../services/logger");

/**
 * GET /api/admin/logs?limit=200&level=error&search=xxx
 */
router.get("/logs", verifyAdmin, (req, res) => {
    const { limit, level, search, since } = req.query;
    const logs = logger.getLogs({
        limit: Number(limit) || 200,
        level: level || undefined,
        search: search || undefined,
        since: since || undefined
    });
    res.json({ logs });
});

/**
 * DELETE /api/admin/logs  (clear all)
 */
router.delete("/logs", verifyAdmin, (req, res) => {
    logger.clearLogs();
    res.json({ success: true });
});

module.exports = router;


