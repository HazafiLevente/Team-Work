const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

app.use(express.json());

app.get('/', (req, res) => {
    res.type('text/plain');
    res.sendFile(path.join(__dirname, 'Home.ts'));
});

app.listen(PORT, () => {
    console.log(`!!The Server is on!! [https://localhost:${PORT}]`);
});
