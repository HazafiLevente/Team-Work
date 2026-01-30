const router = require("express").Router();
const ctrl = require("../controllers/auth.controller");
const verifyUser = require("../middlewares/verifyUser");

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.post("/logout", ctrl.logout);

// 🔥 EZ KÖTELEZŐ
router.get("/me", verifyUser, ctrl.me);

module.exports = router;
