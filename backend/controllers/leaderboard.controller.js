const { supabase } = require("../services/supabase");

console.log("✅ NEW leaderboard.controller.js loaded");

exports.listLeaderboard = async (req, res) => {
    try {
        console.log("✅ listLeaderboard called");

        // 1) user pontok + szint
        const { data: levelData, error: levelError } = await supabase
            .from("user_level[Level]")
            .select("user_id, level, points")
            .order("points", { ascending: false });

        if (levelError) {
            console.error("USER_LEVEL ERROR:", levelError);
            return res.status(500).json(levelError);
        }

        // 2) szint határok
        const { data: rankData, error: rankError } = await supabase
            .from("level_ranks[Level]")
            .select("level, min_point, max_point")
            .order("level", { ascending: true });

        if (rankError) {
            console.error("LEVEL_RANKS ERROR:", rankError);
            return res.status(500).json(rankError);
        }

        // 3) user adatok
        const { data: usersData, error: usersError } = await supabase
            .from("user[Auth]")
            .select('ID, Name, UserName, Email');

        if (usersError) {
            console.error("USERS ERROR:", usersError);
            return res.status(500).json(usersError);
        }

        const usersMap = new Map();
        for (const user of usersData || []) {
            usersMap.set(Number(user.ID), user);
        }

        const ranksMap = new Map();
        for (const rank of rankData || []) {
            ranksMap.set(Number(rank.level), rank);
        }

        const result = (levelData || [])
            .map((item) => {
                const userId = Number(item.user_id);
                const currentLevel = Number(item.level || 0);
                const points = Number(item.points || 0);

                const user = usersMap.get(userId);
                const currentRankRow = ranksMap.get(currentLevel);
                const nextRankRow = ranksMap.get(currentLevel + 1);

                return {
                    id: userId,
                    user_id: userId,
                    username: user?.UserName || "",
                    fullname: user?.Name || "",
                    email: user?.Email || "",

                    points,
                    rank: `Level ${currentLevel}`,
                    nextRank: nextRankRow ? `Level ${nextRankRow.level}` : "Max",

                    pointsToNextRank: nextRankRow
                        ? Math.max(0, Number(nextRankRow.min_point) - points)
                        : 0,

                    // ⭐ EZEK HIÁNYOZNAK MOST A FRONTENDNEK
                    currentLevelNumber: currentLevel,

                    currentMinPoints: currentRankRow
                        ? Number(currentRankRow.min_point)
                        : 0,

                    currentMaxPoints: nextRankRow
                        ? Number(nextRankRow.min_point)
                        : (currentRankRow ? Number(currentRankRow.max_point) : points),

                    nextLevelNumber: nextRankRow
                        ? Number(nextRankRow.level)
                        : null
                };
            })
            .sort((a, b) => b.points - a.points);

        return res.json(result);

    } catch (err) {
        console.error("LEADERBOARD CRASH:", err);
        return res.status(500).json({ error: "Leaderboard failed" });
    }
};