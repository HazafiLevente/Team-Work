const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "..", "..", ".env"),
    override: true
});

const readline = require("readline");
const { refreshTables } = require("../services/control");
const { syncOnce } = require("../services/syncService");
const { runAiPrompt } = require("../ai/ai.controller");

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
  ai       - ask AI: ai <prompt>
  refresh  - control + sync
  control  - only control
  sync     - only sync
  exit     - close admin console
`);
}

async function runSafe(fn) {
    if (busy) {
        console.log("Busy, wait...");
        return;
    }

    busy = true;

    try {
        await fn();
    } catch (error) {
        console.error("Console command failed:", error?.message || error);
    } finally {
        busy = false;
        rl.prompt();
    }
}

console.log("Admin console ready. Type: help");
rl.prompt();

rl.on("line", (line) => {
    const raw = String(line || "").trim();
    const cmd = raw.toLowerCase();

    if (!cmd) {
        rl.prompt();
        return;
    }

    if (cmd === "help") {
        help();
        rl.prompt();
        return;
    }

    if (cmd === "exit") {
        rl.close();
        return;
    }

    if (cmd.startsWith("ai ")) {
        const question = raw.slice(3).trim();

        if (!question) {
            console.log("Usage: ai <question>");
            rl.prompt();
            return;
        }

        runSafe(async () => {
            const data = await runAiPrompt({
                message: question,
                history: [],
                persist: false
            });

            if (data?.answer) {
                console.log(`\nAI: ${data.answer}\n`);
            } else {
                console.log("AI error:", data);
            }
        });
        return;
    }

    if (cmd === "refresh") {
        runSafe(async () => {
            console.log("CONTROL...");
            await refreshTables();
            console.log("SYNC...");
            await syncOnce({ upload: false });
            console.log("DONE");
        });
        return;
    }

    if (cmd === "control") {
        runSafe(async () => {
            await refreshTables();
            console.log("CONTROL DONE");
        });
        return;
    }

    if (cmd === "sync") {
        runSafe(async () => {
            await syncOnce({ upload: false });
            console.log("SYNC DONE");
        });
        return;
    }

    console.log("Unknown command");
    rl.prompt();
});

rl.on("close", () => {
    console.log("Admin console closed");
});
