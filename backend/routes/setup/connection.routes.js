const router = require("express").Router();
const ctrl = require("../../controllers/setup.controller");

router.get("/all-connections", ctrl.allConnections);
router.get("/device-connections", ctrl.deviceConnections);
router.get("/:id/get-connections", ctrl.connections);
router.post("/save-connection", ctrl.connectionsCreate);
router.delete("/remove-connection/:id", ctrl.connectionsRemove);

module.exports = router;
