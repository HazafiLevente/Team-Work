/**
 * --------------------------------------------------------------------------
 *  AUTH ROUTES
 * --------------------------------------------------------------------------
 *  Handles session management, registration, and OAuth flows.
 */

const router = require("express").Router();

router.use(require("./auth/session.routes"));
router.use(require("./auth/register.routes"));
router.use(require("./auth/password.routes"));
router.use(require("./auth/oauth.routes"));

module.exports = router;
