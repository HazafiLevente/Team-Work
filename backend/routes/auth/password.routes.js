const router = require("express").Router();
const ctrl = require("../../controllers/auth.controller");

router.post("/password/request", ctrl.requestPasswordReset);
router.post("/password/reset", ctrl.resetPassword);

module.exports = router;
