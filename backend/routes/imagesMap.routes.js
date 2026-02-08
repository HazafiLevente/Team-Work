const router = require("express").Router();
const ctrl = require("../controllers/imagesMap.controller");

router.get("/map", ctrl.getMap);

module.exports = router;
