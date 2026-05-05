/**
 * --------------------------------------------------------------------------
 *  MESSAGING SYSTEM ROUTES
 * --------------------------------------------------------------------------
 *  Aggregates AI chat, direct messaging, and relationship-based communication.
 */

const router = require("express").Router();
const verifyUser = require("../middlewares/verifyUser");

// All messaging endpoints require authentication
router.use(verifyUser);

router.use(require("./messages/ai.routes"));
router.use(require("./messages/conversation.routes"));
router.use(require("./messages/relation.routes"));

module.exports = router;