const router = require("express").Router();
const verifyAdminPlus = require("../../middlewares/verifyAdminPlus");
const { listNotifications, createNotification, deleteNotification, normalizeCategory } = require("../../services/notificationStore");

router.get("/system-messages", verifyAdminPlus, async (req, res) => {
    try {
        const category = req.query.category ? normalizeCategory(req.query.category) : undefined;
        const messages = await listNotifications({ category });
        res.json({ messages });
    } catch (e) {
        console.error("âťŚ system-messages list:", e);
        res.status(500).json({ error: e.message, messages: [] });
    }
});

router.post("/system-message", verifyAdminPlus, async (req, res) => {
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
        console.error("âťŚ system-message create:", e);
        res.status(500).json({ error: e.message });
    }
});

router.delete("/system-message/:id", verifyAdminPlus, async (req, res) => {
    try {
        const { id } = req.params;
        await deleteNotification(id);
        res.json({ success: true });
    } catch (e) {
        console.error("âťŚ system-message delete:", e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
