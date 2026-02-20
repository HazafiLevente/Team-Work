
const router = require("express").Router();
const ctrl = require("../controllers/setup.controller");
const verifyUser = require("../middlewares/verifyUser");

// ✅ CAR OPTIONS (FONTOS: a "/:id" elé!)
router.get("/car-options", verifyUser, ctrl.carOptions);

// SETUP lista
// ✅ query: /api/setup?favorite=true|false
router.get("/", verifyUser, ctrl.list);

// SETUP gyerekek
router.get("/:id/children", verifyUser, ctrl.children);

// PC BUILDER: PC build lista + létrehozás + alkatrészek
router.get("/:id/pcbuilds", verifyUser, ctrl.pcBuildsList);
router.post("/:id/pcbuilds", verifyUser, ctrl.pcBuildsCreate);
router.get("/:id/pcparts", verifyUser, ctrl.pcParts);

// ✅ CARS: lista + hozzáadás (mint PC, csak 1 dropdown)
router.get("/:id/cars", verifyUser, ctrl.carsList);
router.post("/:id/cars", verifyUser, ctrl.carsAdd);

module.exports = router;