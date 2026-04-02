const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

require("dotenv").config({
    path: path.join(__dirname, "..", "..", ".env"),
    override: false,
    quiet: true
});

const filler = require("../../datas/Jsons/filler.json");

const OUT_FILE = path.join(__dirname, "../../datas", "Jsons", "tables.runtime.json");

function createControlLog() {
    return {
        lines: [],
        add(l) {
            this.lines.push(l);
        },
        flush() {
            console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log("📘 CONTROL / SCHEMA REFRESH");
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            this.lines.forEach(l => console.log(l));
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        }
    };
}




const ALL_TABLES_FILE = path.join(
    __dirname,
    "../../datas",
    "Jsons",
    "tables.all.json"
);

const TABLE_LIST_FILE = path.join(
    __dirname,
    "../../datas",
    "Jsons",
    "tables.list.json"
);

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* ======================================================
   TABLES
====================================================== */

function isExcluded(name) {
    return filler.exclude_table_patterns.some(p => name.includes(p));
}

async function refreshTables() {
    const log = createControlLog();

    const { data, error } = await supabase.rpc("get_all_tables");
    if (error || !Array.isArray(data)) {
        log.add(`❌ table list load error`);
        log.flush();
        return;
    }

    const allTableNames = data.map(t => t.table_name).filter(Boolean);
    const runtimeTableNames = allTableNames.filter(name => !isExcluded(name));

    fs.writeFileSync(ALL_TABLES_FILE, JSON.stringify({
        lastUpdated: Date.now(),
        tables: allTableNames
    }, null, 2));

    const columnMap = await getAllTableColumns();
    const tables = {};

    runtimeTableNames.forEach(table => {
        if (columnMap[table]?.length) {
            tables[table] = { columns: columnMap[table] };
        }
    });

    fs.writeFileSync(OUT_FILE, JSON.stringify({
        lastUpdated: Date.now(),
        tables
    }, null, 2));

    fs.writeFileSync(TABLE_LIST_FILE, JSON.stringify({
        lastUpdated: Date.now(),
        tables: allTableNames
    }, null, 2));

    log.add(`🔄 táblák frissítve`);
    log.add(`   összes: ${allTableNames.length}`);
    log.add(`   runtime: ${Object.keys(tables).length}`);
    log.add(`📦 fájlok:`);
    log.add(`   ✔ tables.all.json`);
    log.add(`   ✔ tables.runtime.json`);
    log.add(`   ✔ tables.list.json`);

    log.flush();

    updateProductsHomeFunction(tables);
}


async function getAllTableColumns() {
    const { data, error } = await supabase.rpc("get_table_columns");

    if (error || !data) {
        console.error("❌ column rpc failed", error);
        return {};
    }

    // A data most már közvetlenül a map (jsonb miatt)
    return data;
}

function detectColumns(columns, tableName) {
    const id =
        columns.find(c => ["id", "ID"].includes(c)) || "'0'";

    let manufacturer =
        columns.find(c => ["manufacturer", "brand", "maker"].includes(c.toLowerCase()));

    let model =
        columns.find(c => ["model", "name", "product_name", "series", "title"].includes(c.toLowerCase()));

    const price =
        columns.find(c => ["price", "cost", "price_huf"].includes(c.toLowerCase()));

    // Fallbacks ha hiányzik valami
    if (!manufacturer) manufacturer = null; // buildUnionSQL fogja kezelni
    if (!model) model = null;

    return { id, manufacturer, model, price: price || null };
}

function q(col) {
    return `"${col.replace(/"/g, '""')}"`;
}

function buildUnionSQL(tablesMeta) {
    const blocks = [];

    for (const [table, meta] of Object.entries(tablesMeta)) {
        const cols = detectColumns(meta.columns, table);
        if (!cols) continue;

        const mfrExpr = cols.manufacturer ? q(cols.manufacturer) : `'${table}'`;
        const modelExpr = cols.model ? q(cols.model) : "'Ismeretlen'";

        blocks.push(`
            select
                '${table}'::text as table_name,
                ${cols.id === "'0'" ? "'0'" : q(cols.id)}::text as id,
                ${mfrExpr}::text as manufacturer,
                ${modelExpr}::text as model,
                ${cols.price ? q(cols.price) + "::numeric" : "null::numeric"} as price
            from "${table}"
        `.trim());
    }

    return blocks.join("\nunion all\n");
}

function buildProductsHomeSQL(unionSQL) {
    return `
create or replace function products_home(
    q text
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
        or lower(table_name) like '%' || q || '%'
        or lower(manufacturer) like '%' || q || '%'
        or lower(model) like '%' || q || '%';
$$;
`;
}

async function updateProductsHomeFunction(tablesMeta) {
    const unionSQL = buildUnionSQL(tablesMeta);
    if (!unionSQL) return;

    const sql = buildProductsHomeSQL(unionSQL);

    const { error } = await supabase.rpc("update_products_home", { sql });

    if (error) {
        console.error("❌ products_home update failed", error);
    } else {
        console.log("✅ products_home updated");
    }
}

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

const BANNED_IDS = new Set(
    (process.env.BANNED_USERS || "")
        .split(",")
        .map(Number)
        .filter(Boolean)
);

const ROLES = {
    owners: OWNER_IDS,
    adminsPlus: ADMIN_PLUS_IDS,
    admins: ADMIN_IDS,
    banned: BANNED_IDS
};

function resolveRole(userId) {
    if (ROLES.owners.has(userId)) return "owner";
    if (ROLES.adminsPlus.has(userId)) return "admin+";
    if (ROLES.admins.has(userId)) return "admin";
    return "user";
}

function updateUserEnvRole(userId, newRole) {
    const envPath = path.join(__dirname, "..", "..", ".env");
    if (!fs.existsSync(envPath)) {
        console.error("❌ .env file not found at", envPath);
        return;
    }

    let content = fs.readFileSync(envPath, "utf-8");

    const owners = ROLES.owners;
    const adminPlus = ROLES.adminsPlus;
    const admins = ROLES.admins;

    const numId = Number(userId);
    if (owners.has(numId)) {
        console.warn(`⚠️ Attempt to modify owner role for ID ${numId} ignored.`);
        return;
    }

    // 1. Update in-memory sets
    adminPlus.delete(numId);
    admins.delete(numId);

    if (newRole === "admin+") adminPlus.add(numId);
    if (newRole === "admin") admins.add(numId);

    // 2. Update process.env strings for other parts of the app
    process.env.ADMINS_PLUS = Array.from(adminPlus).join(",");
    process.env.ADMINS = Array.from(admins).join(",");

    // 3. Update the physical .env file
    content = content.replace(/^ADMINS_PLUS=.*$/m, `ADMINS_PLUS=${process.env.ADMINS_PLUS}`);
    content = content.replace(/^ADMINS=.*$/m, `ADMINS=${process.env.ADMINS}`);

    fs.writeFileSync(envPath, content, "utf-8");
    console.log(`✅ .env and memory updated for user ${numId} -> ${newRole}`);
}

function isBanned(userId) {
    return ROLES.banned.has(Number(userId));
}

function updateUserBanStatus(userId, banned) {
    const envPath = path.join(__dirname, "..", "..", ".env");
    if (!fs.existsSync(envPath)) return;

    let content = fs.readFileSync(envPath, "utf-8");
    const numId = Number(userId);

    if (banned) {
        ROLES.banned.add(numId);
    } else {
        ROLES.banned.delete(numId);
    }

    process.env.BANNED_USERS = Array.from(ROLES.banned).join(",");

    if (/^BANNED_USERS=.*$/m.test(content)) {
        content = content.replace(/^BANNED_USERS=.*$/m, `BANNED_USERS=${process.env.BANNED_USERS}`);
    } else {
        content += `\nBANNED_USERS=${process.env.BANNED_USERS}`;
    }

    fs.writeFileSync(envPath, content, "utf-8");
    console.log(`✅ .env updated: user ${numId} banned status -> ${banned}`);
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

    refreshTables();
    interval = setInterval(refreshTables, 5000);
}

module.exports = {
    startControl,
    refreshTables,
    resolveRole,
    updateUserEnvRole, // ✅ NEW
    isBanned,          // ✅ NEW
    updateUserBanStatus, // ✅ NEW
    canAssignRole,
    hasAdminAccess,
    hasAdminPlusAccess,
    ROLES
};


