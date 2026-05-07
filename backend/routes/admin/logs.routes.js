const router = require("express").Router();
const verifyOwner = require("../../middlewares/verifyOwner");
const logger = require("../../services/logger");

router.get("/logs", verifyOwner, (req, res) => {
    const { limit, level, search, since } = req.query;
    const logs = logger.getLogs({
        limit: Number(limit) || 200,
        level: level || undefined,
        search: search || undefined,
        since: since || undefined
    });
    res.json({ logs });
});

router.delete("/logs", verifyOwner, (req, res) => {
    logger.clearLogs();
    res.json({ success: true });
});

module.exports = router;
