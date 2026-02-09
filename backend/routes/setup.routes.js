const router = require("express").Router();
const ctrl = require("../controllers/setup.controller");
const verifyUser = require("../middlewares/verifyUser");
console.log("typeof verifyUser =", typeof verifyUser);
router.get("/", verifyUser, ctrl.list);
//router.post("/", verifyUser, ctrl.create);
router.get("/:id/children", verifyUser, ctrl.children);
module.exports = router;

