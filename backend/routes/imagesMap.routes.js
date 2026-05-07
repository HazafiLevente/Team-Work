/**
 * --------------------------------------------------------------------------
 *  IMAGE MAPPING ROUTES
 * --------------------------------------------------------------------------
 *  Handles coordinate-based image mapping and spatial data retrieval.
 */

const router = require("express").Router();
const ctrl = require("../controllers/imagesMap.controller");

// Retrieve full image coordinate map
router.get("/map", ctrl.getMap);

module.exports = router;