/**
 * --------------------------------------------------------------------------
 *  COMPUTER ASSETS ROUTES
 * --------------------------------------------------------------------------
 *  Endpoints for managing and listing hardware inventory.
 */

const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/computers.controller");

// Retrieve list of computer systems
router.get("/", ctrl.list);

module.exports = router;