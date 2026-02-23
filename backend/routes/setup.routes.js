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

// SETUP gyerekek
router.get("/:id/children", verifyUser, ctrl.children);
router.get("/:id/connections", verifyUser, ctrl.connections);

// PC BUILDER: PC build lista + létrehozás + alkatrészek
router.get("/:id/pcbuilds", verifyUser, ctrl.pcBuildsList);
router.post("/:id/pcbuilds", verifyUser, ctrl.pcBuildsCreate);
router.get("/:id/pcparts", verifyUser, ctrl.pcParts);

router.patch("/:id", verifyUser, ctrl.update);
router.delete("/:id", verifyUser, ctrl.remove);

// ROOMS (overview spatial positions)
router.patch("/rooms/:setupId/position", verifyUser, ctrl.upsertRoomPosition);

// ✅ CARS: lista + hozzáadás (mint PC, csak 1 dropdown)
router.get("/:id/cars", verifyUser, ctrl.carsList);
router.post("/:id/cars", verifyUser, ctrl.carsAdd);

module.exports = router;