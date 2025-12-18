const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

require("dotenv").config();




const filler = require("./filler.json");

const OUT_FILE = path.join(__dirname, "tables.runtime.json");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* ======================================================
   TABLES
====================================================== */

function isExcluded(name) {
    return filler.exclude_table_patterns.some(p =>
        name.includes(p)
    );
}

async function getTableColumns(table) {
    const { data, error } = await supabase
        .from("information_schema.columns")
        .select("column_name")
        .eq("table_schema", "public")
        .eq("table_name", table);

    if (error || !Array.isArray(data)) {
        console.warn(`⚠️ column load failed for ${table}`);
        return [];
    }

    return data.map(c => c.column_name);
}

async function refreshTables() {
    const { data, error } = await supabase.rpc("get_all_tables");
    if (error || !Array.isArray(data)) {
        console.error("❌ table list load error", error);
        return;
    }

    const tableNames = data
        .map(t => t.table_name)
        .filter(name => name && !isExcluded(name));

    const columnMap = await getAllTableColumns();

    const tables = {};

    tableNames.forEach(table => {
        const columns = columnMap[table];
        if (!columns || !columns.length) return;

        tables[table] = { columns };
    });

    fs.writeFileSync(
        OUT_FILE,
        JSON.stringify({
            lastUpdated: Date.now(),
            tables
        }, null, 2)
    );

    console.log(
        `🔄 [CONTROL] tables refreshed: ${Object.keys(tables).length}`
    );
    updateProductsHomeFunction(tables);
}


async function getAllTableColumns() {
    const { data, error } = await supabase.rpc("get_table_columns");

    if (error || !Array.isArray(data)) {
        console.error("❌ column rpc failed", error);
        return {};
    }

    const map = {};

    data.forEach(row => {
        if (!map[row.table_name]) {
            map[row.table_name] = [];
        }
        map[row.table_name].push(row.column_name);
    });

    return map;
}

function detectColumns(columns) {
    const id =
        columns.find(c => c.toLowerCase() === "id");

    const manufacturer =
        columns.find(c =>
            ["manufacturer", "brand"].includes(c.toLowerCase())
        );

    const model =
        columns.find(c =>
            ["model", "name", "product_name"].includes(c.toLowerCase())
        );

    const price =
        columns.find(c => c.toLowerCase() === "price");

    if (!id || !manufacturer || !model) return null;

    return { id, manufacturer, model, price };
}



function buildUnionSQL(tablesMeta) {
    const blocks = [];

    for (const [table, meta] of Object.entries(tablesMeta)) {
        const cols = detectColumns(meta.columns);
        if (!cols) continue;

        blocks.push(`
            select
                '${table}'::text as table_name,
                ${q(cols.id)}::text as id,
                ${q(cols.manufacturer)}::text as manufacturer,
                ${q(cols.model)}::text as model,
                ${cols.price
            ? q(cols.price) + "::numeric"
            : "null::numeric"} as price
            from "${table}"
        `.trim());
    }

    return blocks.join("\nunion all\n");
}




function q(col) {
    return `"${col.replace(/"/g, '""')}"`;
}


function buildProductsHomeSQL(unionSQL) {
    return `
create or replace function products_home(
    q text,
    lim int,
    off int
)
returns table (
    table_name text,
    id text,
    manufacturer text,
    model text,
    price numeric
)

language sql
security definer
as $$
    select * from (
        ${unionSQL}
    ) all_products
    where
        q is null
        or lower(manufacturer) like '%' || q || '%'
        or lower(model) like '%' || q || '%'
    limit lim offset off;
$$;
`;
}



async function updateProductsHomeFunction(tablesMeta) {
    const unionSQL = buildUnionSQL(tablesMeta);
    if (!unionSQL) return;

    const sql = buildProductsHomeSQL(unionSQL);

    const { error } = await supabase.rpc(
        "update_products_home",
        { sql }
    );

    if (error) {
        console.error("❌ products_home update failed", error);
    } else {
        console.log("✅ products_home updated");
    }
}


/* ======================================================
   ADMIN
====================================================== */



/* ======================================================
   ADMIN / ROLES
====================================================== */

const OWNER_IDS = new Set(
    (process.env.OWNERS || "")
        .split(",")
        .map(Number)
        .filter(Boolean)
);

const ADMIN_PLUS_IDS = new Set(
    (process.env.ADMINS_PLUS || "")
        .split(",")
        .map(Number)
        .filter(Boolean)
);

const ADMIN_IDS = new Set(
    (process.env.ADMINS || "")
        .split(",")
        .map(Number)
        .filter(Boolean)
);

const ROLES = {
    owners: OWNER_IDS,          // 🔒 IMMUTABLE
    adminsPlus: ADMIN_PLUS_IDS, // 🔒 ENV
    admins: ADMIN_IDS           // 🔒 ENV
};


function loadRolesFromEnv() {
    if (!process.env.ADMIN_ROLES) {
        throw new Error("❌ ADMIN_ROLES missing from .env");
    }

    let parsed;
    try {
        parsed = JSON.parse(process.env.ADMIN_ROLES);
    } catch {
        throw new Error("❌ ADMIN_ROLES is not valid JSON");
    }

    ROLES.owners = new Set(
        Object.values(parsed.Owners || {}).map(Number)
    );

    ROLES.admins = new Set(
        Object.values(parsed.Admin || {}).map(Number)
    );

    ROLES.adminsPlus = new Set(
        Object.values(parsed["Admin+"] || {}).map(Number)
    );

    console.log("👑 Owners:", [...ROLES.owners]);
    console.log("🔥 Admin+:", [...ROLES.adminsPlus]);
    console.log("🛡 Admin:", [...ROLES.admins]);
}

function resolveRole(userId) {
    if (ROLES.owners.has(userId)) return "owner";
    if (ROLES.adminsPlus.has(userId)) return "admin+";
    if (ROLES.admins.has(userId)) return "admin";
    return "user";
}


function canAssignRole(granterRole, targetRole) {
    const rank = { owner: 3, "admin+": 2, admin: 1, user: 0 };
    return rank[granterRole] > rank[targetRole];
}

function hasAdminAccess(role) {
    return ["admin", "admin+", "owner"].includes(role);
}

function hasAdminPlusAccess(role) {
    return ["admin+", "owner"].includes(role);
}


let interval = null;

function startControl() {
    if (interval) return;

    console.log("🚀 control.js started");

    refreshTables();           // azonnali futás
    interval = setInterval(
        refreshTables,
        5000
    );
}

module.exports = {
    startControl,

    // 🔐 admin API
    resolveRole,
    canAssignRole,
    hasAdminAccess,
    hasAdminPlusAccess,
    ROLES
};

