/**
 * --------------------------------------------------------------------------
 *  MAIN APPLICATION ENTRY POINT
 * --------------------------------------------------------------------------
 *  Configures Express middleware, static file serving, and initializes
 *  the routing system. This is the central hub of the backend.
 */

// Global Logger initialization (should be first)
require("./services/logger");

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// Config & Services
const { IMAGES_DIR } = require("./config/paths");
const imagePreview = require("./services/imagePreview");
const { trackMiddleware } = require("./services/activeUsers");

// Middlewares
const rankDebugLogger = require("./middlewares/rankDebugLogger");
const registerRoutes = require("./routes");

const app = express();

// --- GLOBAL MIDDLEWARES ---

// Standard parsers
app.use(express.json());
app.use(cookieParser());

// CORS configuration - Allows frontend communication with credentials
app.use(
    cors({
        origin: true, // In production, replace with specific domain
        credentials: true,
    })
);

// Analytics: Tracks unique active users in real-time
app.use(trackMiddleware);

// --- STATIC FILES & IMAGE HANDLING ---

console.log("🖼️  Serving images from:", IMAGES_DIR);

/**
 * Image Preview Service: Handles on-the-fly resizing and caching.
 * Example: /image-preview?path=case.jpg&width=300
 */
app.use("/image-preview", imagePreview);

/**
 * Static Image Server: Serves original files with aggressive caching.
 * Browsers will cache these for 30 days.
 */
app.use("/images", express.static(IMAGES_DIR, {
    maxAge: "30d",
    immutable: true,
}));

// --- BUSINESS LOGIC & ROUTES ---

// Logging XP/Rank changes for easier debugging
app.use(rankDebugLogger);

// Register all API endpoints (Auth, Inventory, Setups, etc.)
registerRoutes(app);

module.exports = app;