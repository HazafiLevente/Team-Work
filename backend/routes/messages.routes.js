const router = require("express").Router();
const verifyUser = require("../middlewares/verifyUser");

router.use(verifyUser);
router.use(require("./messages/ai.routes"));
router.use(require("./messages/relation.routes"));
router.use(require("./messages/conversation.routes"));

module.exports = router;
