const verifyUser = require("./verifyUser");

module.exports = (req, res, next) => {
    verifyUser(req, res, () => {
        if (req.user?.role !== "owner") {
            return res.status(403).json({ error: "Owner only" });
        }
        next();
    });
};

