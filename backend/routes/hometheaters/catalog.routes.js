const router = require("express").Router();
const ctrl = require("../../controllers/hometheaters.controller");

router.get("/catalog", ctrl.getHtCatalog);
router.get("/list", ctrl.list);

module.exports = router;
