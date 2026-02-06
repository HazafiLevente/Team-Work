const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: "http://localhost:4200",
        credentials: true,
    })
);

/* ----------------------------------
   STATIC IMAGES
   Team-Work/datas/images  ->  /images
---------------------------------- */
const ROOT = path.resolve(__dirname, ".."); // Team-Work (repo root)
const IMAGES_DIR = path.join(ROOT, "datas", "images"); // FONTOS: datas/images (kisbetű)

console.log("🖼 Serving images from:", IMAGES_DIR);
app.use("/images", express.static(IMAGES_DIR));

/* ----------------------------------
   API ROUTES
---------------------------------- */

// Alap kategóriák
app.use("/api/hometheaters", require("./routes/hometheaters.routes"));
app.use("/api/computers", require("./routes/computers.routes"));
app.use("/api/cars", require("./routes/cars.routes"));

// ÚJ: Hangszerek és Kiegészítők útvonala
app.use("/api/instruments", require("./routes/instruments.routes"));

// Rendszer és Felhasználó útvonalak
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/products", require("./routes/products.routes"));
app.use("/api/items", require("./routes/items.routes"));
app.use("/api/setup", require("./routes/setup.routes"));
app.use("/api/bell", require("./routes/bell.routes"));


// Adminisztráció és Profil
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/profile", require("./routes/profile.routes"));
app.use("/api/public", require("./routes/public.routes"));

/* ----------------------------------
   IMAGES MAP API
   GET /api/images/map -> datas/Jsons/images.runtime.json
---------------------------------- */
app.use("/api/images", require("./routes/imagesMap.routes"));

/* ----------------------------------
   META
---------------------------------- */
app.use("/api", require("./routes/meta.routes"));

module.exports = app;