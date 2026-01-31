const router = require("express").Router();
const ctrl = require("../controllers/items.controller");
const verifyUser = require("../middlewares/verifyUser");
const items = require("../controllers/items.controller");

router.get("/:table/:id", items.getOne);

module.exports = router;


console.log("ITEMS CTRL =", ctrl);
console.log("ITEMS CTRL LIST =", ctrl.list);


router.get("/list", verifyUser, ctrl.list);
router.get("/search", verifyUser, ctrl.search);

module.exports = router;
