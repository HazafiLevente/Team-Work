const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "..", ".env"),
    override: true
});

const app = require("./app");
const { startControl, ROLES } = require("./services/control");
const { startSyncInterval } = require("./services/syncService");

const PORT = process.env.PORT || 3000;

console.log("ENV CHECK:", {
    SUPABASE_URL: process.env.SUPABASE_URL,
    HAS_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    JWT: !!process.env.JWT_SECRET
});

startControl();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
