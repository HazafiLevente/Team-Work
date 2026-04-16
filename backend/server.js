const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");

require("dotenv").config({
    path: ENV_PATH,
    override: true,
    quiet: true
});

const PORT = process.env.PORT || 3000;

let shuttingDown = false;

process.on("beforeExit", (code) => {
    console.warn("[SERVER] beforeExit fired with code:", code);
});

process.on("exit", (code) => {
    console.warn("[SERVER] exit fired with code:", code);
});

process.on("uncaughtException", (error) => {
    console.error("[SERVER] uncaughtException:", error);
});

process.on("unhandledRejection", (reason) => {
    console.error("[SERVER] unhandledRejection:", reason);
});

process.on("SIGINT", () => {
    shuttingDown = true;
    console.warn("[SERVER] SIGINT received");
});

process.on("SIGTERM", () => {
    shuttingDown = true;
    console.warn("[SERVER] SIGTERM received");
});

console.log("ENV CHECK:", {
    SUPABASE_URL: process.env.SUPABASE_URL,
    HAS_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    JWT: !!process.env.JWT_SECRET,
    DEEPSEEK: !!process.env.DEEPSEEK_API_KEY
});

try {
    const app = require("./app");
    const server = app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });

    server.on("close", () => {
        console.warn("[SERVER] HTTP server closed", {
            port: PORT,
            shuttingDown
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
