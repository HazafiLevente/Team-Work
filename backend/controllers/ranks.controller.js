const { supabase } = require("../services/supabase");

exports.me = async (req, res) => {
    try {
        const userId = Number(req.user?.id);
        if (!userId) return res.status(401).json({ error: "Not logged in" });


        const { data: ul, error: ulErr } = await supabase
            .from('user_level[Level]')
            .select('level, points')
            .eq('user_id', userId)
            .maybeSingle();

        if (ulErr) return res.status(500).json({ error: ulErr.message });

        const level = Number(ul?.level ?? 1);
        const points = Number(ul?.points ?? 0);


        const { data: thr, error: thrErr } = await supabase
            .from('level_ranks[Level]')
            .select('min_point, max_point, level')
            .eq('level', level)
            .maybeSingle();

        if (thrErr) return res.status(500).json({ error: thrErr.message });

        const min = Number(thr?.min_point ?? 0);
        const max = Number(thr?.max_point ?? (min + 1));

        const progress = max > min ? Math.max(0, Math.min(1, (points - min) / (max - min))) : 0;

        res.json({
            level,
            points,
            current: { min, max },
            progress,
            next: {
                level: level < 10 ? level + 1 : 10,
                pointsNeeded: level < 10 ? Math.max(0, max - points) : 0
            }
        });
    } catch (e) {
        res.status(500).json({ error: String(e?.message ?? e) });
    }
};
