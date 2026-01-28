const router = require("express").Router();
const ctrl = require("../controllers/admin.controller");
const verifyAdmin = require("../middlewares/verifyAdmin");

router.get("/tables", verifyAdmin, ctrl.tables);
router.get("/users", verifyAdmin, ctrl.users);

module.exports = router;
