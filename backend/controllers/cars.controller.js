const { listProducts, clampLimit } = require("../services/products/productCatalog.service");

async function listCars(req, res) {
    const limit = clampLimit(req.query.limit, 200, 2000);

    try {
        const items = await listProducts({ limit, category: "car" });
        return res.json({ items });
    } catch (error) {
        console.error("listCars fatal", error);
        return res.status(500).json({ error: "cars fetch failed" });
    }
}

module.exports = { listCars };
