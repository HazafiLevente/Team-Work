const router = require("express").Router();
const ctrl = require("../../controllers/hometheaters.controller");

router.get("/:setupId/connections", ctrl.listConnections);
router.post("/connection", ctrl.createConnection);
router.delete("/connection/:id", ctrl.deleteConnection);

module.exports = router;
