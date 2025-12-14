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
        await loadImageMap();
        await loadProducts();
    }


    if (path === "/profile") {
        await loadProfile();
    }

    if (path !== "/regist") {
        await checkLoginStatus();
    }
    if (path === "/admin") {
        await loadAdminTables();
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
    const adminLink = document.getElementById("admin-link");

    if (!authBtn) return;

    try {
        const res = await fetch("/api/me", { credentials: "include" });

        if (!res.ok) {
            setConnectButton(authBtn);
            if (adminLink) adminLink.classList.add("hidden");
            return;
        }

        const data = await res.json();

        if (data.loggedIn) {
            setLogoutButton(authBtn);

            // 👑 ADMIN CHECK
            if (data.user.isAdmin && adminLink) {
                adminLink.classList.remove("hidden");
            } else if (adminLink) {
                adminLink.classList.add("hidden");
            }

        } else {
            setConnectButton(authBtn);
            if (adminLink) adminLink.classList.add("hidden");
        }

    } catch {
        setConnectButton(authBtn);
        if (adminLink) adminLink.classList.add("hidden");
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
   GLOBAL PRODUCT SEARCH
---------------------------------- */

let allProducts = [];
let currentResults = [];

async function loadProducts() {
    const grid = document.getElementById("product-grid");
    try {
        const res = await fetch("/api/products/tables");

        if (!res.ok) {
            const txt = await res.text();
            console.error("❌ /api/products/tables failed:", res.status, txt);
            if (grid) grid.innerHTML = `<p class="muted">❌ Hiba: /api/products/tables (${res.status})</p>`;
            return;
        }

        const { tables } = await res.json();

        console.log("✅ PRODUCT TABLES:", tables);

        if (!Array.isArray(tables) || tables.length === 0) {
            if (grid) grid.innerHTML = `<p class="muted">Nincs egyetlen product tábla sem (nincs [ a névben).</p>`;
            return;
        }

        const requests = tables.map(t =>
            fetch(`/api/public/table/${t}`)
                .then(async r => {
                    if (!r.ok) {
                        const txt = await r.text();
                        console.error(`❌ table fetch failed: ${t}`, r.status, txt);
                        return [];
                    }
                    return r.json();
                })
                .catch(err => {
                    console.error(`❌ fetch crashed: ${t}`, err);
                    return [];
                })
                .then(rows => rows.map(row => normalizeProduct(row, t)))
        );

        const results = await Promise.all(requests);
        allProducts = results.flat();

        console.log("✅ PRODUCTS:", allProducts.length);
        renderProducts(allProducts);

    } catch (err) {
        console.error("❌ loadProducts error:", err);
        if (grid) grid.innerHTML = `<p class="muted">❌ JS error: ${err.message}</p>`;
    }
}





function normalizeProduct(row, table) {
    const lower = {};
    Object.keys(row).forEach(k => lower[k.toLowerCase()] = row[k]);

    return {
        table,
        id: lower.id,
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
            window.location.href = `/product.html?table=${p.table}&id=${p.id}`;
        };




        grid.appendChild(div);
    });
}


let IMAGE_MAP = {};

async function loadImageMap() {
    try {
        const res = await fetch("/api/images");
        if (!res.ok) {
            console.warn("⚠️ No images map");
            IMAGE_MAP = {};
            return;
        }
        IMAGE_MAP = await res.json();
        console.log("🖼 IMAGE MAP LOADED:", IMAGE_MAP);
    } catch (err) {
        console.error("❌ loadImageMap error:", err);
        IMAGE_MAP = {};
    }
}



function getProductImage(table, product) {
    if (!IMAGE_MAP || !IMAGE_MAP[table]) {
        return "https://via.placeholder.com/200?text=No+Image";
    }

    const text = ((product.manufacturer || "") + " " + (product.model || "")).toLowerCase();
    const rules = IMAGE_MAP[table];

    for (const key in rules) {
        if (text.includes(key)) {
            return rules[key];
        }
    }

    return "https://via.placeholder.com/200?text=No+Image";
}






document.addEventListener("input", e => {
    if (e.target.id !== "table-search") return;

    const term = e.target.value.toLowerCase().trim();

    if (!term) {
        renderTableList(adminTables);
        return;
    }

    const filtered = adminTables.filter(t =>
        t.toLowerCase().includes(term)
    );

    renderTableList(filtered);
});



let adminTables = [];


async function loadAdminTables() {
    const list = document.getElementById("table-list");
    if (!list) return;

    const res = await fetch("/api/all", { credentials: "include" });
    const { tables } = await res.json();

    adminTables = tables;
    renderTableList(tables);
}

function renderTableList(tables) {
    const list = document.getElementById("table-list");
    list.innerHTML = "";

    tables.forEach(t => {
        const li = document.createElement("li");
        li.textContent = t;
        li.onclick = () => selectTable(t, li);
        list.appendChild(li);
    });
}


async function selectTable(table, el) {
    document.querySelectorAll(".admin-sidebar li")
        .forEach(li => li.classList.remove("active"));

    el.classList.add("active");
    document.getElementById("active-table").textContent = table;

    const res = await fetch(`/api/table/${table}`, { credentials: "include" });
    const rows = await res.json();

    renderAdminTable(rows);
}

function renderAdminTable(rows) {
    const thead = document.getElementById("admin-thead");
    const tbody = document.getElementById("admin-tbody");

    thead.innerHTML = "";
    tbody.innerHTML = "";

    if (!rows.length) return;

    // HEAD
    const headRow = document.createElement("tr");
    Object.keys(rows[0]).forEach(col => {
        if (col === "password") return; // 🔒
        const th = document.createElement("th");
        th.textContent = col;
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);

    // BODY
    rows.forEach(r => {
        const tr = document.createElement("tr");
        Object.entries(r).forEach(([k, v]) => {
            if (k === "password") return;
            const td = document.createElement("td");
            td.textContent = v ?? "—";
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}



