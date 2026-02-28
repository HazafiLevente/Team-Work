const path = require("path");
const envPath = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: envPath });

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.from("user[Auth]").select("*").limit(1);
    console.log("Error?", error);
    if (data && data.length) {
        console.log("Cols:", Object.keys(data[0]));
    }
}
check();
