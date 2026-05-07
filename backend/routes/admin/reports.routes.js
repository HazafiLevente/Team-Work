const router = require("express").Router();
const verifyAdmin = require("../../middlewares/verifyAdmin");
const { supabase } = require("../../services/supabase");
const { normalizeReportFieldName, parseStoredReportTitle, pickValue } = require("./reportUtils");

router.get("/reports", verifyAdmin, async (req, res) => {
    try {
        const [reportsResult, propertiesResult, valuesResult] = await Promise.all([
            supabase.from("reports[Admin]").select("*").order("created_at", { ascending: false }),
            supabase.from("reports_properties[Admin]").select("*"),
            supabase.from("reports_values[Admin]").select("*")
        ]);

        if (reportsResult.error) throw reportsResult.error;
        if (propertiesResult.error) throw propertiesResult.error;
        if (valuesResult.error) throw valuesResult.error;

        const reports = reportsResult.data || [];
        const properties = propertiesResult.data || [];
        const values = valuesResult.data || [];
        const propertyById = new Map(
            properties.map((property) => [
                String(pickValue(property, ["id", "ID", "Id"])),
                pickValue(property, ["property", "Property", "name", "Name"])
            ])
        );
        const valuesByReportId = new Map();

        for (const valueRow of values) {
            const reportId = pickValue(valueRow, [
                "reports_id",
                "report_id",
                "reportId",
                "reportsId",
                "reports_admin_id"
            ]);
            if (reportId === undefined) continue;

            const propertyId = pickValue(valueRow, [
                "properties_id",
                "property_id",
                "propertyId",
                "propertiesId",
                "reports_properties_id"
            ]);
            const propertyName = propertyById.get(String(propertyId)) || `property_${propertyId}`;
            const rawValue = pickValue(valueRow, ["value", "Value", "text", "Text", "data", "Data"]);

            if (!valuesByReportId.has(String(reportId))) {
                valuesByReportId.set(String(reportId), []);
            }

            valuesByReportId.get(String(reportId)).push({
                id: pickValue(valueRow, ["id", "ID", "Id"]),
                property_id: propertyId,
                property: propertyName,
                value: rawValue
            });
        }

        const result = reports.map((report) => {
            const reportId = pickValue(report, ["id", "ID", "Id"]);
            const details = valuesByReportId.get(String(reportId)) || [];
            const dynamicFields = {};
            const stored = parseStoredReportTitle(pickValue(report, ["title", "Title"])) || {};

            for (const detail of details) {
                const key = normalizeReportFieldName(detail.property);
                if (!key) continue;
                dynamicFields[key] = detail.value ?? stored[key] ?? "";
            }

            const detailsWithValues = details.map((detail) => {
                const key = normalizeReportFieldName(detail.property);
                return {
                    ...detail,
                    value: detail.value ?? stored[key] ?? ""
                };
            });

            return {
                id: reportId,
                title: stored.title || pickValue(report, ["title", "Title"]) || `Report #${reportId}`,
                type: dynamicFields.type || stored.type || "profile",
                created_at: pickValue(report, ["created_at", "createdAt", "Created_at"]),
                reporter_user_id: dynamicFields.reporter_user_id ?? stored.reporter_user_id ?? "",
                reported_user_id: dynamicFields.reported_user_id ?? stored.reported_user_id ?? "",
                report_type: dynamicFields.report_type ?? stored.report_type ?? "",
                report_message: dynamicFields.report_message ?? stored.report_message ?? "",
                details: detailsWithValues,
                ...dynamicFields
            };
        });

        res.json({ reports: result });
    } catch (err) {
        console.error("Admin reports load error:", err);
        res.status(500).json({ error: err.message || "Failed to load reports", reports: [] });
    }
});

router.delete("/reports/:id", verifyAdmin, async (req, res) => {
    try {
        const reportId = Number(req.params.id);
        if (!Number.isFinite(reportId)) {
            return res.status(400).json({ error: "Invalid report id" });
        }

        const { error: valuesError } = await supabase
            .from("reports_values[Admin]")
            .delete()
            .eq("report_id", reportId);

        if (valuesError) throw valuesError;

        const { error: reportError } = await supabase
            .from("reports[Admin]")
            .delete()
            .eq("id", reportId);

        if (reportError) throw reportError;

        res.json({ success: true });
    } catch (err) {
        console.error("Admin report delete error:", err);
        res.status(500).json({ error: err.message || "Failed to delete report" });
    }
});

module.exports = router;
