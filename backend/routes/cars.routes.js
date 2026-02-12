const express = require("express");
const router = express.Router();

const { listCars } = require("../controllers/cars.controller");

router.get("/", listCars);

module.exports = router;
