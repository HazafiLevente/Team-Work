const metaRoutes = require("./meta.routes");
const leaderboardRoutes = require("./leaderboard.routes");

function registerRoutes(app) {
    app.use("/api/computers", require("./computers.routes"));
    app.use("/api/cars", require("./cars.routes"));
    app.use("/api/home-theater", require("./hometheaters.routes"));
    app.use("/api/instruments", require("./instruments.routes"));
    app.use("/api/meta", metaRoutes);
    app.use("/api/auth", require("./auth.routes"));
    app.use("/api/products", require("./products.routes"));
    app.use("/api/items", require("./items.routes"));
    app.use("/api/setup", require("./setup.routes"));
    app.use("/api/ranks", require("./ranks.routes"));
    app.use("/api/leaderboard", leaderboardRoutes);
    app.use("/api/bell", require("./bell.routes"));
    app.use("/api/admin", require("./admin.routes"));
    app.use("/api/profile", require("./profile.routes"));
    app.use("/api/public", require("./public.routes"));
    app.use("/api/admin/products", require("./admin.products.routes"));
    app.use("/api/images", require("./imagesMap.routes"));
    app.use("/api/users", require("./users.routes"));
    app.use("/api/messages", require("./messages.routes"));
    app.use("/api/ai", require("../ai/ai.routes"));

    app.get("/api/test-live", (req, res) => {
        res.json({ ok: true, msg: "live backend works" });
    });
}

module.exports = registerRoutes;
