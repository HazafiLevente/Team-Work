const express = require("express");
const router = express.Router();

const { askAi } = require("../controllers/ai.controller");

router.post("/chat", askAi);

module.exports = router;
