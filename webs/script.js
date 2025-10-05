//Home TesztLap:
document.addEventListener('DOMContentLoaded', () => {
    let input = document.getElementById('search');
    let result = document.getElementById('result');

    input.addEventListener('input', () => {
        const value = input.value.toLowerCase();

        fetch('/api/guitars')
            .then(res => res.json())
            .then(data => {
                result.innerHTML = "";
                data.forEach(guitar => {
                    result.innerHTML += `<p>${guitar.Name} - ${guitar.Modell}</p>`;
                });
            })
            .catch(err => console.error("❌ Hiba:", err));
    });
});
