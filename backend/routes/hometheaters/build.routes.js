const router = require("express").Router();
const ctrl = require("../../controllers/hometheaters.controller");

router.get("/setup/:setupId", ctrl.listBuildsForSetup);
router.get("/build/:id", ctrl.getBuildById);
router.post("/build", ctrl.saveBuild);
router.delete("/build/:id", ctrl.deleteBuild);
router.get("/:setupId/build", ctrl.getHtBuild);
router.get("/build-by-id/:id", ctrl.getHtBuildById);
router.post("/save-build", ctrl.saveBuild);

module.exports = router;
