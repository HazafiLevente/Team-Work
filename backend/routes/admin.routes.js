const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const { supabase } = require("../services/supabase");
const verifyAdmin = require("../middlewares/verifyAdmin");
const { resolveRole } = require("../services/control");
const localDb = require("../services/localDb");
const { shouldExclude } = require("../services/tableFilter");
const activeUsersTracker = require("../services/activeUsers");


router.get("/stats", verifyAdmin, async (req, res) => {
    // Middleware handles auth & role check


    // 📦 tables.runtime.json (for Product Tables & Products calculation)
    const file = path.join(
        __dirname,
        "../../datas/Jsons/tables.runtime.json"
    );

    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    const runtimeTableNames = Object.keys(json.tables || {});

    // Filter product-site tables from runtime config
    const productTables = runtimeTableNames.filter(
        t => !shouldExclude(t)
    );

    // 🗂 ÖSSZES TÁBLA (Local DB Count)
    const allTables = localDb.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const realTableCount = allTables.filter(t => !shouldExclude(t.name)).length;

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
        products: totalProducts,          // Sum of rows from locally cached product-site tables
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

// ========================================
//  📢 SYSTEM MESSAGES
// ========================================

/**
 * GET /api/admin/system-messages
 * Returns all system messages (for the admin list)
 */
router.get("/system-messages", verifyAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("system_message[System]")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;
        res.json({ messages: data || [] });
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
        const { title, message, target } = req.body;

        if (!title || !message || !target) {
            return res.status(400).json({ error: "Missing title, message, or target" });
        }

        const senderId = Number(req.user.id);

        const { data, error } = await supabase
            .from("system_message[System]")
            .insert({
                title: String(title).trim(),
                message: String(message).trim(),
                target: String(target).trim().toLowerCase(),
                sender: senderId,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, message: data });
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
        const { error } = await supabase
            .from("system_message[System]")
            .delete()
            .eq("id", Number(id));

        if (error) throw error;
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
