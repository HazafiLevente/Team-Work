const router = require("express").Router();
const verifyAdmin = require("../../middlewares/verifyAdmin");
const activeUsersTracker = require("../../services/activeUsers");
const localDb = require("../../services/localDb");
const { shouldExclude } = require("../../services/tableFilter");
const { getCatalogStats } = require("../../services/products/productCatalog.service");

router.get("/stats", verifyAdmin, async (req, res) => {
    const allTables = localDb.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const realTableCount = allTables.filter(t => !shouldExclude(t.name)).length;
    const usersCount = localDb.countAll("user[Auth]");
    const catalogStats = await getCatalogStats();

    res.json({
        users: usersCount || 0,
        tables: realTableCount,
        productTables: catalogStats.categoriesAll.length,
        products: catalogStats.totalAll,
        onlineUsers: activeUsersTracker.getActiveCount()
    });
});

router.get("/active-users", verifyAdmin, async (req, res) => {
    try {
        const [activityDays, daily] = await Promise.all([
            activeUsersTracker.getActivityDays?.({ days: 180 }),
            activeUsersTracker.getDailyHistory?.({ days: 180 })
        ]);

        res.json({
            online: activeUsersTracker.getActiveUsers(),
            onlineCount: activeUsersTracker.getActiveCount(),
            activityDays: activityDays || [],
            daily: daily || []
        });
    } catch {
        res.json({
            online: activeUsersTracker.getActiveUsers(),
            onlineCount: activeUsersTracker.getActiveCount(),
            activityDays: [],
            daily: []
        });
    }
});

router.get("/active-users/day/:date", verifyAdmin, async (req, res) => {
    try {
        const date = String(req.params.date || "");
        const details = await activeUsersTracker.getDayDetails?.(date);
        if (!details) return res.status(400).json({ error: "Bad date" });
        return res.json(details);
    } catch {
        return res.status(500).json({ error: "Failed" });
    }
});

module.exports = router;
