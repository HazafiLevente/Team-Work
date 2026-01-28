exports.list = (req, res) => {
    res.json({ setups: [] });
};

exports.create = (req, res) => {
    res.json({ success: true });
};

exports.children = (req, res) => {
    res.json([]);
};
