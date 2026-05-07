/**
 * --------------------------------------------------------------------------
 *  USER PROFILE ROUTES
 * --------------------------------------------------------------------------
 *  Endpoints for managing personal account data and security settings.
 */

const router = require("express").Router();
const verifyUser = require("../middlewares/verifyUser");
const ctrl = require("../controllers/profile.controller");

// Fetch and update authenticated user profile
router.get("/", verifyUser, ctrl.getProfile);
router.put("/", verifyUser, ctrl.updateProfile);

// Sensitive account security updates
router.put("/password", verifyUser, ctrl.changePassword);

module.exports = router;