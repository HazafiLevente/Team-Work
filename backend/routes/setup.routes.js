/**
 * --------------------------------------------------------------------------
 *  GLOBAL SETUP ORCHESTRATION ROUTES
 * --------------------------------------------------------------------------
 *  Master registry for all setup-related domains including hardware,
 *  networking, and specialized configuration modules.
 */

const router = require("express").Router();
const verifyUser = require("../middlewares/verifyUser");

// All setup configurations require mandatory authentication
router.use(verifyUser);

// --- DOMAIN MODULES ---
router.use(require("./setup/core.routes"));
router.use(require("./setup/options.routes"));
router.use(require("./setup/connection.routes"));
router.use(require("./setup/children.routes"));

// --- SPECIALIZED HARDWARE ---
router.use(require("./setup/pc.routes"));
router.use(require("./setup/car.routes"));
router.use(require("./setup/instrument.routes"));

// --- INFRASTRUCTURE & PERIPHERALS ---
router.use(require("./setup/network.routes"));
router.use(require("./setup/device.routes"));

module.exports = router;