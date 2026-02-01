const fs = require("fs");
const path = require("path");

const MAP_FILE = path.join(__dirname, "..", "..", "datas", "Jsons", "images.runtime.json");

exports.getMap = (req, res) => {
    try {
        const raw = fs.readFileSync(MAP_FILE, "utf8");
        res.type("json").send(raw);
    } catch (e) {
        res.status(500).json({
            error: "images.runtime.json not found. Run: node scripts/build-image-map.js"
        });
    }
};
