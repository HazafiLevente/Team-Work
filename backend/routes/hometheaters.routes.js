/**
 * --------------------------------------------------------------------------
 *  HOME THEATER MANAGEMENT ROUTES
 * --------------------------------------------------------------------------
 *  Handles theater catalogs, build configurations, and device connections.
 */

const router = require("express").Router();
const ctrl = require("../controllers/hometheaters.controller");
const verifyUser = require("../middlewares/verifyUser");

// --- CATALOG & GEAR ---
router.get("/catalog", verifyUser, ctrl.getHtCatalog);

// --- BUILD MANAGEMENT ---
router.get("/setup/:setupId", verifyUser, ctrl.listBuildsForSetup);
router.get("/build/:id", verifyUser, ctrl.getBuildById);

// UPSERT: Creates or updates build depending on payload ID
router.post("/build", verifyUser, ctrl.saveBuild);
router.delete("/build/:id", verifyUser, ctrl.deleteBuild);

// --- DEVICE & CONNECTION ORCHESTRATION ---
router.get("/:setupId/devices", verifyUser, ctrl.listDevices);
router.post("/device", verifyUser, ctrl.createDevice);

router.get("/:setupId/connections", verifyUser, ctrl.listConnections);
router.post("/connection", verifyUser, ctrl.createConnection);
router.delete("/connection/:id", verifyUser, ctrl.deleteConnection);

// --- LEGACY COMPATIBILITY LAYER ---
// Maintained for backward compatibility with existing front-end calls
router.get("/:setupId/build", verifyUser, ctrl.getHtBuild);
router.get("/build-by-id/:id", verifyUser, ctrl.getHtBuildById);
router.post("/save-build", verifyUser, ctrl.saveBuild);
router.get("/list", verifyUser, ctrl.list);

module.exports = router;