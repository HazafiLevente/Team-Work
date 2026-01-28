const router = require("express").Router();
const ctrl = require("../controllers/setup.controller");
const verifyUser = require("../middlewares/verifyUser");

router.get("/", verifyUser, ctrl.list);
router.post("/", verifyUser, ctrl.create);
router.get("/:id/children", verifyUser, ctrl.children);

module.exports = router;
