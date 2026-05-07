const router = require("express").Router();
const ctrl = require("../../controllers/messages.controller");

router.get("/ai/conversations", ctrl.aiConversations);
router.post("/ai/conversations", ctrl.aiCreateConversation);
router.get("/ai/conversation/:key", ctrl.aiConversation);
router.patch("/ai/conversation/:key", ctrl.aiRenameConversation);
router.delete("/ai/conversation/:key", ctrl.aiDeleteConversation);

module.exports = router;
