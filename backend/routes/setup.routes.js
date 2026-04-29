const router = require("express").Router();
const verifyUser = require("../middlewares/verifyUser");

router.use(verifyUser);
router.use(require("./setup/core.routes"));
router.use(require("./setup/options.routes"));
router.use(require("./setup/connection.routes"));
router.use(require("./setup/children.routes"));
router.use(require("./setup/pc.routes"));
router.use(require("./setup/car.routes"));
router.use(require("./setup/instrument.routes"));
router.use(require("./setup/device.routes"));

module.exports = router;
