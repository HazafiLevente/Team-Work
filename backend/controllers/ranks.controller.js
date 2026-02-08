const { supabase } = require("../services/supabase");

exports.me = async (req, res) => {
    console.log("👉 /api/ranks/me user =", req.user);

    if (!req.user) {
        return res.status(401).json({ error: "Not logged in" });
    }

    const userId = req.user.id;

    try {
        const { data: ul, error: ulErr } = await supabase
            .from('user_level[level]')
            .select('level, points')
            .eq('user_id', userId)
            .maybeSingle();

        console.log("UL:", ul, ulErr);

        if (ulErr) return res.status(500).json({ step: "user_level", error: ulErr.message });

        const level = ul?.level ?? 1;
        const points = ul?.points ?? 0;

        const { data: lc, error: lcErr } = await supabase
            .from('level_counter[level]')
            .select('min_point, max_point')
            .eq('level', level)
            .maybeSingle();

        console.log("LC:", lc, lcErr);

        if (lcErr || !lc) {
            return res.status(500).json({ step: "level_counter", error: lcErr?.message ?? "missing row" });
        }

        const min = lc.min_point;
        const max = lc.max_point;
        const progress = (points - min) / (max - min);

        res.json({
            level,
            points,
            current: { min, max },
            progress: Math.max(0, Math.min(1, progress)),
            next: {
                level: level < 10 ? level + 1 : 10,
                pointsNeeded: Math.max(0, max - points)
            }
        });

    } catch (e) {
        console.error("RANK ERROR:", e);
        res.status(500).json({ error: String(e.message ?? e) });
    }
};
