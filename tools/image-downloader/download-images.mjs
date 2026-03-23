import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..", "..");
const API_BASE = process.env.API_BASE || "http://localhost:3000";

const OUT_ROOT = path.join(ROOT, "datas", "images");

const MAX_IMAGES = Number(process.env.MAX_IMAGES || 6);
const START = Number(process.env.START || 0);
const LIMIT = Number(process.env.LIMIT || 0);
const API_LIMIT = Number(process.env.API_LIMIT || 5000);

const DELAY_MS = 800;
const MIN_BYTES = 20000;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function normalize(str) {
  return String(str || "")
      .replace(/\s+/g, " ")
      .trim();
}

function buildQuery(p) {
  const displayName = normalize(p.name || p?.data?.name);
  const manufacturer = normalize(p.manufacturer);
  const model = normalize(p.model);
  const base = displayName || `${manufacturer} ${model}`.trim();
  return `${base} product photo`;
}

function sha1(buf) {
  return crypto.createHash("sha1").update(buf).digest("hex");
}

async function fetchProducts() {
  const r = await fetch(`${API_BASE}/api/products?limit=${API_LIMIT}`);
  if (!r.ok) throw new Error("Products API error");
  const data = await r.json();
  return data.items || data;
}

async function searchImages(query) {
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`;

  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  if (!r.ok) throw new Error(`Bing HTML error ${r.status}`);

  const html = await r.text();

  // Bing HTML-ben murl mező tartalmazza a valódi képet
  const regex = /"murl":"(.*?)"/g;
  const results = [];

  let match;
  while ((match = regex.exec(html)) !== null) {
    const imgUrl = match[1].replace(/\\u0026/g, "&");
    if (!results.includes(imgUrl)) results.push(imgUrl);
  }

  return results;
}

async function downloadImage(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  if (!r.ok) throw new Error(`Image HTTP ${r.status}`);

  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < MIN_BYTES) throw new Error("Too small");

  return buf;
}

async function run() {
  console.log("🔵 Bing HTML scraper indul...");
  console.log("ROOT:", ROOT);

  const productsAll = await fetchProducts();
  const products = LIMIT > 0
      ? productsAll.slice(START, START + LIMIT)
      : productsAll.slice(START);

  console.log(`Batch: ${products.length} / ${productsAll.length}`);

  let ok = 0, fail = 0, skip = 0;

  for (const p of products) {
    if (!p?.id) continue;

    const table = p.table_name || p.table || "unknown";
    const dir = path.join(OUT_ROOT, table, String(p.id));
    ensureDir(dir);

    const existing = fs.existsSync(dir)
        ? fs.readdirSync(dir).length
        : 0;

    if (existing >= MAX_IMAGES) {
      skip++;
      continue;
    }

    const query = buildQuery(p);

    try {
      await sleep(DELAY_MS);

      const results = await searchImages(query);

      let saved = existing;
      const hashes = new Set();

      for (const imgUrl of results) {
        if (saved >= MAX_IMAGES) break;

        try {
          const buf = await downloadImage(imgUrl);
          const hash = sha1(buf);
          if (hashes.has(hash)) continue;
          hashes.add(hash);

          const file = path.join(dir, `${saved + 1}.jpg`);
          fs.writeFileSync(file, buf);
          saved++;
        } catch {}
      }

      console.log(`✅ ${table}/${p.id} (${saved} kép)`);
      ok++;

    } catch (e) {
      console.log(`❌ ${table}/${p.id} - ${e.message}`);
      fail++;
    }
  }

  console.log("KÉSZ:", { ok, skip, fail });
}

run();
