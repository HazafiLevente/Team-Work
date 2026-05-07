const router = require("express").Router();
const ctrl = require("../../controllers/messages.controller");

router.post("/start", ctrl.createPanelAndMessage);
router.post("/send", ctrl.send);
router.post("/report", ctrl.reportUser);
router.get("/panels", ctrl.getPanels);
router.get("/panel/:id", ctrl.getPanelMessages);
router.get("/conversations", ctrl.conversations);
router.get("/conversation/:key", ctrl.conversation);
router.delete("/conversation/:key", ctrl.deleteConversation);
router.patch("/:id", ctrl.editMessage);
router.delete("/:id", ctrl.deleteMessage);

module.exports = router;
