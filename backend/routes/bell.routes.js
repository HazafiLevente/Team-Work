const router = require("express").Router();
const ctrl = require("../controllers/bell.controller");
const verifyUser = require("../middlewares/verifyUser");

router.get("/", verifyUser, ctrl.list);
router.post("/read", verifyUser, ctrl.read);

module.exports = router;
