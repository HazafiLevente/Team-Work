const { getProductByRoute } = require("../services/products/productCatalog.service");

exports.getOne = async (req, res) => {
    const table = String(req.params.table || "").trim();
    const idRaw = String(req.params.id || "").trim();

    if (!table || !idRaw) {
        return res.status(400).json({ error: "Missing table or id" });
    }

    if (!/^[a-z0-9_]+$/i.test(table)) {
        return res.status(400).json({ error: "Invalid table name" });
    }

    const id = /^\d+$/.test(idRaw) ? Number(idRaw) : idRaw;

    try {
        const item = await getProductByRoute(table, id);
        if (!item) {
            return res.status(404).json({ error: "Not found", table, id: idRaw });
        }

        return res.json({ item, source: "supabase" });
    } catch (error) {
        return res.status(500).json({
            error: error.message || "Internal server error",
            table,
            id: idRaw,
        });
    }
};

exports.list = async (req, res) => {
    res.json({ results: [] });
};

exports.search = async (req, res) => {
    res.json({ results: [] });
};
