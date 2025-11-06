const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Supabase inicializálása
const supabaseUrl = 'https://ecjufuhmmehhzusicghh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjanVmdWhtbWVoaHp1c2ljZ2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NjIzNjksImV4cCI6MjA3NTMzODM2OX0.U3cIRqeSrWTyjvxwKTI2LoIwcB2sHiSlEccYHQd9Ow8';

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.static(path.join(__dirname, 'webs')));

// --- Főoldal ---
app.get('/', (req, res) => {
    console.log(" / hívás érkezett!");
    res.sendFile(path.join(__dirname, 'webs/Home.html'));
});
app.get('/home', (req, res) => {
    console.log(" /home hívás érkezett!");
    res.sendFile(path.join(__dirname, 'webs/Home.html'));
});

// --- User Side ---
app.get('/regist', async (req, res) => {
    console.log("✏️ /regist hívás érkezett!");
    res.sendFile(path.join(__dirname, 'webs/Regist.html'));
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
app.get('/api/saxophone/alt', async (req, res) => {
    console.log("🧠 /api/saxophone/alt hívás érkezett!");
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

// --- Alt Saxophone endpoint ---
app.get('/api/bassers', async (req, res) => {
    console.log("🧠 /api/bassers hívás érkezett!");
    const { data, error } = await supabase
        .from('bassers')
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

// --- CoupeCar ---
app.get('/api/coupe', async (req, res) => {
    console.log(" /api/coupe hívás érkezett!");
    const { data, error } = await supabase
        .from('coupe_car')
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

// --- Register endpoint ---
app.post('/api/register', async (req, res) => {
    try {
        const { fullname, username, email, password } = req.body;

        if (!fullname || !username || !email || !password) {
            return res.status(400).json({ error: "Hiányzó adatok!" });
        }

        // 🔒 Jelszó hash-elése
        const hashedPassword = await bcrypt.hash(password, 10);

        // 🧩 Beszúrás a Supabase táblába
        const { data, error } = await supabase
            .from('user')
            .insert([
                {
                    Name: fullname,
                    UserName: username,
                    Email: email,
                    password: hashedPassword,
                    isAdmin: false
                }
            ]);

        if (error) {
            console.error("❌ Supabase hiba:", error);
            return res.status(500).json({ error: error.message });
        }

        console.log("✅ Felhasználó létrehozva:", username);
        res.status(201).json({ message: "Sikeres regisztráció!" });

    } catch (err) {
        console.error("❌ Szerver hiba:", err);
        res.status(500).json({ error: "Belső szerverhiba." });
    }
});

// --- Indítás ---
app.listen(PORT, () => {
    console.log(`✅ The Server is on! [http://localhost:${PORT}]`);
});