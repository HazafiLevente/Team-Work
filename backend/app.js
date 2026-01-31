const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:4200",
    credentials: true
}));


app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/products", require("./routes/products.routes"));
app.use("/api/items", require("./routes/items.routes"));
app.use("/api/cars", require("./routes/cars.routes"));
app.use("/api/setup", require("./routes/setup.routes"));
app.use("/api/bell-message", require("./routes/bell.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/profile", require("./routes/profile.routes"));



app.use("/api/public", require("./routes/public.routes"));
app.use("/api/images", require("./routes/images.routes"));
app.use("/api", require("./routes/meta.routes"));

module.exports = app;
