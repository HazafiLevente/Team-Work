const router = require("express").Router();
const ctrl = require("../controllers/hometheaters.controller");
const verifyUser = require("../middlewares/verifyUser");

/**
 * hometheaters.routes.js
 * 
 * Defines expressive, RESTful routes for Home Theater management.
 */

// --- CATALOG & GEAR ---
router.get("/catalog", verifyUser, ctrl.getHtCatalog);

// --- BUILD MANAGEMENT ---
// List all builds for a setup
router.get("/setup/:setupId", verifyUser, ctrl.listBuildsForSetup);

// Get a specific build by its primary ID
router.get("/build/:id", verifyUser, ctrl.getBuildById);

// Create or Update a build
// [POST] /build - if payload includes { id }, it updates; otherwise inserts new.
router.post("/build", verifyUser, ctrl.saveBuild);

// Delete a build
router.delete("/build/:id", verifyUser, ctrl.deleteBuild);


// --- LEGACY COMPATIBILITY ---
// These are kept to ensure no breaking changes for existing un-refactored calls
router.get("/:setupId/build", verifyUser, ctrl.getHtBuild);
router.get("/build-by-id/:id", verifyUser, ctrl.getHtBuildById);
router.post("/save-build", verifyUser, ctrl.saveBuild);
router.get("/list", verifyUser, ctrl.list);

module.exports = router;