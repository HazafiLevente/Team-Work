const router = require("express").Router();
const ctrl = require("../controllers/setup.controller");
const verifyUser = require("../middlewares/verifyUser");

router.patch("/:id", verifyUser, ctrl.update);

module.exports = router;
