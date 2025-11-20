// ----------------------------
// PRODUCT PAGE LOADER
// ----------------------------

document.addEventListener("DOMContentLoaded", async () => {

    // get URL params
    const params = new URLSearchParams(window.location.search);
    const table = params.get("table");
    const model = params.get("model");

    const box = document.getElementById("product-box");

    if (!table || !model) {
        box.innerHTML = `<h2>❌ Hibás URL</h2>`;
        return;
    }

    // API endpoint mapping
    const endpointMap = {
        processors: "/api/cpu",
        motherboard: "/api/motherboard",
        electric_guitars: "/api/guitars",
        alt_saxophone: "/api/saxophone/alt",
        bassers: "/api/bassers",
        coupe_car: "/api/coupe"
    };

    const endpoint = endpointMap[table];

    if (!endpoint) {
        box.innerHTML = `<h2>❌ Nincs ilyen kategória.</h2>`;
        return;
    }

    // fetch data
    const res = await fetch(endpoint);
    const data = await res.json();

    // find product by model
    const found = data.find(p =>
        (p.Model || p.model || p.Name || p.name) == model
    );

    if (!found) {
        box.innerHTML = `<h2>❌ Termék nem található.</h2>`;
        return;
    }

    // normalize keys
    const lower = {};
    Object.keys(found).forEach(k => lower[k.toLowerCase()] = found[k]);

    // render product
    const img = getProductImage(table, lower);

    box.innerHTML = `
    <h2>${lower.model || lower.name || "Ismeretlen modell"}</h2>
    <div class="neon-line"></div>

    <img src="${img}" 
         style="width:200px;height:200px;object-fit:contain;margin-bottom:20px;">

    <p><strong>Kategória:</strong> ${table}</p>
    <p><strong>Gyártó:</strong> ${lower.manufacturer || "N/A"}</p>
    

        ${Object.entries(lower)
        .filter(([k, v]) => !["id","model","manufacturer"].includes(k))
        .map(([k, v]) => `
                <p><strong>${k}:</strong> ${v}</p>
            `).join("")}

        <br><br>
        <button class="btn" onclick="window.history.back()">⬅ Vissza</button>
    `;
});
