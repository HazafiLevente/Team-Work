import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERP_API_KEY = process.env.SERP_API_KEY;
const API_BASE = process.env.API_BASE || "http://localhost:3000";

if (!SERP_API_KEY) {
    console.error("❌ SERP_API_KEY nincs beállítva");
    process.exit(1);
}

const ROOT = path.resolve(__dirname, "..", "..");
const OUT_ROOT = path.join(ROOT, "datas", "images");

const MAX_IMAGES = 6;

function ensureDir(p) {
    fs.mkdirSync(p, { recursive: true });
}

async function fetchJson(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
}

function buildQuery(p) {
    return `${p.manufacturer || ""} ${p.model || ""} ${p.table_name || ""} product`.trim();
}

async function serpImageSearch(query) {
    const u = new URL("https://serpapi.com/search.json");
    u.searchParams.set("engine", "google_images");
    u.searchParams.set("q", query);
    u.searchParams.set("api_key", SERP_API_KEY);
    u.searchParams.set("num", String(MAX_IMAGES));

    const r = await fetch(u);
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
    console.log("📦 Productok lekérése...");
    const res = await fetchJson(`${API_BASE}/api/products`);
    const products = res.items || res;

    let ok = 0, fail = 0, skip = 0;

    for (const p of products) {
        if (!p.id) continue;

        const table = p.table_name || p.table || "unknown";
        const dir = path.join(OUT_ROOT, table, String(p.id));
        ensureDir(dir);

        const existing = fs.readdirSync(dir).length;
        if (existing >= MAX_IMAGES) {
            skip++;
            continue;
        }

        try {
            const results = await serpImageSearch(buildQuery(p));
            let index = 1;

            for (const img of results.slice(0, MAX_IMAGES)) {
                const outFile = path.join(dir, `${index}.jpg`);
                if (!fs.existsSync(outFile)) {
                    await downloadImage(img.original, outFile);
                }
                index++;
            }

            ok++;
            console.log(`✅ ${table}/${p.id} (${index - 1} kép)`);

        } catch (e) {
            fail++;
            console.log(`❌ ${table}/${p.id}`, e.message);
        }
    }

    console.log("\n🏁 KÉSZ:", { ok, skip, fail });
}

run();
