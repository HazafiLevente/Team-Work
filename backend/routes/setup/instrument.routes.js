const router = require("express").Router();
const ctrl = require("../../controllers/setup.controller");

router.get("/:id/get-instruments", ctrl.instrumentsList);
router.post("/:id/add-instrument", ctrl.instrumentsAdd);

module.exports = router;
