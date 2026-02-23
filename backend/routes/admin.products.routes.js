const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/admin.products.controller");

router.get("/", ctrl.list);
router.post("/:table", ctrl.create);
router.get("/:table/:id", ctrl.getOne);
router.patch("/:table/:id", ctrl.update);
router.delete("/:table/:id", ctrl.remove);

module.exports = router;
