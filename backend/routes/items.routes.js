const router = require("express").Router();
const ctrl = require("../controllers/items.controller");
const verifyUser = require("../middlewares/verifyUser");

console.log("ITEMS CTRL =", ctrl);
console.log("ITEMS CTRL LIST =", ctrl.list);


router.get("/list", verifyUser, ctrl.list);
router.get("/search", verifyUser, ctrl.search);

module.exports = router;
