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
        "ilyen", "olyan", "ez", "azt", "itt", "ott", "nekem", "szeretnék"
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

    // egyediek, üresek nélkül
    return [...new Set(cands)].filter(Boolean);
}

/* =====================================================
   TERMÉK LEKÉRÉS – ugyanazzal az RPC-vel, több próbával
===================================================== */
async function searchProducts(message) {

    const words = message
        .toLowerCase()
        .replace(/[^\w\s-]/g, " ") // Meghagyjuk a kötőjelet ideiglenesen
        .split(/\s+/)
        .filter(w => w.length >= 2);

    let allResults = [];

    for (const word of words) {
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
async function generateAnswer(message, products) {

    if (!products.length) {
        return `
━━━━━━━━━━━━━━━━━━
❌ Nincs találat
━━━━━━━━━━━━━━━━━━

Sajnos nem találtam releváns terméket az adatbázisban.
`;
    }

    const prompt = `
Te a SetupConfigurator webshop prémium asszisztense vagy.

A felhasználó kérdése:
"${message}"

KIZÁRÓLAG az alábbi adatbázis rekordokra támaszkodhatsz:
${JSON.stringify(products, null, 2)}

FORMÁZÁSI SZABÁLYOK (kötelező):

- A válasz legyen tagolt.
- Használj üres sorokat.
- Használj elválasztó vonalat:  ━━━━━━━━━━━━━━━━━━
- Minden termék külön blokkban szerepeljen.
- Az ár külön sorban legyen.
- Az ár így jelenjen meg: 💰 Ár: 195 000 Ft
- A termék neve legyen félkövér markdown stílusban: **AMD Ryzen 7 9800X3D**
- Ne jeleníts meg JSON-t.
- Ne találj ki adatot.
- Az összes terméket jelenítse meg ha listáról van szó.

MINTA STRUKTÚRA:

━━━━━━━━━━━━━━━━━━
🔎 Találatok
━━━━━━━━━━━━━━━━━━

**Termék neve**

Gyártó: ...
Modell: ...
💰 Ár: ... Ft

━━━━━━━━━━━━━━━━━━

Magyarul, természetesen, profi webshop stílusban válaszolj.
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
        if (!message) return res.status(400).json({ error: "Missing message" });

        const products = await searchProducts(message);

        // debug (ha akarod)
        console.log("AI search candidates:", buildSearchCandidates(message));
        console.log("AI products count:", products.length);

        const answer = await generateAnswer(message, products);
        return res.json({ answer });

    } catch (err) {
        console.error("AI ERROR:", err);
        return res.status(500).json({ error: "AI service error" });
    }
};
