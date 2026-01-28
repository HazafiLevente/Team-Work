const jwt = require("jsonwebtoken");
const { resolveRole, ROLES } = require("../services/control");

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function verifyUser(req, res, next) {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: "Not logged in" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const id = Number(decoded.id);

        req.user = {
            id,
            name: decoded.name,
            username: decoded.username,
            email: decoded.email,
            role: resolveRole(id)
        };

        next();
    } catch {
        res.status(403).json({ error: "Invalid token" });
    }
};
