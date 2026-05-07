const verifyUser = require("./verifyUser");
const { hasAdminAccess } = require("../services/control");

module.exports = (req, res, next) => {
    verifyUser(req, res, () => {
        if (!hasAdminAccess(req.user.role)) {
            return res.status(403).json({ error: "Admin only" });
        }
        next();
    });
};
