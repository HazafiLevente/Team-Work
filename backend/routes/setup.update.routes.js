const router = require("express").Router();
const ctrl = require("../controllers/setup.controller");
const verifyUser = require("../middlewares/verifyUser");

// ✅ PC BUILD mentés (FONTOS: a "/:id" elé!)
router.patch("/save-pcbuild/:pcId", verifyUser, ctrl.pcBuildsUpdate);

// CREATE
router.post("/save-setup", verifyUser, ctrl.create);

// UPDATE setup
router.patch("/update-setup/:id", verifyUser, ctrl.update);

// DELETE setup
router.delete("/remove-setup/:id", verifyUser, ctrl.remove);

module.exports = router;
