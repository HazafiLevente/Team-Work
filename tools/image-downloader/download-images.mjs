import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== ÁLLÍTSD BE ======
const SERP_API_KEY = process.env.SERP_API_KEY;
const API_BASE = process.env.API_BASE || "http://localhost:3000";
// ========================

if (!SERP_API_KEY) {
    console.error("❌ SERP_API_KEY nincs beállítva");
    process.exit(1);
}

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const OUT_ROOT = path.join(REPO_ROOT, "src", "assets", "product-images");

function ensureDir(p) {
    fs.mkdirSync(p, { recursive: true });
}

async function fetchJson(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
}

function buildQuery(p) {
    const manu = p.manufacturer || "";
    const model = p.model || "";
    const table = p.table_name || p.table || "";
    return `${manu} ${model} ${table} product photo`.trim();
}

async function serpImageSearch(query) {
    const u = new URL("https://serpapi.com/search.json");
    u.searchParams.set("engine", "google_images");
    u.searchParams.set("q", query);
    u.searchParams.set("api_key", SERP_API_KEY);
    u.searchParams.set("num", "5");

    const r = await fetch(u.toString());
    if (!r.ok) throw new Error("SerpAPI error");
    const data = await r.json();
    return data.images_results || [];
}

async function downloadImage(url, outFile) {
    const r = await fetch(url, { redirect: "follow" });
    if (!r.ok) throw new Error("Image download failed");

    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(outFile, buf);
}

async function run() {
    ensureDir(OUT_ROOT);

    console.log("📦 Productok betöltése...");
    const res = await fetchJson(`${API_BASE}/api/products`);
    const products = res.items || res;

    console.log("🔢 Product count:", products.length);

    let ok = 0, skip = 0, fail = 0;

    for (const p of products) {
        const table = p.table_name || p.table || "unknown";
        const id = p.id;
        if (!id) continue;

        const dir = path.join(OUT_ROOT, table);
        ensureDir(dir);

        const outFile = path.join(dir, `${id}.jpg`);
        if (fs.existsSync(outFile)) {
            skip++;
            continue;
        }

        const query = buildQuery(p);

        try {
            const results = await serpImageSearch(query);
            if (!results.length) throw new Error("No results");

            const imgUrl = results[0].original;
            await downloadImage(imgUrl, outFile);

            ok++;
            console.log(`✅ ${table}/${id} ← ${query}`);
        } catch (e) {
            fail++;
            console.log(`❌ ${table}/${id} (${query})`);
        }
    }

    console.log("\nDONE:", { ok, skip, fail });
}

run();
