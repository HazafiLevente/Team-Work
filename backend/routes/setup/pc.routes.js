const router = require("express").Router();
const ctrl = require("../../controllers/setup.controller");

router.patch("/save-pcbuild/:pcId", ctrl.pcBuildsUpdate);
router.get("/:id/get-pcbuilds", ctrl.pcBuildsList);
router.post("/:id/save-pcbuild", ctrl.pcBuildsCreate);
router.get("/:id/get-pcparts", ctrl.pcParts);

module.exports = router;
