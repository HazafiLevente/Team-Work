const { supabase } = require("./supabase");
const local = require("./localDb");

// gyors timeout wrapper (ne lógjon a request)
function withTimeout(promise, ms = 2500) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("SUPABASE_TIMEOUT")), ms))
    ]);
}

/**
 * Generic fallback select:
 * - primary: Supabase table/view
 * - fallback: SQLite cache table
 */
async function selectWithFallback({
                                      supabaseName,
                                      sqliteName,
                                      select = "*",
                                      orderBy = null,
                                      ascending = false,
                                      limit = 2000
                                  }) {
    // 1) try Supabase
    try {
        let q = supabase.from(supabaseName).select(select);

        if (orderBy) q = q.order(orderBy, { ascending });
        if (limit) q = q.limit(limit);

        const { data, error } = await withTimeout(q);

        if (error) throw error;
        if (!data) return [];

        return data;
    } catch (e) {
        // 2) fallback to SQLite
        const name = sqliteName || supabaseName;
        return local.selectAll(name, limit);
    }
}

module.exports = {
    selectWithFallback
};
