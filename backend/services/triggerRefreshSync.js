const { refreshTables } = require("./control");
const { syncOnce } = require("./syncService");

async function run() {
    console.log("🔄 Starting full refresh and sync...");

    try {
        console.log("1️⃣ Refreshing schema (control.js)...");
        await refreshTables();

        console.log("2️⃣ Synchronizing data (syncService.js)...");
        const result = await syncOnce({ upload: false });

        console.log("\n✅ Refresh and Sync complete!");
        console.log(`Synced: ${result.synced}, Empty: ${result.empty}, Failed: ${result.failed}`);
    } catch (e) {
        console.error("❌ Error during refresh/sync:", e);
        process.exit(1);
    }
}

run();
