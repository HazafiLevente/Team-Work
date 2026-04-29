const router = require("express").Router();
const verifyUser = require("../middlewares/verifyUser");

router.use(verifyUser);
router.use(require("./hometheaters/catalog.routes"));
router.use(require("./hometheaters/build.routes"));
router.use(require("./hometheaters/device.routes"));
router.use(require("./hometheaters/connection.routes"));

module.exports = router;
