const fs = require("fs");
const path = require("path");
const { IMAGES_DIR } = require("../config/paths");

const IMAGES_ROOT = IMAGES_DIR;
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

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

exports.getMap = (req, res) => {
    try {
        console.log("🖼 IMAGES_ROOT:", IMAGES_ROOT);

        if (!fs.existsSync(IMAGES_ROOT)) {
            return res.status(404).json({ error: "datas/images not found", lookedIn: IMAGES_ROOT });
        }

        const result = {};
        const tables = listDirs(IMAGES_ROOT);

        for (const table of tables) {
            const tablePath = path.join(IMAGES_ROOT, table);
            const ids = listDirs(tablePath);

            result[table] = {};

            for (const id of ids) {
                const idPath = path.join(tablePath, id);
                const files = listImageFiles(idPath);

                result[table][id] = files.map(file => `/images/${table}/${id}/${file}`);
            }
        }

        res.json(result);
    } catch (e) {
        console.error("❌ Failed to build image map:", e);
        res.status(500).json({ error: "Failed to build image map" });
    }
};
