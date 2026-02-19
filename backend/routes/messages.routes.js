const router = require("express").Router();
const verifyUser = require("../middlewares/verifyUser");
const ctrl = require("../controllers/messages.controller");

router.post("/start", verifyUser, ctrl.createPanelAndMessage);
router.post("/send", verifyUser, ctrl.send);

router.get("/panels", verifyUser, ctrl.getPanels);
router.get("/panel/:id", verifyUser, ctrl.getPanelMessages);

// 🔥 EZEK HIÁNYOZTAK
router.get("/conversations", verifyUser, ctrl.conversations);
router.get("/conversation/:key", verifyUser, ctrl.conversation);


router.patch("/:id", verifyUser, ctrl.editMessage);
router.delete("/:id", verifyUser, ctrl.deleteMessage);

module.exports = router;
