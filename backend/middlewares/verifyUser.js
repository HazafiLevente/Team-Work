const jwt = require("jsonwebtoken");
const { resolveRole } = require("../services/control");
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function verifyUser(req, res, next) {
    const token = req.cookies.auth_token;
    if (!token) {
        return res.status(401).json({ error: "Not logged in" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        let role = "user";
        try { role = resolveRole(Number(decoded.id)); } catch { }

        req.user = {
            id: Number(decoded.id),
            username: decoded.username,
            fullname: decoded.fullname,
            email: decoded.email,
            role
        };

        next();
    } catch {
        return res.status(403).json({ error: "Invalid token" });
    }
};
