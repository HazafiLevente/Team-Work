// Import path configurations (e.g., .env location, project root)
const { ENV_PATH, ROOT } = require("./config/paths");
// Import process event handlers for graceful shutdown management
const { isShuttingDown, registerProcessEvents } = require("./config/processEvents");

// Load environment variables from the specified .env file path
require("dotenv").config({
    path: ENV_PATH,    // Path to the .env file
    override: true,    // Allow existing variables to be overwritten
    quiet: true        // Suppress errors if the file is missing
});

// Define the port from environment variables or default to 3000
const PORT = process.env.PORT || 3000;

// Register system-level listeners (SIGINT, SIGTERM) for clean process termination
registerProcessEvents();

try {
    // Load the main Express application module
    const app = require("./app");
    // Start the HTTP server on the designated port
    const server = app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });

    // Listener for the server 'close' event (triggered when the server stops)
    server.on("close", () => {
        console.warn("[SERVER] HTTP server closed", {
            port: PORT,
            shuttingDown: isShuttingDown() // Check if the process is currently in shutdown mode
        });
    });

    // Listener for runtime server errors (e.g., port already in use)
    server.on("error", (error) => {
        console.error("[SERVER] HTTP server error:", error);
    });
} catch (error) {
    // Handle failures occurring during the bootstrap/startup phase
    console.error("Server startup failed.");
    console.error("Project root:", ROOT);
    console.error("Expected .env path:", ENV_PATH);

    // Provide specific guidance if a required dependency is missing
    if (error?.code === "MODULE_NOT_FOUND") {
        console.error("Missing module:", error.message);
        console.error("Run `npm install` in the project root, then start the server again.");
    }

    // Rethrow the error to ensure the process exits with a failure state
    throw error;
}