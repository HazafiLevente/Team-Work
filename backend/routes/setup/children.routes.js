const router = require("express").Router();
const ctrl = require("../../controllers/setup.controller");

router.get("/:id/get-children", ctrl.children);
router.get("/:id/children", ctrl.children);

module.exports = router;
