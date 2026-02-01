const router = require("express").Router();
const imagesController = require("../controllers/imagesMap.controller");

router.get("/map", imagesController.getMap);

module.exports = router;
