const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'webs')));

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'datas'
});
connection.connect((err) => {
    if (err) {
        console.error("❌ Nem sikerült kapcsolódni az adatbázishoz:", err);
        return;
    }
    console.log("✅ Kapcsolódva az adatbázishoz!");
});

app.get('/api/guitars', (req, res) => {
    console.log("🎸 /api/guitars hívás érkezett!");
    connection.query('SELECT * FROM guitar', (err, rows) => {
        if (err) {
            console.error("❌ DB hiba:", err);
            return res.status(500).json({ error: "Adatbázis hiba!" });
        }
        res.json(rows);
    });
});

app.get('/api/cpu', (req, res) => {
    console.log("🎸 /api/cpu hívás érkezett!");
    connection.query('SELECT * FROM processors', (err, rows) => {
        if (err) {
            console.error("❌ DB hiba:", err);
            return res.status(500).json({ error: "Adatbázis hiba!" });
        }
        res.json(rows);
    });
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'webs/Home.html'));
});

app.listen(PORT, () => {
    console.log(`✅ The Server is on! [http://localhost:${PORT}]`);
});
