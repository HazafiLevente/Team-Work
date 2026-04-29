const router = require("express").Router();
const { supabase } = require("../services/supabase");
const verifyUser = require("../middlewares/verifyUser");

router.get("/", verifyUser, async (req, res) => {

    const currentUserId = Number(req.user.id);

    const { data, error } = await supabase
        .from("user[Auth]")
        .select("ID, UserName")
        .neq("ID", currentUserId);

    if (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }

    const users = data.map(u => ({
        id: u.ID,
        username: u.UserName
    }));

    res.json(users);
});

module.exports = router;
