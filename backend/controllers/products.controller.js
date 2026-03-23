const { listProducts, listBrands, clampLimit } = require("../services/products/productCatalog.service");

async function list(req, res) {
    const q = (req.query.q ?? "").trim();
    const limit = clampLimit(req.query.limit, 200);

    try {
        const items = await listProducts({ q, limit, category: "all" });

        res.json({ items });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function brands(req, res) {
    try {
        const brands = await listBrands();

        res.json({ brands });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { list, brands };
