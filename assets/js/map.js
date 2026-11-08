let currentMapData = null;
let currentSide = 't';
let currentExpandedCard = null;

document.addEventListener('DOMContentLoaded', () => {
    initMapPage();
    initSideSelector();
    initLightbox();
});

async function initMapPage() {
    const params = new URLSearchParams(window.location.search);
    const mapId = (params.get('map') || 'mirage').toLowerCase();

    const titleEl = document.getElementById('map-title');
    const headerTitleEl = document.getElementById('header-map-title');
    const pageTitle = mapId.charAt(0).toUpperCase() + mapId.slice(1);
    
    document.title = `${pageTitle} Lineups - CS2`;
    if (titleEl) titleEl.textContent = pageTitle;
    if (headerTitleEl) headerTitleEl.textContent = `${pageTitle} Lineups`;

    try {
        const response = await fetch(`./data/${mapId}.json`);
        if (!response.ok) {
            throw new Error(`Data for map ${mapId} not found`);
        }
        currentMapData = await response.json();
        renderMapContent(currentMapData);
    } catch (err) {
        console.warn(err);
        renderEmptyState(pageTitle);
    }
}

function initSideSelector() {
    const btnT = document.getElementById('btn-t-side');
    const btnCT = document.getElementById('btn-ct-side');

    if (btnT && btnCT) {
        btnT.addEventListener('click', () => switchSide('t'));
        btnCT.addEventListener('click', () => switchSide('ct'));
    }
}

function switchSide(side) {
    if (currentSide === side) return;
    currentSide = side;

    const btnT = document.getElementById('btn-t-side');
    const btnCT = document.getElementById('btn-ct-side');

    if (btnT && btnCT) {
        btnT.classList.toggle('active', currentSide === 't');
        btnCT.classList.toggle('active', currentSide === 'ct');
    }

    if (currentExpandedCard) {
        currentExpandedCard.classList.remove('expanded');
        currentExpandedCard = null;
    }

    if (currentMapData) {
        renderSideView();
    }
}

function renderEmptyState(mapName) {
    const container = document.getElementById('map-content');
    const sideSelector = document.getElementById('side-selector');
    if (sideSelector) sideSelector.style.display = 'none';
    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            <h3>Brak lineupów dla mapy ${mapName}</h3>
            <p>Lineupy dla tej mapy są w przygotowaniu i pojawią się wkrótce!</p>
            <br>
            <a href="./map.html?map=mirage" class="nav-back">Zobacz Mirage</a>
        </div>
    `;
}

function renderMapContent(data) {
    // Count lineups for T and CT
    let tCount = 0;
    let ctCount = 0;

    Object.values(data).forEach(lineups => {
        if (Array.isArray(lineups)) {
            lineups.forEach(l => {
                const side = l.side ? l.side.toLowerCase() : 't';
                if (side === 't') tCount++;
                else if (side === 'ct') ctCount++;
                else if (side === 'both') {
                    tCount++;
                    ctCount++;
                }
            });
        }
    });

    const tCountEl = document.getElementById('t-count');
    const ctCountEl = document.getElementById('ct-count');
    if (tCountEl) tCountEl.textContent = tCount;
    if (ctCountEl) ctCountEl.textContent = ctCount;

    renderSideView();
}

function renderSideView() {
    const tabsNav = document.getElementById('tab-buttons');
    const tabsContainer = document.getElementById('tabs-container');
    if (!tabsNav || !tabsContainer || !currentMapData) return;

    tabsNav.innerHTML = '';
    tabsContainer.innerHTML = '';

    // Filter lineups by currentSide
    const filteredSections = {};
    let totalSideLineups = 0;

    Object.keys(currentMapData).forEach(sectionKey => {
        const rawLineups = currentMapData[sectionKey];
        if (Array.isArray(rawLineups)) {
            const matching = rawLineups.filter(l => {
                const s = l.side ? l.side.toLowerCase() : 't';
                return s === currentSide || s === 'both';
            });
            if (matching.length > 0) {
                filteredSections[sectionKey] = matching;
                totalSideLineups += matching.length;
            }
        }
    });

    if (totalSideLineups === 0) {
        tabsNav.style.display = 'none';
        const sideLabel = currentSide === 't' ? 'Terrorystów (T)' : 'Antyterrorystów (CT)';
        const otherSide = currentSide === 't' ? 'ct' : 't';
        const otherSideLabel = currentSide === 't' ? 'CT-Side' : 'T-Side';

        tabsContainer.innerHTML = `
            <div class="empty-state">
                <h3>Brak lineupów po stronie ${sideLabel}</h3>
                <p>Nie dodano jeszcze lineupów dla tej strony na tej mapie.</p>
                <br>
                <button class="nav-back" onclick="switchSide('${otherSide}')">Przełącz na ${otherSideLabel}</button>
            </div>
        `;
        return;
    }

    tabsNav.style.display = 'flex';
    const sectionKeys = Object.keys(filteredSections);

    sectionKeys.forEach((sectionKey, index) => {
        const cleanName = sectionKey.replace(/-/g, ' ');
        const count = filteredSections[sectionKey].length;

        // Tab button with count
        const btn = document.createElement('button');
        btn.className = `tab-link ${index === 0 ? 'active' : ''}`;
        btn.textContent = `${cleanName} (${count})`;
        btn.addEventListener('click', (e) => switchTab(sectionKey, e.currentTarget));
        tabsNav.appendChild(btn);

        // Tab pane
        const pane = document.createElement('div');
        pane.id = `tab-${sectionKey}`;
        pane.className = `tab-pane ${index === 0 ? 'active' : ''}`;

        const grid = document.createElement('div');
        grid.className = 'lineup-grid';

        filteredSections[sectionKey].forEach(lineup => {
            grid.appendChild(createLineupCard(lineup));
        });

        pane.appendChild(grid);
        tabsContainer.appendChild(pane);
    });
}

function switchTab(sectionKey, clickedBtn) {
    document.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    clickedBtn.classList.add('active');
    const targetPane = document.getElementById(`tab-${sectionKey}`);
    if (targetPane) targetPane.classList.add('active');

    if (currentExpandedCard) {
        currentExpandedCard.classList.remove('expanded');
        currentExpandedCard = null;
    }
}

function createLineupCard(lineup) {
    const isSpawnLineup = Array.isArray(lineup.spawns) && lineup.spawns.length > 0;
    const card = document.createElement('div');
    card.className = `lineup-card ${lineup.grenade || 'smoke'} ${isSpawnLineup || lineup.isInstant ? 'is-instant' : ''}`;

    let stepsHtml = '';

    if (isSpawnLineup) {
        const rows = lineup.spawns.map((spawn, sIdx) => {
            const spawnTitle = spawn.title || `Spawn #${sIdx + 1}`;
            const images = Array.isArray(spawn.images) ? spawn.images : [];
            const steps = images.map((imgSrc, i) => `
                <div class="step-card">
                    <div class="step-label">Krok ${i + 1}</div>
                    <img src="${imgSrc}" alt="${lineup.title} - ${spawnTitle} - krok ${i + 1}" class="zoomable-img" loading="lazy">
                </div>
            `).join('');

            const spawnThrowHtml = spawn.throw ? renderThrowInstructions(spawn) : '';

            return `
                <div class="instant-spawn-row">
                    <div class="instant-spawn-header">
                        <span class="instant-spawn-pill">${spawnTitle}</span>
                        ${spawnThrowHtml}
                    </div>
                    <div class="instant-steps-grid">
                        ${steps}
                    </div>
                </div>
            `;
        });
        stepsHtml = `<div class="instant-container">${rows.join('')}</div>`;
    } else if (lineup.isInstant && Array.isArray(lineup.images)) {
        // Fallback for flat images array
        const rows = [];
        for (let i = 0; i < lineup.images.length; i += 2) {
            const spawnNum = Math.floor(i / 2) + 1;
            const img1 = lineup.images[i];
            const img2 = lineup.images[i + 1];

            rows.push(`
                <div class="instant-spawn-row">
                    <div class="instant-spawn-header">
                        <span class="instant-spawn-pill">Spawn #${spawnNum}</span>
                    </div>
                    <div class="instant-steps-grid">
                        <div class="step-card">
                            <div class="step-label">Krok 1</div>
                            <img src="${img1}" alt="${lineup.title} - Spawn #${spawnNum} - krok 1" class="zoomable-img" loading="lazy">
                        </div>
                        ${img2 ? `
                        <div class="step-card">
                            <div class="step-label">Krok 2</div>
                            <img src="${img2}" alt="${lineup.title} - Spawn #${spawnNum} - krok 2" class="zoomable-img" loading="lazy">
                        </div>` : ''}
                    </div>
                </div>
            `);
        }
        stepsHtml = `<div class="instant-container">${rows.join('')}</div>`;
    } else if (Array.isArray(lineup.images)) {
        stepsHtml = `
            <div class="steps-container">
                ${lineup.images.map((imgSrc, i) => `
                    <div class="step-card">
                        <div class="step-label">Krok ${i + 1}</div>
                        <img src="${imgSrc}" alt="${lineup.title} - krok ${i + 1}" class="zoomable-img" loading="lazy">
                    </div>
                `).join('')}
            </div>
        `;
    }

    const instructionsHtml = renderThrowInstructions(lineup);

    card.innerHTML = `
        <div class="lineup-preview-box">
            <img src="${lineup.preview}" alt="${lineup.title}" class="lineup-preview-img" loading="lazy">
        </div>
        <div class="lineup-card-header">
            <h2 class="lineup-card-title">${lineup.title}</h2>
            <span class="lineup-toggle-icon">▼</span>
        </div>
        <div class="lineup-details">
            ${stepsHtml}
            ${instructionsHtml}
        </div>
    `;

    card.addEventListener('click', (e) => {
        if (e.target.classList.contains('zoomable-img')) {
            openLightbox(e.target.src, e.target.alt);
            return;
        }
        toggleExpandCard(card);
    });

    return card;
}

function renderThrowInstructions(lineup) {
    if (lineup.throw) {
        let mouseIcon = '';
        if (lineup.throw.mouse) {
            const m = String(lineup.throw.mouse).toLowerCase();
            let label = 'Lewy przycisk';
            let icon = m;

            if (m === 'right-click' || m === 'right') {
                label = 'Prawy przycisk';
                icon = 'right-click';
            } else if (m === 'both-click' || m === 'both') {
                label = 'Oba przyciski';
                icon = 'both-click';
            } else if (m === 'middle-click' || m === 'middle') {
                label = 'Środkowy przycisk';
                icon = 'middle-click';
            } else if (m === 'no-click' || m === 'none') {
                label = 'Brak kliknięcia';
                icon = 'no-click';
            } else if (m === 'left-click' || m === 'left') {
                label = 'Lewy przycisk';
                icon = 'left-click';
            }

            mouseIcon = `<span class="mouse-badge"><img src="./assets/icons/${icon}.png" class="mouse-icon" alt="${label}"> ${label}</span>`;
        }

        const keysHtml = Array.isArray(lineup.throw.keys)
            ? lineup.throw.keys.map(k => `<kbd>${k}</kbd>`).join(' ')
            : '';

        let actionText = '';
        if (lineup.throw.action === 'jump') actionText = 'Skok';
        else if (lineup.throw.action === 'run') actionText = 'W biegu';
        else if (lineup.throw.action === 'stand') actionText = 'W miejscu';
        else if (lineup.throw.action) actionText = lineup.throw.action;

        const actionBadge = actionText ? `<span class="action-badge">${actionText}</span>` : '';

        return `
            <div class="throw-instructions">
                ${mouseIcon}
                ${keysHtml ? `<span class="instruction-divider">+</span> ${keysHtml}` : ''}
                ${actionBadge ? `<span class="instruction-divider">+</span> ${actionBadge}` : ''}
            </div>
        `;
    }

    if (lineup.instructions) {
        const clean = lineup.instructions.replace(/\.\.\/icons\//g, './assets/icons/');
        return `<div class="throw-instructions">${clean}</div>`;
    }

    return '';
}

function toggleExpandCard(card) {
    if (currentExpandedCard === card) {
        card.classList.remove('expanded');
        currentExpandedCard = null;
        return;
    }

    if (currentExpandedCard) {
        currentExpandedCard.classList.remove('expanded');
    }

    card.classList.add('expanded');
    currentExpandedCard = card;

    setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 250);
}

function initLightbox() {
    const modal = document.createElement('div');
    modal.id = 'lightbox-modal';
    modal.className = 'lightbox-modal';
    modal.innerHTML = '<img class="lightbox-img" id="lightbox-img" src="" alt="Zoom">';
    document.body.appendChild(modal);

    modal.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.classList.remove('active');
        }
    });
}

function openLightbox(src, alt) {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    if (modal && img) {
        img.src = src;
        img.alt = alt || 'Preview';
        modal.classList.add('active');
    }
}
