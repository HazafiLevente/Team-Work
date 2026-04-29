const router = require("express").Router();
const ctrl = require("../controllers/meta.controller");

router.get("/all", ctrl.getAllTables);
router.get("/cars", ctrl.getCarMeta);
router.get("/computer", ctrl.getComputerMeta);
router.get("/ht", ctrl.getHtMeta);
router.get("/instruments", ctrl.getInstrumentMeta);

module.exports = router;
