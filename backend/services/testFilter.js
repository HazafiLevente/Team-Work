const { shouldExclude } = require("./tableFilter");

const testCases = [
    { name: "motherboard", expected: false },
    { name: "processors", expected: false },
    { name: "user[Auth]", expected: true },
    { name: "setup[Setup]", expected: true },
    { name: "favorite_pc_components[Lists]", expected: true },
    { name: "system_message[System]", expected: true },
    { name: "cables_info[Cables]", expected: true },
    { name: "report_messages[System]", expected: true },
    { name: "audio_processor[Setup]", expected: true },
    { name: "custom_product", expected: false }
];

console.log("🧪 Running Table Filter Verification...\n");

let passed = 0;
for (const tc of testCases) {
    const result = shouldExclude(tc.name);
    const status = result === tc.expected ? "✅ PASS" : "❌ FAIL";
    if (result === tc.expected) passed++;
    console.log(`${status} - Table: "${tc.name}", Should Exclude: ${tc.expected}, Result: ${result}`);
}

console.log(`\n📊 Summary: ${passed}/${testCases.length} tests passed.`);

if (passed === testCases.length) {
    console.log("\n🚀 Verification SUCCESSFUL!");
} else {
    console.log("\n⚠️ Verification FAILED!");
    process.exit(1);
}
