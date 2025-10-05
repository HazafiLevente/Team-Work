const express = require('express');
const path = require('path');
const app = express();
const sql = require("msnodesqlv8");


const PORT = process.env.PORT || 4000;

// Angular buildelt fájlok kiszolgálása
app.use(express.static(path.join(__dirname, 'Work/dist/Work')));


// Angular route-ok (minden más útvonal)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Work/dist/Work/browser/index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ The Server is on! [http://localhost:${PORT}]`);
});

