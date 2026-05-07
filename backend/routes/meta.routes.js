/**
 * --------------------------------------------------------------------------
 *  METADATA & SCHEMA ROUTES
 * --------------------------------------------------------------------------
 *  Provides schema definitions and configuration data for various domains.
 */

const router = require("express").Router();
const ctrl = require("../controllers/meta.controller");

// Retrieve full schema overview
router.get("/all", ctrl.getAllTables);

// Domain-specific metadata endpoints
router.get("/cars", ctrl.getCarMeta);
router.get("/computer", ctrl.getComputerMeta);
router.get("/ht", ctrl.getHtMeta);
router.get("/instruments", ctrl.getInstrumentMeta);

module.exports = router;