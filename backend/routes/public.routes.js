const router = require("express").Router();
const ctrl = require("../controllers/public.controller");

router.get("/table/:name", ctrl.table);

module.exports = router;