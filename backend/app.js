require("./services/logger");

const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const { IMAGES_DIR } = require("./config/paths");
const rankDebugLogger = require("./middlewares/rankDebugLogger");
const registerRoutes = require("./routes");
const { trackMiddleware } = require("./services/activeUsers");

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: true,
        credentials: true,
    })
);

app.use(trackMiddleware);

console.log("đź–Ľ Serving images from:", IMAGES_DIR);
app.use("/images", express.static(IMAGES_DIR));

app.use(rankDebugLogger);
registerRoutes(app);

module.exports = app;
