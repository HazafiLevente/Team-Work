const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");

require("dotenv").config({
    path: ENV_PATH,
    override: true,
    quiet: true
});

const PORT = process.env.PORT || 3000;

console.log("ENV CHECK:", {
    SUPABASE_URL: process.env.SUPABASE_URL,
    HAS_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    JWT: !!process.env.JWT_SECRET,
    DEEPSEEK: !!process.env.DEEPSEEK_API_KEY
});

try {
    const app = require("./app");

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
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
