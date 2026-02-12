const { GoogleGenerativeAI } = require("@google/generative-ai");
const { supabase } = require("../services/supabase");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });


/* =====================================================
   1️⃣ SQL KERESÉS
===================================================== */

async function searchProducts(message) {

    const lower = message.toLowerCase();

    const { data, error } = await supabase
        .from("all_products")
        .select("*")
        .or(`manufacturer.ilike.%${lower}%,model.ilike.%${lower}%`)
        .limit(10);

    if (error) {
        console.log("SEARCH ERROR:", error.message);
        return [];
    }

    return data || [];
}


/* =====================================================
   2️⃣ AI VÁLASZ GENERÁLÁS
===================================================== */

async function generateAnswer(message, products) {

    if (!products.length) {
        return "Nincs találat az adatbázisban.";
    }

    const prompt = `
Te egy webshop AI asszisztens vagy.

A felhasználó ezt kérdezte:
"${message}"

CSAK az alábbi adatbázis rekordokból dolgozhatsz:
${JSON.stringify(products, null, 2)}

Szabályok:
- Ne találj ki új terméket.
- Ne találj ki árat.
- Csak a listában szereplő adatokat használd.
- Fogalmazz természetesen, intelligensen, segítőkészen magyarul.
- Ne írj JSON-t a válaszba.
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
}


/* =====================================================
   MAIN
===================================================== */

exports.askAi = async (req, res) => {

    try {

        const message = req.body.message;
        const userId = req.user?.id;

        if (!message) {
            return res.status(400).json({ error: "Missing message" });
        }

        // 1️⃣ SQL keresés
        const products = await searchProducts(message);

        // 2️⃣ Gemini válasz
        const answer = await generateAnswer(message, products);

        // 3️⃣ Mentés Supabase-be
        if (userId) {

            const { data: existingChat } = await supabase
                .from('ai_messages[Messages]')
                .select("*")
                .eq("user_id", userId)
                .limit(1)
                .maybeSingle();

            let chatId = existingChat?.id;

            if (!chatId) {
                const { data: newChat } = await supabase
                    .from('ai_messages[Messages]')
                    .insert({ user_id: userId })
                    .select()
                    .single();

                chatId = newChat.id;
            }

            await supabase
                .from('ai_texts[Messages]')
                .insert({
                    messages_id: chatId,
                    user_text: message,
                    ai_text: answer
                });
        }

        return res.json({ answer });

    } catch (err) {

        console.error("AI ERROR:", err);

        return res.status(500).json({
            error: "AI service error"
        });
    }
};
