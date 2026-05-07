const router = require("express").Router();
const ctrl = require("../../controllers/setup.controller");

router.get("/:id/get-cars", ctrl.carsList);
router.post("/:id/add-car", ctrl.carsAdd);

module.exports = router;
