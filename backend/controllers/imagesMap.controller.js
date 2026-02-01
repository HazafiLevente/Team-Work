const fs = require("fs");
const path = require("path");

// Team-Work/datas/Jsons/images.runtime.json
const IMAGES_MAP_FILE = path.join(process.cwd(), "datas", "Jsons", "images.runtime.json");

exports.getMap = (req, res) => {
    try {
        if (!fs.existsSync(IMAGES_MAP_FILE)) {
            return res.status(404).json({
                error: "images.runtime.json not found",
                expectedPath: IMAGES_MAP_FILE
            });
        }

        const raw = fs.readFileSync(IMAGES_MAP_FILE, "utf8");
        const json = JSON.parse(raw);

        return res.json(json);
    } catch (err) {
        console.error("❌ getMap error:", err);
        return res.status(500).json({ error: "Failed to read images map" });
    }
};
