const { getProductsForAI } = require("./backend/services/productProvider");

const testCases = [
    "ai mennyibe kerül a pioneer sc-lx81 erősítő ?",
    "ai van olyan az adatbázisban hogy pioneer",
    "pioneer sc-lx81"
];

testCases.forEach(q => {
    console.log(`\nKérdés: "${q}"`);
    const res = getProductsForAI(q);
    console.log(`Mode: ${res.mode}`);
    if (res.brand) console.log(`Brand: ${res.brand}`);
    if (res.exact) console.log(`Exact matches: ${res.exact.length}`);
    if (res.similar) console.log(`Similar matches: ${res.similar.length}`);
    if (res.list) console.log(`List items: ${res.list.length}`);
});
