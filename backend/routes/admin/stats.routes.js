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

router.get("/active-users", verifyAdmin, (req, res) => {
    res.json({
        online: activeUsersTracker.getActiveUsers(),
        onlineCount: activeUsersTracker.getActiveCount(),
        daily: activeUsersTracker.getDailyHistory()
    });
});

module.exports = router;
