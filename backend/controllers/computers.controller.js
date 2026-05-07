const { listProducts, clampLimit } = require("../services/products/productCatalog.service");
const { norm } = require("../services/products/productCatalog.helpers");

async function list(req, res) {
    const limit = clampLimit(req.query.limit, 200, 2000);

    try {
        // PC builder "kész gép" listához: csak a products táblából
        // type === 'pc' és category === ('desktop'|'laptop')
        // (A "category: computer" szűrés a jelenlegi matchesCategory() miatt
        // nem garantálja, hogy desktop/laptop pc-k benne lesznek.)
        const rows = await listProducts({ limit: Math.max(limit, 500), category: "all" });

        const items = (Array.isArray(rows) ? rows : [])
            .filter((row) => norm(row?.type) === "pc")
            .filter((row) => ["desktop", "laptop"].includes(norm(row?.category)));

        res.json({ items });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { list };
