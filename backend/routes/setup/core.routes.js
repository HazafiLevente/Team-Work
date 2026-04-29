const router = require("express").Router();
const ctrl = require("../../controllers/setup.controller");

router.post("/create", ctrl.create);
router.post("/save-setup", ctrl.create);
router.patch("/update-setup/:id", ctrl.update);
router.delete("/remove-setup/:id", ctrl.remove);
router.get("/", ctrl.list);
router.patch("/:id/update-setup", ctrl.update);
router.delete("/:id/remove-setup", ctrl.remove);
router.patch("/rooms/:setupId/update-position", ctrl.upsertRoomPosition);

module.exports = router;
