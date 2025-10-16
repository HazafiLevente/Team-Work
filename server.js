const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase inicializálása
const supabaseUrl = 'https://ecjufuhmmehhzusicghh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjanVmdWhtbWVoaHp1c2ljZ2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NjIzNjksImV4cCI6MjA3NTMzODM2OX0.U3cIRqeSrWTyjvxwKTI2LoIwcB2sHiSlEccYHQd9Ow8';

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.static(path.join(__dirname, 'webs')));

// --- Főoldal ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'webs/Home.html'));
});


// --- Guitar endpoint ---
app.get('/api/guitars', async (req, res) => {
    console.log("🎸 /api/guitars hívás érkezett!");
    const { data, error } = await supabase
        .from('electric_guitars')
        .select('*');
    if (error) {
        console.error("❌ Supabase hiba:", error);
        return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
        return res.status(404).json({ message: "Nincs adat a táblában" });
    }

    res.json(data);
});

// --- CPU endpoint ---
app.get('/api/cpu', async (req, res) => {
    console.log("🧠 /api/cpu hívás érkezett!");
    const { data, error } = await supabase
        .from('processors')
        .select('*');

    if (error) {
        console.error("❌ Supabase hiba:", error);
        return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
        return res.status(404).json({ message: "Nincs adat a táblában" });
    }

    res.json(data);
});




// --- Alt Saxophone endpoint ---
app.get('/api/alt/saxophone', async (req, res) => {
    console.log("🧠 /api/alt/saxophone hívás érkezett!");
    const { data, error } = await supabase
        .from('alt_saxophone')
        .select('*');

    if (error) {
        console.error("❌ Supabase hiba:", error);
        return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
        return res.status(404).json({ message: "Nincs adat a táblában" });
    }

    res.json(data);
});

// --- Indítás ---
app.listen(PORT, () => {
    console.log(`✅ The Server is on! [http://localhost:${PORT}]`);
});


