const router = require("express").Router();
const ctrl = require("../controllers/setup.controller");
const verifyUser = require("../middlewares/verifyUser");

// One setup router keeps both the current and legacy endpoints together.
router.post("/create", verifyUser, ctrl.create);
router.post("/save-setup", verifyUser, ctrl.create);
router.patch("/update-setup/:id", verifyUser, ctrl.update);
router.delete("/remove-setup/:id", verifyUser, ctrl.remove);
router.patch("/save-pcbuild/:pcId", verifyUser, ctrl.pcBuildsUpdate);

router.get("/car-options", verifyUser, ctrl.carOptions);
router.get("/instrument-options", verifyUser, ctrl.instrumentOptions);
router.get("/car-setup/:carSetupId/details", verifyUser, ctrl.carSetupDetails);

router.get("/", verifyUser, ctrl.list);
router.get("/all-connections", verifyUser, ctrl.allConnections);
router.get("/device-connections", verifyUser, ctrl.deviceConnections);

router.get("/:id/get-children", verifyUser, ctrl.children);
router.get("/:id/get-connections", verifyUser, ctrl.connections);

router.get("/:id/get-pcbuilds", verifyUser, ctrl.pcBuildsList);
router.post("/:id/save-pcbuild", verifyUser, ctrl.pcBuildsCreate);
router.get("/:id/get-pcparts", verifyUser, ctrl.pcParts);

router.patch("/:id/update-setup", verifyUser, ctrl.update);
router.delete("/:id/remove-setup", verifyUser, ctrl.remove);

router.patch("/rooms/:setupId/update-position", verifyUser, ctrl.upsertRoomPosition);

router.get("/:id/get-cars", verifyUser, ctrl.carsList);
router.post("/:id/add-car", verifyUser, ctrl.carsAdd);
router.get("/:id/get-instruments", verifyUser, ctrl.instrumentsList);
router.post("/:id/add-instrument", verifyUser, ctrl.instrumentsAdd);
router.post("/:id/save-device", verifyUser, ctrl.addDevice);

router.patch("/rename-item", verifyUser, ctrl.renameItem);
router.patch("/update-item-position", verifyUser, ctrl.updateItemPosition);
router.delete("/remove-item", verifyUser, ctrl.removeItem);

router.post("/save-connection", verifyUser, ctrl.connectionsCreate);
router.delete("/remove-connection/:id", verifyUser, ctrl.connectionsRemove);

module.exports = router;
