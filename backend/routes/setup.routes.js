const router = require("express").Router();
const ctrl = require("../controllers/setup.controller");
const verifyUser = require("../middlewares/verifyUser");

// ✅ CAR OPTIONS (FONTOS: a "/:id" elé!)
router.get("/car-options", verifyUser, ctrl.carOptions);

// ✅ ÚJ: Car_setup row részletek (külön endpoint, nem ütközik PC-vel)
router.get("/car-setup/:carSetupId/details", verifyUser, ctrl.carSetupDetails);

// SETUP lista
// ✅ query: /api/setup?favorite=true|false
router.get("/", verifyUser, ctrl.list);
router.get("/all-connections", verifyUser, ctrl.allConnections);

router.get("/device-connections", verifyUser, ctrl.deviceConnections);

// SETUP gyerekek
router.get("/:id/get-children", verifyUser, ctrl.children);
router.get("/:id/get-connections", verifyUser, ctrl.connections);

// PC BUILDER: PC build lista + létrehozás + alkatrészek
router.get("/:id/get-pcbuilds", verifyUser, ctrl.pcBuildsList);
router.post("/:id/save-pcbuild", verifyUser, ctrl.pcBuildsCreate);
router.get("/:id/get-pcparts", verifyUser, ctrl.pcParts);

router.patch("/:id/update-setup", verifyUser, ctrl.update);
router.delete("/:id/remove-setup", verifyUser, ctrl.remove);

// ROOMS (overview spatial positions)
router.patch("/rooms/:setupId/update-position", verifyUser, ctrl.upsertRoomPosition);

// ✅ CARS: lista + hozzáadás (mint PC, csak 1 dropdown)
router.get("/:id/get-cars", verifyUser, ctrl.carsList);
router.post("/:id/add-car", verifyUser, ctrl.carsAdd);

// ✅ Generic device add to any setup
router.post("/:id/save-device", verifyUser, ctrl.addDevice);


// ✅ CONNECTIONS
router.post("/save-connection", verifyUser, ctrl.connectionsCreate);
router.delete("/remove-connection/:id", verifyUser, ctrl.connectionsRemove);
router.delete("/remove-item", verifyUser, ctrl.removeItem);

module.exports = router;
