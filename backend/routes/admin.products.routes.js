const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/admin.products.controller");
const verifyAdminPlus = require("../middlewares/verifyAdminPlus");

router.use(verifyAdminPlus);

// type templates (must be before "/:table" routes)
router.get("/types", ctrl.listTypes);
router.post("/types", ctrl.createTypeTemplate);
router.get("/types/:type", ctrl.getTypeTemplate);

router.get("/", ctrl.list);
router.post("/:table", ctrl.create);
router.get("/:table/:id", ctrl.getOne);
router.patch("/:table/:id", ctrl.update);
router.delete("/:table/:id", ctrl.remove);

module.exports = router;
