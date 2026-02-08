const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "..", "..", ".env"),
    override: true
});


const readline = require("readline");
const { refreshTables } = require("../services/control");
const {syncOnce } = require("../services/syncService");
const fetch = global.fetch;


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "ADMIN> "
});

let busy = false;

function help() {
    console.log(`
Commands:
  help     - this help
  refresh  - control + sync
  control  - only control
  sync     - only sync
  exit     - close admin console
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

    if (cmd === "help") return help(), rl.prompt();
    if (cmd === "exit") return rl.close();
    if (cmd.startsWith("ai ")) {
        const question = line.slice(3).trim();

        if (!question) {
            console.log("❗ Usage: ai <question>");
            return rl.prompt();
        }

        return runSafe(async () => {
            const res = await fetch("http://localhost:3000/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: question })
            });

            const data = await res.json();

            if (data.answer) {
                console.log("\n🤖 AI:", data.answer, "\n");
            } else {
                console.log("⚠️ AI error:", data);
            }
        });
    }


    if (cmd === "refresh") {
        return runSafe(async () => {
            console.log("🔄 CONTROL...");
            await refreshTables();
            console.log("🔄 SYNC...");
            await syncOnce({ upload: false });
            console.log("✅ DONE");
        });
    }

    if (cmd === "control") {
        return runSafe(async () => {
            await refreshTables();
            console.log("✅ CONTROL DONE");
        });
    }

    if (cmd === "sync") {
        return runSafe(async () => {
            await syncOnce({ upload: false });
            console.log("✅ SYNC DONE");
        });
    }

    console.log("❓ Unknown command");
    rl.prompt();
});

rl.on("close", () => {
    console.log("👋 Admin console closed");
});
