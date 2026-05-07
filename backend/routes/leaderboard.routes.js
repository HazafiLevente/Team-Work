/**
 * --------------------------------------------------------------------------
 *  LEADERBOARD ROUTES
 * --------------------------------------------------------------------------
 *  Provides rankings and competitive standings across the platform.
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/leaderboard.controller");

// Fetch global or filtered leaderboard rankings
router.get("/", ctrl.listLeaderboard);

module.exports = router;