const OpenAI = require("openai");
const { getProductsForAI } = require("../services/productProvider");

const ai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com"
});

const SYSTEM_PROMPT = `
Te egy profi hardver-szakértő asszisztens vagy.
A válaszaidat KIZÁRÓLAG a megadott <DB> adatokra alapozhatod.

SZABÁLYOK:
1. Ha a <DB>-ben vannak releváns termékek, mutasd be őket barátságosan és szakszerűen.
2. Ha a kérdés típusára (pl. ár) nincs adat a <DB>-ben, de a terméket megtaláltad, jelezd, hogy ez az információ nem áll rendelkezésre.
3. Ha egyáltalán nincs releváns adat a <DB>-ben, válaszold pontosan ezt: "Nincs adat a helyi adatbázisban."
4. Pénznem: Mindig forintban (Ft) számolj.
5. Nyelv: Magyar.
6. Stílus: Segítőkész, lényegretörő.
`;

function fmtPrice(p) {
    if (p === null || p === undefined || !Number.isFinite(Number(p))) return null;
    return `${Number(p).toLocaleString("hu-HU")} Ft`;
}

function formatLocalResult(result, question) {
    if (!result || result.mode === "none") {
        return "Nincs adat a helyi adatbázisban.";
    }

    if (result.mode === "list") {
        const brand = result.brand || "ismeretlen gyártó";
        const lines = result.list.map(p => {
            const parts = [`- ${p.manufacturer ?? ""} ${p.model ?? "?"}`.trim()];
            if (p.socket) parts.push(`Socket: ${p.socket}`);
            const pr = fmtPrice(p.price);
            if (pr) parts.push(`Ár: ${pr}`);
            return parts.join(" | ");
        });
        return `A(z) ${brand} termékei:\n\n${lines.join("\n")}`;
    }

    if (result.mode === "product") {
        if (result.exact?.length) {
            const p = result.exact[0];
            const pr = fmtPrice(p.price);
            return pr
                ? `A ${p.manufacturer ?? ""} ${p.model ?? ""} ára ${pr}.`
                : `A ${p.manufacturer ?? ""} ${p.model ?? ""} ára nem szerepel a helyi adatbázisban.`;
        }
        if (result.similar?.length) {
            const lines = result.similar.map(p => {
                const pr = fmtPrice(p.price);
                return `- ${p.manufacturer ?? ""} ${p.model ?? "?"}${pr ? " – " + pr : ""}`;
            });
            return "A keresett termék nem található pontosan. Hasonló termékek:\n\n" + lines.join("\n");
        }
    }

    return "Nincs adat a helyi adatbázisban.";
}

exports.askAi = async (req, res) => {
    try {
        const message = req.body?.message;
        if (!message) {
            return res.status(400).json({ error: "Missing message" });
        }

        const result = getProductsForAI(message);
        const dbSlice = JSON.stringify(result, null, 2);

        try {
            const completion = await ai.chat.completions.create({
                model: "deepseek-chat",
                temperature: 0,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    {
                        role: "user",
                        content: `<DB>\n${dbSlice}\n</DB>\n\nKérdés:\n${message}`
                    }
                ]
            });

            const answer = completion.choices[0].message.content;

            // Ha az AI véletlenül nem a kért fallback szöveget mondja, de üres a DB
            if (result.mode === "none" && !answer.includes("Nincs adat")) {
                return res.json({ answer: "Nincs adat a helyi adatbázisban." });
            }

            return res.json({ answer });

        } catch (apiErr) {
            console.error("DEEPSEEK API ERROR:", apiErr.message);

            // Ha egyenleghiány vagy más API hiba van, adjuk vissza a lokális adatokat formázva
            const fallbackAnswer = formatLocalResult(result, message);

            let notice = "";
            if (apiErr.status === 402) {
                notice = "\n\n⚠️ (Megjegyzés: Az AI egyenlege elfogyott, de az adatbázisból kikerestem az adatokat.)";
            } else {
                notice = "\n\n⚠️ (Megjegyzés: Az AI szolgáltatás jelenleg nem elérhető, de az adatbázisból kikerestem az adatokat.)";
            }

            return res.json({ answer: fallbackAnswer + notice });
        }

    } catch (err) {
        console.error("GENERAL AI ERROR:", err);
        res.status(500).json({ error: "AI service error" });
    }
};
