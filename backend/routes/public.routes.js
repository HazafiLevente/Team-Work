/**
 * --------------------------------------------------------------------------
 *  PUBLIC ACCESS ROUTES
 * --------------------------------------------------------------------------
 *  Provides restricted, read-only access to public table data.
 */

const router = require("express").Router();
const ctrl = require("../controllers/public.controller");

// Dynamically fetch public content by table name
router.get("/table/:name", ctrl.table);

module.exports = router;