const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/admin.products.controller");

router.get("/", ctrl.list);
router.get("/:table/:id", ctrl.getOne);

module.exports = router;
