const { supabase } = require("../services/supabase");

exports.me = async (req, res) => {
    try {
        const userId = req.user.id;

        // points
        const { data: ptsRow, error: ptsErr } = await supabase
            .from("user_level_points")
            .select("points")
            .eq("user_id", userId)
            .single();

        const points = ptsRow?.points ?? 0;

        // level
        const { data: lvlRow, error: lvlErr } = await supabase
            .from("user_level")
            .select("level")
            .eq("user_id", userId)
            .single();

        const level = lvlRow?.level ?? 1;

        // thresholds
        const { data: lcRow, error: lcErr } = await supabase
            .from("level_counter")
            .select("level, min_point, max_point")
            .eq("level", level)
            .single();

        if (lcErr) return res.status(500).json({ error: lcErr.message });

        const min = lcRow.min_point ?? 0;
        const max = lcRow.max_point ?? (min + 1);

        const progress = max > min ? Math.max(0, Math.min(1, (points - min) / (max - min))) : 0;

        res.json({
            level,
            points,
            current: { min, max },
            progress,
            next: { level: level < 10 ? level + 1 : 10, pointsNeeded: level < 10 ? Math.max(0, max - points) : 0 }
        });
    } catch (e) {
        res.status(500).json({ error: String(e?.message ?? e) });
    }
};
