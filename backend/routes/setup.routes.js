const router = require("express").Router();
const ctrl = require("../controllers/setup.controller");
const verifyUser = require("../middlewares/verifyUser");

// SETUP lista
router.get("/", verifyUser, ctrl.list);

// SETUP gyerekek
router.get("/:id/children", verifyUser, ctrl.children);

// PC BUILDER: PC build lista + létrehozás + alkatrészek
router.get("/:id/pcbuilds", verifyUser, ctrl.pcBuildsList);
router.post("/:id/pcbuilds", verifyUser, ctrl.pcBuildsCreate);
router.get("/:id/pcparts", verifyUser, ctrl.pcParts);

module.exports = router;
