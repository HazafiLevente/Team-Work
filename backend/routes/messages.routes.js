const router = require("express").Router();
const verifyUser = require("../middlewares/verifyUser");
const ctrl = require("../controllers/messages.controller");

router.post("/start", verifyUser, ctrl.createPanelAndMessage);
router.post("/send", verifyUser, ctrl.send);

router.get("/panels", verifyUser, ctrl.getPanels);
router.get("/panel/:id", verifyUser, ctrl.getPanelMessages);

router.get("/conversations", verifyUser, ctrl.conversations);
router.get("/conversation/:key", verifyUser, ctrl.conversation);


router.post("/relation/mute", verifyUser, ctrl.setMute);
router.post("/relation/disable", verifyUser, ctrl.setDisable);
router.post("/relation/block", verifyUser, ctrl.setBlock);


// ✅ EZ KELL
router.delete("/conversation/:key", verifyUser, ctrl.deleteConversation);

router.patch("/:id", verifyUser, ctrl.editMessage);
router.delete("/:id", verifyUser, ctrl.deleteMessage);

module.exports = router;