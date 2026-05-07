
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..", "..");
const API_BASE = process.env.API_BASE || "http://localhost:3000";
const OUT_ROOT = path.join(ROOT, "datas", "images");
const DEBUG_DIR = path.join(ROOT, "datas", "Jsons", "bing_debug");

const TARGET = Number(process.env.MAX_IMAGES || 4);
const START = Number(process.env.START || 0);
const LIMIT = Number(process.env.LIMIT || 0);
const API_LIMIT = Number(process.env.API_LIMIT || 5000);

const SEARCH_DELAY_MS = Number(process.env.SEARCH_DELAY_MS || 2000);
const DL_DELAY_MS = Number(process.env.DL_DELAY_MS || 600);

const MIN_BYTES = Number(process.env.MIN_BYTES || 12000);

const DOWNLOAD_RETRIES = Number(process.env.DOWNLOAD_RETRIES || 2);
const DOWNLOAD_TIMEOUT_MS = Number(process.env.DOWNLOAD_TIMEOUT_MS || 20000);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function sha1(buf) { return crypto.createHash("sha1").update(buf).digest("hex"); }
function normalize(str) { return String(str || "").replace(/\s+/g, " ").trim(); }

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

function pickFromData(dataObj) {
    if (!dataObj || typeof dataObj !== "object") return "";
    const keys = ["name","Name","title","Title","model","Model","manufacturer","Manufacturer","brand","Brand"];
    const parts = [];
    for (const k of keys) {
        const v = dataObj[k];
        if (typeof v === "string" && v.trim().length >= 3) parts.push(v.trim());
        if (parts.length >= 3) break;
    }
    return parts.join(" ");
}

function makeQueries(p) {
    const man = normalize(p.manufacturer);
    const model = normalize(p.model);
    const displayName = normalize(p.name || p?.data?.name);
    const hint = normalize(p.table_name || p.category || p.type || "");

    let dataName = "";
    try { if (p.data && typeof p.data === "object") dataName = pickFromData(p.data); } catch {}

    const base = displayName || normalize(`${man} ${model}`) || normalize(dataName) || hint || `${p.table_name || ""} ${p.id}`.trim();


    return [
        `${base} product photo`,
        `${base} product image`,
        hint ? `${base} ${hint} image` : `${base} image`,
        `${base} site:thomann.de`,
        `${base} site:muziker`
    ].filter(Boolean);
}

function isBadUrl(u) {
    const s = (u || "").toLowerCase();
    if (!s) return true;


    if (s.includes("logo") || s.includes("icon") || s.includes("sprite") || s.includes("banner")) return true;
    if (s.includes("data:image")) return true;
    if (s.endsWith(".svg")) return true;


    if (s.includes("bing.com/th?") && s.includes("pid=")) return true;

    return false;
}

function htmlDecode(str) {
    if (!str) return "";
    return String(str)
        .replace(/\\u0026/g, "&")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
}

function safeName(s) {
    return String(s || "").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 120) || "q";
}

function detectBlocked(html) {
    const h = (html || "").toLowerCase();
    if (h.includes("b_captcha") || h.includes("captcha")) return "Bing blocked/robot-check page (captcha)";
    if (h.includes("unusual traffic") || h.includes("sorry") && h.includes("robot")) return "Bing blocked/robot-check page";
    return null;
}

function extractTitle(html) {
    const m = /<title[^>]*>(.*?)<\/title>/i.exec(html || "");
    return m ? htmlDecode(m[1]).trim() : null;
}

async function searchBing(query, dbgCtx) {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`;

    const r = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept-Language": "en-US,en;q=0.9,hu;q=0.8"
        }
    });

    if (!r.ok) throw new Error(`Bing HTML error ${r.status}`);

    const html = await r.text();

    const blocked = detectBlocked(html);
    if (blocked) {

        throw new Error(blocked);
    }

    let results = [];


    {
        const regex = /"murl"\s*:\s*"(.*?)"/g;
        let m;
        while ((m = regex.exec(html)) !== null) {
            const imgUrl = htmlDecode(m[1]);
            if (!results.includes(imgUrl)) results.push(imgUrl);
            if (results.length >= 80) break;
        }
    }


    if (results.length === 0) {
        const regex2 = /murl&quot;\s*:\s*&quot;(.*?)&quot;/g;
        let m2;
        while ((m2 = regex2.exec(html)) !== null) {
            const imgUrl = htmlDecode(m2[1]);
            if (!results.includes(imgUrl)) results.push(imgUrl);
            if (results.length >= 80) break;
        }
    }


    if (results.length === 0) {
        const regex3 = /"imgurl"\s*:\s*"(.*?)"/g;
        let m3;
        while ((m3 = regex3.exec(html)) !== null) {
            const imgUrl = htmlDecode(m3[1]);
            if (!results.includes(imgUrl)) results.push(imgUrl);
            if (results.length >= 80) break;
        }
    }


    if (results.length === 0) {
        ensureDir(DEBUG_DIR);

        const title = extractTitle(html);
        const sample = html.slice(0, 5000);

        const out = {
            when: new Date().toISOString(),
            query,
            url,
            title,
            htmlSampleHead: sample,
            hint: "0 urlsFound with error=null usually means Bing HTML structure changed or results are rendered differently. Check title/htmlSampleHead."
        };

        const file = path.join(DEBUG_DIR, `${dbgCtx.table}_${dbgCtx.id}_${safeName(query)}.json`);
        fs.writeFileSync(file, JSON.stringify(out, null, 2), "utf8");
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
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
                "Referer": "https://www.bing.com/"
            },
        });

        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < MIN_BYTES) throw new Error(`Too small (${buf.length})`);
        return buf;
    } finally {
        clearTimeout(t);
    }
}

async function run() {
    console.log("🟠 Pass3 (FILL UP TO TARGET images) indul...");
    console.log("ROOT:", ROOT);
    console.log("TARGET:", TARGET);
    console.log("");

    const all = await fetchProducts();
    const products = LIMIT > 0 ? all.slice(START, START + LIMIT) : all.slice(START);

    let touched = 0, ok = 0, skip = 0;

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
        let nextIndex = have + 1;

        const errorCounts = new Map();
        const addErr = (msg) => errorCounts.set(msg, (errorCounts.get(msg) || 0) + 1);

        const perQuery = [];

        for (const q of queries) {
            if (have >= TARGET) break;

            await sleep(SEARCH_DELAY_MS);

            let urls = [];
            try {
                urls = await searchBing(q, { table, id: p.id });
            } catch (e) {
                addErr(e.message);
                perQuery.push({ query: q, urlsFound: 0, error: e.message });
                continue;
            }

            perQuery.push({ query: q, urlsFound: urls.length, error: null });

            for (const imgUrl of urls) {
                if (have >= TARGET) break;
                if (!imgUrl || isBadUrl(imgUrl)) continue;

                let buf = null;
                for (let a = 1; a <= DOWNLOAD_RETRIES; a++) {
                    try {
                        await sleep(DL_DELAY_MS);
                        buf = await downloadWithTimeout(imgUrl, DOWNLOAD_TIMEOUT_MS);
                        break;
                    } catch (e) {
                        addErr(e.message);
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

        const errsSorted = [...errorCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);

        console.log(`✅ ${table}/${p.id} -> ${have}/${TARGET} | queries=${queries.length}`);
        if (have < TARGET) {
            if (errsSorted.length) console.log("   ❗ top errors:", errsSorted);
            console.log("   🔎 sample queries:", queries.slice(0,3));
        } else {
            ok++;
        }
    }

    console.log("\n🏁 PASS3 kész:", { touched, ok, skip });
}

run().catch(e => {
    console.error("❌ PASS3 crash:", e?.message || e);
    process.exit(1);
});
