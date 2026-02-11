const OpenAI = require("openai");
const { getProductsForAI } = require("../services/productProvider");

const ai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com"
});

/* =====================================================
   SYSTEM PROMPT
===================================================== */

const SYSTEM_PROMPT = `
Te egy profi hardver-szakértő asszisztens vagy.
A válaszaidat KIZÁRÓLAG a megadott <DB> adatokra alapozhatod.

SZABÁLYOK:
1. Ha a <DB>-ben vannak releváns termékek, mutasd be őket röviden és szakszerűen.
2. Ha a kérdés árra vonatkozik, és van price mező, forintban (Ft) válaszolj.
3. Ha a termék megvan, de nincs ár, jelezd, hogy az ár nem szerepel az adatbázisban.
4. Ha nincs releváns adat, válaszold pontosan ezt:
   "Nincs adat a helyi adatbázisban."
5. Nyelv: magyar.
6. Stílus: segítőkész, tömör.
`;

/* =====================================================
   HELPER
===================================================== */

function fmtPrice(p) {
    if (p === null || p === undefined || !Number.isFinite(Number(p))) return null;
    return `${Number(p).toLocaleString("hu-HU")} Ft`;
}

function formatLocalResult(result) {
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

/* =====================================================
   MAIN CONTROLLER
===================================================== */

exports.askAi = async (req, res) => {
    try {
        const message = req.body?.message;
        if (!message) {
            return res.status(400).json({ error: "Missing message" });
        }

        // 1️⃣ Lokális adat lekérés
        const result = getProductsForAI(message);

        // 2️⃣ Ha nincs adat, azonnal visszaadjuk (nem hívunk AI-t feleslegesen)
        if (!result || result.mode === "none") {
            return res.json({ answer: "Nincs adat a helyi adatbázisban." });
        }

        const dbSlice = JSON.stringify(result, null, 2);

        try {
            // 3️⃣ DeepSeek hívás
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

            const answer = completion.choices?.[0]?.message?.content?.trim();

            if (!answer) {
                return res.json({ answer: formatLocalResult(result) });
            }

            return res.json({ answer });


        } catch (apiErr) {
            console.error("DEEPSEEK API ERROR:", apiErr.message);
            console.log("DEBUG RESULT:", JSON.stringify(result, null, 2));




            // 4️⃣ Fallback lokális válasz
            const fallbackAnswer = formatLocalResult(result);

            let notice = "";
            if (apiErr.status === 402) {
                notice = "\n\n⚠️ (Megjegyzés: Az AI egyenlege elfogyott, az adatbázisból válaszoltam.)";
            } else {
                notice = "\n\n⚠️ (Megjegyzés: Az AI jelenleg nem elérhető, az adatbázisból válaszoltam.)";
            }

            return res.json({ answer: fallbackAnswer + notice });

        }


    } catch (err) {
        console.error("GENERAL AI ERROR:", err);
        res.status(500).json({ error: "AI service error" });
    }

};
