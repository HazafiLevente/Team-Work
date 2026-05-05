/**
 * --------------------------------------------------------------------------
 *  NOTIFICATION (BELL) ROUTES
 * --------------------------------------------------------------------------
 *  Endpoints for user notifications and message conversations.
 */

const router = require("express").Router();
const ctrl = require("../controllers/bell.controller");
const verifyUser = require("../middlewares/verifyUser");

// Main notification list and status updates
router.get("/", verifyUser, ctrl.list);
router.post("/read", verifyUser, ctrl.read);

// Chat / Conversation threads
router.get("/conversations", verifyUser, ctrl.conversations);
router.get("/conversation/:key", verifyUser, ctrl.conversation);

// Fetch specific notification by source mapping
router.get("/:source_table/:id", verifyUser, ctrl.getOne);

module.exports = router;