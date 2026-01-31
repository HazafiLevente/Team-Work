const path = require("path");
require("dotenv").config({
    path: path.join(__dirname, "..", "..", ".env"), // ✅ services -> backend -> project root
    override: true
});

const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL) {
    throw new Error("SUPABASE_URL missing from .env");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY missing from .env");
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = { supabase };


