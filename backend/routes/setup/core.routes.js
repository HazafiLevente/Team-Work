const router = require("express").Router();
const ctrl = require("../../controllers/setup.controller");

router.post("/create", ctrl.create);
router.post("/save-setup", ctrl.create);
router.patch("/update-setup/:id", ctrl.update);
router.delete("/remove-setup/:id", ctrl.remove);
router.get("/lists", ctrl.listSetupLists);
router.post("/lists", ctrl.createSetupList);
router.post("/lists/:listId/setups", ctrl.addSetupToList);
router.delete("/lists/:listId/setups/:setupId", ctrl.removeSetupFromList);
router.get("/", ctrl.list);
router.patch("/:id/update-setup", ctrl.update);
router.post("/:id/add-product", ctrl.allProductAdd);
router.get("/device-link/:id", ctrl.getDeviceLink);
router.delete("/:id/remove-setup", ctrl.remove);
router.patch("/rooms/:setupId/update-position", ctrl.upsertRoomPosition);

module.exports = router;
