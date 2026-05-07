const fs = require("fs");
const path = require("path");
const { IMAGES_DIR } = require("../config/paths");

const IMAGES_ROOT = IMAGES_DIR;
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const CACHE_TTL_MS = 60_000;

const cache = {
    full: { at: 0, value: null },
    preview: { at: 0, value: null },
};

function isDir(p) {
    try {
        return fs.statSync(p).isDirectory();
    } catch {
        return false;
    }
}

function listDirs(p) {
    if (!isDir(p)) return [];
    return fs.readdirSync(p).filter(name => isDir(path.join(p, name)));
}

function listImageFiles(p) {
    if (!isDir(p)) return [];
    return fs
        .readdirSync(p)
        .filter(name => ALLOWED_EXT.has(path.extname(name).toLowerCase()))
        .sort((a, b) => {
            const an = parseInt(path.parse(a).name, 10);
            const bn = parseInt(path.parse(b).name, 10);

            if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
        });
}

function pickSmallestImageFile(dir, files) {
    return files
        .map(file => {
            try {
                return { file, size: fs.statSync(path.join(dir, file)).size };
            } catch {
                return { file, size: Number.MAX_SAFE_INTEGER };
            }
        })
        .sort((a, b) => a.size - b.size || a.file.localeCompare(b.file, undefined, { numeric: true, sensitivity: "base" }))
        .map(item => item.file)[0];
}

function buildMap(previewOnly) {
    const result = {};
    const tables = listDirs(IMAGES_ROOT);

    for (const table of tables) {
        const tablePath = path.join(IMAGES_ROOT, table);
        const ids = listDirs(tablePath);

        result[table] = {};

        for (const id of ids) {
            const idPath = path.join(tablePath, id);
            const files = listImageFiles(idPath);

            if (previewOnly) {
                const preview = pickSmallestImageFile(idPath, files);
                result[table][id] = preview ? [`/images/${table}/${id}/${preview}`] : [];
                continue;
            }

            result[table][id] = files.map(file => `/images/${table}/${id}/${file}`);
        }
    }

    return result;
}

exports.getMap = (req, res) => {
    try {

        if (!fs.existsSync(IMAGES_ROOT)) {
            return res.status(404).json({ error: "datas/images not found", lookedIn: IMAGES_ROOT });
        }

        const previewOnly = req.query.preview === "1" || req.query.preview === "true";
        const bucket = previewOnly ? cache.preview : cache.full;
        const now = Date.now();

        if (!bucket.value || now - bucket.at > CACHE_TTL_MS) {
            bucket.value = buildMap(previewOnly);
            bucket.at = now;
        }

        res.set("Cache-Control", "public, max-age=60");
        res.json(bucket.value);
    } catch (e) {
        console.error("❌ Failed to build image map:", e);
        res.status(500).json({ error: "Failed to build image map" });
    }
};
