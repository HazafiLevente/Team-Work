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
        await checkLoginStatus();

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
        await loadMySetupsPage();
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

/* ----------------------------------
   LOGIN BUTTON
---------------------------------- */

async function checkLoginStatus() {
    const authBtn = document.getElementById("auth-btn");
    const adminLink = document.getElementById("admin-link");

    if (!authBtn) {
        setTimeout(checkLoginStatus, 50);
        return;
    }


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
            if (["admin","admin+","owner"].includes(data.user.role)) {
                adminLink.classList.remove("hidden");
            } else if (adminLink) {
                adminLink.classList.add("hidden");
            }

        } else {
            setConnectButton(authBtn);
            if (adminLink) adminLink.classList.add("hidden");
        }
        window.CURRENT_USER_ROLE = data.user.role;
        console.log("CURRENT_USER_ROLE:", window.CURRENT_USER_ROLE);

    } catch {
        setConnectButton(authBtn);
        if (adminLink) adminLink.classList.add("hidden");
    }

}

function setConnectButton(btn) {
    btn.textContent = "Connect";
    btn.onclick = () => {
        window.location.href = "/regist";
    };
}
function setLogoutButton(btn) {
    btn.textContent = "Logout";
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

        // 🔥 EZ A FONTOS RÉSZ
        model:
            lower.model ||
            lower.product_name ||
            lower.name ||
            "Unknown",

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


//PRODUCTIMAGE//

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





const TABLE_IMAGE_CATEGORY_MAP = {
    hatchback_cars: "cars",
    coupe_cars: "cars",
    cabrio_cars: "cars",
    wagon_cars: "cars",
    mpv_cars: "cars",

    electric_guitars: "electric_guitars",
    acoustic_guitars: "acoustic-guitars",
    bassers: "bass",

    drums_acoustic: "drums(acoustic)",
    acoustic_drums: "drums(acoustic)",
    drums_electric: "drums(electronic)",
    electric_drums: "drums(electronic)",

    guitaramps_normal: "guitaramps-normal",
    guitaramps_tubed: "guitaramps-tubed",

    daws: "daws",


    multi_effects: "effect-multieffects",
    effects_pedal:"effect-effectpedal",

    mixer: "mixer",
    soundcard: "soundcard",
    soundcards: "soundcard",

    midis: "midis",

    guitarstrings: "guitarstring",

    microphones: "microphones",

    software_products: "softwares",

    alt_saxophone:"alt_saxophones",
    alt_saxophones:"alt_saxophones",

    audio_processors: "audio_processor",

    wind_instrument_oils: "wind_instruments_cremes_oils",

    cleaning_brushes: "cleaning_brushes",

    saxophone_cases: "saxophone_case",

    c_trumpets: "c_trumpets",

    home_theater: "home_theater",
    home_theatre: "home_theatre",

    studio_audio_speakers: "studio_audio_speakers",

    processors: "processors",
    motherboards: "motherboard",

    ram: "rams",
    rams: "rams",
    video_cards: "videocards",
    psu:"psu"

};


function getProductImage(table, product) {
    if (!IMAGE_MAP || Object.keys(IMAGE_MAP).length === 0) {
        return "https://via.placeholder.com/200?text=No+Image";
    }

    const category = normalizeTableName(table);
    const categoryRules = getCategoryRules(category);

    const text = normalizeText(
        (product.manufacturer || "") + " " + (product.model || "")
    );

    if (categoryRules) {
        const entries = Object.entries(categoryRules)
            .map(([key, url]) => ({
                key: normalizeText(key),
                url
            }))
            .sort((a, b) => b.key.length - a.key.length);

        for (const entry of entries) {
            if (text.includes(entry.key)) {
                return entry.url;
            }
        }

        // 🟡 fallback: első kép a kategóriából
        const fallback = Object.values(categoryRules)[0];
        if (fallback) return fallback;
    }

    return "https://via.placeholder.com/200?text=No+Image";
}


function normalizeTableName(table) {
    const clean = table
        .toLowerCase()
        .replace("public.", "")
        .replace("_setup", "")
        .replace("[setup]", "")
        .replace(/-/g, "_")
        .replace(/\s+/g, "_")
        .trim();

    return TABLE_IMAGE_CATEGORY_MAP[clean] || clean;
}




function normalizeText(str = "") {
    return String(str)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/['".]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


function getCategoryRules(category) {
    const normalizedCategory = normalizeText(category);

    for (const [key, value] of Object.entries(IMAGE_MAP)) {
        if (normalizeText(key) === normalizedCategory) {
            return value;
        }
    }
    return null;
}





/* ----------------------------------
   ADMIN PAGE
---------------------------------- */

let adminAllRows = [];
let currentTableRows = [];
let adminTables = [];

document.addEventListener("input", e => {
    if (e.target.id !== "admin-row-search") return;

    const term = e.target.value.toLowerCase().trim();

    if (!term) {
        renderAdminTable(adminAllRows);
        return;
    }

    const filtered = adminAllRows.filter(row =>
        Object.values(row).some(v =>
            String(v).toLowerCase().includes(term)
        )
    );

    renderAdminTable(filtered);
});

document.addEventListener("input", e => {
    if (e.target.id !== "admin-table-search") return;

    const term = e.target.value.toLowerCase().trim();

    if (!term) {
        renderTableList(adminTables); // vissza az összes
        return;
    }

    const filtered = adminTables.filter(t =>
        t.toLowerCase().includes(term)
    );

    renderTableList(filtered);
});




async function loadAdminTables() {
    const res = await fetch("/api/all", { credentials: "include" });
    const { tables } = await res.json();
    adminTables = tables;
    renderTableList(tables);
}

function renderTableList(tables) {
    const list = document.getElementById("table-list");
    if (!list) return;

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

    let rows;

    if (table === "user[Auth]") {
        const res = await fetch("/api/admin/users", { credentials: "include" });
        rows = await res.json();
    } else {
        const res = await fetch(`/api/table/${table}`, { credentials: "include" });
        rows = await res.json();
    }


    adminAllRows = rows;
    currentTableRows = rows;
    renderAdminTable(rows);

}

/* ==================================================
   ADMIN – TABLE RENDER (⋮ MENÜ!)
================================================== */
function renderAdminTable(rows) {
    const thead = document.getElementById("admin-thead");
    const tbody = document.getElementById("admin-tbody");


    thead.innerHTML = "";
    tbody.innerHTML = "";

    if (!rows || rows.length === 0) return;

    const isUserTable =
        "Email" in rows[0] &&
        "UserName" in rows[0];

    /* ---------- HEAD ---------- */
    const headRow = document.createElement("tr");

    Object.keys(rows[0]).forEach(col => {
        if (col === "password") return;
        const th = document.createElement("th");
        th.textContent = col;
        headRow.appendChild(th);
    });

    if (isUserTable) {
        const roleTh = document.createElement("th");
        roleTh.textContent = "Role";
        headRow.appendChild(roleTh);
    }

    const actionTh = document.createElement("th");
    actionTh.textContent = "⋮";
    headRow.appendChild(actionTh);

    thead.appendChild(headRow);

    /* ---------- BODY ---------- */
    rows.forEach(r => {
        const tr = document.createElement("tr");

        // 🔥 EZ KELL
        tr.dataset.pk = r.id ?? r.ID ?? r.Id;
        tr.dataset.pkColumn = r.id !== undefined
            ? "id"
            : r.ID !== undefined
                ? "ID"
                : r.Id !== undefined
                    ? "Id"
                    : null;


        Object.entries(r).forEach(([k, v]) => {
            if (k === "password") return;
            if (isUserTable && k === "role") return; // 🔥 EZ IS

            const td = document.createElement("td");
            td.textContent = v ?? "—";
            td.dataset.column = k;
            tr.appendChild(td);
        });


        if (isUserTable) {
            const roleTd = document.createElement("td");
            roleTd.textContent = r.role?.toUpperCase() || "USER";
            roleTd.style.fontWeight = "600";
            roleTd.style.opacity = "0.8";
            tr.appendChild(roleTd);
        }

        const actionTd = document.createElement("td");
        const menuBtn = document.createElement("div");
        menuBtn.className = "menu-dots";
        menuBtn.innerHTML = "&#8942;";


        menuBtn.onclick = e => {
            e.stopPropagation();
            if (isUserTable) {
                openUserMenu(r, menuBtn);
            } else {
                openGenericMenu(r, menuBtn);
            }
        };



        actionTd.appendChild(menuBtn);
        tr.appendChild(actionTd);
        tbody.appendChild(tr);

        tr.ondblclick = () => {
            enableRowEdit(tr, r);
        };


    });
    // ➕ ADD ROW BAR – VÉGÉN (NEM user[Auth]-nál)
    if (!isUserTable) {
        const addRowTr = document.createElement("tr");
        addRowTr.className = "add-row-tr";

        const addTd = document.createElement("td");
        addTd.colSpan = thead.querySelectorAll("th").length;
        addTd.innerHTML = `<div class="add-row-btn">➕ Új sor hozzáadása</div>`;

        addTd.onclick = () => createEmptyRow(rows[0]);

        addRowTr.appendChild(addTd);
        tbody.appendChild(addRowTr);
    }



}

function openGenericMenu(row, anchor) {
    closeAnyMenu();

    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement("div");
    menu.id = "context-menu";
    menu.className = "user-menu neon";

    menu.style.top = rect.bottom + "px";
    menu.style.left = (rect.left - 200) + "px";

    const table = document.getElementById("active-table").textContent;

    menu.innerHTML = `
        <div class="menu-title">Műveletek</div>

        <div class="menu-item danger"
             onclick="deleteGenericRow('${table}', '${row.id ?? row.ID ?? row.Id}')">
            <span style="color:#ff4d4d; font-weight:700; margin-right:6px;">❌</span>
            Törlés
        </div>
    `;

    document.body.appendChild(menu);
    setTimeout(() =>
            document.addEventListener("click", closeAnyMenu, { once: true }),
        0
    );
}


function enableRowEdit(tr, row) {
    if (tr.classList.contains("editing")) return;

    tr.classList.add("editing");

    const table = document.getElementById("active-table").textContent;
    const tds = Array.from(tr.children);

    const original = {};

    tds.forEach((td, index) => {
        const col = td.dataset?.column;
        if (!col) return;

        original[col] = row[col];

        // tiltott mezők
        if (["id", "password", "created_at"].includes(col)) return;

        const input = document.createElement("input");
        input.className = "row-input";
        input.value = row[col] ?? "";

        td.textContent = "";
        td.appendChild(input);
    });

    const cancel = () => {
        tr.classList.remove("editing");
        selectTable(table, document.querySelector(".admin-sidebar li.active"));
    };

    const save = async () => {
        const updates = {};

        tds.forEach(td => {
            const col = td.dataset?.column;
            const input = td.querySelector("input");
            if (!input) return;

            const val = input.value.trim();
            if (val !== String(row[col] ?? "")) {
                updates[col] = val;
            }
        });

        if (Object.keys(updates).length === 0) {
            cancel();
            return;
        }

        const res = await fetch("/api/admin/update-row", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                table,
                id: tr.dataset.pk,
                updates
            })


        });

        if (!res.ok) {
            const err = await res.json();
            alert("❌ Beszúrás sikertelen:\n" + err.error);
            return;
        }


        cancel();
    };

    tr.addEventListener("keydown", e => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") cancel();
    });

    tr.addEventListener("focusout", save, { once: true });
}


/* ==================================================
   ⋮ MENÜK
================================================== */

function closeAnyMenu() {
    const m = document.getElementById("context-menu");
    if (m) m.remove();
}

function openUserMenu(user, anchor) {
    closeAnyMenu();

    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement("div");
    menu.id = "context-menu";
    menu.className = "user-menu neon";

    menu.style.top = rect.bottom + "px";
    menu.style.left = (rect.left - 200) + "px";

    menu.innerHTML = `
        <div class="menu-title">Felhasználó</div>
        <div class="muted">${user.Name} • ${user.role.toUpperCase()}</div>

        <hr>

        <div class="menu-title">👑 Rang adás</div>
        ${renderRoleList(user)}
        
        <hr>
        
        <hr>

        <div class="menu-item danger"
             onclick="deleteRow(${user.id})">
            <span style="color:#ff4d4d; font-weight:700; margin-right:6px;">❌</span>
            Törlés
        </div>

    `;

    document.body.appendChild(menu);
    setTimeout(() =>
            document.addEventListener("click", closeAnyMenu, { once: true }),
        0
    );
}

function renderRoleList(user) {
    const roles = ["owner", "admin+", "admin", "user"];

    return roles.map(role => {
        if (role === user.role) {
            return `
                <div class="role-option disabled">
                    ✔ ${role.toUpperCase()}
                </div>
            `;
        }

        return `
            <div class="role-option"
                 onclick="setUserRole(${user.id}, '${role}')">
                ${role.toUpperCase()}
            </div>
        `;
    }).join("");
}

async function deleteRow(id) {
    const table = document.getElementById("active-table").textContent;

    if (!confirm("⚠️ Biztosan törlöd ezt a sort? Ez nem visszavonható!")) {
        return;
    }

    const res = await fetch("/api/admin/delete-row", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            table,
            id
        })
    });

    const data = await res.json();

    if (!res.ok) {
        alert("❌ Törlés sikertelen: " + data.error);
        return;
    }

    closeAnyMenu();

    // 🔄 frissítjük a táblát
    selectTable(table, document.querySelector(".admin-sidebar li.active"));
}


function openRoleMenu(userId) {
    closeAnyMenu();

    const row = currentTableRows.find(u => u.id === userId);
    if (!row) return;

    openUserMenu(row, document.querySelector(".menu-dots"));
}





function closeModal() {
    const m = document.querySelector(".user-edit-modal");
    if (m) m.remove();
}


function canAssignFrontend(granter, target) {
    const rank = { owner: 3, "admin+": 2, admin: 1, user: 0 };
    return (rank[granter] || 0) > (rank[target] || 0); // ✅ Null-safe check
}




function openDisabledMenu(anchor) {
    closeAnyMenu();

    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement("div");
    menu.id = "context-menu";
    menu.className = "user-menu muted";
    menu.style.top = rect.bottom + "px";
    menu.style.left = rect.left + "px";

    menu.innerHTML = `
        <div class="menu-item">⏳ Később elérhető</div>
    `;

    document.body.appendChild(menu);
    setTimeout(() =>
            document.addEventListener("click", closeAnyMenu, { once: true })
        , 0);
}
async function setUserRole(userId, role) {
    if (!confirm(`Biztosan ${role.toUpperCase()} rangot adsz?`)) return;

    const res = await fetch("/api/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, role })
    });

    const data = await res.json();
    if (!res.ok) {
        alert("❌ " + data.error);
        return;
    }

    closeAnyMenu();

    const table = document.getElementById("active-table").textContent;
    selectTable(table, document.querySelector(".admin-sidebar li.active"));
}


function createEmptyRow(exampleRow) {
    const tbody = document.getElementById("admin-tbody");
    const table = document.getElementById("active-table").textContent;

    const tr = document.createElement("tr");
    tr.className = "editing new-row";

    const inputs = {};

    Object.keys(exampleRow).forEach(col => {
        if (["id", "ID", "created_at", "password"].includes(col)) return;

        const td = document.createElement("td");
        const input = document.createElement("input");

        input.className = "row-input";
        input.placeholder = col;

        inputs[col] = input;
        td.appendChild(input);
        tr.appendChild(td);
    });

    // role / action oszlopok üresen
    const filler = document.createElement("td");
    tr.appendChild(filler);
    tr.appendChild(document.createElement("td"));

    tbody.insertBefore(tr, tbody.lastChild);

    const cancel = () => tr.remove();

    const save = async () => {
        const payload = {};
        Object.entries(inputs).forEach(([k, input]) => {
            const val = input.value.trim();
            if (val !== "") payload[k] = val;
        });

        if (Object.keys(payload).length === 0) {
            cancel();
            return;
        }

        const res = await fetch("/api/admin/insert-row", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ table, payload })
        });

        if (!res.ok) {
            alert("❌ Beszúrás sikertelen");
            return;
        }

        selectTable(table, document.querySelector(".admin-sidebar li.active"));
    };

    tr.addEventListener("keydown", e => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") cancel();
    });

    tr.querySelector("input")?.focus();

    // createEmptyRow végén
    tr.addEventListener("focusout", save, { once: true });

}


/* ==================================================
   ADMIN – TOGGLE ROLE
================================================== */

async function toggleAdmin(userId) {
    if (!confirm("Biztos módosítod az admin jogot?")) return;

    const res = await fetch("/api/admin/toggle-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId })
    });

    const data = await res.json();
    if (!res.ok) {
        alert("❌ " + data.error);
        return;
    }

    const table = document.getElementById("active-table").textContent;
    selectTable(table, document.querySelector(".admin-sidebar li.active"));
}

/* ==================================================
   ADMIN – SQL
================================================== */

function bindSQLButton() {
    const addBtn = document.getElementById("add-query-btn");
    if (!addBtn) return;

    addBtn.onclick = () => {
        document.getElementById("sql-editor").classList.remove("hidden");
        document.getElementById("sql-textarea").value = "";
        document.getElementById("sql-result").textContent = "";
    };
}

async function runSQL() {
    const sql = document.getElementById("sql-textarea").value.trim();
    const result = document.getElementById("sql-result");

    if (!sql) {
        result.textContent = "❌ Üres SQL";
        return;
    }

    result.textContent = "⏳ Running...";

    const res = await fetch("/api/admin/sql/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sql })
    });

    const data = await res.json();
    result.textContent = res.ok
        ? JSON.stringify(data, null, 2)
        : "❌ " + data.error;
}

async function deleteGenericRow(table, id) {
    if (!confirm("⚠️ Biztosan törlöd ezt a sort?")) return;

    const res = await fetch("/api/admin/delete-row", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ table, id })
    });

    const data = await res.json();

    if (!res.ok) {
        alert("❌ Törlés sikertelen: " + data.error);
        return;
    }

    closeAnyMenu();
    selectTable(table, document.querySelector(".admin-sidebar li.active"));
}



/* ----------------------------------
   SETUP PAGE
---------------------------------- */


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

        if (!data.setups || data.setups.length === 0) {
            document.getElementById("setup-list").innerHTML =
                `<p class="muted">❌ Nincs még setupod.</p>`;
            return;
        }

        renderSetupCards(data.setups);

    } catch (err) {
        console.error(err);
        document.getElementById("setup-list").innerHTML =
            `<p class="muted">❌ Hiba történt.</p>`;
    }
}

function renderSetupCards(setups) {
    const list = document.getElementById("setup-list");
    list.innerHTML = "";

    // 🧩 EXISTING SETUPS – ELŐSZÖR
    setups.forEach(setup => {
        const div = document.createElement("div");
        div.className = "setup-card";

        div.innerHTML = `
            <h3>${setup.setup_name}</h3>
            <p class="muted">ID: ${setup.id}</p>
        `;

        div.onclick = () => {
            loadSetupChildren(setup.id);
        };

        list.appendChild(div);
    });

    // ➕ CREATE NEW SETUP CARD – VÉGÉRE
    const addCard = document.createElement("div");
    addCard.className = "setup-card setup-card-add";
    addCard.innerHTML = `<span class="setup-plus">+</span>`;

    addCard.onclick = createNewSetup;
    list.appendChild(addCard);
}


async function createNewSetup() {
    const name = prompt("Add meg az új setup nevét:");
    if (!name) return;

    try {
        const res = await fetch("/api/my-setups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name })
        });

        const data = await res.json();

        if (!res.ok) {
            alert("❌ Nem sikerült létrehozni: " + data.error);
            return;
        }

        // 🔄 frissítjük a listát
        await loadMySetupsPage();

    } catch (err) {
        console.error(err);
        alert("❌ Hiba történt");
    }
}
async function loadSetupChildren(setupId) {
    const content = document.querySelector(".content");

    content.innerHTML = `
        <button class="btn small" onclick="loadMySetupsPage()">⬅ Vissza</button>
        <p class="muted">⏳ Betöltés...</p>
    `;

    const res = await fetch(`/api/setup/${setupId}/children`, {
        credentials: "include"
    });

    const data = await res.json();

    content.innerHTML = `
        <button class="btn small" onclick="loadMySetupsPage()">⬅ Vissza</button>
        <h2>Setup konfigurációk</h2>
        <div class="neon-line"></div>
        
        <div class="setup-page-wide">
            <div id="child-list" class="setup-grid-wide"></div>
        </div>


    `;

    const list = document.getElementById("child-list");

    if (!data.children.length) {
        list.innerHTML = `<p class="muted">❌ Nincs konfiguráció</p>`;
        return;
    }

    data.children.forEach(child => {
        const div = document.createElement("div");
        div.className = "setup-card";

        div.innerHTML = `
        <h3>${child.setup_name}</h3>
        <p class="muted">${child.child_type === "home_theater" ? "🎬 Házimozi" : "🖥 PC"}</p>
    `;

        div.onclick = () => {
            loadSetupDetails(child.type, child.id);
        };


        list.appendChild(div);
    });

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
