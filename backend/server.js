const { ENV_PATH, ROOT } = require("./config/paths");
const { isShuttingDown, registerProcessEvents } = require("./config/processEvents");

require("dotenv").config({
    path: ENV_PATH,
    override: true,
    quiet: true
});

const PORT = process.env.PORT || 3000;

registerProcessEvents();

try {
    const app = require("./app");
    const server = app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });

    server.on("close", () => {
        console.warn("[SERVER] HTTP server closed", {
            port: PORT,
            shuttingDown: isShuttingDown()
        });
    });

    server.on("error", (error) => {
        console.error("[SERVER] HTTP server error:", error);
    });
} catch (error) {
    console.error("Server startup failed.");
    console.error("Project root:", ROOT);
    console.error("Expected .env path:", ENV_PATH);

    if (error?.code === "MODULE_NOT_FOUND") {
        console.error("Missing module:", error.message);
        console.error("Run `npm install` in the project root, then start the server again.");
    }

    throw error;
}
