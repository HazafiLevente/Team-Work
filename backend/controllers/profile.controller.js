const { changeUserPassword } = require("../services/profile/password.service");
const { getOrCreateUserDetails, getUserProfile, updateUserProfile, upsertUserDetails } = require("../services/profile/profile.service");
const { calculateUserSetupPrice } = require("../services/profile/setupPrice.service");

async function getProfile(req, res) {
    const userId = req.user.id;

    try {
        const [user, details, totalSetupPrice] = await Promise.all([
            getUserProfile(userId),
            getOrCreateUserDetails(userId),
            calculateUserSetupPrice(userId).catch((err) => {
                console.error("Hiba a profil Ă¶sszĂ©rtĂ©k szĂˇmĂ­tĂˇsĂˇban:", err);
                return 0;
            })
        ]);

        res.json({
            username: user.UserName,
            fullname: user.Name,
            email: user.Email,
            age: details?.age ?? null,
            phone: details?.phone_number ?? null,
            city: details?.city ?? null,
            totalSetupPrice
        });
    } catch (err) {
        res.status(500).json({ error: err.message || "Internal Server Error" });
    }
}

async function updateProfile(req, res) {
    try {
        const userId = req.user.id;

        await updateUserProfile(userId, req.body);
        await upsertUserDetails(userId, req.body);

        res.json({ success: true });
    } catch (err) {
        console.error("updateProfile ERROR:", err);
        res.status(500).json({ error: err.message || "Internal Server Error" });
    }
}

async function changePassword(req, res) {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        await changeUserPassword(userId, oldPassword, newPassword);
        res.json({ success: true });
    } catch (err) {
        console.error("changePassword ERROR:", err);
        res.status(err.statusCode || 500).json({ error: err.message || "Internal Server Error" });
    }
}

module.exports = {
    changePassword,
    getProfile,
    updateProfile
};
