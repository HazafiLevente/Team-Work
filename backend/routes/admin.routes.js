const router = require("express").Router();

router.use(require("./admin/stats.routes"));
router.use(require("./admin/reports.routes"));
router.use(require("./admin/users.routes"));
router.use(require("./admin/notifications.routes"));
router.use(require("./admin/logs.routes"));

module.exports = router;
