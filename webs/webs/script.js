/* ----------------------------------
   PAGE INIT
---------------------------------- */

document.addEventListener("DOMContentLoaded", async () => {
    const path = window.location.pathname;

    // ✅ KELL minden oldalra, mert product.html-en is kell a kép
    await loadImageMap();

    if (path === "/home" || path === "/") {
        injectSearchArea();
        await loadProducts();
        await loadManufacturersDropdown();
        bindExtraFiltersAutoRun();
        bindCarClearButton();
        // await loadBrandFilters();
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

    if (path === "/profile") {
        if (!(await requireLoginOrRedirect())) return;
        await loadProfile();
    }

    if (path === "/setup") {
        if (!(await requireLoginOrRedirect())) return;
        await loadMySetupsPage();
    }

    if (path === "/favorite") {
        if (!(await requireLoginOrRedirect())) return;
        await loadFavorite();
    }



    // ✅ és utána jöhet a product page loader rész (ami nálad lentebb van)





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
    if (document.getElementById("search-input")) return;

    const content = document.querySelector(".content");
    if (!content) return;

    const box = document.createElement("div");
    box.id = "search-box-wrapper";
    box.style.gridColumn = "1 / -1";

    box.innerHTML = `
      <div class="search-row">
        <select id="manufacturer-select" class="search-input" style="max-width:260px;">
          <option value="">⏳ Gyártók betöltése...</option>
        </select>
        
        <input id="search-input" type="text"
               placeholder="Keresés: model, kategória..."
               class="search-input" />

        <button id="brand-search-btn" type="button" class="btn">🔎 Keresés</button>

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
    return true;
}


/* ----------------------------------
   LOGIN BUTTON
---------------------------------- */

async function checkLoginStatus() {
    const userWrap = document.getElementById("user-menu-wrap");
    const avatarBtn = document.getElementById("user-avatar-btn");
    const adminLink = document.getElementById("admin-link");
    const connectBtn = document.getElementById("connect-btn");

    try {
        const res = await fetch("/api/me", { credentials: "include" });

        if (!res.ok) {
            userWrap?.classList.add("hidden");
            adminLink?.classList.add("hidden");
            connectBtn?.classList.remove("hidden");
            return;
        }

        const data = await res.json();

        if (data.loggedIn) {
            userWrap.classList.remove("hidden");
            connectBtn?.classList.add("hidden");

            avatarBtn.onclick = (e) => {
                e.stopPropagation();
                openUserDropdown(data.user, avatarBtn);
            };

            if (["admin","admin+","owner"].includes(data.user.role)) {
                adminLink?.classList.remove("hidden");
            } else {
                adminLink?.classList.add("hidden");
            }
        } else {
            userWrap.classList.add("hidden");
            connectBtn?.classList.remove("hidden");
        }

        window.CURRENT_USER_ROLE = data.user.role;
        console.log("CURRENT_USER_ROLE:", window.CURRENT_USER_ROLE);

    } catch (err) {
        console.error("auth check error:", err);
        userWrap?.classList.add("hidden");
        adminLink?.classList.add("hidden");
        connectBtn?.classList.remove("hidden");
    }
}


function openUserDropdown(user, anchor) {
    closeAnyMenu();

    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement("div");
    menu.id = "context-menu";
    menu.className = "user-menu neon";

    menu.style.top = rect.bottom + 8 + "px";
    menu.style.right = "20px";

    menu.innerHTML = `
        <div class="menu-title">${user.username}</div>
        <div class="muted">${user.email}</div>

        <hr>
        
        <div class="menu-item" onclick="location.href='/profile'">👤 Profile</div>
        <div class="menu-item" onclick="location.href='/favorite'">⭐ Favorite</div>
        <div class="menu-item" onclick="location.href='/setup'">🧰 My Setup</div>

        ${["admin","admin+","owner"].includes(user.role)
        ? `<div class="menu-item" onclick="location.href='/admin'">🛡 Admin</div>`
        : ``}

        <hr>

        <div class="menu-item danger" onclick="logout()">🚪 Logout</div>
    `;

    document.body.appendChild(menu);

    setTimeout(() =>
            document.addEventListener("click", closeAnyMenu, { once: true }),
        0
    );
}
/* ----------------------------------
        BELL AUTH
 ---------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    const bell = document.getElementById("bell-message");
    if (bell) {
        bell.addEventListener("click", AuthBell);
    }
});

let bellOpen = false;

async function AuthBell() {
    closeAnyMenu();

    if (bellOpen) {
        document.getElementById("bell-message-dropdown")?.remove();
        bellOpen = false;
        return;
    }

    const res = await fetch("/api/bell", { credentials: "include" });
    if (!res.ok) return;

    const data = await res.json();

    const box = document.createElement("div");
    box.id = "bell-message-dropdown";
    box.className = "bell-message-dropdown";

    if (!data.length) {
        box.innerHTML = `
            <div class="bell-item muted">Nincs értesítés</div>
        `;
    } else {
        box.innerHTML = data.map(n => `
            <div class="bell-item ${n.read ? "read" : "unread"}"
                 onclick="markBellRead(${n.id}, this)">
                <div class="bell-title">${escapeHtml(n.title)}</div>
                <div class="bell-message">${escapeHtml(n.message)}</div>
                <div class="bell-date">${formatBellDate(n.created_at)}</div>
            </div>
        `).join("");
    }

    document.body.appendChild(box);

    setTimeout(() => {
        document.addEventListener("click", () => {
            box.remove();
            bellOpen = false;
        }, { once: true });
    }, 0);

    bellOpen = true;
}

function formatBellDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 1000 / 60 / 60;// órában
    if (diff < 24) {
        return d.toLocaleTimeString("hu-HU", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }
    return d.toLocaleDateString("hu-HU") .replace(/\./g, "-") .replace(/\s/g, "");
}


async function markBellRead(messageId, el) {
    if (el.classList.contains("read")) return;

    el.classList.add("read");
    el.classList.remove("unread");

    await fetch("/api/bell/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messageId })
    });
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

function renderProfile(box, user) {
    box.innerHTML = `
        <h2>Profilod</h2>
        <div class="neon-line"></div>
        <p><strong>Név:</strong> ${user.name}</p>
        <p><strong>Felhasználónév:</strong> ${user.username}</p>
        <p><strong>Email:</strong> ${user.email}</p>

        <button class="btn" onclick="location.href='/setup'">My Setup</button>
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

/*async function loadProducts() {
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
}*/


async function loadProducts(q = null) {
    const res = await fetch(`/api/products?q=${encodeURIComponent(q || "")}`);

    if (!res.ok) {
        console.error("❌ products load failed");
        return;
    }

    const { items } = await res.json();

    allProducts = items.map(p => ({
        table: p.table_name,
        id: p.id,
        manufacturer: p.manufacturer,
        model: p.model,
        price: p.price,
        raw: p   // 🔥 EZ A LÉNYEG
    }));


    renderProducts(allProducts);

    populateManufacturerSelect(allProducts);
    bindManufacturerSearch();
    bindEnterSearch();
    bindSelectChange();
}

function bindSelectChange() {
    const sel = document.getElementById("manufacturer-select");
    if (!sel) return;
    if (sel.dataset.bound === "1") return;
    sel.dataset.bound = "1";

    sel.addEventListener("change", () => {
        SELECTED_MANUFACTURER = sel.value;
        runSearchFilter();
    });
}


async function runSearchFilter() {
    const input = document.getElementById("search-input");
    const term = (input?.value || "").toLowerCase().trim();

    let result = allProducts;

    // top manufacturer select
    if (SELECTED_MANUFACTURER !== "__all__") {
        const selectedLower = SELECTED_MANUFACTURER.toLowerCase();
        result = result.filter(p => (p.manufacturer || "").toLowerCase() === selectedLower);
    }

    // text search
    if (term) {
        result = result.filter(p =>
            (p.model || "").toLowerCase().includes(term) ||
            (p.table || "").toLowerCase().includes(term)
        );
    }

    const carFilters = getCarFilters();
    if (isCarFilterActive(carFilters)) {
        await ensureCarDetailsLoaded();               // ✅ most már létezik

        result = applyCarFilters(allProducts, carFilters);

        // optional: még ráengedjük a top filtereket
        if (SELECTED_MANUFACTURER !== "__all__") {
            const selectedLower = SELECTED_MANUFACTURER.toLowerCase();
            result = result.filter(p => (p.manufacturer || "").toLowerCase() === selectedLower);
        }

        if (term) {
            result = result.filter(p =>
                (p.model || "").toLowerCase().includes(term) ||
                (p.table || "").toLowerCase().includes(term)
            );
        }
    }

    renderProducts(result);
}


let SELECTED_MANUFACTURER = "__all__";

function populateManufacturerDropdown(products) {
    const optionsBox = document.getElementById("brand-dd-options");
    if (!optionsBox) return;

    optionsBox.innerHTML = "";           // ✅ fontos: ne duplázzon

    const manufacturers = [...new Set(
        products.map(p => (p.manufacturer || "").trim()).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "hu"));

    // ... a többi maradhat ugyanaz


    // első opció: összes
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "dd-option active";
    allBtn.textContent = "(Összes gyártó)";
    allBtn.onclick = () => selectManufacturer("");
    optionsBox.appendChild(allBtn);

    manufacturers.forEach(m => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "dd-option";
        btn.textContent = m;
        btn.onclick = () => selectManufacturer(m);
        optionsBox.appendChild(btn);
    });

    bindDropdownUI();
}

function selectManufacturer(name) {
    SELECTED_MANUFACTURER = (name || "").trim();

    const label = document.getElementById("brand-dd-label");
    if (label) label.textContent = SELECTED_MANUFACTURER || "(Összes gyártó)";

    // active class frissítés
    document.querySelectorAll("#brand-dd-options .dd-option").forEach(btn => {
        const isAll = btn.textContent.includes("Összes");
        const isMatch = btn.textContent === SELECTED_MANUFACTURER;
        btn.classList.toggle("active", (!SELECTED_MANUFACTURER && isAll) || isMatch);
    });

    closeDropdown();
}


function bindDropdownUI() {
    const btn = document.getElementById("brand-dd-btn");
    const menu = document.getElementById("brand-dd-menu");
    const search = document.getElementById("brand-dd-search");

    if (!btn || !menu) return;

    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", (e) => {
        e.preventDefault();
        menu.classList.toggle("hidden");
        if (!menu.classList.contains("hidden")) {
            setTimeout(() => search?.focus(), 0);
        }
    });

    // click outside => close
    document.addEventListener("click", (e) => {
        const wrap = document.getElementById("brand-dd");
        if (!wrap) return;
        if (!wrap.contains(e.target)) closeDropdown();
    });

    // dropdown search (szűrők a listában)
    search?.addEventListener("input", () => {
        const term = (search.value || "").toLowerCase().trim();
        document.querySelectorAll("#brand-dd-options .dd-option").forEach(btn => {
            const txt = btn.textContent.toLowerCase();
            // az "Összes" mindig látszódjon
            if (btn.textContent.includes("Összes")) {
                btn.style.display = "";
                return;
            }
            btn.style.display = txt.includes(term) ? "" : "none";
        });
    });
}

function closeDropdown() {
    document.getElementById("brand-dd-menu")?.classList.add("hidden");
}

function bindManufacturerSearch() {
    const btn = document.getElementById("brand-search-btn");
    if (!btn) return;

    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", () => {
        // ✅ mindig a frontend filter fusson
        runSearchFilter();
    });

}

function bindEnterSearch() {
    document.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;

        const id = document.activeElement?.id;
        if (["search-input", "min-price", "max-price"].includes(id)) {
            e.preventDefault();
            runSearchFilter();
        }
    });
}


function bindExtraFiltersAutoRun() {
    const ids = ["min-price", "max-price", "sort-select"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.dataset.bound === "1") return;
        el.dataset.bound = "1";
        el.addEventListener("change", runSearchFilter);
    });
}


function bindCarClearButton() {
    const btn = document.getElementById("car-clear-btn");
    if (!btn) return;
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", () => {
        [
            "car-manufacturer","car-model","car-price-min","car-price-max",
            "car-bodytype","car-hp-min","car-hp-max","car-accel-min","car-accel-max",
            "car-seats-min","car-seats-max","car-fuel","car-year-min","car-year-max",
            "car-transmission"
        ].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });

        runSearchFilter();
    });
}




function getCarFilters() {
    const vAny = (...ids) => {
        for (const id of ids) {
            const el = document.getElementById(id);
            if (el && (el.value ?? "").trim() !== "") return (el.value ?? "").trim();
        }
        return "";
    };

    return {
        manufacturer: vAny("car-manufacturer", "manufacturer", "car_manu"),
        model: vAny("car-model", "model", "car_model"),

        priceMin: vAny("car-price-min", "price-min", "min-price"),
        priceMax: vAny("car-price-max", "price-max", "max-price"),

        bodyType: vAny("car-bodytype", "bodytype", "body-type"),

        hpMin: vAny("car-hp-min", "hp-min", "loero-min"),
        hpMax: vAny("car-hp-max", "hp-max", "loero-max"),

        accelMin: vAny("car-accel-min", "accel-min", "gyorsulas-min"),
        accelMax: vAny("car-accel-max", "accel-max", "gyorsulas-max"),

        seatsMin: vAny("car-seats-min", "seats-min", "ulesek-min"),
        seatsMax: vAny("car-seats-max", "seats-max", "ulesek-max"),

        fuel: vAny("car-fuel", "fuel", "uzemanyag"),
        yearMin: vAny("car-year-min", "year-min", "evjarat-min"),
        yearMax: vAny("car-year-max", "year-max", "evjarat-max"),

        transmission: vAny("car-transmission", "transmission", "valto"),
    };
}


function isCarFilterActive(cf) {
    // ha bármelyik mező ki van töltve, akkor aktívnak vesszük
    return Object.values(cf).some(x => String(x || "").length > 0);
}


// --- CAR DETAILS CACHE (GLOBAL) ---
const CAR_TABLE_CACHE = new Map(); // table -> Map(id -> fullRow)
let carDetailsLoading = null;

function normalizeTableForFetch(t = "") {
    return String(t).toLowerCase().replace("public.", "").trim();
}

function getIdAny(row) {
    if (!row) return null;
    const lower = {};
    Object.keys(row).forEach(k => (lower[String(k).toLowerCase()] = row[k]));
    return lower.id ?? lower.ID ?? lower.Id ?? null;
}

async function ensureCarDetailsLoaded() {
    if (carDetailsLoading) return carDetailsLoading;

    carDetailsLoading = (async () => {
        const carTables = [...new Set(
            allProducts
                .filter(p => isCarTable(p.table))
                .map(p => normalizeTableForFetch(p.table))
        )];

        for (const table of carTables) {
            if (CAR_TABLE_CACHE.has(table)) continue;

            try {
                const res = await fetch(`/api/public/table/${table}`);
                if (!res.ok) {
                    console.warn("❌ car table fetch failed:", table, res.status);
                    CAR_TABLE_CACHE.set(table, new Map());
                    continue;
                }

                const rows = await res.json();
                const map = new Map();

                rows.forEach(r => {
                    const id = getIdAny(r);
                    if (id !== null && id !== undefined) map.set(String(id), r);
                });

                CAR_TABLE_CACHE.set(table, map);
                console.log("✅ car details cached:", table, map.size);

            } catch (e) {
                console.warn("❌ car table fetch crashed:", table, e);
                CAR_TABLE_CACHE.set(table, new Map());
            }
        }

        // merge full rows into allProducts.raw
        allProducts = allProducts.map(p => {
            if (!isCarTable(p.table)) return p;

            const table = normalizeTableForFetch(p.table);
            const map = CAR_TABLE_CACHE.get(table);
            if (!map) return p;

            const full = map.get(String(p.id));
            if (!full) return p;

            return { ...p, raw: full };
        });
    })();

    await carDetailsLoading;
    carDetailsLoading = null;
}



function isCarTable(tableName = "") {
    const t = String(tableName).toLowerCase().replace("public.", "");
    return (
        t.includes("cars") ||
        t.includes("hatchback_cars") ||
        t.includes("coupe_cars") ||
        t.includes("cabrio_cars") ||
        t.includes("wagon_cars") ||
        t.includes("mpv_cars") ||
        t.includes("sedan_cars") ||
        t.includes("suv_cars") ||
        t.includes("crossover_cars")
    );
}


function pickNumber(obj, keys) {
    for (const k of keys) {
        const val = obj?.[k];
        const n = toNumber(val);   // 🔥 nem sima Number()
        if (n !== null) return n;
    }
    return null;
}

function pickText(obj, keys) {
    for (const k of keys) {
        const val = obj?.[k];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
            return String(val).trim();
        }
    }
    return "";
}


const BODY_SYNONYMS = {
    hatchback: ["hatchback"],
    coupe: ["coupe"],
    cabrio: ["cabrio", "cabriolet", "convertible", "roadster"],
    wagon: ["wagon", "estate", "kombi", "station wagon"],
    mpv: ["mpv", "minivan", "people carrier", "egyteru", "egyterű"],
    sedan: ["sedan", "saloon", "limousine"],
    suv: ["suv", "crossover"]
};

const FUEL_SYNONYMS = {
    petrol: ["petrol", "gasoline", "gas", "benzin"],
    diesel: ["diesel", "dizel", "dízel"],
    hybrid: ["hybrid", "hibrid"],
    electric: ["electric", "ev", "elektromos"]
};

const TRANS_SYNONYMS = {
    manual: ["manual", "mt"],
    automatic: ["automatic", "auto", "at", "dct", "cvt"]
};

function includesAny(haystack, terms) {
    const h = String(haystack || "").toLowerCase();
    return terms.some(t => h.includes(String(t).toLowerCase()));
}






function applyCarFilters(list, cf) {
    // csak autós táblák
    let cars = list.filter(p => p.raw && isCarTable(p.table));

    // Ár (Price) - MIN/MAX
    const pMin = cf.priceMin ? Number(cf.priceMin) : null;
    const pMax = cf.priceMax ? Number(cf.priceMax) : null;

    if (pMin !== null || pMax !== null) {
        cars = cars.filter(p => {
            const price = Number(p.price);
            if (!Number.isFinite(price)) return false;
            if (pMin !== null && price < pMin) return false;
            if (pMax !== null && price > pMax) return false;
            return true;
        });
    }



    // Gyártó (manufacturer)
    if (cf.manufacturer) {
        const m = cf.manufacturer.toLowerCase();
        cars = cars.filter(p =>
            String(p.manufacturer || "").toLowerCase().includes(m)
        );
    }

    // Modell
    if (cf.model) {
        const m = cf.model.toLowerCase();
        cars = cars.filter(p =>
            String(p.model || "").toLowerCase().includes(m)
        );
    }

    // Kivitel (Body Type) - táblanév alapján
    if (cf.bodyType) {
        const bt = cf.bodyType.toLowerCase().trim();

        const TABLE_BY_BODYTYPE = {
            hatchback: ["hatchback_cars"],
            coupe: ["coupe_cars"],
            cabrio: ["cabrio_cars"],
            wagon: ["wagon_cars"],
            mpv: ["mpv_cars"],
            sedan: ["sedan_cars"],
            suv: ["suv_cars", "crossover_cars"]
        };

        const allowed = TABLE_BY_BODYTYPE[bt] || [];

        if (allowed.length) {
            cars = cars.filter(p => {
                const table = String(p.table || "").toLowerCase().replace("public.", "");
                return allowed.includes(table);
            });
        }
    }





// Lóerő (Horsepower)
    const hpMin = cf.hpMin ? toNumber(cf.hpMin) : null;
    const hpMax = cf.hpMax ? toNumber(cf.hpMax) : null;

    if (hpMin !== null || hpMax !== null) {
        let missing = 0;

        cars = cars.filter(p => {
            const raw = getCarRaw(p);
            const hp = pickNumber(raw, ["horsepower","hp","power","ps","loero","loerő","loeero"]);

            if (hp === null) { missing++; return false; } // ha szűrsz HP-ra, akkor hiányzó adat kiesik

            if (hpMin !== null && hp < hpMin) return false;
            if (hpMax !== null && hp > hpMax) return false;
            return true;
        });

        console.log("HP filter missing hp rows:", missing);
    }



// Gyorsulás (0-100) másodperc
    const aMin = cf.accelMin ? toNumber(cf.accelMin) : null;
    const aMax = cf.accelMax ? toNumber(cf.accelMax) : null;

    if (aMin !== null || aMax !== null) {
        cars = cars.filter(p => {
            const raw = getCarRaw(p);
            const acc = pickNumber(raw, [
                "acceleration", "acceleration_s", "acceleration_sec",
                "0_100", "0-100", "zero_to_hundred",
                "gyorsulas", "gyorsulás"
            ]);

            if (acc === null) return false;
            if (aMin !== null && acc < aMin) return false;
            if (aMax !== null && acc > aMax) return false;
            return true;
        });
    }


// Ülések (Seats)
    const sMin = cf.seatsMin ? toNumber(cf.seatsMin) : null;
    const sMax = cf.seatsMax ? toNumber(cf.seatsMax) : null;

    if (sMin !== null || sMax !== null) {
        cars = cars.filter(p => {
            const raw = getCarRaw(p);
            const seats = pickNumber(raw, [
                "seats", "seat_count",
                "ulesek", "ülések", "ules", "ülés"
            ]);

            if (seats === null) return false;
            if (sMin !== null && seats < sMin) return false;
            if (sMax !== null && seats > sMax) return false;
            return true;
        });
    }



// Üzemanyag (Fuel Type)
    if (cf.fuel) {
        const key = cf.fuel.toLowerCase().trim();           // petrol/diesel/hybrid/electric
        const terms = FUEL_SYNONYMS[key] || [key];

        cars = cars.filter(p => {
            const raw = getCarRaw(p);
            const ft = pickText(raw, [
                "fuel_type", "fuel", "fueltype",
                "uzemanyag", "üzemanyag"
            ]);
            return includesAny(ft, terms);
        });
    }




// Évjárat (Year)
    const yMin = cf.yearMin ? toNumber(cf.yearMin) : null;
    const yMax = cf.yearMax ? toNumber(cf.yearMax) : null;

    if (yMin !== null || yMax !== null) {
        cars = cars.filter(p => {
            const raw = getCarRaw(p);
            const y = pickNumber(raw, [
                "year", "model_year",
                "evjarat", "évjárat"
            ]);

            if (y === null) return false;
            if (yMin !== null && y < yMin) return false;
            if (yMax !== null && y > yMax) return false;
            return true;
        });
    }



// Váltó (Transmission)
    if (cf.transmission) {
        const key = cf.transmission.toLowerCase().trim();   // manual/automatic
        const terms = TRANS_SYNONYMS[key] || [key];

        cars = cars.filter(p => {
            const raw = getCarRaw(p);
            const tr = pickText(raw, [
                "transmission", "transmission_type", "gearbox",
                "valto", "váltó"
            ]);
            return includesAny(tr, terms);
        });
    }




    return cars;
}


function getCarRaw(p) {
    return normalizeRawKeys(p?.raw || {});
}


function normalizeRawKeys(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj || {})) {
        const nk = String(k)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_"); // "Body Type" -> "body_type"
        out[nk] = v;
    }
    return out;
}



function toNumber(val) {
    if (val === null || val === undefined) return null;

    const s = String(val).toLowerCase().trim();
    if (!s) return null;

    // 1) tartomány: "99-100", "99–100", "99 - 100"
    const rangeMatch = s.match(/(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)/);
    if (rangeMatch) {
        const a = Number(rangeMatch[1].replace(",", "."));
        const b = Number(rangeMatch[2].replace(",", "."));
        if (Number.isFinite(a) && Number.isFinite(b)) return (a + b) / 2;
    }

    // 2) sima szám: "7,2 s", "250 hp", "1 500", "250.000"
    const cleaned = s
        .replace(",", ".")
        .replace(/\s+/g, "")
        .match(/-?\d+(?:\.\d+)?/);

    if (!cleaned) return null;

    const n = Number(cleaned[0]);
    return Number.isFinite(n) ? n : null;
}








function parseNumberSafe(val) {
    if (val === undefined || val === null) return null;
    const s = String(val).trim();
    if (!s) return null;

    // engedjük: "250000", "250 000", "250.000"
    const cleaned = s.replace(/[^\d]/g, "");
    if (!cleaned) return null;

    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
}


function sortProducts(list, sort) {
    const arr = [...list];

    if (sort === "price_asc") {
        arr.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    } else if (sort === "price_desc") {
        arr.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    } else if (sort === "name_asc") {
        arr.sort((a, b) => String(a.model || "").localeCompare(String(b.model || ""), "hu"));
    } else if (sort === "name_desc") {
        arr.sort((a, b) => String(b.model || "").localeCompare(String(a.model || ""), "hu"));
    }

    return arr;
}






function populateManufacturerSelect(products) {
    const select = document.getElementById("manufacturer-select");
    if (!select) return;

    const manufacturers = [...new Set(
        products.map(p => (p.manufacturer || "").trim()).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "hu"));

    select.innerHTML = `
        <option value="__all__">(Összes gyártó)</option>
        ${manufacturers.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("")}
    `;

}




// biztonságos option szöveghez
function escapeHtml(str = "") {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
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


document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (document.activeElement?.id !== "search-input") return;

    document.getElementById("brand-search-btn")?.click();
});
/* ----------------------------------
   RENDER PRODUCT GRID
---------------------------------- */

function buildBrandFilters(products) {
    const box = document.getElementById("brand-filters");
    if (!box) {
        console.warn("❌ #brand-filters element not found");
        return;
    }

    box.innerHTML = "";
    activeBrands.clear();

    const brands = [...new Set(
        products
            .map(p => p.manufacturer)
            .filter(b => typeof b === "string" && b.trim())
    )].sort((a, b) => a.localeCompare(b));

    brands.forEach(brand => {
        const id = `brand-${brand.replace(/\s+/g, "-")}`;

        const label = document.createElement("label");
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.gap = "8px";
        label.style.cursor = "pointer";

        label.innerHTML = `
            <input type="checkbox" id="${id}">
            <span>${brand}</span>
        `;

        const checkbox = label.querySelector("input");

        checkbox.addEventListener("change", () => {
            checkbox.checked
                ? activeBrands.add(brand)
                : activeBrands.delete(brand);
            applyFilters();
        });

        box.appendChild(label);
    });

    console.log("✅ Brand filters built:", brands);
}



async function loadBrandFilters() {
    try {
        const res = await fetch("/api/products/brands");

        if (!res.ok) {
            console.error("❌ /api/products/brands failed:", res.status);
            return;
        }

        const data = await res.json();

        if (!Array.isArray(data.brands)) {
            console.warn("⚠️ brands is not array:", data);
            return;
        }

        buildBrandFilters(
            data.brands.map(b => ({ manufacturer: b }))
        );
    } catch (err) {
        console.error("❌ loadBrandFilters crashed:", err);
    }
}

async function loadManufacturersDropdown() {
    try {
        const res = await fetch("/api/products/brands");
        if (!res.ok) {
            console.error("❌ /api/products/brands failed:", res.status);
            return;
        }

        const data = await res.json();

        // ✅ engedjük: {brands:[...]} vagy sima [...]
        const raw = Array.isArray(data) ? data : (data.brands || []);

        // ✅ engedjük: ["Asus"] vagy [{manufacturer:"Asus"}] vagy [{brand:"Asus"}]
        const manufacturers = raw
            .map(x => typeof x === "string" ? x : (x.manufacturer || x.brand || x.name || ""))
            .map(s => String(s).trim())
            .filter(Boolean);

        populateManufacturerDropdown(
            manufacturers.map(m => ({ manufacturer: m }))
        );

        console.log("✅ Manufacturers loaded:", manufacturers.length);

    } catch (err) {
        console.error("❌ loadManufacturersDropdown error:", err);
    }
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
    crossover_cars: "cars",
    pickup_cars: "cars",


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


    software_products: "softwaress",


    alt_saxophone:"alt_saxophones",
    alt_saxophones:"alt_saxophones",

    audio_processors: "audio_processorss",

    wind_instrument_oils: "wind_instruments_cremes_oils",

    cleaning_brushes: "cleaning_brushes",

    saxophone_cases: "saxophone_case",

    c_trumpets: "c_trumpets",

    home_theater: "home_theater",
    home_theatre: "home_theatre",

    studio_audio_speakers: "studio_audio_speakers",
    studio_monitor_speakers:"studio_monitor_speakerss",
    studio_monitor_speakerss:"studio_monitor_speakers",

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
        if (user.role === "owner") {
            return `
                <div class="role-option disabled">
                    👑 OWNER (env locked)
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

async function loadSetupChildren(setupId) {
    const content = document.querySelector(".content");

    // 1. Alap szerkezet felépítése
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
        // 2. Adatok lekérése
        const res = await fetch(`/api/setup/${setupId}/children`, {
            credentials: "include"
        });

        if (!res.ok) {
            document.getElementById("child-list").innerHTML = `<p class="muted">❌ Hiba az adatok betöltésekor.</p>`;
            return;
        }

        // 3. Adat feldolgozása
        const data = await res.json();

        // Mivel a szervered közvetlenül a tömböt küldi,
        // ellenőrizzük, hogy tömb-e, ha nem, akkor keressük a .children kulcsot.
        const itemsToRender = Array.isArray(data) ? data : (data.children || []);

        console.log("Megjelenítendő elemek:", itemsToRender);

        // 4. Renderelés meghívása
        // A renderChildCards fogja kirakni a kártyákat és a "+" gombot
        renderChildCards(itemsToRender, setupId);

    } catch (err) {
        console.error("Hiba a frontend oldalon:", err);
        document.getElementById("child-list").innerHTML = `<p class="muted">❌ Szerver hiba.</p>`;
    }
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

async function openListModal(setupId, type) {
    const prev = document.getElementById("search-modal");
    if(prev) prev.remove();

    const modal = document.createElement("div");
    modal.id = "search-modal";
    modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center; z-index:1100; color:white;";

    modal.innerHTML = `
        <div style="background:#1a1a1a; padding:30px; border-radius:15px; width:90%; max-width:500px; border:1px solid #333; max-height:80vh; display:flex; flex-direction:column;">
            <h2 style="margin-bottom:15px; text-align:center;">Válassz egy elemet</h2>
            <div id="items-container" style="overflow-y:auto; flex-grow:1; border:1px solid #222; border-radius:8px; padding:10px; background:#111;">
                <p style="text-align:center;">Betöltés...</p>
            </div>
            <button class="btn" style="margin-top:20px; width:100%;" onclick="document.getElementById('search-modal').remove()">Mégse</button>
        </div>
    `;

    document.body.appendChild(modal);

    try {
        // Itt hívjuk meg az új listázó API-t
        const res = await fetch(`/api/items/list?type=${type}`, { credentials: "include" });
        const data = await res.json();
        const container = document.getElementById("items-container");

        container.innerHTML = ""; // Töröljük a "Betöltés..." szöveget

        if (!data.results || data.results.length === 0) {
            container.innerHTML = "<p style='text-align:center; padding:20px;'>Nincs elérhető elem.</p>";
            return;
        }

        data.results.forEach(item => {
            const div = document.createElement("div");
            div.style.cssText = "padding:12px; border-bottom:1px solid #222; cursor:pointer; transition: 0.2s;";
            div.innerHTML = `<strong>${item.name}</strong> <span style="font-size:12px; color:#666; float:right;">${item.category}</span>`;

            // Hover effekt
            div.onmouseover = () => div.style.background = "#222";
            div.onmouseout = () => div.style.background = "transparent";

            // Kattintáskor mentünk
            div.onclick = () => saveSelection(setupId, type, item.name);
            container.appendChild(div);
        });
    } catch (err) {
        console.error("Hiba:", err);
    }
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
                <button class="btn" onclick="openListModal('${setupId}', 'pc')">🖥️ PC Alkatrész</button>
                <button class="btn" onclick="openListModal('${setupId}', 'car')">🚗 Autó</button>
                <button class="btn" onclick="openListModal('${setupId}', 'home_theater')">🎬 Mozi eszköz</button>
                <button class="btn" onclick="openListModal('${setupId}', 'studio')">🎵 Stúdió cucc</button>
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




/*
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
*/

/* ==================================================
   FAVORITE SITE
================================================== */

async function loadFavorite() {
    const box = document.getElementById("favorite-box");
    if (!box) return;

    box.innerHTML = `
        <p class="muted">⭐ Kedvenc termékeid hamarosan itt lesznek.</p>
    `;
}

/* ==================================================
   SEARCH FILTERS
================================================== */

