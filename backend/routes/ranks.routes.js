const router = require("express").Router();
const ctrl = require("../controllers/ranks.controller");
const { verifyUser } = require('../middlewares/verifyUser');

router.get('/me', verifyUser, ctrl.me);

module.exports = router;
