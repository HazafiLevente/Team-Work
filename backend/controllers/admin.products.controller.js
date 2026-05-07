const { supabase } = require("../services/supabase");
const { listProducts, clampLimit, getProductByRoute, clearCatalogCache } = require("../services/products/productCatalog.service");
const { awardRankPointsSafe } = require("../services/rankPoints.service");
const { norm } = require("../services/products/productCatalog.helpers");

const IGNORE_PROPERTY_NAMES_FOR_TYPE = new Set(["manufacturer", "model"]);

function splitProductPayload(payload) {
    const obj = (payload && typeof payload === "object") ? payload : {};
    const data = (obj.data && typeof obj.data === "object") ? obj.data : obj;

    const base = {
        name: data.name ?? data.model ?? data.title ?? null,
        type: data.type ?? null,
        category: data.category ?? null,
    };

    const exclusions = new Set([
        "id", "ID", "created_at", "table_name", "table", "source_table", "product_table",
        "data", "price", "manufacturer", "model", "name", "type", "category", "image", "image_url",
    ]);

    const values = {};
    for (const [k, v] of Object.entries(data)) {
        if (!k) continue;
        if (exclusions.has(k)) continue;
        if (v === undefined) continue;
        values[k] = v;
    }

    return { base, values };
}

async function upsertPropertiesAndValues(productId, valueMap, productType) {
    const entries = Object.entries(valueMap || {}).filter(([k]) => String(k || "").trim());
    if (!entries.length) return;

    // Ensure property rows exist
    const propNames = entries.map(([k]) => String(k).trim());
    const { data: existingProps, error: propsErr } = await supabase
        .from("properties")
        .select("id, property")
        .in("property", propNames);
    if (propsErr) throw propsErr;

    const existingMap = new Map((existingProps || []).map(p => [String(p.property), p.id]));
    const missing = propNames.filter(p => !existingMap.has(p));

    if (missing.length) {
        const { data: inserted, error: insertErr } = await supabase
            .from("properties")
            // In this project, properties.type is used as the "product type" grouping.
            // Do not overwrite existing semantics; default missing properties to the current product type (if known).
            .insert(missing.map(p => ({ property: p, type: productType ?? null })))
            .select("id, property");
        if (insertErr) throw insertErr;
        for (const row of inserted || []) existingMap.set(String(row.property), row.id);
    }

    // Replace values for this product (simple + reliable)
    const { error: delErr } = await supabase.from("values").delete().eq("products_id", productId);
    if (delErr) throw delErr;

    const rows = entries.map(([k, v]) => ({
        products_id: productId,
        properties_id: existingMap.get(String(k).trim()),
        value: v === null ? null : String(v),
    })).filter(r => r.properties_id);

    if (rows.length) {
        const { error: valErr } = await supabase.from("values").insert(rows);
        if (valErr) throw valErr;
    }
}

async function list(req, res) {
    const q = (req.query.q ?? "").trim();
    const limit = clampLimit(req.query.limit, 500, 5000);

    try {
        const products = await listProducts({ q, limit, category: "all" });

        res.json({ products });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

async function getOne(req, res) {
    const { table, id } = req.params;
    try {
        // Always return the fully decorated EAV product (all properties).
        const product = await getProductByRoute("products", Number(id));
        if (!product) return res.status(404).json({ error: "Not found" });
        res.json({ product: { ...product, table_name: table || product.table_name || "products" } });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

async function create(req, res) {
    const { table } = req.params;
    try {
        if (norm(table) === "products" || norm(table) === "product") {
            const { base, values } = splitProductPayload(req.body);

            const { data: inserted, error: insErr } = await supabase
                .from("products")
                .insert({
                    name: base.name ?? "",
                    category: base.category ?? null,
                })
                .select("id")
                .single();
            if (insErr) throw insErr;

            const newId = Number(inserted?.id);
            if (Number.isFinite(newId) && Object.keys(values).length) {
                await upsertPropertiesAndValues(newId, values, base.type);
            }

            clearCatalogCache();
            await awardRankPointsSafe(req.user?.id, "product_add");
            return res.json({ id: String(newId) });
        }

        // fallback: legacy dynamic table create
        const { data, error } = await supabase.rpc("admin_create_product", {
            p_table: table,
            p_data: req.body || {}
        });
        if (error) return res.status(500).json({ error: error.message });
        await awardRankPointsSafe(req.user?.id, "product_add");
        res.json({ id: data });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

async function remove(req, res) {
    const { table, id } = req.params;
    try {
        if (norm(table) === "products" || norm(table) === "product") {
            const pid = Number(id);
            const { error: delValsErr } = await supabase.from("values").delete().eq("products_id", pid);
            if (delValsErr) throw delValsErr;
            const { error: delProdErr } = await supabase.from("products").delete().eq("id", pid);
            if (delProdErr) throw delProdErr;
            clearCatalogCache();
            await awardRankPointsSafe(req.user?.id, "product_delete");
            return res.json({ success: true });
        }

        const { error } = await supabase.rpc("admin_delete_product", {
            p_table: table,
            p_id: Number(id)
        });
        if (error) return res.status(500).json({ error: error.message });
        await awardRankPointsSafe(req.user?.id, "product_delete");
        res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

async function update(req, res) {
    const { table, id } = req.params;
    try {
        if (norm(table) === "products" || norm(table) === "product") {
            const pid = Number(id);
            const { base, values } = splitProductPayload(req.body);

            const { error: updErr } = await supabase
                .from("products")
                .update({
                    name: base.name ?? "",
                    category: base.category ?? null,
                })
                .eq("id", pid);
            if (updErr) throw updErr;

            await upsertPropertiesAndValues(pid, values, base.type);
            clearCatalogCache();
            return res.json({ success: true });
        }

        const dataToSend = req.body;
        const { error } = await supabase.rpc("admin_update_product", {
            p_table: table,
            p_id: Number(id),
            p_data: dataToSend
        });
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

async function listTypes(req, res) {
    try {
        const { data: rows, error } = await supabase
            .from("properties")
            .select("type, property")
            .not("type", "is", null)
            .limit(10000);
        if (error) throw error;

        const byType = new Map();
        for (const r of rows || []) {
            const t = String(r?.type || "").trim();
            const p = String(r?.property || "").trim();
            if (!t || !p) continue;
            if (IGNORE_PROPERTY_NAMES_FOR_TYPE.has(p.toLowerCase())) continue;
            if (!byType.has(t)) byType.set(t, []);
            byType.get(t).push(p);
        }

        const types = Array.from(byType.keys()).sort((a, b) => a.localeCompare(b, "hu"));
        const templates = types.map((t) => ({
            type: t,
            properties: Array.from(new Set(byType.get(t) || [])).sort((a, b) => a.localeCompare(b, "hu")),
        }));

        res.json({ types, templates });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

async function getTypeTemplate(req, res) {
    try {
        const type = String(req.params.type || "").trim();
        if (!type) return res.status(400).json({ error: "Missing type" });

        const { data: rows, error } = await supabase
            .from("properties")
            .select("property")
            .eq("type", type)
            .limit(5000);
        if (error) throw error;

        const properties = Array.from(
            new Set(
                (rows || [])
                    .map(r => String(r.property || "").trim())
                    .filter(Boolean)
                    .filter(p => !IGNORE_PROPERTY_NAMES_FOR_TYPE.has(p.toLowerCase()))
            )
        )
            .sort((a, b) => a.localeCompare(b, "hu"));

        res.json({ type, properties });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

async function createTypeTemplate(req, res) {
    try {
        const type = String(req.body?.type || "").trim();
        const props = Array.isArray(req.body?.properties) ? req.body.properties : [];
        const properties = Array.from(
            new Set(
                props
                    .map(p => String(p || "").trim())
                    .filter(Boolean)
                    .filter(p => !IGNORE_PROPERTY_NAMES_FOR_TYPE.has(p.toLowerCase()))
            )
        );

        if (!type) return res.status(400).json({ error: "Missing type" });

        if (!properties.length) return res.status(400).json({ error: "Missing properties" });

        // Only insert missing property rows for this type
        const { data: existingRows, error: exErr } = await supabase
            .from("properties")
            .select("property")
            .eq("type", type)
            .in("property", properties);
        if (exErr) throw exErr;

        const existing = new Set((existingRows || []).map(r => String(r.property || "").trim()));
        const missing = properties.filter(p => !existing.has(p));

        if (missing.length) {
            const { error: insErr } = await supabase
                .from("properties")
                .insert(missing.map((p) => ({ type, property: p })));
            if (insErr) throw insErr;
        }

        res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

module.exports = {
    list,
    getOne,
    update,
    create,
    remove,
    listTypes,
    getTypeTemplate,
    createTypeTemplate,
};
