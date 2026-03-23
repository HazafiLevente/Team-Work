import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..", "..");
const API_BASE = process.env.API_BASE || "http://localhost:3000";
const OUT_ROOT = path.join(ROOT, "datas", "images");

const TARGET = Number(process.env.MAX_IMAGES || 6);
const START = Number(process.env.START || 0);
const LIMIT = Number(process.env.LIMIT || 0);
const API_LIMIT = Number(process.env.API_LIMIT || 5000);

const SEARCH_DELAY_MS = Number(process.env.SEARCH_DELAY_MS || 900);
const DL_DELAY_MS = Number(process.env.DL_DELAY_MS || 250);
const MIN_BYTES = Number(process.env.MIN_BYTES || 20000);
const DOWNLOAD_RETRIES = Number(process.env.DOWNLOAD_RETRIES || 3);
const DOWNLOAD_TIMEOUT_MS = Number(process.env.DOWNLOAD_TIMEOUT_MS || 15000);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function normalize(str) {
    return String(str || "").replace(/\s+/g, " ").trim();
}

function sha1(buf) {
    return crypto.createHash("sha1").update(buf).digest("hex");
}

function existingImageCount(dir) {
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).length;
}

async function fetchProducts() {
    const r = await fetch(`${API_BASE}/api/products?limit=${API_LIMIT}`);
    if (!r.ok) throw new Error(`Products API error HTTP ${r.status}`);
    const data = await r.json();
    return data.items || data;
}

function makeQueries(p) {
    const man = normalize(p.manufacturer);
    const model = normalize(p.model);
    const displayName = normalize(p.name || p?.data?.name);

    const base = displayName || `${man} ${model}`.trim();

    // Ha nincs elég adat, legalább valami
    const q1 = `${base} product photo`.trim();
    const q2 = `${base} official product image`.trim();
    const q3 = `${base} site:thomann.de`.trim();
    const q4 = `${base} site:muziker.hu`.trim();

    // table hint (néha segít)
    const hint = normalize(p.table_name || p.category || p.type || "");
    const q5 = hint ? `${base} ${hint} product photo`.trim() : null;

    return [q1, q2, q3, q4, q5].filter(Boolean);
}

async function searchImagesBingHTML(query) {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`;
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) throw new Error(`Bing HTML error ${r.status}`);

    const html = await r.text();

    // "murl":"https://..."
    const regex = /"murl":"(.*?)"/g;
    const results = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        const imgUrl = match[1].replace(/\\u0026/g, "&");
        if (!results.includes(imgUrl)) results.push(imgUrl);
        if (results.length >= 60) break; // ne gyűjtsünk végtelen
    }
    return results;
}

async function downloadWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const r = await fetch(url, {
            signal: controller.signal,
            redirect: "follow",
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            },
        });

        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < MIN_BYTES) throw new Error(`Too small (${buf.length} bytes)`);
        return buf;
    } finally {
        clearTimeout(t);
    }
}

async function run() {
    console.log("🟣 Pass2 (fill to 6) indul...");
    console.log("ROOT:", ROOT);
    console.log("TARGET:", TARGET, "START:", START, "LIMIT:", LIMIT || "ALL");
    console.log("");

    const all = await fetchProducts();
    const products = LIMIT > 0 ? all.slice(START, START + LIMIT) : all.slice(START);

    let touched = 0, ok = 0, skip = 0, fail = 0;

    for (const p of products) {
        if (!p?.id) continue;

        const table = (p.table_name || p.table || "unknown");
        const dir = path.join(OUT_ROOT, table, String(p.id));
        ensureDir(dir);

        let have = existingImageCount(dir);
        if (have >= TARGET) { skip++; continue; }

        touched++;

        const queries = makeQueries(p);
        const hashes = new Set();

        // már meglévő fájlokat ne bántsuk, csak folytassuk a sorszámot
        let nextIndex = have + 1;

        try {
            for (const q of queries) {
                if (have >= TARGET) break;

                await sleep(SEARCH_DELAY_MS);
                const urls = await searchImagesBingHTML(q);

                for (const imgUrl of urls) {
                    if (have >= TARGET) break;

                    // egyszerű szűrés
                    const low = imgUrl.toLowerCase();
                    if (low.includes("logo") || low.includes("icon") || low.includes("sprite")) continue;

                    // letöltés retry
                    let buf = null;
                    for (let a = 1; a <= DOWNLOAD_RETRIES; a++) {
                        try {
                            await sleep(DL_DELAY_MS);
                            buf = await downloadWithTimeout(imgUrl, DOWNLOAD_TIMEOUT_MS);
                            break;
                        } catch {
                            if (a === DOWNLOAD_RETRIES) buf = null;
                        }
                    }
                    if (!buf) continue;

                    const h = sha1(buf);
                    if (hashes.has(h)) continue;
                    hashes.add(h);

                    const outFile = path.join(dir, `${nextIndex}.jpg`);
                    fs.writeFileSync(outFile, buf);
                    nextIndex++;
                    have++;
                }
            }

            console.log(`✅ ${table}/${p.id} -> ${have}/${TARGET}`);
            ok++;
        } catch (e) {
            console.log(`❌ ${table}/${p.id} -> ${have}/${TARGET} (${e.message})`);
            fail++;
        }
    }

    console.log("\n🏁 PASS2 kész:", { touched, ok, skip, fail });
}

run();
