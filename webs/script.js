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