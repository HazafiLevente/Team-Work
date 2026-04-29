const router = require("express").Router();
const ctrl = require("../../controllers/hometheaters.controller");

router.get("/:setupId/devices", ctrl.listDevices);
router.post("/device", ctrl.createDevice);

module.exports = router;
