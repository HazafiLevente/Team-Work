const router = require("express").Router();
const ctrl = require("../controllers/bell.controller");
const verifyUser = require("../middlewares/verifyUser");

router.get("/", verifyUser, ctrl.list);
router.post("/read", verifyUser, ctrl.read);

router.get("/conversations", verifyUser, ctrl.conversations);
router.get("/conversation/:key", verifyUser, ctrl.conversation);

router.get("/:source_table/:id", verifyUser, ctrl.getOne);

module.exports = router;
