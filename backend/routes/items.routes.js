const router = require("express").Router();
const ctrl = require("../controllers/items.controller");
const verifyUser = require("../middlewares/verifyUser");

router.get("/list", verifyUser, ctrl.list);
router.get("/search", verifyUser, ctrl.search);
router.get("/:table/:id", ctrl.getOne);

module.exports = router;
