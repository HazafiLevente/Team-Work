/**
 * --------------------------------------------------------------------------
 *  TABLE FILTER UNIT TEST
 * --------------------------------------------------------------------------
 *  Validates the exclusion logic against various database table patterns.
 *  Ensures that system tables are hidden while product tables remain visible.
 */

const { shouldExclude, loadFilters } = require("./tableFilter");

// Refresh filters from filler.json before running tests
loadFilters();

const testCases = [
    // --- Expected to stay VISIBLE ---
    { name: "motherboard", expected: false },
    { name: "processors", expected: false },
    { name: "graphics_cards", expected: false },
    { name: "custom_product", expected: false },

    // --- Expected to be EXCLUDED (System/Internal) ---
    { name: "user[Auth]", expected: true },
    { name: "setup[Setup]", expected: true },
    { name: "favorite_pc_components[Lists]", expected: true },
    { name: "system_message[System]", expected: true },
    { name: "cables_info[Cables]", expected: true },
    { name: "report_messages[System]", expected: true },
    { name: "audio_processor[Setup]", expected: true }
];

console.log("--------------------------------------------------");
console.log("🧪 Running Table Filter Verification...");
console.log("--------------------------------------------------\n");

let passed = 0;

testCases.forEach((tc, index) => {
    const result = shouldExclude(tc.name);
    const isOk = result === tc.expected;

    if (isOk) passed++;

    const icon = isOk ? "✅" : "❌";
    const label = tc.expected ? "[HIDE]" : "[SHOW]";

    console.log(
        `${icon} Test #${index + 1}: ${tc.name.padEnd(35)} | Expected: ${label.padEnd(6)} | Result: ${result ? "Hidden" : "Visible"}`
    );
});

console.log("\n--------------------------------------------------");
console.log(`📊 Summary: ${passed}/${testCases.length} tests passed.`);

if (passed === testCases.length) {
    console.log("🚀 VERIFICATION SUCCESSFUL: Filter logic is consistent.");
    console.log("--------------------------------------------------\n");
} else {
    console.log("⚠️  VERIFICATION FAILED: Check your filler.json patterns!");
    console.log("--------------------------------------------------\n");
    process.exit(1);
}