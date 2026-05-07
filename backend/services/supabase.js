const path = require("path");

/**
 * Load environment variables from the root .env file.
 *
 * override: true
 * -> allows values from the .env file
 *    to overwrite existing process.env values.
 */
require("dotenv").config({
    path: path.join(__dirname, "..", "..", ".env"),
    override: true
});

// Import Supabase client factory
const { createClient } = require("@supabase/supabase-js");

/**
 * Validate required environment variables.
 *
 * These checks prevent the application from starting
 * with missing configuration values.
 */
if (!process.env.SUPABASE_URL) {
    throw new Error("SUPABASE_URL missing from .env");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY missing from .env");
}

/**
 * Create Supabase client instance.
 *
 * SUPABASE_URL
 * -> your Supabase project API URL
 *
 * SUPABASE_SERVICE_ROLE_KEY
 * -> admin-level secret key used for backend access
 *    (should NEVER be exposed to frontend clients)
 */
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Export initialized Supabase client
 * so it can be reused across the project.
 */
module.exports = { supabase };