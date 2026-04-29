function rankDebugLogger(req, res, next) {
    if (req.url.startsWith("/api/ranks")) {
        console.log("đź”Ą HIT", req.method, req.url);
    }
    next();
}

module.exports = rankDebugLogger;
