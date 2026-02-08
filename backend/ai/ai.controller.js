const { GoogleGenAI } = require("@google/genai");
const { getProductsForAI } = require("../services/productProvider");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
Te egy termék-információs asszisztens vagy.

SZABÁLYOK:
- CSAK a <DB> adatokat használhatod.
- Ha nincs adat, mondd: "Nincs adat a helyi adatbázisban."
- TILOS kitalálni vagy internetes tudást használni.
- Ár esetén forintban válaszolj.
- A válasz legyen rövid, magyar.
`;

function fmtPrice(p) {
    if (p === null || p === undefined || !Number.isFinite(Number(p))) return null;
    return `${Number(p).toLocaleString("hu-HU")} Ft`;
}

exports.askAi = async (req, res) => {
    try {
        const message = req.body?.message;
        if (!message) return res.status(400).json({ error: "Missing message" });

        const result = getProductsForAI(message);

        /* ❌ NONE */
        if (!result || result.mode === "none") {
            return res.json({ answer: "Nincs adat a helyi adatbázisban." });
        }

        /* 📋 LIST */
        if (result.mode === "list") {
            const brand = result.brand || "ismeretlen gyártó";

            const lines = result.list.map(p => {
                const parts = [];

                parts.push(`- ${p.manufacturer ?? ""} ${p.model ?? "?"}`.trim());

                if (p.socket) parts.push(`Socket: ${p.socket}`);
                const pr = fmtPrice(p.price);
                if (pr) parts.push(`Ár: ${pr}`);

                // ha akarod: táblanév debug
                // parts.push(`(${p.table})`);

                return parts.join(" | ");
            });

            return res.json({
                answer: `A(z) ${brand} termékei:\n\n${lines.join("\n")}`
            });
        }

        /* 🟢 PRODUCT EXACT */
        if (result.mode === "product" && result.exact?.length) {
            const p = result.exact[0];
            const pr = fmtPrice(p.price);

            if (!pr) {
                // ha nincs ár, mondjuk meg
                return res.json({
                    answer: `A ${p.manufacturer ?? ""} ${p.model ?? ""} ára nem szerepel a helyi adatbázisban.`
                        .replace(/\s+/g, " ")
                        .trim()
                });
            }

            return res.json({
                answer: `A ${p.manufacturer ?? ""} ${p.model ?? ""} ára ${pr}.`
                    .replace(/\s+/g, " ")
                    .trim()
            });
        }

        /* 🟡 PRODUCT SIMILAR */
        if (result.mode === "product" && result.similar?.length) {
            const lines = result.similar.slice(0, 10).map(p => {
                const pr = fmtPrice(p.price);
                return `- ${p.manufacturer ?? ""} ${p.model ?? "?"}${pr ? " – " + pr : ""}`
                    .replace(/\s+/g, " ")
                    .trim();
            });

            return res.json({
                answer:
                    "A keresett termék nem található pontosan.\n" +
                    "Viszont hasonló termékek:\n\n" +
                    lines.join("\n")
            });
        }

        /* (optional) ha valamiért ide esne, akkor Gemini-vel “összefoglalunk” */
        const dbSlice = JSON.stringify(
            {
                exact: result.exact || [],
                similar: result.similar || [],
                list: result.list || []
            },
            null,
            2
        );

        const prompt = `
${SYSTEM_PROMPT}

<DB>
${dbSlice}
</DB>

Felhasználó kérdése:
"${message}"

Válasz:
`;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        });

        return res.json({
            answer: response.text ?? "Nincs adat a helyi adatbázisban."
        });
    } catch (err) {
        console.error("GENAI ERROR:", err);
        res.status(500).json({ error: "AI service error" });
    }
};
