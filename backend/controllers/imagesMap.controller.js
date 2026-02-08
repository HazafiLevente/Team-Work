const fs = require("fs");
const path = require("path");

const FILE = path.join(process.cwd(), "datas", "Jsons", "images.runtime.json");

exports.getMap = (req, res) => {
    try {
        if (!fs.existsSync(FILE)) {
            return res.status(404).json({ error: "images.runtime.json not found" });
        }

        const json = JSON.parse(fs.readFileSync(FILE, "utf8"));
        res.json(json);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to load image map" });
    }
};
