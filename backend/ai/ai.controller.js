const { GoogleGenerativeAI } = require("@google/generative-ai");
const { supabase } = require("../services/supabase");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// stabil modell név (a preview-k gyakran 503/404)
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

/* =====================================================
   QUERY NORMALIZÁLÁS (ez a kulcs)
===================================================== */
function buildSearchCandidates(message) {
    const raw = (message || "").toLowerCase();

    // kiszedi az írásjeleket, fölös szavakat, stb.
    const cleaned = raw
        .replace(/[^\p{L}\p{N}\s]/gu, " ")   // minden nem betű/szám -> space
        .replace(/\s+/g, " ")
        .trim();

    // nagyon gyakori "zaj" szavak (bővítheted)
    const stop = new Set([
        "és", "vagy", "a", "az", "egy", "mennyi", "mennyibe", "kerül", "ára", "ár", "price",
        "van", "vannak", "listázd", "sorold", "mutasd", "kérlek", "legyen", "mond", "meg",
        "ilyen", "olyan", "ez", "azt", "itt", "ott", "nekem", "szeretnék",
        "építs", "összeállítás", "konfiguráció", "gép", "pc", "számítógép", "budget"
    ]);

    const tokens = cleaned
        .split(" ")
        .filter(t => t.length >= 2)
        .filter(t => !stop.has(t));

    // 1) teljes cleaned
    const cands = [];
    if (cleaned) cands.push(cleaned);

    // 2) tokenekből 2-4 szavas “kulcs” (modellnév tipikusan itt van)
    // pl: "ryzen 7 9800x3d"
    if (tokens.length) {
        cands.push(tokens.slice(0, 6).join(" "));
    }

    // 3) ha van benne “x3d / 9800x3d” jellegű minta, azt külön is próbáljuk
    const modelLike = cleaned.match(/\b[0-9]{3,5}[a-z]*x?3d\b/g);
    if (modelLike?.length) {
        for (const m of modelLike) cands.push(m);
    }

    // 4) ryzen/intel/rtx/gtx stb esetén első 3 token
    if (tokens.length >= 3) cands.push(tokens.slice(0, 3).join(" "));

    // 5) Kompatibilitási kulcsszavak: socketek, chipsetek
    const compatibilityKeywords = cleaned.match(/\b(am4|am5|lga1200|lga1700|b550|b650|z790|h470|h610|ddr4|ddr5)\b/g);
    if (compatibilityKeywords?.length) {
        for (const k of compatibilityKeywords) cands.push(k);
    }

    // egyediek, üresek nélkül
    return [...new Set(cands)].filter(Boolean);
}

/* =====================================================
   TERMÉK LEKÉRÉS – ugyanazzal az RPC-vel, több próbával
===================================================== */
async function searchProducts(message) {

    const candidates = buildSearchCandidates(message);
    let allResults = [];

    for (const word of candidates) {
        const { data, error } = await supabase.rpc("products_home", {
            q: word
        });

        if (!error && data) {
            allResults.push(...data);
        }
    }

    // Duplikációk kiszűrése id alapján
    const unique = Object.values(
        allResults.reduce((acc, item) => {
            acc[item.id] = item;
            return acc;
        }, {})
    );

    console.log("AI products count:", unique.length);

    return unique;
}


/* =====================================================
   AI VÁLASZ
===================================================== */
async function generateAnswer(message, products, history = []) {

    const historyPrompt = history.length > 0 
        ? `KORÁBBI BESZÉLGETÉS ELŐZMÉNYEI:
${history.map(h => `${h.role === 'user' ? 'Felhasználó' : 'AI'}: ${h.text}`).join('\n')}
` : "";

    const prompt = `
Te a SetupConfigurator konfigurációs weboldal prémium asszisztense vagy. A feladatod, hogy segíts a felhasználóknak termékeket találni az adatbázisunk alapján, vagy válaszolj az üdvözlésükre.

${historyPrompt}

A felhasználó aktuális üzenete:
"${message}"

ADATBÁZIS TALÁLATOK (KIZÁRÓLAG ezekre támaszkodhatsz, ha termékeket mutatsz be):
${JSON.stringify(products, null, 2)}

STÍLUS ÉS TARTALMI SZABÁLYOK:

1. TERMÉSZETES NYELV: Beszélj emberi módon, mintha egy profi eladó lennél egy szaküzletben. Saját szavaiddal mutasd be a találatokat, ne csak egy listát dobj a felhasználó elé.
2. ÜDVÖZLÉS ÉS SEGÍTSÉGKÉRÉS: Ha a felhasználó köszön (pl. Szia, Üdv, Jó napot), köszönj vissza barátságosan. Ha csak érdeklődik, légy segítőkész.
3. NINCS TALÁLAT: Ha az adatbázis lista üres ÉS a felhasználó konkrét terméket keresett, barátságosan jelezd, hogy jelenleg nem találtál ilyet, de ajánld fel a segítségedet másban.
4. FORMÁZÁS ÉS DIZÁJN: 
   - Használj bekezdéseket és listajeleket (pl. emojikat vagy pontokat) a jobb olvashatóság érdekében.
   - A termékek nevét emeld ki félkövérrel: **Termék neve**.
   - Az árakat emeld ki emoji-val: 💰 [összeg] Ft.
   - Használj vizuális elválasztókat (pl. vékony vonal: ──── vagy díszesebb: ✧─────✧), ha több terméket mutatsz be.
   - Ne használj technikai kódrészleteket, JSON-t vagy reguláris kifejezéseket a válaszban.
5. LISTÁZÁS: Ha több terméket sorolsz fel, használj strukturált, de barátságos listát. Minden termék után hagyj egy üres sort.
6. NYELV: A válasz nyelve minden esetben MAGYAR.
7. REFLEXIÓ ÉS KOMPATIBILITÁS: 
   - Ha a felhasználó korábbi üzenetekre utal, használd az előzményeket.
   - FIGYELEM: Mindig ellenőrizd a kiválasztott alkatrészek kompatibilitását (pl. processzor foglalat és alaplap egyezése, RAM típusa). Ha a felhasználó olyat kér, ami nem összeillő (pl. Intel CPU AMD alaplapba), figyelmeztesd rá szakmailag, de barátságosan!
   - Ha a keresett kategóriában (pl. budget) nincs találat az adatbázisban, ne csak közöld, hanem adj szakmai tanácsot, hogy milyen specifikációjú (pl. milyen socket-ű) terméket keressen nálunk később, ami passzol a már meglévő alkatrészeihez.

Kérlek, válaszolj a felhasználónak a fenti szabályok és a profi, de barátságos dizájn elvek alapján!
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
}


/* =====================================================
   MAIN
===================================================== */
exports.askAi = async (req, res) => {
    try {
        const message = req.body?.message;
        const history = req.body?.history || [];
        if (!message) return res.status(400).json({ error: "Missing message" });

        const products = await searchProducts(message);

        // debug (ha akarod)
        console.log("AI search candidates:", buildSearchCandidates(message));
        console.log("AI products count:", products.length);
        console.log("AI history length:", history.length);

        const answer = await generateAnswer(message, products, history);
        return res.json({ answer });

    } catch (err) {
        console.error("AI ERROR:", err);
        return res.status(500).json({ error: "AI service error" });
    }
};
