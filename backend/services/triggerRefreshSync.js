/**
 * --------------------------------------------------------------------------
 *  SYSTEM ORCHESTRATOR: REFRESH & SYNC
 * --------------------------------------------------------------------------
 *  This utility triggers a sequential update of the entire system:
 *  1. Introspects the remote database schema to update local definitions.
 *  2. Synchronizes data from Supabase to the local SQLite cache.
 */

const { refreshTables } = require("./control");
const { syncOnce } = require("./syncService");

async function run() {
    console.log("--------------------------------------------------");
    console.log("🔄 SYSTEM REFRESH & SYNC INITIATED");
    console.log("--------------------------------------------------");

    const startTime = Date.now();

    try {
        // STEP 1: Update the map of the database (Tables, Columns, Filters)
        console.log("1️⃣  Refreshing Schema Definitions...");
        await refreshTables();
        console.log("   -> Schema mapping updated successfully.");

        // STEP 2: Pull fresh data from remote to local DB
        console.log("2️⃣  Executing Data Synchronization...");

        // upload: false -> Csak letöltés (Pull), nem módosítjuk a távoli adatokat
        const result = await syncOnce({ upload: false });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log("\n--------------------------------------------------");
        console.log("✅ SYSTEM UPDATE COMPLETE");
        console.log(`⏱️  Duration: ${duration}s`);
        console.log(`📊 Stats: Synced: ${result.synced} | Empty: ${result.empty} | Failed: ${result.failed}`);
        console.log("--------------------------------------------------");

    } catch (e) {
        console.error("\n❌ CRITICAL FAILURE during system update:");
        console.error(e.stack || e);
        process.exit(1);
    }
}

// Execute the orchestrator
run();