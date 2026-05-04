const { supabase } = require("./supabase");

const LEVEL_COUNTER_TABLE = "level_counter[Level]";
const USER_LEVEL_TABLE = "user_level[Level]";
const LEVEL_RANKS_TABLE = "level_ranks[Level]";

async function getCounter(type) {
    const { data, error } = await supabase
        .from(LEVEL_COUNTER_TABLE)
        .select("type, points, isPositive")
        .eq("type", type)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const basePoints = Number(data.points || 0);
    const direction = data.isPositive === false ? -1 : 1;

    return {
        type: data.type,
        points: basePoints * direction
    };
}

async function getUserLevel(userId) {
    const { data, error } = await supabase
        .from(USER_LEVEL_TABLE)
        .select("user_id, level, points")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) throw error;

    return {
        exists: !!data,
        level: Number(data?.level ?? 1),
        points: Number(data?.points ?? 0)
    };
}

async function resolveLevel(points) {
    const { data, error } = await supabase
        .from(LEVEL_RANKS_TABLE)
        .select("level, min_point, max_point")
        .order("level", { ascending: true });

    if (error) throw error;

    const ranks = data || [];
    if (!ranks.length) return 1;

    const matching = ranks
        .filter((rank) => points >= Number(rank.min_point || 0))
        .sort((a, b) => Number(b.level || 0) - Number(a.level || 0))[0];

    return Number(matching?.level ?? ranks[0]?.level ?? 1);
}

async function setUserLevel(userId, points, level, exists) {
    if (exists) {
        const { error } = await supabase
            .from(USER_LEVEL_TABLE)
            .update({ points, level })
            .eq("user_id", userId);

        if (error) throw error;
        return;
    }

    const { error } = await supabase
        .from(USER_LEVEL_TABLE)
        .insert({ user_id: userId, points, level });

    if (error) throw error;
}

async function awardRankPoints(userId, type) {
    const numericUserId = Number(userId);
    if (!numericUserId || !type) {
        return null;
    }

    const counter = await getCounter(type);
    if (!counter) {
        return null;
    }

    const current = await getUserLevel(numericUserId);
    const nextPoints = Math.max(0, current.points + counter.points);
    const nextLevel = await resolveLevel(nextPoints);

    await setUserLevel(numericUserId, nextPoints, nextLevel, current.exists);

    return {
        userId: numericUserId,
        type,
        delta: counter.points,
        points: nextPoints,
        level: nextLevel
    };
}

async function awardRankPointsSafe(userId, type) {
    try {
        return await awardRankPoints(userId, type);
    } catch (error) {
        console.error("[RANK] award failed:", {
            userId,
            type,
            error: error?.message || error
        });
        return null;
    }
}

module.exports = {
    awardRankPoints,
    awardRankPointsSafe
};
