const router = require("express").Router();
const ctrl = require("../controllers/auth.controller");
const verifyUser = require("../middlewares/verifyUser");

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.post("/logout", ctrl.logout);
router.post("/register/request", ctrl.requestRegisterCode);
router.post("/register/verify", ctrl.verifyRegisterCode);

router.post("/password/request", ctrl.requestPasswordReset);
router.post("/password/reset", ctrl.resetPassword);
router.post("/google", ctrl.googleLogin);

// 🔥 EZ KÖTELEZŐ
router.get("/me", verifyUser, ctrl.me);

module.exports = router;
