const router = require("express").Router();
const ctrl = require("../../controllers/setup.controller");

router.post("/:id/save-device", ctrl.addDevice);
router.patch("/replace-child-device/:childId", ctrl.replaceChildDevice);
router.get("/child-device/:childId", ctrl.childDevice);
router.patch("/rename-item", ctrl.renameItem);
router.patch("/update-item-position", ctrl.updateItemPosition);
router.delete("/remove-child-setup/:id", ctrl.removeChildSetup);
router.delete("/remove-item", ctrl.removeItem);

module.exports = router;
