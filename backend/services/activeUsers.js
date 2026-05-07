


const jwt = require("jsonwebtoken");
const { db } = require("./localDb");
const { createClient } = require("@supabase/supabase-js");
let persistOkLoggedAt = 0;

const JWT_SECRET = process.env.JWT_SECRET;

const ACTIVE_WINDOW_MS = 60 * 1000;

// SQLite tables (local SQL persistence; replaces JSON history)
db.exec(`
    CREATE TABLE IF NOT EXISTS "active_users" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "created_at" TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "idx_active_users_created_at" ON "active_users" ("created_at");

    CREATE TABLE IF NOT EXISTS "active_users_values" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "active_id" INTEGER NOT NULL,
        "property" TEXT NOT NULL,
        "value" TEXT,
        UNIQUE("active_id","property"),
        FOREIGN KEY("active_id") REFERENCES "active_users"("id") ON DELETE CASCADE
    );
`);

// Migration: older versions used "values" column name -> rename to "value"
try {
    const cols = db.prepare(`PRAGMA table_info("active_users_values")`).all();
    const hasValues = cols.some(c => c.name === "values");
    const hasValue = cols.some(c => c.name === "value");
    if (hasValues && !hasValue) {
        db.exec(`ALTER TABLE "active_users_values" RENAME COLUMN "values" TO "value"`);
        console.log("✅ Migrated active_users_values.values -> value");
    }
} catch (e) {
    console.warn("⚠️ active_users_values migration check failed:", e?.message || e);
}

// Optional Supabase sync (on shutdown)
let supabaseClient = null;
let supabaseSchemaChecked = false;
let supabaseSchemaOk = false;

// Real Supabase table names (with project naming convention)
const SB_TABLE_ACTIVE_USERS = process.env.SUPABASE_TABLE_ACTIVE_USERS || "active_users[Active]";
const SB_TABLE_ACTIVE_USERS_VALUES = process.env.SUPABASE_TABLE_ACTIVE_USERS_VALUES || "active_users_values[Active]";
const SB_TABLE_ACTIVE_USERS_PROPERTIES = process.env.SUPABASE_TABLE_ACTIVE_USERS_PROPERTIES || "active_users_properties[Active]";

// property-name -> property-id cache (resolved against SB_TABLE_ACTIVE_USERS_PROPERTIES)
const propertyIdCache = new Map();

// Properties we may sync to Supabase. Any name not present in the
// active_users_properties[Active] table is silently skipped, so adding
// entries here is safe even if the schema doesn't have them yet.
const SUPPORTED_REMOTE_PROPERTIES = new Set([
    // base 8
    "server_life_time",
    "first_person_id",
    "person_longest_time",
    "person_id",
    "person_name",
    "max_count",
    "avg_count",
    "min_count",
    // extras (only synced if the property exists in active_users_properties[Active])
    "users",
    "unique",
    "total_requests",
    "now_time"
]);

const propertyMissingWarned = new Set();
async function resolvePropertyId(sb, name) {
    if (!SUPPORTED_REMOTE_PROPERTIES.has(name)) return null;
    if (propertyIdCache.has(name)) return propertyIdCache.get(name);

    try {
        const sel = await sb
            .from(SB_TABLE_ACTIVE_USERS_PROPERTIES)
            .select("id, property")
            .eq("property", name)
            .limit(1);

        if (sel?.error) {
            console.warn(`⚠️ Supabase ${SB_TABLE_ACTIVE_USERS_PROPERTIES} select failed:`, sel.error?.message || sel.error, name);
            return null;
        }

        const existingId = sel.data?.[0]?.id;
        if (existingId) {
            propertyIdCache.set(name, existingId);
            return existingId;
        }

        // Schema is fixed: do not insert new properties. Warn only once per name.
        if (!propertyMissingWarned.has(name)) {
            propertyMissingWarned.add(name);
            console.warn(`ℹ️ Supabase ${SB_TABLE_ACTIVE_USERS_PROPERTIES} missing property (skip):`, name);
        }
        return null;
    } catch (e) {
        console.warn(`⚠️ Supabase resolveProperty exception:`, e?.message || e, name);
        return null;
    }
}

function getSupabaseForSync() {
    if (supabaseClient) return supabaseClient;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;

    supabaseClient = createClient(url, key);
    return supabaseClient;
}

async function checkSupabaseSchemaAccess() {
    if (supabaseSchemaChecked) return supabaseSchemaOk;
    supabaseSchemaChecked = true;

    const sb = getSupabaseForSync();
    if (!sb) {
        supabaseSchemaOk = false;
        return false;
    }

    try {
        const probe = await sb.from(SB_TABLE_ACTIVE_USERS).select("id").limit(1);
        if (probe?.error) {
            supabaseSchemaOk = false;
            console.warn(`⚠️ Supabase ${SB_TABLE_ACTIVE_USERS} not accessible:`, probe.error?.message || probe.error);
            return false;
        }
        supabaseSchemaOk = true;
        return true;
    } catch (e) {
        supabaseSchemaOk = false;
        console.warn("⚠️ Supabase schema probe exception:", e?.message || e);
        return false;
    }
}

async function syncTodayToSupabase() {
    const sb = getSupabaseForSync();
    if (!sb) return false;

    const ok = await checkSupabaseSchemaAccess();
    if (!ok) return false;

    try {
        const key = todayKey();
        const from = startOfDayIso(key);
        const to = nextDayIso(key);

        const localRow = db.prepare(`
            SELECT id, created_at
            FROM "active_users"
            WHERE created_at >= ? AND created_at < ?
            ORDER BY created_at ASC
            LIMIT 1
        `).get(from, to);

        if (!localRow?.id) return true;

        const localValues = db.prepare(`
            SELECT "property", "value"
            FROM "active_users_values"
            WHERE "active_id" = ?
        `).all(localRow.id);

        // Ensure remote day row exists and get its id
        const remoteExisting = await sb
            .from(SB_TABLE_ACTIVE_USERS)
            .select("id, created_at")
            .gte("created_at", from)
            .lt("created_at", to)
            .order("created_at", { ascending: true })
            .limit(1);

        if (remoteExisting?.error) {
            console.warn(`⚠️ Supabase ${SB_TABLE_ACTIVE_USERS} select failed:`, remoteExisting.error?.message || remoteExisting.error);
            return false;
        }

        let remoteActiveId = remoteExisting.data?.[0]?.id;

        if (!remoteActiveId) {
            const ins = await sb
                .from(SB_TABLE_ACTIVE_USERS)
                .insert({ created_at: localRow.created_at })
                .select("id")
                .single();

            if (ins?.error) {
                console.warn(`⚠️ Supabase ${SB_TABLE_ACTIVE_USERS} insert failed:`, ins.error?.message || ins.error);
                return false;
            }
            remoteActiveId = ins.data?.id;
        }

        if (!remoteActiveId) return false;

        // Upsert properties into active_users_values.
        // The "property" column is bigint (FK to active_users_properties.id),
        // so we resolve the property name to its id first.
        for (const v of localValues) {
            const propertyId = await resolvePropertyId(sb, v.property);
            if (!propertyId) continue;

            const existing = await sb
                .from(SB_TABLE_ACTIVE_USERS_VALUES)
                .select("id")
                .eq("active_id", remoteActiveId)
                .eq("property", propertyId)
                .limit(1);

            if (existing?.error) {
                console.warn(`⚠️ Supabase ${SB_TABLE_ACTIVE_USERS_VALUES} select failed:`, existing.error?.message || existing.error, v.property);
                continue;
            }

            const existingId = existing.data?.[0]?.id;

            if (existingId) {
                const upd = await sb
                    .from(SB_TABLE_ACTIVE_USERS_VALUES)
                    .update({ value: v.value })
                    .eq("id", existingId);

                if (upd?.error) {
                    console.warn(`⚠️ Supabase ${SB_TABLE_ACTIVE_USERS_VALUES} update failed:`, upd.error?.message || upd.error, v.property);
                }
            } else {
                const ins2 = await sb
                    .from(SB_TABLE_ACTIVE_USERS_VALUES)
                    .insert({ active_id: remoteActiveId, property: propertyId, value: v.value });

                if (ins2?.error) {
                    console.warn(`⚠️ Supabase ${SB_TABLE_ACTIVE_USERS_VALUES} insert failed:`, ins2.error?.message || ins2.error, v.property);
                }
            }
        }

        console.log("✅ ActiveUsers synced to Supabase on shutdown", { day: key });
        return true;
    } catch (e) {
        console.warn("⚠️ Supabase sync exception:", e?.message || e);
        return false;
    }
}



const activeSessions = new Map();
const leaveTimers = new Map();
// Per-user daily session aggregates (for person_longest_time)
// userId -> { username, firstSeen, lastSeen, totalMs }
const userDailyTotals = new Map();
let firstPersonIdToday = null;
const dayStartedAt = Date.now();



const todaySeenUserIds = new Set();
let todayRequestCount = 0;
let todayInserted = false;
let todayInsertedKey = null;
let todayActiveId = null;
let currentDayKey = null;
let todayMaxOnline = null;
let todayMinOnline = null;
let todayOnlineSum = 0;
let todayOnlineSamples = 0;
let todayDayStartedAt = Date.now();

function pad2(n) {
    return String(n).padStart(2, "0");
}

function todayKey() {
    // Local date key (YYYY-MM-DD) so "today" matches the server's locale day.
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDayIso(dateKey) {
    const [y, m, d] = String(dateKey).split("-").map(x => Number(x));
    const dt = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
    return dt.toISOString();
}

function nextDayIso(dateKey) {
    const [y, m, d] = String(dateKey).split("-").map(x => Number(x));
    const dt = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
    dt.setDate(dt.getDate() + 1);
    return dt.toISOString();
}

async function ensureTodayRow() {
    const key = todayKey();
    if (todayInserted && todayInsertedKey === key) return;

    todayInserted = true;
    todayInsertedKey = key;
    todayActiveId = null;

    try {
        // SQLite: Ensure 1 row/day by using created_at within local-day bounds.
        const from = startOfDayIso(key);
        const to = nextDayIso(key);

        const existing = db.prepare(`
            SELECT id, created_at
            FROM "active_users"
            WHERE created_at >= ? AND created_at < ?
            ORDER BY created_at ASC
            LIMIT 1
        `).get(from, to);

        if (existing?.id) {
            todayActiveId = existing.id;
            return;
        }

        const ins = db.prepare(`INSERT INTO "active_users"(created_at) VALUES (?)`).run(new Date().toISOString());
        todayActiveId = Number(ins.lastInsertRowid);
    } catch (e) {
        console.warn("⚠️ active_users insert/select failed:", e?.message || e);
    }
}

async function persistTodaySnapshot() {
    await ensureTodayRow();
    if (!todayActiveId) return;

    // update daily online stats (max/min/avg) based on current online count
    const nowOnline = getActiveCount();
    todayOnlineSamples++;
    todayOnlineSum += nowOnline;
    todayMaxOnline = todayMaxOnline === null ? nowOnline : Math.max(todayMaxOnline, nowOnline);
    todayMinOnline = todayMinOnline === null ? nowOnline : Math.min(todayMinOnline, nowOnline);
    const avgOnline = todayOnlineSamples ? (todayOnlineSum / todayOnlineSamples) : 0;

    const userDetails = [];
    todaySeenUserIds.forEach(id => {
        const session = activeSessions.get(id);
        userDetails.push({
            id,
            username: session?.username || `User#${id}`
        });
    });

    // Compute extended metrics (server_life_time, first_person_id, person_longest_time, person_id, person_name)
    const serverLifeTimeSec = Math.max(0, Math.round((Date.now() - todayDayStartedAt) / 1000));

    let longestUserId = null;
    let longestUsername = null;
    let longestMs = 0;
    for (const [uid, t] of userDailyTotals.entries()) {
        if ((t?.totalMs || 0) > longestMs) {
            longestMs = t.totalMs;
            longestUserId = uid;
            longestUsername = t.username || `User#${uid}`;
        }
    }
    const personLongestTimeSec = Math.round(longestMs / 1000);

    const rows = [
        { active_id: todayActiveId, property: "unique", value: String(todaySeenUserIds.size) },
        { active_id: todayActiveId, property: "total_requests", value: String(todayRequestCount) },
        { active_id: todayActiveId, property: "users", value: JSON.stringify(userDetails) },
        { active_id: todayActiveId, property: "max_count", value: String(todayMaxOnline ?? 0) },
        { active_id: todayActiveId, property: "min_count", value: String(todayMinOnline ?? 0) },
        { active_id: todayActiveId, property: "avg_count", value: String(Math.round(avgOnline * 100) / 100) },
        { active_id: todayActiveId, property: "server_life_time", value: String(serverLifeTimeSec) },
        { active_id: todayActiveId, property: "first_person_id", value: firstPersonIdToday !== null ? String(firstPersonIdToday) : "" },
        { active_id: todayActiveId, property: "person_longest_time", value: String(personLongestTimeSec) },
        { active_id: todayActiveId, property: "person_id", value: longestUserId !== null ? String(longestUserId) : "" },
        { active_id: todayActiveId, property: "person_name", value: longestUsername || "" },
        { active_id: todayActiveId, property: "now_time", value: new Date().toISOString() }
    ];

    try {
        for (const r of rows) {
            db.prepare(`
                INSERT INTO "active_users_values"("active_id", "property", "value")
                VALUES (?, ?, ?)
                ON CONFLICT("active_id", "property")
                DO UPDATE SET "value" = excluded."value"
            `).run(r.active_id, r.property, r.value);
        }
        const now = Date.now();
        if (now - persistOkLoggedAt > 60_000) {
            persistOkLoggedAt = now;
            console.log("✅ ActiveUsers snapshot persisted", { day: todayInsertedKey || todayKey(), active_id: todayActiveId });
        }
    } catch (e) {
        console.warn("⚠️ active_users_values upsert failed:", e?.message || e);
    }
}


let saveTimer = null;
function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        void persistTodaySnapshot();
    }, 2000);
}

function ensureDayState() {
    const key = todayKey();
    if (currentDayKey === null) currentDayKey = key;

    if (key !== currentDayKey) {
        // day rollover: reset counters and ids for the new day
        currentDayKey = key;
        todaySeenUserIds.clear();
        todayRequestCount = 0;
        todayInserted = false;
        todayInsertedKey = null;
        todayActiveId = null;
        todayMaxOnline = null;
        todayMinOnline = null;
        todayOnlineSum = 0;
        todayOnlineSamples = 0;
        userDailyTotals.clear();
        firstPersonIdToday = null;
        todayDayStartedAt = Date.now();
    }
}

// Flush + sync on shutdown
let shuttingDown = false;
async function gracefulShutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    try {
        ensureDayState();
        await persistTodaySnapshot();

        // best-effort: try to sync today's row to Supabase
        await Promise.race([
            syncTodayToSupabase(),
            new Promise(resolve => setTimeout(resolve, 2500))
        ]);
    } catch { }

    process.exit(0);
}

process.once("SIGINT", () => void gracefulShutdown("SIGINT"));
process.once("SIGTERM", () => void gracefulShutdown("SIGTERM"));


function trackMiddleware(req, _res, next) {
    try {
        ensureDayState();
        const token = req.cookies?.auth_token;
        if (token && JWT_SECRET) {
            const decoded = jwt.verify(token, JWT_SECRET);
            const userId = Number(decoded.id);
            const username = decoded.username || `User#${userId}`;

            const now = Date.now();
            const prev = activeSessions.get(userId);
            const wasOnline = !!prev && (now - prev.lastSeen < ACTIVE_WINDOW_MS);

            activeSessions.set(userId, {
                lastSeen: now,
                username
            });

            // Update per-user daily totals (for person_longest_time)
            const t = userDailyTotals.get(userId) || { username, firstSeen: now, lastSeen: now, totalMs: 0 };
            t.username = username;
            if (!wasOnline) {
                // Restart "online window" - count any previous segment first
                if (t.lastSeen && t.firstSeen && t.lastSeen >= t.firstSeen) {
                    t.totalMs += Math.max(0, t.lastSeen - t.firstSeen);
                }
                t.firstSeen = now;
            }
            t.lastSeen = now;
            userDailyTotals.set(userId, t);

            // First person of the day
            if (firstPersonIdToday === null) {
                firstPersonIdToday = userId;
            }

            // fire-and-forget: one row/day is enough for calendar activity
            // (do not await to avoid slowing down requests)
            void ensureTodayRow();

            todaySeenUserIds.add(userId);
            todayRequestCount++;
            scheduleSave();

            // If the user just came online (enter), push a snapshot immediately
            // and sync to Supabase right away (don't wait for the 5-minute interval).
            if (!wasOnline) {
                (async () => {
                    try {
                        await persistTodaySnapshot();
                        await syncTodayToSupabase();
                    } catch { }
                })();
            }

            // Schedule a "leave" snapshot when their online window expires.
            const prevTimer = leaveTimers.get(userId);
            if (prevTimer) clearTimeout(prevTimer);

            const timer = setTimeout(() => {
                (async () => {
                    try {
                        const s = activeSessions.get(userId);
                        if (!s) return;
                        if (Date.now() - s.lastSeen >= ACTIVE_WINDOW_MS) {
                            await persistTodaySnapshot();
                            await syncTodayToSupabase();
                        }
                    } catch { }
                })();
            }, ACTIVE_WINDOW_MS + 250);

            leaveTimers.set(userId, timer);
        }
    } catch {  }
    next();
}


function getActiveUsers() {
    const now = Date.now();
    const online = [];

    for (const [userId, session] of activeSessions) {
        if (now - session.lastSeen < ACTIVE_WINDOW_MS) {
            online.push({
                id: userId,
                username: session.username,
                lastSeen: new Date(session.lastSeen).toISOString()
            });
        }
    }

    return online;
}

function getActiveCount() {
    const now = Date.now();
    let count = 0;
    for (const session of activeSessions.values()) {
        if (now - session.lastSeen < ACTIVE_WINDOW_MS) count++;
    }
    return count;
}

async function getDailyHistory({ days = 90 } = {}) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    try {
        const daysRows = db.prepare(`
            SELECT id, created_at
            FROM "active_users"
            WHERE created_at >= ?
            ORDER BY created_at ASC
            LIMIT 500
        `).all(since);

        const mapped = daysRows.map(row => {
            const date = String(row.created_at || "").slice(0, 10);
            const values = db.prepare(`
                SELECT "property", "value"
                FROM "active_users_values"
                WHERE "active_id" = ?
            `).all(row.id);

            const get = (p) => values.find(v => v?.property === p)?.value;
            const unique = Number(get("unique") || 0) || 0;
            const total_requests = Number(get("total_requests") || 0) || 0;
            const max_count = Number(get("max_count") || 0) || 0;
            const min_count = Number(get("min_count") || 0) || 0;
            const avg_count = Number(get("avg_count") || 0) || 0;
            let users = [];
            try {
                const raw = get("users");
                if (raw) users = JSON.parse(raw);
            } catch { }

            return { date, unique, total_requests, max_count, min_count, avg_count, users };
        }).filter(x => x.date);

        // If there are multiple rows/day, keep the last one
        const byDate = new Map();
        for (const row of mapped) byDate.set(row.date, row);
        return Array.from(byDate.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-days)
            .map(([, v]) => v);
    } catch {
        return [];
    }
}

async function getActivityDays({ days = 90 } = {}) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    try {
        const set = new Set();
        const rows = db.prepare(`
            SELECT created_at
            FROM "active_users"
            WHERE created_at >= ?
            ORDER BY created_at DESC
            LIMIT 2000
        `).all(since);

        for (const row of rows) {
            const d = String(row.created_at || "").slice(0, 10);
            if (d) set.add(d);
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    } catch {
        return [];
    }
}

async function getDayDetails(dateKey) {
    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

    try {
        const from = startOfDayIso(dateKey);
        const to = nextDayIso(dateKey);

        const row = db.prepare(`
            SELECT id, created_at
            FROM "active_users"
            WHERE created_at >= ? AND created_at < ?
            ORDER BY created_at DESC
            LIMIT 1
        `).get(from, to);

        if (!row?.id) return { date: dateKey, unique: 0, total_requests: 0, max_count: 0, min_count: 0, avg_count: 0, users: [] };

        const values = db.prepare(`
            SELECT "property", "value"
            FROM "active_users_values"
            WHERE "active_id" = ?
        `).all(row.id);

        const get = (p) => values.find(v => v?.property === p)?.value;

        const unique = Number(get("unique") || 0) || 0;
        const total_requests = Number(get("total_requests") || 0) || 0;
        const max_count = Number(get("max_count") || 0) || 0;
        const min_count = Number(get("min_count") || 0) || 0;
        const avg_count = Number(get("avg_count") || 0) || 0;
        let users = [];
        try {
            const raw = get("users");
            if (raw) users = JSON.parse(raw);
        } catch { }

        return { date: dateKey, unique, total_requests, max_count, min_count, avg_count, users };
    } catch {
        return null;
    }
}

// Note: We persist on "enter/leave" events (see trackMiddleware) and via debounced saves.

// Also persist periodically so the DB is refreshed even without state changes.
// This makes the system robust if "leave" timers don't fire (server restarts, etc.).
let intervalStarted = false;
function startPeriodicPersist() {
    if (intervalStarted) return;
    intervalStarted = true;

    // small delay after boot
    setTimeout(async () => {
        try {
            ensureDayState();
            await persistTodaySnapshot();
            await syncTodayToSupabase();
        } catch { }
    }, 10_000);

    setInterval(async () => {
        try {
            ensureDayState();
            await persistTodaySnapshot();
            await syncTodayToSupabase();
        } catch { }
    }, 5 * 60 * 1000);
}

startPeriodicPersist();

module.exports = { trackMiddleware, getActiveUsers, getActiveCount, getDailyHistory, getActivityDays, getDayDetails };
