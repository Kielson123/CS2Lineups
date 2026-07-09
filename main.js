let currentExpanded = null;


function openTab(event, tabName) {
    const tabcontent = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove("visible");
    }
    const tablinks = document.getElementsByClassName("tab-links");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }

    document.getElementById(tabName).classList.add("visible");
    event.currentTarget.classList.add("active");
}


async function loadLineups() {
    const map = document.body.dataset.map;
    if (!map) {
        console.error("Nie podano mapy w data-map");
        return;
    }

    try {
        const response = await fetch(`./data/${map}.json`);
        if (!response.ok) {
            throw new Error("Nie znaleziono pliku JSON");
        }
        const data = await response.json();

        generateSection("Bombsite-A", data["Bombsite-A"]);
        generateSection("Mid", data["Mid"]);
        generateSection("Bombsite-B", data["Bombsite-B"]);
        generateSection("Others", data["Others"]);
    } catch(error) {
        console.error(error);
    }
}


function generateSection(sectionName, lineups) {
    const container = document.querySelector(
        `#${sectionName} .lineup-container`
    );
    if (!container || !lineups) {
        return;
    }

    container.innerHTML = "";
    lineups.forEach(lineup => {
        const card = document.createElement("div");
        card.className = `lineup-card ${lineup.grenade}`;
        let content = `
            <div class="lineup-preview">
                <img src="${lineup.preview}" alt="${lineup.title}">
                <h2>${lineup.title}</h2>
            </div>
            <div class="lineup-details"><center>`;
        lineup.images.forEach(image => content += `<img src="${image}" alt="${lineup.title}">`)
        content += `</center><p>${lineup.instructions}</p></div>`;
        card.innerHTML = content;

        card.addEventListener("click", () => expandLineup(card));
        container.appendChild(card);
    });
}


function expandLineup(card) {
    if (currentExpanded === card) {
        card.classList.remove("expanded");
        currentExpanded = null;
        return;
    }

    document
        .querySelectorAll(".lineup-card.expanded")
        .forEach(item => {
            item.classList.remove("expanded");
        });

    card.classList.add("expanded");
    currentExpanded = card;

    setTimeout(()=>{
        card.scrollIntoView({
            behavior:"smooth",
            block:"end"
        });
    },350);
}


document.addEventListener(
    "DOMContentLoaded",
    ()=>{
        loadLineups();
        const defaultTab =
            document.getElementById("defaultOpen");
        if(defaultTab){
            defaultTab.click();
        }
    }
);