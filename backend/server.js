// backend/server.js
const path = require("path");
const readline = require("readline");

require("dotenv").config({
    path: path.join(__dirname, "..", ".env"),
    override: true
});

const app = require("./app");
const { refreshTables } = require("./services/control");
const { syncOnce } = require("./services/syncService");

const PORT = process.env.PORT || 3000;

console.log("ENV CHECK:", {
    SUPABASE_URL: process.env.SUPABASE_URL,
    HAS_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    JWT: !!process.env.JWT_SECRET
});

// ✅ 1) SERVER START
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// ✅ 2) FIRST RUN OK (szerverindításkor egyszer)
(async () => {
    try {
        console.log("🟦 First refresh (control)...");
        await refreshTables();
        console.log("✅ First control refresh done.");
    } catch (e) {
        console.error("❌ First control refresh failed:", e.message);
    }
})();

// ✅ 3) ADMIN CONSOLE (külön cmd)
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "ADMIN> "
});

let busy = false;

function help() {
    console.log(`
Commands:
  help                 - this help
  refresh              - control.refreshTables() + syncOnce()
  control              - only control.refreshTables()
  sync                 - only syncOnce()
  exit                 - stop admin console
`);
}

async function runSafe(fn) {
    if (busy) {
        console.log("⏳ Busy, wait...");
        return;
    }
    busy = true;
    try {
        await fn();
    } finally {
        busy = false;
        rl.prompt();
    }
}

console.log("🧰 Admin console ready. Type: help");
rl.prompt();

rl.on("line", (line) => {
    const cmd = line.trim().toLowerCase();

    if (!cmd) return rl.prompt();

    if (cmd === "help") {
        help();
        return rl.prompt();
    }

    if (cmd === "exit") {
        console.log("👋 Admin console closed.");
        rl.close();
        return;
    }

    if (cmd === "refresh") {
        return runSafe(async () => {
            console.log("🔄 CONTROL refresh...");
            await refreshTables();
            console.log("✅ CONTROL done.");

            console.log("🔄 SYNC (Supabase -> SQLite)...");
            await syncOnce({ upload: false });
            console.log("✅ SYNC done.");
        });
    }

    if (cmd === "control") {
        return runSafe(async () => {
            console.log("🔄 CONTROL refresh...");
            await refreshTables();
            console.log("✅ CONTROL done.");
        });
    }

    if (cmd === "sync") {
        return runSafe(async () => {
            console.log("🔄 SYNC (Supabase -> SQLite)...");
            await syncOnce({ upload: false });
            console.log("✅ SYNC done.");
        });
    }

    console.log("❓ Unknown command. Type: help");
    rl.prompt();
});

rl.on("close", () => {
    // nem állítjuk le a szervert, csak a konzolt zárjuk
});
