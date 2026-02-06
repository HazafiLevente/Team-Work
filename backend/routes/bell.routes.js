const router = require("express").Router();
const ctrl = require("../controllers/bell.controller");
const verifyUser = require("../middlewares/verifyUser");

// SPECIFIC ROUTES FIRST ✅
router.get("/conversations", verifyUser, ctrl.conversations);
router.get("/conversation/:key", verifyUser, ctrl.conversation);

// BASIC BELL LIST
router.get("/", verifyUser, ctrl.list);

// READ
router.post("/read", verifyUser, ctrl.read);

// MUST BE LAST (dynamic) ✅
router.get("/:type/:id", verifyUser, ctrl.getOne);

module.exports = router;
