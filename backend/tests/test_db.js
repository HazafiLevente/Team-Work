const { supabase } = require("../services/supabase");
require("dotenv").config();

async function test() {
    try {
        console.log("🔍 Checking user_more[Auth] columns...");
        const { data: moreData, error: moreError } = await supabase
            .from("user_more[Auth]")
            .select("*")
            .limit(1);

        if (moreData && moreData.length > 0) {
            console.log("✅ user_more[Auth] columns:", Object.keys(moreData[0]));
        } else {
            console.log("ℹ️ user_more[Auth] is empty or error:", moreError?.message);
        }

        console.log("🔍 Checking user[Auth] columns...");
        const { data: authData, error: authError } = await supabase
            .from("user[Auth]")
            .select("*")
            .limit(1);

        if (authData && authData.length > 0) {
            console.log("✅ user[Auth] columns:", Object.keys(authData[0]));
        } else {
            console.log("ℹ️ user[Auth] is empty or error:", authError?.message);
        }
    } catch (e) {
        console.error("💥 Fatal error:", e.message);
    }
}

test();
