const { listProducts, clampLimit } = require("../services/products/productCatalog.service");

async function list(req, res) {
    const limit = clampLimit(req.query.limit, 200, 2000);

    try {
        const items = await listProducts({ limit, category: "computer" });

        res.json({ items });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { list };
