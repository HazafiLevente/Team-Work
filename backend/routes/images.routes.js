const express = require("express");
const path = require("path");
const fs = require("fs");

const router = express.Router();


const IMAGES_JSON_PATH = path.join(
    __dirname,
    "..",
    "..",
    "datas",
    "Jsons",
    "images.json"
);

router.get("/", (req, res) => {
    try {
        if (!fs.existsSync(IMAGES_JSON_PATH)) {
            return res.status(404).json({ error: "images.json not found" });
        }

        const raw = fs.readFileSync(IMAGES_JSON_PATH, "utf-8");
        const json = JSON.parse(raw);

        res.json(json);
    } catch (err) {
        console.error("❌ images.json load error:", err);
        res.status(500).json({ error: "Failed to load images.json" });
    }
});

module.exports = router;
