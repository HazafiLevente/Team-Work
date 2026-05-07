/**
 * --------------------------------------------------------------------------
 *  USER RANKING ROUTES
 * --------------------------------------------------------------------------
 *  Provides progression and tier information for the authenticated user.
 */

const router = require("express").Router();
const ctrl = require("../controllers/ranks.controller");
const verifyUser = require("../middlewares/verifyUser");

// Get the current user's rank and progression status
router.get("/me", verifyUser, ctrl.me);

module.exports = router;