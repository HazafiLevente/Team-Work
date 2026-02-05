const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/instruments.controller");

// Lekéri az összes hangszert és kiegészítőt a View-ból
router.get("/", ctrl.list);

module.exports = router;