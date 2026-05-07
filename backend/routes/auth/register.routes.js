const router = require("express").Router();
const ctrl = require("../../controllers/auth.controller");

router.post("/register", ctrl.register);
router.post("/register/request", ctrl.requestRegisterCode);
router.post("/register/verify", ctrl.verifyRegisterCode);

module.exports = router;
