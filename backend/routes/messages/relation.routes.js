const router = require("express").Router();
const ctrl = require("../../controllers/messages.controller");

router.post("/relation/mute", ctrl.setMute);
router.post("/relation/disable", ctrl.setDisable);
router.post("/relation/block", ctrl.setBlock);

module.exports = router;
