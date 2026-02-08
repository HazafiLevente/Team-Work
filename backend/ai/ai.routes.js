const express = require("express");
const router = express.Router();

const { askAi } = require("./ai.controller");

router.post("/chat", askAi);

module.exports = router;
