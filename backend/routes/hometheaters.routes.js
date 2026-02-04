const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/hometheaters.controller");

router.get("/", ctrl.list);

module.exports = router;
