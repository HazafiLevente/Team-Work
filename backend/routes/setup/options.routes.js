const router = require("express").Router();
const ctrl = require("../../controllers/setup.controller");

router.get("/car-options", ctrl.carOptions);
router.get("/instrument-options", ctrl.instrumentOptions);
router.get("/network-options", ctrl.networkOptions);
router.get("/car-setup/:carSetupId/details", ctrl.carSetupDetails);

module.exports = router;
