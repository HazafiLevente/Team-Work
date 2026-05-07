/**
 * --------------------------------------------------------------------------
 *  SYSTEM CONTROL & SCHEMA ORCHESTRATOR
 * --------------------------------------------------------------------------
 *  Handles:
 *   - database schema introspection
 *   - dynamic SQL generation
 *   - automatic table synchronization
 *   - role-based access control (RBAC)
 * --------------------------------------------------------------------------
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Load environment variables from .env
require("dotenv").config({
    path: path.join(__dirname, "..", "..", ".env"),
    override: false,
    quiet: true
});

const filler = require("../../datas/Jsons/filler.json");

// Runtime-generated table metadata output
const OUT_FILE = path.join(
    __dirname,
    "../../datas",
    "Jsons",
    "tables.runtime.json"
);

/* =========================================================================
   SUPABASE INITIALIZATION
   ========================================================================= */

// Create Supabase admin/service client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =========================================================================
   LOGGING UTILITIES
   ========================================================================= */

/**
 * Creates a lightweight structured logger
 * used during schema refresh operations.
 */
function createControlLog() {
    return {
        lines: [],

        // Add new log line
        add(l) {
            this.lines.push(l);
        },

        // Print collected logs to console
        flush() {
            console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log("📘 CONTROL / SCHEMA REFRESH");
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

            this.lines.forEach(l => console.log(l));

            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        }
    };
}

/* =========================================================================
   DATABASE INTROSPECTION
   ========================================================================= */

/**
 * Refreshes all runtime table metadata.
 *
 * Steps:
 *  1. Load all database tables
 *  2. Exclude ignored/internal tables
 *  3. Fetch column metadata
 *  4. Generate runtime JSON files
 *  5. Rebuild global SQL search function
 */
async function refreshTables() {

    const log = createControlLog();

    // Load all database tables through RPC
    const { data, error } = await supabase.rpc("get_all_tables");

    if (error || !Array.isArray(data)) {
        log.add(`❌ Table list load error: ${error?.message}`);
        log.flush();
        return;
    }

    // Extract valid table names
    const allTableNames = data
        .map(t => t.table_name)
        .filter(Boolean);

    /**
     * Ignore internal/system tables
     * based on configured patterns.
     */
    const isExcluded = (name) =>
        filler.exclude_table_patterns.some(p => name.includes(p));

    // Runtime-visible tables only
    const runtimeTableNames = allTableNames.filter(
        name => !isExcluded(name)
    );

    // Load column metadata for all tables
    const columnMap = await getAllTableColumns();

    const tables = {};

    /**
     * Build runtime table structure:
     * {
     *   table_name: {
     *      columns: [...]
     *   }
     * }
     */
    runtimeTableNames.forEach(table => {
        if (columnMap[table]?.length) {
            tables[table] = {
                columns: columnMap[table]
            };
        }
    });

    /* ---------------------------------------------------------------------
       Persist generated metadata files
       --------------------------------------------------------------------- */

    const writeJson = (file, content) =>
        fs.writeFileSync(file, JSON.stringify(content, null, 2));

    // Full table list
    writeJson(
        path.join(__dirname, "../../datas", "Jsons", "tables.all.json"),
        {
            lastUpdated: Date.now(),
            tables: allTableNames
        }
    );

    // Runtime table metadata
    writeJson(OUT_FILE, {
        lastUpdated: Date.now(),
        tables
    });

    // Simple table name list
    writeJson(
        path.join(__dirname, "../../datas", "Jsons", "tables.list.json"),
        {
            lastUpdated: Date.now(),
            tables: allTableNames
        }
    );

    log.add(
        `🔄 Tables updated | Total: ${allTableNames.length} | Runtime: ${Object.keys(tables).length}`
    );

    log.flush();

    // Rebuild global SQL search function
    await updateProductsHomeFunction(tables);
}

/**
 * Loads all table columns using a Supabase RPC.
 */
async function getAllTableColumns() {

    const { data, error } = await supabase.rpc("get_table_columns");

    if (error) {
        console.error("❌ Column RPC failed", error);
        return {};
    }

    return data;
}

/* =========================================================================
   DYNAMIC SQL GENERATION
   ========================================================================= */

/**
 * Attempts to detect common semantic columns
 * across arbitrary tables.
 *
 * Detects:
 *  - ID
 *  - manufacturer
 *  - model/name
 *  - price
 */
function detectColumns(columns) {

    const id =
        columns.find(c => ["id", "ID"].includes(c)) || "'0'";

    const mfr =
        columns.find(c =>
            ["manufacturer", "brand", "maker"]
                .includes(c.toLowerCase())
        );

    const model =
        columns.find(c =>
            ["model", "name", "product_name", "series", "title"]
                .includes(c.toLowerCase())
        );

    const price =
        columns.find(c =>
            ["price", "cost", "price_huf"]
                .includes(c.toLowerCase())
        );

    return {
        id,
        manufacturer: mfr || null,
        model: model || null,
        price: price || null
    };
}

/**
 * Dynamically generates a giant UNION ALL SQL query
 * from every detected hardware/product table.
 *
 * This allows global searching across the entire database.
 */
function buildUnionSQL(tablesMeta) {

    // SQL-safe quoted identifier
    const q = (col) =>
        `"${col.replace(/"/g, '""')}"`;

    const blocks = [];

    for (const [table, meta] of Object.entries(tablesMeta)) {

        const cols = detectColumns(meta.columns);

        const mfrExpr =
            cols.manufacturer
                ? q(cols.manufacturer)
                : `'${table}'`;

        const modelExpr =
            cols.model
                ? q(cols.model)
                : "'Unknown'";

        blocks.push(`
            SELECT 
                '${table}'::text AS table_name,

                ${cols.id === "'0'"
            ? "'0'"
            : q(cols.id)
        }::text AS id,

                ${mfrExpr}::text AS manufacturer,

                ${modelExpr}::text AS model,

                ${cols.price
            ? q(cols.price) + "::numeric"
            : "NULL::numeric"
        } AS price

            FROM "${table}"
        `.trim());
    }

    return blocks.join("\nUNION ALL\n");
}

/**
 * Recreates the products_home SQL function inside Supabase.
 *
 * The function provides a unified searchable product endpoint.
 */
async function updateProductsHomeFunction(tablesMeta) {

    const unionSQL = buildUnionSQL(tablesMeta);

    if (!unionSQL) return;

    const sql = `
        CREATE OR REPLACE FUNCTION products_home(q TEXT)

        RETURNS TABLE (
            table_name TEXT,
            id TEXT,
            manufacturer TEXT,
            model TEXT,
            price NUMERIC
        )

        LANGUAGE sql
        SECURITY DEFINER

        AS $$

            SELECT * FROM (${unionSQL}) all_products

            WHERE q IS NULL

               OR LOWER(table_name)
                    LIKE '%' || q || '%'

               OR LOWER(manufacturer)
                    LIKE '%' || q || '%'

               OR LOWER(model)
                    LIKE '%' || q || '%';

        $$;
    `;

    const { error } = await supabase.rpc(
        "update_products_home",
        { sql }
    );

    if (error) {
        console.error("❌ products_home update failed", error);
    } else {
        console.log("✅ products_home SQL function updated");
    }
}

/* =========================================================================
   ROLE-BASED ACCESS CONTROL (RBAC)
   ========================================================================= */

/**
 * Converts comma-separated environment IDs
 * into Set collections for fast lookups.
 */
const parseIds = (envVar) =>
    new Set(
        (process.env[envVar] || "")
            .split(",")
            .map(Number)
            .filter(Boolean)
    );

/**
 * Role collections loaded from environment variables.
 */
const ROLES = {

    owners: parseIds("OWNERS"),

    adminsPlus: parseIds("ADMINS_PLUS"),

    admins: parseIds("ADMINS"),

    banned: parseIds("BANNED_USERS")
};

/**
 * Resolves a user's role based on environment config.
 */
function resolveRole(userId) {

    const id = Number(userId);

    if (ROLES.owners.has(id)) return "owner";

    if (ROLES.adminsPlus.has(id)) return "admin+";

    if (ROLES.admins.has(id)) return "admin";

    return "user";
}

/**
 * Updates a user's role dynamically
 * and persists changes into the .env file.
 */
function updateUserEnvRole(userId, newRole) {

    const envPath = path.join(
        __dirname,
        "..",
        "..",
        ".env"
    );

    const numId = Number(userId);

    // Owner roles are immutable
    if (ROLES.owners.has(numId)) {

        console.warn(
            `⚠️ Security: Cannot modify owner role (ID: ${numId})`
        );

        return;
    }

    // Remove from all admin collections
    ROLES.adminsPlus.delete(numId);
    ROLES.admins.delete(numId);

    // Reassign role
    if (newRole === "admin+") {
        ROLES.adminsPlus.add(numId);
    }

    if (newRole === "admin") {
        ROLES.admins.add(numId);
    }

    // Sync memory -> process.env
    process.env.ADMINS_PLUS =
        Array.from(ROLES.adminsPlus).join(",");

    process.env.ADMINS =
        Array.from(ROLES.admins).join(",");

    // Persist into .env file
    let content =
        fs.readFileSync(envPath, "utf-8");

    content = content.replace(
        /^ADMINS_PLUS=.*$/m,
        `ADMINS_PLUS=${process.env.ADMINS_PLUS}`
    );

    content = content.replace(
        /^ADMINS=.*$/m,
        `ADMINS=${process.env.ADMINS}`
    );

    fs.writeFileSync(envPath, content, "utf-8");

    console.log(
        `✅ Role updated: ${numId} -> ${newRole}`
    );
}

/* =========================================================================
   SYSTEM LIFECYCLE
   ========================================================================= */

let interval = null;

/**
 * Starts the automated control system.
 *
 * Features:
 *  - initial schema refresh
 *  - periodic metadata synchronization
 */
function startControl() {

    if (interval) return;

    console.log("🚀 Control system initializing...");

    // Initial refresh
    refreshTables();

    // Auto-refresh every 10 minutes
    interval = setInterval(
        refreshTables,
        600000
    );
}

module.exports = {

    startControl,

    refreshTables,

    resolveRole,

    updateUserEnvRole,

    // Ban checker
    isBanned: (id) =>
        ROLES.banned.has(Number(id)),

    // Access guards
    hasAdminAccess: (role) =>
        ["admin", "admin+", "owner"].includes(role),

    hasAdminPlusAccess: (role) =>
        ["admin+", "owner"].includes(role),

    ROLES
};