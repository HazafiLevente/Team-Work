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
app.use("/api/setup", require("./routes/setup.routes"));
app.use("/api/bell", require("./routes/bell.routes"));
app.use("/api/admin", require("./routes/admin.routes"));

console.log("products.routes =", require("./routes/products.routes"));
console.log("auth.routes =", require("./routes/auth.routes"));
console.log("items.routes =", require("./routes/items.routes"));
console.log("setup.routes =", require("./routes/setup.routes"));
console.log("bell.routes =", require("./routes/bell.routes"));

module.exports = app;
