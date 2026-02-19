const router = require("express").Router();
const ctrl = require("../controllers/setup.controller");
const verifyUser = require("../middlewares/verifyUser");

// MY SETUPS (nem favorite)
router.get("/", verifyUser, ctrl.list);

// FAVORITES
router.get("/favorites", verifyUser, ctrl.favorites);

// SETUP gyerekek
router.get("/:id/children", verifyUser, ctrl.children);

// PC BUILDER
router.get("/:id/pcbuilds", verifyUser, ctrl.pcBuildsList);
router.post("/:id/pcbuilds", verifyUser, ctrl.pcBuildsCreate);
router.get("/:id/pcparts", verifyUser, ctrl.pcParts);

module.exports = router;
