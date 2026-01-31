const router = require("express").Router();
const verifyUser = require("../middlewares/verifyUser");
const ctrl = require("../controllers/profile.controller");

router.get("/", verifyUser, ctrl.getProfile);
router.put("/", verifyUser, ctrl.updateProfile);
router.put("/password", verifyUser, ctrl.changePassword);

module.exports = router;
