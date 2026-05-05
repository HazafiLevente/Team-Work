const jwt = require("jsonwebtoken");
const { resolveRole } = require("../services/control");

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function optionalUser(req, _res, next) {
    const token = req.cookies?.auth_token;
    if (!token) return next();

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        let role = "user";

        try {
            role = resolveRole(Number(decoded.id));
        } catch {
            role = decoded.role || "user";
        }

        req.user = {
            id: Number(decoded.id),
            username: decoded.username,
            email: decoded.email,
            role
        };
    } catch {
        req.user = null;
    }

    next();
};
