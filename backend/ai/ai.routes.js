const express = require("express");
const router = express.Router();
const verifyUser = require("../middlewares/verifyUser");
const { askAi } = require("./ai.controller");

router.post("/ask", verifyUser, askAi);

module.exports = router;
