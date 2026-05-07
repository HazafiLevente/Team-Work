const router = require("express").Router();
const ctrl = require("../../controllers/auth.controller");

router.post("/google", ctrl.googleLogin);

module.exports = router;
