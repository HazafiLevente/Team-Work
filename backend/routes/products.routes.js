const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/products.controller");

console.log("✅ products.controller keys:", Object.keys(ctrl));
console.log("✅ typeof ctrl.list:", typeof ctrl.list);
console.log("✅ typeof ctrl.brands:", typeof ctrl.brands);

router.get("/", ctrl.list);
router.get("/brands", ctrl.brands);

module.exports = router;
