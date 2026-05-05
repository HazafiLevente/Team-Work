const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/leaderboard.controller");


router.get("/", ctrl.listLeaderboard);

module.exports = router;