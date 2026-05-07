const router = require("express").Router();
const verifyAdmin = require("../../middlewares/verifyAdmin");
const { supabase } = require("../../services/supabase");
const { resolveRole, updateUserEnvRole, isBanned, updateUserBanStatus } = require("../../services/control");

function rank(role) {
    const map = { user: 0, admin: 1, "admin+": 2, owner: 3 };
    return map[String(role || "")] ?? 0;
}

router.get("/users", verifyAdmin, async (req, res) => {
    const { data: users, error: userError } = await supabase
        .from("user[Auth]")
        .select("ID, UserName, Email, created_at");

    if (userError) {
        console.error(userError);
        return res.status(500).json({ error: userError.message });
    }

    const { data: more, error: moreError } = await supabase
        .from("user_more[Auth]")
        .select("user_id, city, age, phone_number");

    if (moreError) {
        console.error(moreError);
        return res.status(500).json({ error: moreError.message });
    }

    const usersWithMore = users.map(u => {
        const extra = more.find(m => m.user_id === u.ID);

        return {
            id: u.ID,
            username: u.UserName,
            email: u.Email,
            created_at: u.created_at,
            role: resolveRole(u.ID),
            banned: isBanned(u.ID),
            city: extra?.city ?? "",
            age: extra?.age ?? null,
            phone: extra?.phone_number ?? ""
        };
    });

    res.json({ users: usersWithMore });
});

router.patch("/users/:id", verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { username, city, age, phone, role } = req.body;

    try {
        const numId = Number(id);

        const { error: authError } = await supabase
            .from("user[Auth]")
            .update({ UserName: username })
            .eq("ID", numId);

        if (authError) {
            console.error("âťŚ Step 1 (user[Auth]) failed:", authError);
            throw authError;
        }

        if (role) {
            const granter = String(req.user?.role || "user");
            const targetCurrent = resolveRole(numId);
            const desired = String(role);

            // Can only modify users below you, and only assign up to your own rank
            if (rank(granter) <= rank(targetCurrent) || rank(desired) > rank(granter)) {
                return res.status(403).json({ error: "Insufficient role to assign this rank" });
            }

            try {
                updateUserEnvRole(numId, desired);
            } catch (envErr) {
                console.error("âťŚ Step 2 (.env role) failed:", envErr);
            }
        }

        const { data: existingMore, error: findError } = await supabase
            .from("user_more[Auth]")
            .select("id")
            .eq("user_id", numId)
            .maybeSingle();

        if (findError) {
            console.error("âťŚ Step 3 (find user_more) failed:", findError);
            throw findError;
        }

        if (existingMore) {
            const { error: moreError } = await supabase
                .from("user_more[Auth]")
                .update({
                    city: city,
                    age: age,
                    phone_number: phone
                })
                .eq("user_id", numId);
            if (moreError) {
                console.error("âťŚ Step 3 (update user_more) failed:", moreError);
                throw moreError;
            }
        } else {
            const { error: moreError } = await supabase
                .from("user_more[Auth]")
                .insert({
                    user_id: numId,
                    city: city,
                    age: age,
                    phone_number: phone
                });
            if (moreError) {
                console.error("âťŚ Step 3 (insert user_more) failed:", moreError);
                throw moreError;
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error("đź’Ą CRITICAL: Admin user update fatal error:", err);
        res.status(500).json({ error: err.message || "Internal Server Error" });
    }
});

router.post("/users/:id/ban", verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const adminRole = resolveRole(req.user.id);

    if (adminRole !== "admin+" && adminRole !== "owner") {
        return res.status(403).json({ error: "Only Admin+ or Owner can ban users." });
    }

    try {
        updateUserBanStatus(id, true);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/users/:id/unban", verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const adminRole = resolveRole(req.user.id);

    if (adminRole !== "admin+" && adminRole !== "owner") {
        return res.status(403).json({ error: "Only Admin+ or Owner can unban users." });
    }

    try {
        updateUserBanStatus(id, false);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/users/:id/setups", verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const { data: setups, error: setupsError } = await supabase
            .from("setup_room")
            .select("*")
            .eq("user_id", id);

        if (setupsError) throw setupsError;

        const result = [];
        for (const s of (setups || [])) {
            const { data: roomSetups } = await supabase
                .from("setups")
                .select("id")
                .eq("room_id", s.id);

            const setupIds = (roomSetups || []).map((row) => row.id);
            let totalPrice = 0;

            if (setupIds.length > 0) {
                const { data: setupDevices } = await supabase
                    .from("setup_devices")
                    .select("device_id")
                    .in("setup_id", setupIds);

                const productIds = Array.from(new Set((setupDevices || []).map((row) => Number(row.device_id)).filter(Number.isFinite)));

                if (productIds.length > 0) {
                    const valueRows = await Promise.all(productIds.map(async (productId) => {
                        const { data } = await supabase
                            .from("values")
                            .select("value, properties_id")
                            .eq("products_id", productId);
                        return data || [];
                    }));

                    const { data: props } = await supabase.from("properties").select("id, property");
                    const pricePropIds = new Set((props || []).filter((p) => String(p.property).toLowerCase() === "price").map((p) => Number(p.id)));

                    totalPrice = valueRows.flat().reduce((sum, row) => {
                        if (!pricePropIds.has(Number(row.properties_id))) return sum;
                        return sum + Number(row.value || 0);
                    }, 0);
                }
            }

            result.push({
                ...s,
                setup_name: s.setup_name ?? s.name ?? "NĂ©vtelen setup",
                x: s?.pos_x ?? 0,
                y: s?.pos_y ?? 0,
                total_price: totalPrice
            });
        }

        res.json({ setups: result });
    } catch (err) {
        console.error("âťŚ Admin user setups error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
