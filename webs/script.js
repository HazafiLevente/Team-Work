// ----------------------------
// PAGE INIT
// ----------------------------
document.addEventListener("DOMContentLoaded", async () => {
    // csak a home oldalon töltsön CPU-kat
    if (window.location.pathname === "/home" || window.location.pathname === "/") {
        await loadCPUs();
    }

    // a /regist oldalon ne töltsön semmit
    if (window.location.pathname !== "/regist") {
        await checkLoginStatus();
    }
});

// ----------------------------
// REGISTRATION
// ----------------------------
async function connectreg() {
    const fullname = document.getElementById("fullname").value;
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const userData = { fullname, username, email, password };
    console.log("📤 Küldés:", userData);

    const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
        credentials: "include"
    });

    const result = await res.json();
    if (res.ok) {
        alert("✅ Sikeres regisztráció!");
        window.location.href = "/home";
    } else {
        alert("❌ Hiba: " + result.error);
    }
}

// ----------------------------
// LOGIN
// ----------------------------
async function connectlog() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    console.log("📤 Bejelentkezés:", email);

    const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include"
    });

    const result = await res.json();

    if (res.ok) {
        alert("✅ Sikeres bejelentkezés!");
        window.location.href = "/home";
    } else {
        alert("❌ Hiba: " + result.error);
    }
}

// ----------------------------
// LOGOUT
// ----------------------------
async function logout() {
    await fetch("/api/logout", {
        method: "POST",
        credentials: "include"
    });
    alert("👋 Kijelentkeztél!");
    window.location.href = "/regist";
}

// ----------------------------
// LOGIN STATUS CHECK
// ----------------------------
async function checkLoginStatus() {
    const authBtn = document.getElementById("auth-btn");
    if (!authBtn) return;

    try {
        const res = await fetch("/api/me", {
            method: "GET",
            credentials: "include"
        });

        if (!res.ok) {
            setConnectButton(authBtn);
            return;
        }

        const data = await res.json();
        if (data && data.loggedIn) {
            setLogoutButton(authBtn);
        } else {
            setConnectButton(authBtn);
        }
    } catch (err) {
        console.error("⚠️ Hiba a bejelentkezés-ellenőrzésnél:", err);
        setConnectButton(authBtn);
    }
}

function setConnectButton(authBtn) {
    authBtn.textContent = "Connect";
    authBtn.href = "/regist";
    authBtn.style.color = "";
    authBtn.style.border = "";
    authBtn.onclick = null;
}

function setLogoutButton(authBtn) {
    authBtn.textContent = "Logout";
    authBtn.href = "#";
    authBtn.style.color = "red";
    authBtn.style.border = "1px solid red";
    authBtn.style.padding = "5px 10px";
    authBtn.style.borderRadius = "5px";
    authBtn.style.cursor = "pointer";
    authBtn.style.marginLeft = "10px";
    authBtn.style.fontSize = "16px";
    authBtn.style.fontWeight = "bold";
    authBtn.style.textDecoration = "none";
    authBtn.onclick = (e) => {
        e.preventDefault();
        logout();
    };
}

// ----------------------------
// REGISTRATION / LOGIN PAGES
// ----------------------------
function regist() {
    var content = document.querySelector(".content");
    content.innerHTML = `
        <section class="panel">
            <div class="hero">
                <h2>Registration</h2>
                <label for="username">Username:</label>
                <input type="text" id="username" required/>
                <label for="fullname">Fullname:</label>
                <input type="text" id="fullname" required/>
                <label for="email">Email:</label>
                <input type="text" id="email" required/>
                <label for="password">Password:</label>
                <input type="password" id="password" required/>
                <br>
                <button class="btn" onclick="connectreg()">Connect</button>
                <p class="logorreg">
                    van fiókom, <a class='logorreg' onclick="login()">bejelentkezek</a>
                </p>
            </div>
        </section>`;
}

function login() {
    var content = document.querySelector(".content");
    content.innerHTML = `
        <section class="panel">
            <div class="hero">
                <h2>Login</h2>
                <label for="email">Email:</label>
                <input type="text" id="email" required/>
                <label for="password">Password:</label>
                <input type="password" id="password" required/>
                <br>
                <button class="btn" onclick="connectlog()">Connect</button>
                <br>
                <p>
                    még nincs fiókom, <a onclick="regist()" class='logorreg'>regisztrálok</a>
                </p>
            </div>
        </section>`;
}

// ----------------------------
// CPU ITEMS (dynamic load)
// ----------------------------
async function loadCPUs() {
    try {
        const content = document.querySelector(".content");

        content.classList.add("wide-content");

        content.innerHTML = `
            <section class="panel wide-panel">
                <div class="hero">
                    <h2>Available CPUs</h2>
                    <div class="neon-line"></div>
                    <div class="cpu-grid" id="cpu-grid">
                        <p class="muted">🔄 Betöltés...</p>
                    </div>
                </div>
            </section>
        `;

        const res = await fetch("/api/cpu", { credentials: "include" });
        const data = await res.json();
        const grid = document.getElementById("cpu-grid");
        grid.innerHTML = "";

        if (!res.ok || !data || data.length === 0) {
            grid.innerHTML = `<p class="muted">❌ Nincs elérhető CPU adat.</p>`;
            return;
        }

        // CPU-k kártyáinak megjelenítése (4 db / sor)
        data.forEach(cpu => {
            // 🔍 gyártó alapú kép kiválasztása
            let imageURL = "";
            if (cpu.Manufacturer && cpu.Manufacturer.toLowerCase().includes("amd")) {
                imageURL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQclXL3zcdtE9LYXthL1f2egJdYdxDKXLfmCg&s";
            } else if (cpu.Manufacturer && cpu.Manufacturer.toLowerCase().includes("intel")) {
                imageURL = "https://mir-s3-cdn-cf.behance.net/project_modules/1400_webp/8e4313112554403.60186ea0c7798.jpg";
            } else {
                imageURL = "https://via.placeholder.com/200x120?text=CPU";
            }

            const card = document.createElement("div");
            card.className = "cpu-card";
            card.innerHTML = `
                <div class="cpu-item" style="text-align:center; padding:12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:12px;">
                    <img src="${imageURL}" width="140" height="140" alt="${cpu.Model}" style="border-radius:10px; object-fit:cover;">
                    <h3 style="margin-top:10px;">${cpu.Model}</h3>
                    <p><strong>${cpu.Manufacturer}</strong></p>
                    <p>${cpu.Threads} threads • ${cpu.Clock} GHz</p>
                    <p>Socket: ${cpu.Socket}</p>
                    <p>Cache: ${cpu.Cache} MB</p>
                    <p><strong>Ár:</strong> ${cpu.Price.toLocaleString("hu-HU")} Ft</p>
                </div>
            `;
            grid.appendChild(card);
        });

        // pontosan 4 oszlopos grid
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = "repeat(4, 1fr)";
        grid.style.gap = "24px";
        grid.style.justifyItems = "center";

    } catch (err) {
        console.error("❌ CPU betöltési hiba:", err);
        const grid = document.getElementById("cpu-grid");
        if (grid) grid.innerHTML = `<p class="muted">⚠️ Hiba a CPU-k betöltése közben.</p>`;
    }
}



