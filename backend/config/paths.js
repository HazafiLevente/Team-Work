const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const ENV_PATH = path.join(ROOT, ".env");
const IMAGES_DIR = path.join(ROOT, "datas", "images");
const TABLES_RUNTIME_PATH = path.join(ROOT, "datas", "Jsons", "tables.runtime.json");

module.exports = {
    ROOT,
    ENV_PATH,
    IMAGES_DIR,
    TABLES_RUNTIME_PATH
};
