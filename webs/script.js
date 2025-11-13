
// ============================
//   TERMÉKLISTA FUNKCIÓK
// ============================

// Fake produktlista – később API-ból is mehetne
const products = [
    { name: "Ibanez RG421PB-CHF elektromos gitár", date: "2025-01-10" },
    { name: "Focusrite Scarlett Solo 4th Gen", date: "2025-01-10" },
    { name: "BOSS Katana-50 Gen 3", date: "2025-01-09" },
    { name: "Arturia MiniLab 3", date: "2025-01-09" },
    { name: "Nux DM-210 Drumkit", date: "2025-01-08" }
];

document.addEventListener("DOMContentLoaded", () => {
    renderProductList();
    updateNewProductsCount();
});

// Lista megjelenítése
function renderProductList() {
    const container = document.getElementById("productContainer");
    if (!container) return; // login/reg oldalon nem létezik

    container.innerHTML = "";

    products.forEach(p => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
            <div class="product-name">${p.name}</div>
            <div class="product-date">Hozzáadva: ${p.date}</div>
        `;
        container.appendChild(card);
    });
}

// Oldalsáv: új termékek száma
function updateNewProductsCount() {
    const box = document.getElementById("newProductCount");
    if (!box) return;

    const today = new Date().toISOString().split("T")[0];
    let count = products.filter(p => p.date === today).length;

    box.innerText = count;
}

// Felfedezés gomb smooth scroll
const explore = document.getElementById("exploreBtn");
if (explore) {
    explore.addEventListener("click", () => {
        const section = document.getElementById("productSection");
        if (section) {
            section.scrollIntoView({ behavior: "smooth" });
        }
    });
}



document.addEventListener("DOMContentLoaded", {

});
function connectlog()
{
    var email = document.getElementById("email");
    var password = document.getElementById("password");
    window.location.href = "Home.html";
    console.log("connect [" + email.value + ";" + password.value + "]");
}
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
        body: JSON.stringify(userData)
    });

    const result = await res.json();
    if (res.ok) {
        alert("✅ Sikeres regisztráció!");
        window.location.href = "Home.html";
    } else {
        alert("❌ Hiba: " + result.error);
    }
}

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
function login()
{
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
                        még nincs fiókom, <a onclick="regist()" class='logorreg'>regisztrálok</>
                     </p>
            </div>
        </section>`
}


