/**
 * --------------------------------------------------------------------------
 *  GENERAL ITEM ROUTES
 * --------------------------------------------------------------------------
 *  Generic interface for searching and retrieving various catalog assets.
 */

const router = require("express").Router();
const ctrl = require("../controllers/items.controller");
const verifyUser = require("../middlewares/verifyUser");
const optionalUser = require("../middlewares/optionalUser");

// Paginated lists and keyword search
router.get("/list", verifyUser, ctrl.list);
router.get("/search", verifyUser, ctrl.search);

// Dynamic resource retrieval based on table mapping
router.get("/:table/:id", optionalUser, ctrl.getOne);

module.exports = router;