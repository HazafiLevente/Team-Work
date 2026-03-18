const router = require("express").Router();
const ctrl = require("../controllers/hometheaters.controller");
const verifyUser = require("../middlewares/verifyUser");

// LIST
router.get("/", ctrl.list);
router.get("/list", ctrl.list);

// CATALOG
router.get("/get-catalog", verifyUser, ctrl.getHtCatalog);

// DEVICES
router.get("/:setupId/get-devices", verifyUser, ctrl.listDevices);
router.post("/save-device", verifyUser, ctrl.createDevice);

// CONNECTIONS
router.get("/:setupId/get-connections", verifyUser, ctrl.listConnections);
router.post("/save-connection", verifyUser, ctrl.createConnection);
router.delete("/remove-connection/:id", verifyUser, ctrl.deleteConnection);

// BUILD
router.get("/:setupId/get-build", verifyUser, ctrl.getHtBuild);
router.post("/save-build", verifyUser, ctrl.saveHtBuild);

// 🔥 ÚJ ROUTE-OK
router.patch("/update-build/:id", verifyUser, ctrl.updateHtBuild);
router.delete("/delete-build/:id", verifyUser, ctrl.deleteHtBuild);

module.exports = router;