/**
 * --------------------------------------------------------------------------
 *  IMAGE MAP BUILDER (RUNTIME DATA GENERATOR)
 * --------------------------------------------------------------------------
 *  Scans the 'datas/images' directory and builds a hierarchical JSON map
 *  of available assets. This pre-computed map is used by the frontend
 *  to resolve image URLs without direct filesystem access.
 */

const fs = require("fs");
const path = require("path");

// --- PATH CONFIGURATION ---
const ROOT = path.resolve(__dirname, "..", "..");
const IMAGES_ROOT = path.join(ROOT, "datas", "images");
const OUT_FILE = path.join(ROOT, "datas", "Jsons", "images.runtime.json");

// Allowed image formats
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

/**
 * Lists all subdirectories within a given path.
 */
function listDirs(p) {
    if (!fs.existsSync(p)) return [];
    return fs.readdirSync(p).filter(d =>
        fs.statSync(path.join(p, d)).isDirectory()
    );
}

/**
 * Lists and sorts all allowed image files in a directory.
 * Numeric sorting ensures "image2.jpg" comes before "image10.jpg".
 */
function listImages(p) {
    if (!fs.existsSync(p)) return [];
    return fs.readdirSync(p)
        .filter(f => ALLOWED_EXT.has(path.extname(f).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * Converts an absolute system path to a public web URL.
 */
function urlFromAbs(abs) {
    const rel = path.relative(IMAGES_ROOT, abs).split(path.sep).join("/");
    return `/images/${rel}`;
}

/**
 * Main build process: Iterates through tables and IDs to map files.
 */
function build() {
    console.log("🚀 Building image runtime map...");

    const out = {
        lastUpdated: Date.now(),
        images: {}
    };

    // Iterate through 'table' directories (e.g., 'products', 'setups')
    for (const table of listDirs(IMAGES_ROOT)) {
        out.images[table] = {};

        // Iterate through 'ID' directories (e.g., '101', '102')
        for (const id of listDirs(path.join(IMAGES_ROOT, table))) {
            const folder = path.join(IMAGES_ROOT, table, id);
            const files = listImages(folder);

            // Map each file to its web-accessible URL
            out.images[table][id] = files.map(f =>
                urlFromAbs(path.join(folder, f))
            );
        }
    }

    // Persist result to JSON
    try {
        fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
        fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
        console.log(`✅ Success: ${OUT_FILE} generated.`);
    } catch (error) {
        console.error("❌ Failed to write image map:", error.message);
        process.exit(1);
    }
}

// Execute build
build();