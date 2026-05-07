/**
 * --------------------------------------------------------------------------
 *  MUSICAL INSTRUMENTS ROUTES
 * --------------------------------------------------------------------------
 *  Endpoints for browsing and listing musical equipment assets.
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/instruments.controller");

// Retrieve all available instruments
router.get("/", ctrl.list);

module.exports = router;