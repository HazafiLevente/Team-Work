const fs = require("fs");
const path = require("path");

const ITEMS_PATH = path.join(
    __dirname,
    "..",
    "..",
    "datas",
    "Jsons",
    "items.runtime.json"
);

function loadItems() {
    if (!fs.existsSync(ITEMS_PATH)) return [];
    return JSON.parse(fs.readFileSync(ITEMS_PATH, "utf8"));
}



function findRelevantItems(message, items) {
    const q = message.toLowerCase();

    return items.filter(item =>
        `${item.manufacturer ?? ""} ${item.model ?? ""}`
            .toLowerCase()
            .includes(q)
    );
}


const fetch = global.fetch; // Node 18+

console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "OK" : "MISSING");


const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

const SYSTEM_PROMPT = `
Te egy termék-információs asszisztens vagy.

SZABÁLYOK:
- CSAK a <DB> és </DB> közötti adatokat használhatod.
- Ha a kérdésre nincs válasz a DB-ben, mondd:
  "Nincs adat a helyi adatbázisban."
- TILOS feltételezni, becsülni, internetes tudást használni.
- TILOS árat vagy terméket kitalálni.
`;


exports.askAi = async (req, res) => {
    try {
        const message = req.body?.message;

        if (!message) {
            return res.status(400).json({ error: "Missing message" });
        }

        if (!GEMINI_API_KEY) {
            throw new Error("Missing GEMINI_API_KEY");
        }

        // 1️⃣ DB betöltés
        const items = loadItems();

        // 2️⃣ releváns elemek keresése
        const relevant = findRelevantItems(message, items);

        // 3️⃣ DB szelet
        const dbSlice =
            relevant.length > 0
                ? JSON.stringify(relevant.slice(0, 10), null, 2)
                : "[]";

        // 4️⃣ VÉGSŐ PROMPT – EZ A LÉNYEG
        const finalPrompt = `
${SYSTEM_PROMPT}

<DB>
${dbSlice}
</DB>

Felhasználó kérdése:
"${message}"

Válasz:
`;

        // 5️⃣ Gemini hívás
        const response = await fetch(
            `${GEMINI_URL}?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [{ text: finalPrompt }]
                        }
                    ]
                })
            }
        );

        const text = await response.text();
        if (!response.ok) {
            throw new Error(text);
        }

        const data = JSON.parse(text);

        const answer =
            data.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Nincs adat a helyi adatbázisban.";

        res.json({ answer });

    } catch (err) {
        console.error("GEMINI ERROR:", err.message);
        res.status(500).json({ error: "AI service error" });
    }
};


