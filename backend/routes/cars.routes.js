/**
 * --------------------------------------------------------------------------
 *  CAR INVENTORY ROUTES
 * --------------------------------------------------------------------------
 *  Exposes endpoints for fetching and listing available vehicles.
 */

const express = require("express");
const router = express.Router();

const { listCars } = require("../controllers/cars.controller");

// Fetch all cars with optional filters
router.get("/", listCars);

module.exports = router;