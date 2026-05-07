const router = require("express").Router();
const ctrl = require("../../controllers/setup.controller");

router.post("/:id/add-network", ctrl.networkAdd);

module.exports = router;
