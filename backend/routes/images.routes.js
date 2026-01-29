const router = require("express").Router();
const fs = require("fs");
const path = require("path");

router.get("/", (req, res) => {
    try {
        const filePath = path.join(__dirname, "..", "images.json");
        const raw = fs.readFileSync(filePath, "utf8");
        res.json(JSON.parse(raw));
    } catch (err) {
        console.error("❌ images.json load error:", err);
        res.status(500).json({});
    }
});

module.exports = router;