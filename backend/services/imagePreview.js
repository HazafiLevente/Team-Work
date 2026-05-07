/**
 * --------------------------------------------------------------------------
 *  DYNAMIC IMAGE PREVIEW & CACHE SERVICE
 * --------------------------------------------------------------------------
 *  Intercepts image requests to provide resized, optimized WebP previews.
 *  Implements filesystem caching to prevent redundant 'sharp' processing.
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { ROOT, IMAGES_DIR } = require("../config/paths");

// Configuration constants
const CACHE_DIR = path.join(ROOT, "datas", "image-cache", "previews");
const MIN_WIDTH = 96;
const MAX_WIDTH = 900;
const DEFAULT_WIDTH = 320;

/**
 * Validates and constrains the requested preview width.
 */
function parseWidth(value) {
    const n = parseInt(String(value || ""), 10);
    if (isNaN(n)) return DEFAULT_WIDTH;
    return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, n));
}

/**
 * Safely resolves the source image path, preventing directory traversal attacks.
 */
function resolveSource(reqPath) {
    const relative = decodeURIComponent(reqPath || "").replace(/^[/\\]+/, "");
    const source = path.resolve(IMAGES_DIR, relative);
    const root = path.resolve(IMAGES_DIR);

    // Security check: Ensure the resolved path is within the IMAGES_DIR
    if (source !== root && source.startsWith(root + path.sep)) {
        return { source, relative };
    }
    return null;
}

/**
 * Generates a structured cache path based on width and original structure.
 */
function cachePathFor(relative, width) {
    const parsed = path.parse(relative);
    return path.join(CACHE_DIR, String(width), parsed.dir, `${parsed.name}.webp`);
}

/**
 * Checks if a cached version exists and is newer than the source file.
 */
function isCacheFresh(cachePath, sourcePath) {
    try {
        const cached = fs.statSync(cachePath);
        const source = fs.statSync(sourcePath);
        return cached.mtimeMs >= source.mtimeMs;
    } catch {
        return false;
    }
}

/**
 * Orchestrates the image resizing and conversion via 'sharp'.
 */
async function ensurePreview(source, cachePath, width) {
    if (isCacheFresh(cachePath, source)) return;

    // Create nested cache directories if they don't exist
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });

    await sharp(source)
        .rotate() // Auto-orient based on EXIF
        .resize({
            width,
            height: width,
            fit: "inside",
            withoutEnlargement: true,
        })
        .webp({ quality: 72, effort: 4 }) // High compression efficiency
        .toFile(cachePath);
}

/**
 * Express middleware / controller for image preview requests.
 */
module.exports = async function imagePreview(req, res) {
    const resolved = resolveSource(req.path);

    if (!resolved || !fs.existsSync(resolved.source)) {
        return res.status(404).json({ error: "Image not found" });
    }

    const width = parseWidth(req.query.w);
    const cachePath = cachePathFor(resolved.relative, width);

    try {
        await ensurePreview(resolved.source, cachePath, width);

        // Serve the file with long-term caching headers
        res.set({
            "Content-Type": "image/webp",
            "Cache-Control": "public, max-age=2592000, immutable", // 30 days
        });

        res.sendFile(cachePath);
    } catch (err) {
        console.error("❌ Image preview failed:", err.message);
        res.status(500).json({ error: "Failed to render image preview" });
    }
};