const router = require("express").Router();
const ctrl = require("../controllers/hometheaters.controller");
const verifyUser = require("../middlewares/verifyUser");

// ✅ LISTA A FILTERHEZ
router.get("/", ctrl.list);
router.get("/list", ctrl.list);

// catalog
router.get("/catalog", verifyUser, ctrl.getHtCatalog);

// setup devices
router.get("/:setupId/devices", verifyUser, ctrl.listDevices);
router.post("/device", verifyUser, ctrl.createDevice);

// connections
router.get("/:setupId/connections", verifyUser, ctrl.listConnections);
router.post("/connection", verifyUser, ctrl.createConnection);
router.delete("/connection/:id", verifyUser, ctrl.deleteConnection);

// save
router.post("/config", verifyUser, ctrl.saveHtConfig);
router.post("/build", verifyUser, ctrl.saveHtBuild);

module.exports = router;