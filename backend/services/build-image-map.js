const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const IMAGES_ROOT = path.join(ROOT, "datas", "images");
const OUT_FILE = path.join(ROOT, "datas", "Jsons", "images.runtime.json");

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function listDirs(p) {
    if (!fs.existsSync(p)) return [];
    return fs.readdirSync(p).filter(d =>
        fs.statSync(path.join(p, d)).isDirectory()
    );
}

function listImages(p) {
    if (!fs.existsSync(p)) return [];
    return fs.readdirSync(p)
        .filter(f => ALLOWED_EXT.has(path.extname(f).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function urlFromAbs(abs) {
    const rel = path.relative(IMAGES_ROOT, abs).split(path.sep).join("/");
    return `/images/${rel}`;
}

function build() {
    const out = { lastUpdated: Date.now(), images: {} };

    for (const table of listDirs(IMAGES_ROOT)) {
        out.images[table] = {};

        for (const id of listDirs(path.join(IMAGES_ROOT, table))) {
            const folder = path.join(IMAGES_ROOT, table, id);
            const files = listImages(folder);

            out.images[table][id] = files.map(f =>
                urlFromAbs(path.join(folder, f))
            );
        }
    }

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));

    console.log("✅ images.runtime.json kész");
}

build();
