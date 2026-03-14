const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/leaderboard.controller");

console.log("✅ leaderboard.routes.js loaded");

router.get("/", ctrl.listLeaderboard);

module.exports = router;