const express = require('express');
const path = require('path');
const app = express();

// Port beállítása
const PORT = process.env.PORT || 3000;

// Statikus fájlok kiszolgálása
app.use(express.static(path.join(__dirname)));

// Middleware a JSON és URL-encoded adatok kezeléséhez
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fő oldal kiszolgálása
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Home.html'));
});

// Példa POST kérés kezelésére
app.post('/submit', (req, res) => {
    // Kéréssel érkező adatok
    const requestData = req.body;
    console.log('Received data:', requestData);

    // Itt kezelheted a kapott adatokat (mentés adatbázisba, válasz küldése, stb.)

    res.send('Data received');
});

// Szerver indítása
app.listen(PORT, () => {
    console.log(`Szerver fut a https://localhost:${PORT} porton.`);
});
