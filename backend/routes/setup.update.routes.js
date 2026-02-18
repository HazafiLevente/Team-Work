const router = require("express").Router();
const ctrl = require("../controllers/setup.controller");
const verifyUser = require("../middlewares/verifyUser");

// ✅ PC BUILD mentés (FONTOS: a "/:id" elé!)
router.patch("/pcbuilds/:pcId", verifyUser, ctrl.pcBuildsUpdate);

// CREATE
router.post("/create", verifyUser, ctrl.create);

// UPDATE setup
router.patch("/:id", verifyUser, ctrl.update);

// DELETE setup
router.delete("/:id", verifyUser, ctrl.remove);

module.exports = router;
