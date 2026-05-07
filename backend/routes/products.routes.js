/**
 * --------------------------------------------------------------------------
 *  PRODUCT CATALOG ROUTES
 * --------------------------------------------------------------------------
 *  Public endpoints for browsing products and filtering by brands.
 */

const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/products.controller");

// List all products and fetch available brand names
router.get("/", ctrl.list);
router.get("/brands", ctrl.brands);

module.exports = router;