const router = require("express").Router();
const ctrl = require("../controllers/bell.controller");
const verifyUser = require("../middlewares/verifyUser");


router.get("/", verifyUser, ctrl.list);
router.post("/read", verifyUser, ctrl.read);
router.get("/:type/:id", verifyUser, ctrl.getOne);
router.get("/conversations", verifyUser, ctrl.conversations);
router.get("/conversation/:key", verifyUser, ctrl.conversation);



module.exports = router;
