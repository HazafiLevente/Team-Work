const jwt = require("jsonwebtoken");
const { resolveRole } = require("../services/control");
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function verifyUser(req, res, next) {
    console.log("🍪 COOKIES:", req.cookies);

    const token = req.cookies.auth_token;
    if (!token) {
        console.log("❌ NINCS auth_token");
        return res.status(401).json({ error: "Not logged in" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        let role = "user";
        try { role = resolveRole(Number(decoded.id)); } catch {}

        req.user = {
            id: Number(decoded.id),
            username: decoded.username,
            email: decoded.email,
            role
        };

        next();
    } catch (e) {
        console.log("❌ TOKEN HIBA", e.message);
        return res.status(403).json({ error: "Invalid token" });
    }
};
