// 📋 Logger MUST be first – intercepts all console output
require("./services/logger");

const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const path = require("path");


const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: true,
        credentials: true,
    })
);

// 👥 Active user tracking
const { trackMiddleware } = require("./services/activeUsers");
app.use(trackMiddleware);

/* ----------------------------------
STATIC IMAGES
Team-Work/datas/images -> /images
---------------------------------- */
const ROOT = path.resolve(__dirname, "..");
const IMAGES_DIR = path.join(ROOT, "datas", "images");
const leaderboardRoutes = require("./routes/leaderboard.routes");

console.log("🖼 Serving images from:", IMAGES_DIR);
app.use("/images", express.static(IMAGES_DIR));

app.use((req, res, next) => {
    if (req.url.startsWith("/api/ranks")) {
        console.log("🔥 HIT", req.method, req.url);
    }
    next();
});

/* ----------------------------------
API ROUTES
---------------------------------- */

// Alap kategóriák
app.use("/api/computers", require("./routes/computers.routes"));
app.use("/api/cars", require("./routes/cars.routes"));
app.use("/api/home-theater", require("./routes/hometheaters.routes"));
app.use("/api/instruments", require("./routes/instruments.routes"));


// Rendszer és felhasználó
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/products", require("./routes/products.routes"));
app.use("/api/items", require("./routes/items.routes"));
app.use("/api/setup", require("./routes/setup.routes"));
app.use("/api/ranks", require("./routes/ranks.routes"));
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/bell", require("./routes/bell.routes"));

// Admin / profil / public
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/profile", require("./routes/profile.routes"));
app.use("/api/public", require("./routes/public.routes"));
app.use("/api/admin/products", require("./routes/admin.products.routes"));

// ✅ EZ KELL A KÉPMAPHOZ
app.use("/api/images", require("./routes/imagesMap.routes"));

// Meta
app.use("/api/meta", require("./routes/meta.routes"));

// Users
app.use("/api/users", require("./routes/users.routes"));

// Messages
app.use("/api/messages", require("./routes/messages.routes"));

// AI
app.use("/api/ai", require("./ai/ai.routes"));

app.get("/api/test-live", (req, res) => {
    res.json({ ok: true, msg: "live backend works" });
});
module.exports = app;
