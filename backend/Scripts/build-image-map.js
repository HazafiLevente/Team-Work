const fs = require("fs");
const path = require("path");

// Projekt root (Team-Work). A script a backend/scripts-ben van, ezért: ../..
const ROOT = path.join(__dirname, "..", "..");

// KÉPEK: Team-Work/datas/Images
const IMAGES_ROOT = path.join(ROOT, "datas", "Images");

// JSON: Team-Work/datas/Jsons/images.runtime.json
const OUT_FILE = path.join(ROOT, "datas", "Jsons", "images.runtime.json");

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function safeReadDir(p) {
    try { return fs.readdirSync(p, { withFileTypes: true }); }
    catch { return []; }
}

function sortNaturally(a, b) {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function toUrl(parts) {
    // Ezt majd a backend szolgálja ki /images alatt
    return "/images/" + parts.map(encodeURIComponent).join("/");
}

function build() {
    if (!fs.existsSync(IMAGES_ROOT)) {
        console.error("❌ IMAGES_ROOT not found:", IMAGES_ROOT);
        process.exit(1);
    }

    const result = {}; // table -> manufacturer -> model -> [urls]

    const tables = safeReadDir(IMAGES_ROOT)
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .sort(sortNaturally);

    for (const table of tables) {
        const tablePath = path.join(IMAGES_ROOT, table);
        const manufacturers = safeReadDir(tablePath)
            .filter(d => d.isDirectory())
            .map(d => d.name)
            .sort(sortNaturally);

        for (const manu of manufacturers) {
            const manuPath = path.join(tablePath, manu);
            const models = safeReadDir(manuPath)
                .filter(d => d.isDirectory())
                .map(d => d.name)
                .sort(sortNaturally);

            for (const model of models) {
                const modelPath = path.join(manuPath, model);

                const files = safeReadDir(modelPath)
                    .filter(f => f.isFile())
                    .map(f => f.name)
                    .filter(name => IMAGE_EXTS.has(path.extname(name).toLowerCase()))
                    .sort(sortNaturally);

                if (!files.length) continue;

                const urls = files.map(file => toUrl([table, manu, model, file]));

                if (!result[table]) result[table] = {};
                if (!result[table][manu]) result[table][manu] = {};
                result[table][manu][model] = urls;
            }
        }
    }

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(
        OUT_FILE,
        JSON.stringify({ lastUpdated: Date.now(), images: result }, null, 2),
        "utf8"
    );

    console.log("✅ image map generated:", OUT_FILE);
}

build();
