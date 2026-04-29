function pickValue(row, candidates) {
    for (const key of candidates) {
        if (row && row[key] !== undefined && row[key] !== null) return row[key];
    }
    return undefined;
}

function normalizeReportFieldName(name) {
    return String(name || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function parseStoredReportTitle(value) {
    try {
        const parsed = JSON.parse(String(value || ""));
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
        return null;
    }
}

module.exports = {
    normalizeReportFieldName,
    parseStoredReportTitle,
    pickValue
};
