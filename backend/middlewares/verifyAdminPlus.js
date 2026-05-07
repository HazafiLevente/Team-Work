const verifyUser = require("./verifyUser");
const { hasAdminPlusAccess } = require("../services/control");

module.exports = (req, res, next) => {
    verifyUser(req, res, () => {
        if (!hasAdminPlusAccess(req.user.role)) {
            return res.status(403).json({ error: "Admin+ only" });
        }
        next();
    });
};

