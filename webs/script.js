/* ----------------------------------
   SEARCH + PRODUCT GRID INJECTOR
---------------------------------- */

function injectSearchArea() {
    // ⛔ ha már van search input, NE injektáljuk újra
    if (document.getElementById("search-input")) return;

    const content = document.querySelector(".content");
    if (!content) return;

    const box = document.createElement("div");
    box.id = "search-box-wrapper";
    box.style.gridColumn = "1 / -1";
    box.innerHTML = `
        <div style="margin-bottom: 20px;">
            <input id="search-input" 
                   type="text" 
                   placeholder="Keresés: manufacturer, model, kategória..."
                   style="
                        width:100%;
                        padding:14px;
                        border-radius:10px;
                        background:rgba(255,255,255,0.05);
                        border:1px solid rgba(255,255,255,0.12);
                        color:white;
                        font-size:16px;">
        </div>

        <div id="product-grid"></div>
    `;

    content.prepend(box);
}


/* ----------------------------------
   PAGE INIT
---------------------------------- */

document.addEventListener("DOMContentLoaded", async () => {
    const path = window.location.pathname;

    if (path === "/home" || path === "/") {
        injectSearchArea();
        await loadProducts();   // egen kategóriák
        await loadLatestProducts();
    }

    if (path === "/profile") {
        await loadProfile();
    }

    if (path !== "/regist") {
        await checkLoginStatus();
    }
});

async function login() {
    var main = document.querySelector(".content"); // <-- EZ A HELYES
    main.innerHTML = `
    <section class="panel">
        <div class="hero">
            <h2>Login</h2>
            <label for="email">Email:</label>
            <input type="text" id="email" required/>
            <label for="password">Password:</label>
            <input type="password" id="password" required/>
            <br>
            <button class="btn" onclick="connectlog()">Connect</button>
            <p class="logorreg">
                Még nincs fiókom, <a class='logorreg' onclick="regist()">regisztrálok</a>
            </p>
        </div>
    </section>`;
}


async function regist() {
    var main = document.querySelector(".content");
    main.innerHTML = `
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
                Van már fiókom, <a class='logorreg' onclick="login()">bejelentkezek</a>
            </p>
        </div>
    </section>`;
}


/* ----------------------------------
   AUTH
---------------------------------- */

async function connectreg() {
    const fullname = document.getElementById("fullname").value;
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullname, username, email, password }),
        credentials: "include"
    });

    const data = await res.json();

    if (res.ok) {
        alert("Sikeres regisztráció!");
        window.location.href = "/home";
    } else {
        alert("Hiba: " + data.error);
    }
}

async function connectlog() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include"
    });

    const data = await res.json();

    if (res.ok) {
        alert("Sikeres bejelentkezés!");
        window.location.href = "/home";
    } else {
        alert("Hiba: " + data.error);
    }
}

async function logout() {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    window.location.href = "/regist";
}

/* ----------------------------------
   LOGIN BUTTON
---------------------------------- */

async function checkLoginStatus() {
    const authBtn = document.getElementById("auth-btn");
    if (!authBtn) return;

    try {
        const res = await fetch("/api/me", { credentials: "include" });

        if (!res.ok) {
            setConnectButton(authBtn);
            return;
        }

        const data = await res.json();
        data.loggedIn ? setLogoutButton(authBtn) : setConnectButton(authBtn);

    } catch {
        setConnectButton(authBtn);
    }
}

function setConnectButton(btn) {
    btn.textContent = "Connect";
    btn.href = "/regist";
    btn.onclick = null;
}

function setLogoutButton(btn) {
    btn.textContent = "Logout";
    btn.href = "#";
    btn.onclick = (e) => {
        e.preventDefault();
        logout();
    };
}

/* ----------------------------------
   PROFILE PAGE
---------------------------------- */
let isSetup = false;

async function loadProfile() {
    const box = document.getElementById("profile-box");
    if (!box) return;

    const res = await fetch("/api/me", { credentials: "include" });
    if (!res.ok) return regist();

    const { loggedIn, user } = await res.json();
    if (!loggedIn) return regist();

    renderProfile(box, user);
}

async function mySetup() {
    const box = document.getElementById("profile-box");
    if (!box) return;

    isSetup = !isSetup;

    if (!isSetup) {
        const res = await fetch("/api/me", { credentials: "include" });
        const { user } = await res.json();
        return renderProfile(box, user);
    }

    // ⏳ loading
    box.innerHTML = `
        <h2>My Setup</h2>
        <p class="muted">⏳ Setup betöltése...</p>
    `;

    const res = await fetch("/api/my-first-setup", { credentials: "include" });
    const data = await res.json();

    if (!data.setup) {
        box.innerHTML = `
            <h2>My Setup</h2>
            <p class="muted">❌ Még nincs egyetlen géped sem.</p>
            <button class="btn" onclick="mySetup()">⬅ Vissza</button>
        `;
        return;
    }

    renderSetupWithData(box, data);
}


function renderSetupWithData(box, data) {
    const { setup, details } = data;

    box.innerHTML = `
        <div class="setup-title">
            <h2 id="setup-title-text">${setup.setup_name}</h2>
            <button class="btn small" onclick="editSetupName(${setup.id})">✏️ Módosít</button>
        </div>

        <div class="neon-line"></div>

        <ul class="setup-list">
            <li><strong>CPU:</strong> ${details.processor?.Model || "—"}</li>
            <li><strong>Alaplap:</strong> ${details.motherboard?.Model || "—"}</li>
            <li><strong>RAM:</strong> ${details.ram?.model || "—"}</li>
            <li><strong>VGA:</strong> ${details.videocard?.model || "—"}</li>
            <li><strong>Tápegység:</strong> ${details.psu?.model || "—"}</li>
        </ul>

        <button class="btn" onclick="mySetup()">⬅ Vissza a profilhoz</button>
        <button class="btn" onclick="logout()">Kijelentkezés</button>
    `;
}

function editSetupName(setupId) {
    const title = document.getElementById("setup-title-text");
    const currentName = title.textContent;

    title.outerHTML = `
        <input 
            id="setup-title-input"
            value="${currentName}"
            style="font-size:24px; padding:6px; width:100%; max-width:400px;"
        />
        <div style="margin-top:10px">
            <button class="btn small" onclick="saveSetupName(${setupId})">💾 Mentés</button>
            <button class="btn small" onclick="cancelEditSetupName('${currentName}')">❌ Mégse</button>
        </div>
    `;
}

async function saveSetupName(setupId) {
    const input = document.getElementById("setup-title-input");
    const newName = input.value.trim();

    if (!newName) {
        alert("A név nem lehet üres!");
        return;
    }

    const res = await fetch("/api/update-setup-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ setupId, newName })
    });

    if (!res.ok) {
        alert("❌ Nem sikerült menteni");
        return;
    }

    // frissítjük a nézetet
    mySetup();
}

function cancelEditSetupName(originalName) {
    mySetup(); // egyszerűbb: újratöltjük a setup nézetet
}


function renderProfile(box, user) {
    box.innerHTML = `
        <h2>Profilod</h2>
        <div class="neon-line"></div>
        <p><strong>Név:</strong> ${user.name}</p>
        <p><strong>Felhasználónév:</strong> ${user.username}</p>
        <p><strong>Email:</strong> ${user.email}</p>

        <button class="btn" onclick="mySetup()">My Setup</button>
        <button class="btn" onclick="logout()">Kijelentkezés</button>
    `;
}

function renderSetup(box, user) {
    box.innerHTML = `
        <h2>My Setup</h2>
        <div class="neon-line"></div>

        <p><strong>Név:</strong> ${user.name}</p>
        <p><strong>Email:</strong> ${user.email}</p>

        <div id="setupBox-content">
            <!-- ide jön majd CPU / GPU / stb -->
            <p class="muted">⚙️ Setup szerkesztése hamarosan…</p>
        </div>

        <button class="btn" onclick="mySetup()">⬅ Vissza a profilhoz</button>
        <button class="btn" onclick="logout()">Kijelentkezés</button>
    `;
}


/* ----------------------------------
   CPU LIST
---------------------------------- */

async function loadCPUs() {
    const content = document.querySelector(".content");

    const section = document.createElement("section");
    section.className = "panel wide-panel";
    section.innerHTML = `
        <div class="hero">
            <h2>Available CPUs</h2>
            <div class="neon-line"></div>
            <div class="cpu-grid" id="cpu-grid">
                <p class="muted">Betöltés...</p>
            </div>
        </div>
    `;
    content.appendChild(section);

    const res = await fetch("/api/cpu", { credentials: "include" });
    const data = await res.json();
    const grid = document.getElementById("cpu-grid");

    grid.innerHTML = "";

    data.forEach(cpu => {
        const card = document.createElement("div");
        card.className = "cpu-card";

        let imageURL = "https://via.placeholder.com/200x120?text=CPU";
        if (cpu.Manufacturer && cpu.Manufacturer.toLowerCase().includes("amd")) {
            imageURL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQclXL3zcdtE9LYXthL1f2egJdYdxDKXLfmCg&s";
        } else if (cpu.Manufacturer && cpu.Manufacturer.toLowerCase().includes("intel")) {
            imageURL = "https://mir-s3-cdn-cf.behance.net/project_modules/1400_webp/8e4313112554403.60186ea0c7798.jpg";
        }
        card.innerHTML = `
            <div class="cpu-item" style="padding:12px;">
                <img src="${imageURL}" width="140">
                <h3>${cpu.Model}</h3>
                <p>${cpu.Manufacturer}</p>
                <p>${cpu.Threads} threads</p>
                <p>${cpu.Clock} GHz</p>
                <p><strong>${cpu.Price.toLocaleString("hu-HU")} Ft</strong></p>
            </div>
        `;

        grid.appendChild(card);
    });
}

/* ----------------------------------
   MOTHERBOARDS
---------------------------------- */

async function loadMotherboards() {
    const content = document.querySelector(".content");

    const section = document.createElement("section");
    section.className = "panel wide-panel";
    section.innerHTML = `
        <div class="hero">
            <h2>Available Motherboards</h2>
            <div class="neon-line"></div>
            <div id="motherboard-grid"></div>
        </div>
    `;
    content.appendChild(section);

    const res = await fetch("/api/motherboard");
    const data = await res.json();
    const grid = document.getElementById("motherboard-grid");

    grid.innerHTML = "";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fill,minmax(280px,1fr))";
    grid.style.gap = "20px";

    data.forEach(mb => {
        const card = document.createElement("div");
        card.className = "cpu-card";

        card.innerHTML = `
            <div class="cpu-item">
                <h3>${mb.Model}</h3>
                <p>${mb.Manufacturer}</p>
                <p>Socket: ${mb.Socket}</p>
                <p><strong>${mb.Price.toLocaleString("hu-HU")} Ft</strong></p>
            </div>
        `;

        grid.appendChild(card);
    });
}

/* ----------------------------------
   LATEST PRODUCTS SIDEBAR
---------------------------------- */

async function loadLatestProducts() {
    const res = await fetch("/api/all", { credentials: "include" });
    const { tables } = await res.json();

    const random = tables[Math.floor(Math.random() * tables.length)];

    const r = await fetch(`/api/latest?table=${random}`, { credentials: "include" });
    const rows = await r.json();

    const list = document.getElementById("latest-list");
    if (!list) return;

    list.innerHTML = "";

    rows.forEach(row => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${row.manufacturer}</strong><br>${row.model}`;
        list.appendChild(li);
    });
}

/* ----------------------------------
   GLOBAL PRODUCT SEARCH
---------------------------------- */

let allProducts = [];
let currentResults = [];

async function loadProducts() {
    try {
        const res = await fetch("/api/all");
        const { tables } = await res.json();

        const map = {
            processors: "/api/cpu",
            motherboard: "/api/motherboard",
            electric_guitars: "/api/guitars",
            alt_saxophone: "/api/saxophone/alt",
            bassers: "/api/bassers",
            coupe_car: "/api/coupe"
        };

        let merged = [];

        for (let t of tables) {
            if (!map[t]) continue;

            const r = await fetch(map[t]);
            const rows = await r.json();

            rows.forEach(x => merged.push(normalizeProduct(x, t)));
        }

        allProducts = merged;
        currentResults = merged;

        renderProducts(merged);

    } catch (err) {
        console.error("loadProducts error:", err);
    }
}

function normalizeProduct(row, table) {
    const lower = {};
    Object.keys(row).forEach(k => lower[k.toLowerCase()] = row[k]);

    return {
        table,
        manufacturer: lower.manufacturer || lower.brand || "Unknown",
        model: lower.model || lower.name || "Unknown",
        price: lower.price ?? null,
        raw: row
    };
}

/* ----------------------------------
   SEARCH INPUT
---------------------------------- */

document.addEventListener("input", e => {
    if (e.target.id !== "search-input") return;

    const term = e.target.value.toLowerCase().trim();

    if (!term) {
        renderProducts(allProducts);
        return;
    }

    const filtered = allProducts.filter(p =>
        p.manufacturer.toLowerCase().includes(term) ||
        p.model.toLowerCase().includes(term) ||
        p.table.toLowerCase().includes(term)
    );

    renderProducts(filtered);
});

/* ----------------------------------
   RENDER PRODUCT GRID
---------------------------------- */

function renderProducts(list) {
    const grid = document.getElementById("product-grid");
    if (!grid) return;

    if (!list.length) {
        grid.innerHTML = `<p class="muted">Nincs találat.</p>`;
        return;
    }

    grid.innerHTML = "";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(220px, 1fr))";
    grid.style.gap = "20px";

    list.forEach(p => {
        const div = document.createElement("div");
        div.className = "cpu-card";

        let priceText = p.price ? p.price.toLocaleString("hu-HU") + " Ft" : "N/A";

        const img = getProductImage(p.table, p);

        div.innerHTML = `
    <div class="cpu-item" style="padding:12px; text-align:center;">
        <img src="${img}" 
         alt="product image"
         style="display:block; margin:0 auto; 
                width:120px; height:120px; 
                object-fit:contain; margin-bottom:10px; border-radius: 6px;">


        <span class="tag">${p.table}</span>
        <h3>${p.model}</h3>
        <p>${p.manufacturer}</p>
        <p><strong>${priceText}</strong></p>
    </div>
`;

        div.onclick = () => {
            window.location.href = `/product.html?table=${p.table}&model=${encodeURIComponent(p.model)}`;
        };

        grid.appendChild(div);
    });
}






function getProductImage(table, product) {

    const m = (product.manufacturer || "").toLowerCase();
    const model = (product.model || "").toLowerCase();

    // CPU képek
    if (table === "processors") {
        if (m.includes("intel")) return "https://mir-s3-cdn-cf.behance.net/project_modules/1400_webp/8e4313112554403.60186ea0c7798.jpg";
        if (m.includes("amd")) return "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQclXL3zcdtE9LYXthL1f2egJdYdxDKXLfmCg&s";
    }


    // Motherboard képek
    if (table === "motherboard") {
        if (m.includes("asus") && model.includes("rog"))
            return "https://www.svgrepo.com/show/303479/asus-rog-1-logo.svg";
        if (m.includes("asus") && model.includes("tuf"))
            return "https://images.seeklogo.com/logo-png/55/1/asus-tuf-gaming-logo-png_seeklogo-555052.png";
        if (m.includes("msi"))
            return "https://images.seeklogo.com/logo-png/30/1/msi-logo-png_seeklogo-304877.png";
        if (m.includes("gigabyte"))
            return "https://1000logos.net/wp-content/uploads/2020/05/Gigabyte-Logo.png";
        if (m.includes("asrock"))
            return "https://images.seeklogo.com/logo-png/49/1/asrock-logo-png_seeklogo-490350.png";
        if (m.includes("asus") && model.includes("prime"))
            return "https://1000logos.net/wp-content/uploads/2016/10/Asus-Logo.png";
    }

    // Electric Guitar
    if (table === "electric_guitars") {
        if (m.includes("ibanez"))
            return "https://i.etsystatic.com/34531699/r/il/cce3ab/3800330793/il_1140xN.3800330793_2y7v.jpg";
        if (m.includes("fender"))
            return "https://i.etsystatic.com/34531699/r/il/5c4684/3935469309/il_1140xN.3935469309_a0j4.jpg";
        if (m.includes("gibson"))
            return "https://upload.wikimedia.org/wikipedia/commons/5/51/Gibson_Guitar_logo.svg";

    }

    // Bass Guitar
    if (table === "bassers") {
        if (m.includes("yamaha"))
            return "https://1000logos.net/wp-content/uploads/2020/06/Yamaha-Logo.png";
        if (m.includes("fender"))
            return "https://i.etsystatic.com/34531699/r/il/5c4684/3935469309/il_1140xN.3935469309_a0j4.jpg";
    }

    // Alt Saxophone
    if (table === "alt_saxophone") {
        return "https://cdn-icons-png.flaticon.com/512/2965/2965647.png";
    }

    // Coupe Car
    if (table === "coupe_car") {
        if (model.includes("bmw"))
            return "https://www.bmwusa.com/content/dam/bmwusa/4-series/coupe/2024/desktop/BMW-MY24-4SeriesCoupe-430i-xDrive-1.png";
        if (model.includes("audi"))
            return "https://www.audi.hu/media/Theme_Banner_Banner_Image_Component/8559-banner_image/dh-640-2bb7ad/1366x683-a5_3_4_front.jpg";
        if (model.includes("mercedes"))
            return "https://www.mbusa.com/content/dam/mb-nafta/us/myco/my24/c/class/sedan/all-vehicles/2024-C-SEDAN-AVP-DR.png";
        return "https://cdn-icons-png.flaticon.com/512/7436/7436317.png";
    }

    // DEFAULT kép bármire
    return "https://via.placeholder.com/200?text=No+Image";
}
