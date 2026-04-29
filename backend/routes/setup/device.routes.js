const router = require("express").Router();
const ctrl = require("../../controllers/setup.controller");

router.post("/:id/save-device", ctrl.addDevice);
router.patch("/rename-item", ctrl.renameItem);
router.patch("/update-item-position", ctrl.updateItemPosition);
router.delete("/remove-item", ctrl.removeItem);

module.exports = router;
