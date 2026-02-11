const router = require("express").Router();
const ctrl = require("../controllers/setup.controller");
const verifyUser = require("../middlewares/verifyUser");

// ✅ külön endpoint, nem nyúlunk a setup.routes.js-hez
router.post("/create", verifyUser, ctrl.create);

module.exports = router;
