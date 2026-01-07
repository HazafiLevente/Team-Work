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

        const addBtn = document.getElementById("add-query-btn");
        if (addBtn) {
            addBtn.addEventListener("click", () => {
                const editor = document.getElementById("sql-editor");
                const textarea = document.getElementById("sql-textarea");
                const result = document.getElementById("sql-result");

                editor.classList.remove("hidden");
                textarea.value = "";
                result.textContent = "";
                textarea.placeholder = "SELECT * FROM table_name LIMIT 10;";
            });
        }
    }

    if (path === "/setup") {
        const ok = await requireLoginOrRedirect(); // Ha nincs belépve, ez átviszi a /regist-re
        if (ok) {
            await loadMySetupsPage();
        }
    }




    /* ----------------------------------
       PRODUCT PAGE LOADER
    ---------------------------------- */


    // ❗ Csak product oldalon fusson
    // ✅ HELYES – csak product logika
    if (window.location.pathname.includes("product.html")) {
        const box = document.getElementById("product-box");
        if (!box) return;

        const params = new URLSearchParams(window.location.search);
        const table = params.get("table");
        const id = params.get("id");

        if (!table || !id) {
            box.innerHTML = `<h2>❌ Hibás URL</h2>`;
            return;
        }

        try {
            const res = await fetch(`/api/public/table/${table}`);
            if (!res.ok) {
                box.innerHTML = `<h2>❌ Nem sikerült betölteni az adatokat.</h2>`;
                return;
            }

            const data = await res.json();

            // 🔥 NORMALIZÁLT ID KERESÉS (EZ A FIX)
            const foundRow = data.find(row => {
                const lower = {};
                Object.keys(row).forEach(k => lower[k.toLowerCase()] = row[k]);
                return String(lower.id) === String(id);
            });

            if (!foundRow) {
                box.innerHTML = `<h2>❌ Termék nem található.</h2>`;
                return;
            }

            // 🔁 végleges normalizált objektum
            const lower = {};
            Object.keys(foundRow).forEach(k => lower[k.toLowerCase()] = foundRow[k]);

            const img = getProductImage(table, lower);

            box.innerHTML = `
            <h2>${lower.model || lower.name || "Ismeretlen modell"}</h2>
            <div class="neon-line"></div>

            <img src="${img}"
                 style="width:220px;height:220px;object-fit:contain;margin-bottom:20px;">

            <p><strong>Kategória:</strong> ${table}</p>
            <p><strong>Gyártó:</strong> ${lower.manufacturer || lower.brand || "N/A"}</p>

            <div style="margin-top:20px">
                ${Object.entries(lower)
                .filter(([k]) => !["id","model","manufacturer","brand"].includes(k))
                .map(([k,v]) => `<p><strong>${k}:</strong> ${v}</p>`)
                .join("")}
            </div>

            <br>
            <button class="btn" onclick="window.history.back()">⬅ Vissza</button>
        `;

        } catch (err) {
            console.error("❌ product load error:", err);
            box.innerHTML = `<h2>❌ Hiba történt.</h2>`;
        }
    }




});

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
   LOGIN PAGE
---------------------------------- */


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

/* ----------------------------------
   REGISTRATION PAGE
---------------------------------- */


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

async function requireLoginOrRedirect() {
    const res = await fetch("/api/me", { credentials: "include" });
    if (!res.ok) {
        window.location.href = "/regist";
        return false;
    }

    const data = await res.json();
    if (!data.loggedIn) {
        window.location.href = "/regist";
        return false;
    }

    return true;
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

/* ----------------------------------
   MYSETUP PAGE
---------------------------------- */


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


function renderSetupCards(setups) {
    const list = document.getElementById("setup-list");
    if (!list) return;

    list.innerHTML = "";

    setups.forEach(setup => {
        const div = document.createElement("div");
        div.className = "setup-card";

        div.innerHTML = `
            <div class="setup-card-header">
                <h3>${setup.setup_name}</h3>
                <button class="dots-btn" onclick="toggleSetupMenu(event, ${setup.id})">⋮</button>
            </div>

            <div class="setup-menu hidden" id="menu-${setup.id}">
                <button class="danger-btn" onclick="confirmDeleteSetup(${setup.id})">
                    🗑 Setup törlése
                </button>
            </div>
        `;

        div.addEventListener("click", () => loadSetupChildren(setup.id));
        list.appendChild(div);
    });

    // ➕ Új setup kártya
    const addCard = document.createElement("div");
    addCard.className = "setup-card setup-card-add";
    addCard.innerHTML = `
        <div style="text-align:center;">
            <span style="font-size:40px">+</span>
            <div class="muted">Új setup</div>
        </div>
    `;
    addCard.onclick = createNewSetup;
    list.appendChild(addCard);
}



function toggleSetupMenu(event, setupId) {
    event.stopPropagation();

    document.querySelectorAll(".setup-menu").forEach(m => {
        if (m.id !== `menu-${setupId}`) m.classList.add("hidden");
    });

    const menu = document.getElementById(`menu-${setupId}`);
    if (menu) menu.classList.toggle("hidden");
}

async function confirmDeleteSetup(setupId) {
    const ok = confirm("Biztosan törölni szeretnéd ezt a setupot?");
    if (!ok) return;

    try {
        const res = await fetch(`/api/my-setups/${setupId}`, {
            method: "DELETE",
            credentials: "include"
        });

        if (!res.ok) {
            alert("❌ Nem sikerült törölni");
            return;
        }

        await loadMySetupsPage();

    } catch (err) {
        console.error(err);
        alert("❌ Hiba történt");
    }
}

/* ----------------------------------
   CHILD SETUP KEZELÉS
---------------------------------- */

// Ez a függvény rajzolja ki a kártyákat + a "Hozzáadás" gombot
function renderChildCards(children, setupId) {
    const list = document.getElementById("child-list");
    if (!list) return;
    list.innerHTML = "";

    // 1. MEGLÉVŐ ELEMEK LISTÁZÁSA
    children.forEach(child => {
        const div = document.createElement("div");
        div.className = "setup-card";

        // Ikon kiválasztása
        let icon = "❓";
        if (child.type === "pc") icon = "🖥️";
        if (child.type === "car") icon = "🚗";
        if (child.type === "home_theater") icon = "🎬";
        if (child.type === "studio") icon = "🎵";

        div.innerHTML = `
            <h3>${icon} ${child.setup_name}</h3>
            <p class="muted" style="font-size:12px">${child.label}</p>

            <div class="setup-menu" onclick="toggleChildMenu(event, 'menu-${child.id}-${child.type}')">⋮</div>
            
            <div id="menu-${child.id}-${child.type}" class="setup-dropdown hidden">
                <div onclick="deleteChild('${child.type}', '${child.id}', '${setupId}', event)">🗑️ Törlés</div>
            </div>
        `;

        // Kattintás a kártyára (részletek)
        div.onclick = () => alert(`Részletek megnyitása: ${child.setup_name}`);

        list.appendChild(div);
    });

    // 2. A "HOZZÁADÁS" KÁRTYA (VÁLTOZATLAN)
    const addCard = document.createElement("div");
    addCard.className = "setup-card setup-card-add";
    addCard.style.display = "flex";
    addCard.style.flexDirection = "column";
    addCard.style.justifyContent = "center";
    addCard.style.alignItems = "center";
    addCard.style.cursor = "pointer";
    addCard.style.border = "2px dashed rgba(255,255,255,0.2)";

    addCard.innerHTML = `
        <span style="font-size:32px; margin-bottom:5px;">+</span>
        <span style="font-size:14px;" class="muted">Elem hozzáadása</span>
    `;
    addCard.onclick = () => showAddChildModal(setupId);
    list.appendChild(addCard);
}

function showAddChildModal(setupId) {
    const existing = document.getElementById("custom-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "custom-modal";
    // Stílus, hogy jól nézzen ki
    modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:1000;";

    modal.innerHTML = `
        <div style="background:#1a1a1a; padding:30px; border-radius:12px; width:90%; max-width:450px; border:1px solid #333; text-align:center; color: white;">
            <h2 style="margin-bottom:20px;">Mit szeretnél hozzáadni?</h2>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px;">
                <button class="btn" onclick="openSearchModal('${setupId}', 'pc')">🖥️ PC Alkatrész</button>
                <button class="btn" onclick="openSearchModal('${setupId}', 'car')">🚗 Autó</button>
                <button class="btn" onclick="openSearchModal('${setupId}', 'home_theater')">🎬 Mozi eszköz</button>
                <button class="btn" onclick="openSearchModal('${setupId}', 'studio')">🎵 Stúdió cucc</button>
            </div>
            <button class="btn small" style="background:transparent; border:1px solid #555; color: white;" onclick="document.getElementById('custom-modal').remove()">Mégse</button>
        </div>
    `;
    document.body.appendChild(modal);
}


// 📡 API HÍVÁS A LÉTREHOZÁSHOZ
async function createChild(setupId, type, defaultName) {
    // Bezárjuk a modalt
    document.getElementById("custom-modal").remove();

    // Név bekérése
    const name = prompt(`Nevezd el az új ${type} elemet:`, defaultName);
    if (!name) return;

    try {
        const res = await fetch(`/api/setup/${setupId}/child`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, name }),
            credentials: "include"
        });

        const data = await res.json();

        if (res.ok) {
            // Siker! Újratöltjük a listát, hogy megjelenjen az új elem
            loadSetupChildren(setupId);
        } else {
            alert("Hiba: " + data.error);
        }

    } catch (err) {
        console.error(err);
        alert("Szerver hiba történt.");
    }
}


// 🛠️ MENÜ MEGJELENÍTÉSE / ELREJTÉSE
function toggleChildMenu(event, menuId) {
    event.stopPropagation(); // Ne nyissa meg a kártyát

    // Először becsukjuk az összes többit
    document.querySelectorAll(".setup-dropdown").forEach(el => el.classList.add("hidden"));

    const menu = document.getElementById(menuId);
    if (menu) {
        menu.classList.toggle("hidden");
    }
}

// Ha bárhova máshova kattintunk, záródjanak be a menük
document.addEventListener("click", () => {
    document.querySelectorAll(".setup-dropdown").forEach(el => el.classList.add("hidden"));
});


// 🗑️ TÖRLÉS FUNKCIÓ
async function deleteChild(type, id, setupId, event) {
    if (event) event.stopPropagation(); // Ne klikkeljen a kártyára

    if (!confirm("Biztosan törölni szeretnéd ezt az elemet?")) return;

    try {
        const res = await fetch(`/api/child/${type}/${id}`, {
            method: "DELETE",
            credentials: "include"
        });

        const data = await res.json();

        if (res.ok) {
            // Siker esetén frissítjük a nézetet
            loadSetupChildren(setupId);
        } else {
            alert("Hiba: " + (data.error || "Ismeretlen hiba"));
        }
    } catch (err) {
        console.error(err);
        alert("Hálózati hiba.");
    }
}

/* ----------------------------------
   GLOBAL PRODUCT SEARCH
---------------------------------- */

let allProducts = [];
let currentResults = [];

let activeBrands = new Set();
let filterPanelOpen = false;



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
        buildBrandFilters(allProducts);


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

function buildBrandFilters(products) {
    const box = document.getElementById("brand-filters");
    if (!box) return;

    box.innerHTML = "";

    const brands = [...new Set(
        products.map(p => p.manufacturer).filter(Boolean)
    )].sort();

    brands.forEach(brand => {
        const id = `brand-${brand.replace(/\s+/g, "-")}`;

        const label = document.createElement("label");
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.gap = "8px";
        label.style.cursor = "pointer";

        label.innerHTML = `
            <input type="checkbox" id="${id}" />
            <span>${brand}</span>
        `;

        const checkbox = label.querySelector("input");

        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                activeBrands.add(brand);
            } else {
                activeBrands.delete(brand);
            }
            applyFilters();
        });

        box.appendChild(label);
    });
}

function applyFilters() {
    const term = document
        .getElementById("search-input")
        .value
        .toLowerCase()
        .trim();

    let result = allProducts;

    // 🔍 TEXT SEARCH
    if (term) {
        result = result.filter(p =>
            p.manufacturer.toLowerCase().includes(term) ||
            p.model.toLowerCase().includes(term) ||
            p.table.toLowerCase().includes(term)
        );
    }

    // 🧰 BRAND FILTER
    if (activeBrands.size > 0) {
        result = result.filter(p =>
            activeBrands.has(p.manufacturer)
        );
    }

    renderProducts(result);
}


/* ----------------------------------
   SEARCH FILTER
---------------------------------- */

document.addEventListener("click", e => {
    if (e.target.id !== "filter-toggle-btn") return;

    const panel = document.getElementById("filter-panel");
    filterPanelOpen = !filterPanelOpen;

    panel.classList.toggle("hidden", !filterPanelOpen);
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







/* ----------------------------------
   ADMIN PAGE
---------------------------------- */

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

document.addEventListener("input", e => {
    if (e.target.id !== "admin-row-search") return;

    const term = e.target.value.toLowerCase().trim();

    if (!term) {
        renderAdminTable(currentTableRows);
        return;
    }

    const filtered = currentTableRows.filter(row =>
        Object.values(row).some(v =>
            String(v).toLowerCase().includes(term)
        )
    );

    renderAdminTable(filtered);
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

    currentTableRows = rows;   // ⬅️ CACHE
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

/* ----------------------------------
   ADMIN SQL QUERY STATE
---------------------------------- */

let currentSQL = "";

document.addEventListener("DOMContentLoaded", () => {
    const addBtn = document.getElementById("add-query-btn");
    if (!addBtn) return;

    addBtn.addEventListener("click", () => {
        const editor = document.getElementById("sql-editor");
        const textarea = document.getElementById("sql-textarea");
        const result = document.getElementById("sql-result");

        editor.classList.remove("hidden");
        textarea.value = "";
        result.textContent = "";

        // segéd minta
        textarea.placeholder = "SELECT * FROM table_name LIMIT 10;";
    });
});

async function runSQL() {
    const textarea = document.getElementById("sql-textarea");
    const resultBox = document.getElementById("sql-result");

    const sql = textarea.value.trim();
    if (!sql) {
        resultBox.textContent = "❌ Üres SQL";
        return;
    }

    resultBox.textContent = "⏳ Running query...";

    try {
        const res = await fetch("/api/admin/sql/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ sql })
        });

        const data = await res.json();

        if (!res.ok) {
            resultBox.textContent = "❌ ERROR:\n" + (data.error || "Unknown error");
            return;
        }

        resultBox.textContent = JSON.stringify(data, null, 2);

    } catch (err) {
        console.error(err);
        resultBox.textContent = "❌ JS error: " + err.message;
    }
}

function saveSQL() {
    alert("💾 Save később jön (Supabase table)");
}

function discardSQL() {
    document.getElementById("sql-editor").classList.add("hidden");
    document.getElementById("sql-textarea").value = "";
    document.getElementById("sql-result").textContent = "";
}


/* ----------------------------------
   SETUP PAGE
---------------------------------- */



async function loadSetupChildren(setupId) {
    const content = document.querySelector(".content");

    // 1. Alap szerkezet felépítése (Címsor + Üres konténer a listának)
    content.innerHTML = `
        <button class="btn small" onclick="loadMySetupsPage()">⬅ Vissza a setupokhoz</button>
        <h2>Setup konfigurációk</h2>
        <div class="neon-line"></div>
        
        <div class="setup-page-wide">
            <div id="child-list" class="setup-grid-wide">
                <p class="muted">⏳ Betöltés...</p>
            </div>
        </div>
    `;

    try {
        // 2. Adatok lekérése a szervertől (az új, bővített API-ról)
        const res = await fetch(`/api/setup/${setupId}/children`, {
            credentials: "include"
        });

        if (!res.ok) {
            document.getElementById("child-list").innerHTML = `<p class="muted">❌ Hiba az adatok betöltésekor.</p>`;
            return;
        }

        const data = await res.json();

        // 3. 🔥 ITT A LÉNYEG: Meghívjuk a renderelő függvényt! 🔥
        // Ez fogja kirakni a kártyákat és a "+" gombot is.
        renderChildCards(data.children || [], setupId);

    } catch (err) {
        console.error(err);
        document.getElementById("child-list").innerHTML = `<p class="muted">❌ Szerver hiba.</p>`;
    }
}

async function loadSetupDetails(type, id) {
    const content = document.querySelector(".content");

    content.innerHTML = `
        <button class="btn small" onclick="loadMySetupsPage()">⬅ Vissza</button>
        <p class="muted">⏳ Betöltés...</p>
    `;

    const res = await fetch(
        `/api/setup/details?type=${type}&id=${id}`,
        { credentials: "include" }
    );

    const data = await res.json();

    content.innerHTML = `
        <button class="btn small" onclick="loadMySetupsPage()">⬅ Vissza</button>
        <h2>${data.setup.setup_name}</h2>
        <div class="neon-line"></div>
        <div class="setup-page-wide">
            <div id="device-list" class="setup-grid-wide"></div>
        </div>

    `;

    renderGenericItems(data.items);
}



function renderGenericItems(items) {
    const list = document.getElementById("device-list");
    list.innerHTML = "";

    if (!items || items.length === 0) {
        list.innerHTML = `<p class="muted">❌ Nincs adat</p>`;
        return;
    }

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "setup-card";

        div.innerHTML = `
            <h3>${item.label}</h3>
            <p class="muted">${item.value || "—"}</p>
        `;

        list.appendChild(div);
    });
}

async function loadMySetupsPage() {
    const content = document.querySelector(".content");
    if (!content) return;

    content.innerHTML = `
        <h2>My Setups</h2>
        <div class="neon-line"></div>
        <div id="setup-list" class="setup-grid">
            <p class="muted">⏳ Betöltés...</p>
        </div>
    `;

    try {
        const res = await fetch("/api/my-setups", { credentials: "include" });
        const data = await res.json();

        renderSetupCards(data.setups || []);

    } catch (err) {
        console.error(err);
        document.getElementById("setup-list").innerHTML =
            `<p class="muted">❌ Hiba történt.</p>`;
    }
}


async function createNewSetup() {
    const name = prompt("Add meg az új setup nevét:");
    if (!name) return;

    const res = await fetch("/api/my-setups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name })
    });

    if (!res.ok) {
        alert("❌ Nem sikerült létrehozni");
        return;
    }

    loadMySetupsPage();
}

async function deleteSetup(setupId, event) {

    if (event) event.stopPropagation();

    if (!confirm("Biztosan törölni szeretnéd ezt a setupot?")) return;

    try {
        const res = await fetch(`/api/my-setups/${setupId}`, {
            method: "DELETE",
            credentials: "include"
        });

        const data = await res.json();

        if (res.ok && data.success) {
            alert("Setup sikeresen törölve!");
            await loadMySetupsPage(); // Lista frissítése
        } else {
            alert("Hiba a törlés során: " + (data.error || "Ismeretlen hiba"));
        }
    } catch (err) {
        console.error("Delete fetch error:", err);
        alert("Hálózati hiba történt a törléskor.");
    }
}


async function loadMySetups() {
    const box = document.getElementById("setup-list");
    if (!box) return;

    try {
        const res = await fetch("/api/my-setups", {
            credentials: "include"
        });

        if (!res.ok) throw new Error("API error");

        const setups = await res.json();
        renderSetupCards(setups);

    } catch (err) {
        console.error(err);
        box.innerHTML = "<p class='error'>❌ Hiba történt.</p>";
    }
}

function openSearchModal(setupId, type) {
    // Eltávolítjuk a választó modalt
    const prev = document.getElementById("custom-modal");
    if(prev) prev.remove();

    const modal = document.createElement("div");
    modal.id = "search-modal";
    // Sötét háttér a keresőnek
    modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); display:flex; flex-direction:column; align-items:center; padding-top:100px; z-index:1100; color:white;";

    modal.innerHTML = `
        <div style="width:90%; max-width:600px; text-align:center;">
            <h2 style="margin-bottom:20px;">Keresés az adatbázisban</h2>
            <input type="text" id="item-search-input" placeholder="Kezdj el gépelni (pl. Ferrari)..." 
                   style="width:100%; padding:15px; font-size:18px; border-radius:8px; border:1px solid #444; background:#222; color:white; margin-bottom:20px;">
            <div id="search-results" style="max-height:50vh; overflow-y:auto; text-align:left; background:#1a1a1a; border-radius:8px;">
                <p style="padding:20px; color:#888; text-align:center;">Gépelj legalább 2 karaktert...</p>
            </div>
            <button class="btn" style="margin-top:20px; background:#444;" onclick="document.getElementById('search-modal').remove()">Mégse</button>
        </div>
    `;

    document.body.appendChild(modal);

    const input = document.getElementById("item-search-input");
    input.focus();

    // Figyeljük a gépelést
    input.onkeyup = async (e) => {
        const query = e.target.value;
        const resultsDiv = document.getElementById("search-results");

        if (query.length < 2) return;

        try {
            const res = await fetch(`/api/items/search?type=${type}&query=${query}`, { credentials: "include" });
            const data = await res.json();

            resultsDiv.innerHTML = "";
            if (data.results.length === 0) {
                resultsDiv.innerHTML = '<p style="padding:20px;">Nincs találat.</p>';
                return;
            }

            data.results.forEach(item => {
                const itemDiv = document.createElement("div");
                itemDiv.style.cssText = "padding:15px; border-bottom:1px solid #333; cursor:pointer; hover:background:#333;";
                itemDiv.innerHTML = `<strong>${item.name}</strong> <br> <small style="color:#888;">${item.category}</small>`;

                // KIVÁLASZTÁS
                itemDiv.onclick = () => saveSelection(setupId, type, item.name);
                resultsDiv.appendChild(itemDiv);
            });
        } catch (err) {
            console.error("Keresési hiba:", err);
        }
    };
}

// Mentés funkció
async function saveSelection(setupId, type, itemName) {
    document.getElementById("search-modal").remove();
    try {
        const res = await fetch(`/api/setup/${setupId}/child`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, name: itemName }),
            credentials: "include"
        });
        if (res.ok) {
            loadSetupChildren(setupId); // Frissítjük a kártyákat
        }
    } catch (err) {
        console.error(err);
    }
}