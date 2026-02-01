const fs = require("fs");
const path = require("path");

// Fixen a repo root (Team-Work)
const ROOT = path.resolve(__dirname, "..", ".."); // backend/services -> backend -> Team-Work
const IMAGES_ROOT = path.join(ROOT, "datas", "images"); // FONTOS: datas/images (kisbetű)
const OUT_FILE = path.join(ROOT, "datas", "Jsons", "images.runtime.json");

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function isDir(p) {
    try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

function isFile(p) {
    try { return fs.statSync(p).isFile(); } catch { return false; }
}

function listDirs(p) {
    if (!isDir(p)) return [];
    return fs.readdirSync(p).filter(name => isDir(path.join(p, name)));
}

function listImageFiles(p) {
    if (!isDir(p)) return [];
    try {
        return fs.readdirSync(p).filter(name => {
            const full = path.join(p, name);
            if (!isFile(full)) return false;
            const ext = path.extname(name).toLowerCase();
            return ALLOWED_EXT.has(ext);
        });
    } catch {
        return [];
    }
}

function urlPathFromAbsolute(absPath) {
    const rel = path.relative(IMAGES_ROOT, absPath).split(path.sep).join("/");
    return "/images/" + rel.split("/").map(encodeURIComponent).join("/");
}

/**
 * Rekurzívan bejárja a manu mappát, és minden olyan almappát begyűjt,
 * ahol vannak képek. A modelKey = az almappa neve (leaf).
 */
function collectModelsRecursively(manuPath, out) {
    // 1) ha ebben a mappában vannak képek -> ez egy "model" folder
    const files = listImageFiles(manuPath)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (files.length > 0) {
        const modelKey = path.basename(manuPath); // pl. 9800X3D vagy GRG121DX
        const urls = files.map(f => urlPathFromAbsolute(path.join(manuPath, f)));

        // ha ütközik ugyanaz a modelKey több helyről, inkább fűzzük össze
        if (!out[modelKey]) out[modelKey] = [];
        out[modelKey].push(...urls);

        return; // ha találtunk képeket, nem muszáj tovább menni (de lehetne)
    }

    // 2) különben menjünk tovább az almappákba
    const subDirs = listDirs(manuPath);
    for (const d of subDirs) {
        collectModelsRecursively(path.join(manuPath, d), out);
    }
}

function build() {
    const result = { lastUpdated: Date.now(), images: {} };

    console.log("🔎 IMAGES_ROOT:", IMAGES_ROOT);
    console.log("📝 OUT_FILE:", OUT_FILE);

    if (!isDir(IMAGES_ROOT)) {
        console.error("❌ IMAGES_ROOT not found:", IMAGES_ROOT);
        process.exit(1);
    }

    const topFolders = listDirs(IMAGES_ROOT); // Electric Guitars, Processors, ...

    for (const top of topFolders) {
        const topPath = path.join(IMAGES_ROOT, top);
        const manuDirs = listDirs(topPath); // Ibanez, AMD, Intel...

        for (const manu of manuDirs) {
            const manuPath = path.join(topPath, manu);

            const modelsOut = {};
            collectModelsRecursively(manuPath, modelsOut);

            if (!result.images[top]) result.images[top] = {};
            // akkor is írjuk be (üresen is), mert te ezt akarod:
            result.images[top][manu] = modelsOut;
        }
    }

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), "utf8");

    console.log("✅ images.runtime.json generated:", OUT_FILE);
}

build();
