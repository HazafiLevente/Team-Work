const express = require("express");
const router = express.Router();

const { listCars, getCarDetails } = require("../controllers/cars.controller");

router.get("/", listCars);
router.get("/:table/:id", getCarDetails);


module.exports = { listCars, getCarDetails };
module.exports = router;
