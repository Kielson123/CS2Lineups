const STORAGE_KEYS = {
    VIEW_MODE: 'cs2_lineups_view_mode', // 'standard' | 'browse'
    SIDE: 'cs2_lineups_side',           // 't' | 'ct'
    SITE: 'cs2_lineups_site'            // 'Bombsite-A'
};

let currentMapData = null;
let currentMapId = 'mirage';
let currentSide = 't';
let currentViewMode = 'standard';
let currentExpandedCard = null;

const GRENADE_ORDER = {
    smoke: 1,
    molotov: 2,
    he: 3,
    flash: 4
};

function getGrenadeType(grenade) {
    if (!grenade) return 'smoke';
    const g = String(grenade).toLowerCase().trim();
    if (g === 'molotov' || g === 'incendiary') return 'molotov';
    if (g === 'flash' || g === 'flashbang') return 'flash';
    if (g === 'he' || g.includes('grenade')) return 'he';
    return 'smoke';
}

function getGrenadeDisplayLabel(grenade) {
    const type = getGrenadeType(grenade);
    switch (type) {
        case 'smoke': return 'Smoke';
        case 'molotov': return 'Molotov';
        case 'flash': return 'Flash';
        case 'he': return 'Granat HE';
        default: return type ? type.toUpperCase() : 'Smoke';
    }
}

function getGrenadePriority(grenade) {
    const type = getGrenadeType(grenade);
    return GRENADE_ORDER[type] !== undefined ? GRENADE_ORDER[type] : 99;
}

function sortLineupsByGrenade(lineups) {
    if (!Array.isArray(lineups)) return [];
    return [...lineups].sort((a, b) => getGrenadePriority(a.grenade) - getGrenadePriority(b.grenade));
}

function getSectionCleanName(key) {
    return String(key).replace(/-/g, ' ');
}

function getPolishPlural(count, many = 'ów', few = 'y', one = '') {
    if (count === 1) return one;
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
        return few;
    }
    return many;
}

document.addEventListener('DOMContentLoaded', () => {
    initViewModeToggle();
    initSideSelector();
    initLightbox();
    initMapPage();
});

function initViewModeToggle() {
    const btnStandard = document.getElementById('btn-mode-standard');
    const btnBrowse = document.getElementById('btn-mode-browse');

    if (btnStandard) {
        btnStandard.addEventListener('click', () => setViewMode('standard'));
    }
    if (btnBrowse) {
        btnBrowse.addEventListener('click', () => setViewMode('browse'));
    }
}

function setViewMode(mode) {
    if (currentViewMode === mode && document.getElementById(mode === 'browse' ? 'browse-view' : 'standard-view').style.display !== 'none') {
        return;
    }
    currentViewMode = mode;

    try {
        localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
    } catch (e) {
        console.warn('localStorage not available', e);
    }

    const btnStandard = document.getElementById('btn-mode-standard');
    const btnBrowse = document.getElementById('btn-mode-browse');
    if (btnStandard) btnStandard.classList.toggle('active', mode === 'standard');
    if (btnBrowse) btnBrowse.classList.toggle('active', mode === 'browse');

    const standardView = document.getElementById('standard-view');
    const browseView = document.getElementById('browse-view');

    if (mode === 'browse') {
        if (standardView) standardView.style.display = 'none';
        if (browseView) {
            browseView.style.display = 'block';
            renderBrowseView();
        }
    } else {
        if (browseView) browseView.style.display = 'none';
        if (standardView) {
            standardView.style.display = 'block';
            renderSideView();
        }
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

    try {
        localStorage.setItem(`${STORAGE_KEYS.SIDE}_${currentMapId}`, side);
    } catch (e) {
        console.warn('localStorage not available', e);
    }

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

async function initMapPage() {
    const params = new URLSearchParams(window.location.search);
    currentMapId = (params.get('map') || 'mirage').toLowerCase();

    const headerTitleEl = document.getElementById('header-map-title');
    const pageTitle = currentMapId.charAt(0).toUpperCase() + currentMapId.slice(1);

    document.title = `${pageTitle} Lineups - CS2`;
    if (headerTitleEl) headerTitleEl.textContent = `${pageTitle} Lineups`;

    // Restore saved preferences from localStorage (per-map for side, global for view mode)
    try {
        const savedMode = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
        if (savedMode === 'browse' || savedMode === 'standard') {
            currentViewMode = savedMode;
        }

        const savedSide = localStorage.getItem(`${STORAGE_KEYS.SIDE}_${currentMapId}`);
        if (savedSide === 't' || savedSide === 'ct') {
            currentSide = savedSide;
        } else {
            currentSide = 't';
        }
    } catch (e) {
        console.warn('localStorage read error', e);
        currentSide = 't';
    }

    // Update Side Buttons UI
    const btnT = document.getElementById('btn-t-side');
    const btnCT = document.getElementById('btn-ct-side');
    if (btnT && btnCT) {
        btnT.classList.toggle('active', currentSide === 't');
        btnCT.classList.toggle('active', currentSide === 'ct');
    }

    // Update View Mode Toggle UI
    const btnStandard = document.getElementById('btn-mode-standard');
    const btnBrowse = document.getElementById('btn-mode-browse');
    if (btnStandard) btnStandard.classList.toggle('active', currentViewMode === 'standard');
    if (btnBrowse) btnBrowse.classList.toggle('active', currentViewMode === 'browse');

    try {
        const response = await fetch(`./data/${currentMapId}.json`);
        if (!response.ok) {
            throw new Error(`Data for map ${currentMapId} not found`);
        }
        currentMapData = await response.json();
        Object.keys(currentMapData).forEach(sectionKey => {
            if (Array.isArray(currentMapData[sectionKey])) {
                currentMapData[sectionKey] = sortLineupsByGrenade(currentMapData[sectionKey]);
            }
        });
        renderMapContent(currentMapData);
    } catch (err) {
        console.warn(err);
        renderEmptyState(pageTitle);
    }
}

function renderEmptyState(mapName) {
    const standardView = document.getElementById('standard-view');
    const browseView = document.getElementById('browse-view');
    const sideSelector = document.getElementById('side-selector');
    if (sideSelector) sideSelector.style.display = 'none';
    if (browseView) browseView.style.display = 'none';
    if (standardView) {
        standardView.style.display = 'block';
        standardView.innerHTML = `
            <div class="empty-state">
                <h3>Brak lineupów dla mapy ${mapName}</h3>
                <p>Lineupy dla tej mapy są w przygotowaniu i pojawią się wkrótce!</p>
                <br>
                <a href="./index.html" class="nav-back">Wróć</a>
            </div>
        `;
    }
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

    const standardView = document.getElementById('standard-view');
    const browseView = document.getElementById('browse-view');

    if (currentViewMode === 'browse') {
        if (standardView) standardView.style.display = 'none';
        if (browseView) browseView.style.display = 'block';
        renderBrowseView();
    } else {
        if (browseView) browseView.style.display = 'none';
        if (standardView) standardView.style.display = 'block';
        renderSideView();
    }
}

/* ==========================================================================
   Standard Tabbed View
   ========================================================================== */
function renderSideView() {
    const tabsNav = document.getElementById('tab-buttons');
    const tabsContainer = document.getElementById('tabs-container');
    if (!tabsNav || !tabsContainer || !currentMapData) return;

    tabsNav.innerHTML = '';
    tabsContainer.innerHTML = '';

    // Filter lineups by currentSide
    const filteredSections = {};
    let totalSideLineups = 0;

    const allKeys = Object.keys(currentMapData);

    allKeys.forEach(sectionKey => {
        const rawLineups = currentMapData[sectionKey];
        if (Array.isArray(rawLineups)) {
            const matching = rawLineups.filter(l => {
                const s = l.side ? l.side.toLowerCase() : 't';
                return s === currentSide || s === 'both';
            });
            if (matching.length > 0) {
                filteredSections[sectionKey] = sortLineupsByGrenade(matching);
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

    // Retrieve saved site preference for this map
    let savedSite = null;
    try {
        savedSite = localStorage.getItem(`${STORAGE_KEYS.SITE}_${currentMapId}`);
    } catch (e) {}

    let activeIndex = 0;
    if (savedSite && sectionKeys.includes(savedSite)) {
        activeIndex = sectionKeys.indexOf(savedSite);
    }

    sectionKeys.forEach((sectionKey, index) => {
        const cleanName = getSectionCleanName(sectionKey);
        const count = filteredSections[sectionKey].length;
        const isActive = index === activeIndex;

        // Tab button with count
        const btn = document.createElement('button');
        btn.className = `tab-link ${isActive ? 'active' : ''}`;
        btn.textContent = `${cleanName} (${count})`;
        btn.addEventListener('click', (e) => switchTab(sectionKey, e.currentTarget));
        tabsNav.appendChild(btn);

        // Tab pane
        const pane = document.createElement('div');
        pane.id = `tab-${sectionKey}`;
        pane.className = `tab-pane ${isActive ? 'active' : ''}`;

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

    try {
        localStorage.setItem(`${STORAGE_KEYS.SITE}_${currentMapId}`, sectionKey);
    } catch (e) {
        console.warn('localStorage not available', e);
    }

    if (currentExpandedCard) {
        currentExpandedCard.classList.remove('expanded');
        currentExpandedCard = null;
    }
}

function createLineupCard(lineup) {
    const isSpawnLineup = Array.isArray(lineup.spawns) && lineup.spawns.length > 0;
    const card = document.createElement('div');
    const grenadeType = getGrenadeType(lineup.grenade);
    card.className = `lineup-card ${grenadeType} ${isSpawnLineup ? 'is-instant' : ''}`;

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

/* ==========================================================================
   Continuous Browsing Mode View
   ========================================================================== */
const STANDARD_ACTIONS = new Set([
    'jump',
    'run',
    'stand',
    'skok',
    'bieg',
    'w biegu',
    'w miejscu',
    'skok w biegu',
    'skok kucając',
    'jump-throw',
    'run-throw'
]);

function isStandardAction(action) {
    if (!action) return false;
    return STANDARD_ACTIONS.has(String(action).trim().toLowerCase());
}

function renderCompactThrowBadges(throwObj) {
    if (!throwObj) return '';

    let mouseHtml = '';
    if (throwObj.mouse) {
        const m = String(throwObj.mouse).toLowerCase();
        let label = 'Lewy';
        let icon = 'left-click';
        if (m.includes('right')) { label = 'Prawy'; icon = 'right-click'; }
        else if (m.includes('both')) { label = 'Oba'; icon = 'both-click'; }
        else if (m.includes('middle')) { label = 'Środkowy'; icon = 'middle-click'; }
        else if (m.includes('no') || m.includes('none')) { label = 'Brak'; icon = 'no-click'; }

        mouseHtml = `<span class="mouse-badge" title="${label} przycisk myszy"><img src="./assets/icons/${icon}.png" class="mouse-icon" alt="${label}"> ${label}</span>`;
    }

    const keysHtml = Array.isArray(throwObj.keys) && throwObj.keys.length > 0
        ? throwObj.keys.map(k => `<kbd>${k.toUpperCase()}</kbd>`).join(' ')
        : '';

    let actionHtml = '';
    if (throwObj.action && isStandardAction(throwObj.action)) {
        const a = String(throwObj.action).toLowerCase();
        let actionText = throwObj.action;
        if (a === 'jump' || a === 'skok') actionText = 'Skok';
        else if (a === 'run' || a === 'bieg') actionText = 'Bieg';
        else if (a === 'stand' || a === 'w miejscu') actionText = 'W miejscu';
        else if (a === 'skok w biegu') actionText = 'Skok w biegu';
        else if (a === 'skok kucając') actionText = 'Skok kucając';
        actionHtml = `<span class="action-badge">${actionText}</span>`;
    }

    const parts = [];
    if (mouseHtml) parts.push(mouseHtml);
    if (keysHtml) parts.push(keysHtml);
    if (actionHtml) parts.push(actionHtml);

    if (parts.length > 0) {
        return parts.join('<span class="instruction-divider">+</span>');
    }

    return '';
}

function createBrowseRowElement(item) {
    const grenadeType = getGrenadeType(item.grenade);
    const grenadeLabel = getGrenadeDisplayLabel(item.grenade);
    const badgesHtml = renderCompactThrowBadges(item.throwObj);

    const row = document.createElement('div');
    row.className = `browse-row ${grenadeType}`;

    const numImgs = item.images.length;
    const imagesHtml = item.images.map((imgSrc, idx) => {
        let stepLabel = 'Celowanie';
        if (idx === 0) {
            stepLabel = 'Ustawienie';
        } else if (idx === numImgs - 1 && numImgs > 1) {
            stepLabel = 'Efekt';
        }

        return `
            <div class="browse-img-wrapper">
                <span class="browse-img-step-tag">${stepLabel}</span>
                <img src="${imgSrc}" alt="${item.title} - ${stepLabel}" class="zoomable-img browse-img" loading="lazy">
            </div>
        `;
    }).join('');

    const noteHtml = item.note ? `<div class="browse-info-note-cell">${item.note}</div>` : '';

    row.innerHTML = `
        <div class="browse-info-col">
            <div class="browse-grenade-bar ${grenadeType}">${grenadeLabel}</div>
            <div class="browse-info-content">
                <div class="browse-info-title-cell">${item.title}</div>
                <div class="browse-info-details">
                    ${noteHtml}
                    ${badgesHtml ? `<div class="browse-info-badges-cell">${badgesHtml}</div>` : ''}
                </div>
            </div>
        </div>
        <div class="browse-images-col">
            ${imagesHtml}
        </div>
    `;

    return row;
}

function createBrowseSiteGroup(side, sectionKey, lineups) {
    const group = document.createElement('div');
    group.className = 'browse-site-group';
    group.id = `browse-${side}-${sectionKey}`;

    const cleanName = getSectionCleanName(sectionKey);

    const header = document.createElement('div');
    header.className = 'browse-site-header';
    header.innerHTML = `
        <h3 class="browse-site-name">${cleanName}</h3>
        <span class="browse-site-count">${lineups.length} lineup${getPolishPlural(lineups.length, 'ów', 'y', '')}</span>
    `;
    group.appendChild(header);

    const rowsList = document.createElement('div');
    rowsList.className = 'browse-rows-list';

    lineups.forEach(lineup => {
        // Lineup with spawns (multiple methods or spawns)
        if (Array.isArray(lineup.spawns) && lineup.spawns.length > 0) {
            lineup.spawns.forEach((spawn, sIdx) => {
                const spawnTitle = spawn.title || `Spawn #${sIdx + 1}`;
                const fullTitle = `${lineup.title} (${spawnTitle})`;
                const spawnImages = Array.isArray(spawn.images) ? spawn.images : [];
                const allImages = [...spawnImages];
                if (lineup.preview) allImages.push(lineup.preview);

                const baseThrow = lineup.throw || {};
                const spawnThrow = spawn.throw || {};
                let note = null;
                let actionToUse = null;

                if (spawnThrow.action) {
                    if (isStandardAction(spawnThrow.action)) {
                        actionToUse = spawnThrow.action;
                    } else {
                        note = spawnThrow.action;
                        actionToUse = baseThrow.action || 'jump';
                    }
                } else {
                    actionToUse = baseThrow.action || 'jump';
                }

                const effectiveThrow = {
                    mouse: spawnThrow.mouse || baseThrow.mouse || 'left-click',
                    keys: spawnThrow.keys || baseThrow.keys || [],
                    action: actionToUse
                };

                const rowEl = createBrowseRowElement({
                    title: fullTitle,
                    grenade: lineup.grenade,
                    throwObj: effectiveThrow,
                    note: note,
                    images: allImages
                });
                rowsList.appendChild(rowEl);
            });
        } else {
            // Standard lineup
            const stepImages = Array.isArray(lineup.images) ? lineup.images : [];
            const allImages = [...stepImages];
            if (lineup.preview) allImages.push(lineup.preview);

            let note = null;
            let effectiveThrow = lineup.throw || null;
            if (effectiveThrow && effectiveThrow.action && !isStandardAction(effectiveThrow.action)) {
                note = effectiveThrow.action;
                effectiveThrow = { ...effectiveThrow, action: null };
            }

            const rowEl = createBrowseRowElement({
                title: lineup.title,
                grenade: lineup.grenade,
                throwObj: effectiveThrow,
                note: note,
                images: allImages
            });
            rowsList.appendChild(rowEl);
        }
    });

    group.appendChild(rowsList);
    return group;
}

function renderBrowseView() {
    const browseView = document.getElementById('browse-view');
    if (!browseView || !currentMapData) return;

    browseView.innerHTML = '';

    // Group lineups by side (T and CT), and within each side by sectionKey in file order
    const sectionKeys = Object.keys(currentMapData);

    const tSections = {};
    const ctSections = {};
    let totalT = 0;
    let totalCT = 0;

    sectionKeys.forEach(sectionKey => {
        const rawLineups = currentMapData[sectionKey];
        if (!Array.isArray(rawLineups)) return;

        const tMatching = rawLineups.filter(l => {
            const s = l.side ? l.side.toLowerCase() : 't';
            return s === 't' || s === 'both';
        });
        if (tMatching.length > 0) {
            tSections[sectionKey] = sortLineupsByGrenade(tMatching);
            totalT += tMatching.length;
        }

        const ctMatching = rawLineups.filter(l => {
            const s = l.side ? l.side.toLowerCase() : 't';
            return s === 'ct' || s === 'both';
        });
        if (ctMatching.length > 0) {
            ctSections[sectionKey] = sortLineupsByGrenade(ctMatching);
            totalCT += ctMatching.length;
        }
    });

    if (totalT === 0 && totalCT === 0) {
        browseView.innerHTML = `
            <div class="empty-state">
                <h3>Brak lineupów dla tej mapy</h3>
                <p>Nie znaleziono lineupów do wyświetlenia.</p>
            </div>
        `;
        return;
    }

    // Quick navigation bar
    const navBar = document.createElement('nav');
    navBar.className = 'browse-quick-nav';
    navBar.setAttribute('aria-label', 'Szybka nawigacja po bombsite\'ach');

    let navHtml = '';
    // T Nav Group
    if (totalT > 0) {
        navHtml += `
            <div class="browse-nav-side-group">
                <span class="browse-nav-side-tag t-tag">
                    <img src="./assets/icons/t.png" alt="T"> T
                </span>
        `;
        Object.keys(tSections).forEach(key => {
            const cleanName = getSectionCleanName(key);
            navHtml += `
                <button type="button" class="browse-nav-link" onclick="scrollToBrowseSection('browse-t-${key}')">
                    <span>${cleanName}</span>
                    <span class="badge-count">${tSections[key].length}</span>
                </button>
            `;
        });
        navHtml += `</div>`;
    }

    if (totalT > 0 && totalCT > 0) {
        navHtml += `<div class="browse-nav-divider"></div>`;
    }

    // CT Nav Group
    if (totalCT > 0) {
        navHtml += `
            <div class="browse-nav-side-group">
                <span class="browse-nav-side-tag ct-tag">
                    <img src="./assets/icons/ct.png" alt="CT"> CT
                </span>
        `;
        Object.keys(ctSections).forEach(key => {
            const cleanName = getSectionCleanName(key);
            navHtml += `
                <button type="button" class="browse-nav-link" onclick="scrollToBrowseSection('browse-ct-${key}')">
                    <span>${cleanName}</span>
                    <span class="badge-count">${ctSections[key].length}</span>
                </button>
            `;
        });
        navHtml += `</div>`;
    }

    navBar.innerHTML = navHtml;
    browseView.appendChild(navBar);

    // Section 1: T-Side
    if (totalT > 0) {
        const tSectionEl = document.createElement('section');
        tSectionEl.className = 'browse-side-section';
        tSectionEl.id = 'browse-side-t';

        tSectionEl.innerHTML = `
            <div class="browse-side-header t-side">
                <img src="./assets/icons/t.png" alt="Terroryści" class="browse-side-logo">
                <h2 class="browse-side-title">Strona Terrorystów (T)</h2>
                <span class="browse-side-count">${totalT} lineup${getPolishPlural(totalT, 'ów', 'y', '')}</span>
            </div>
        `;

        Object.keys(tSections).forEach(key => {
            const siteGroup = createBrowseSiteGroup('t', key, tSections[key]);
            tSectionEl.appendChild(siteGroup);
        });

        browseView.appendChild(tSectionEl);
    }

    // Section 2: CT-Side
    if (totalCT > 0) {
        const ctSectionEl = document.createElement('section');
        ctSectionEl.className = 'browse-side-section';
        ctSectionEl.id = 'browse-side-ct';

        ctSectionEl.innerHTML = `
            <div class="browse-side-header ct-side">
                <img src="./assets/icons/ct.png" alt="Antyterroryści" class="browse-side-logo">
                <h2 class="browse-side-title">Strona Antyterrorystów (CT)</h2>
                <span class="browse-side-count">${totalCT} lineup${getPolishPlural(totalCT, 'ów', 'y', '')}</span>
            </div>
        `;

        Object.keys(ctSections).forEach(key => {
            const siteGroup = createBrowseSiteGroup('ct', key, ctSections[key]);
            ctSectionEl.appendChild(siteGroup);
        });

        browseView.appendChild(ctSectionEl);
    }
}

function scrollToBrowseSection(targetId) {
    const target = document.getElementById(targetId);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/* ==========================================================================
   Lightbox Modal with Lineup-Scoped Navigation
   ========================================================================== */
let currentLightboxGroup = [];
let currentLightboxIndex = 0;

function initLightbox() {
    const modal = document.createElement('div');
    modal.id = 'lightbox-modal';
    modal.className = 'lightbox-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Podgląd zdjęcia');

    modal.innerHTML = `
        <button type="button" class="lightbox-btn lightbox-close" id="lightbox-close" aria-label="Zamknij podgląd" title="Zamknij (Esc)">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
        <button type="button" class="lightbox-btn lightbox-prev" id="lightbox-prev" aria-label="Poprzednie zdjęcie" title="Poprzednie (←)">
            <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2.5" fill="none">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
        </button>
        <button type="button" class="lightbox-btn lightbox-next" id="lightbox-next" aria-label="Następne zdjęcie" title="Następne (→)">
            <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2.5" fill="none">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        </button>
        <div class="lightbox-content" id="lightbox-content">
            <img class="lightbox-img" id="lightbox-img" src="" alt="Zoom">
            <div class="lightbox-footer">
                <span class="lightbox-caption" id="lightbox-caption"></span>
                <span class="lightbox-counter" id="lightbox-counter"></span>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    const content = document.getElementById('lightbox-content');

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeLightbox();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateLightbox(-1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateLightbox(1);
        });
    }

    if (content) {
        content.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('active')) return;

        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            navigateLightbox(-1);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            navigateLightbox(1);
        }
    });

    // Touch swipe support for mobile
    let touchStartX = 0;
    let touchStartY = 0;

    modal.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    }, { passive: true });

    modal.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 1 && currentLightboxGroup.length > 1) {
            const diffX = e.changedTouches[0].clientX - touchStartX;
            const diffY = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > 0) {
                    navigateLightbox(-1);
                } else {
                    navigateLightbox(1);
                }
            }
        }
    }, { passive: true });

    // Delegated click handler: scopes navigation strictly to THAT lineup
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (target && target.classList.contains('zoomable-img')) {
            e.stopPropagation();

            const container = target.closest('.browse-row')
                || target.closest('.instant-spawn-row')
                || target.closest('.lineup-card')
                || target.parentElement;

            const group = container ? Array.from(container.querySelectorAll('.zoomable-img')) : [target];
            const idx = group.indexOf(target);

            openLightbox(group, idx >= 0 ? idx : 0);
        }
    });
}

function openLightbox(group, index) {
    const modal = document.getElementById('lightbox-modal');
    if (!modal) return;

    currentLightboxGroup = Array.isArray(group) ? group : [];
    currentLightboxIndex = index >= 0 && index < currentLightboxGroup.length ? index : 0;

    updateLightboxContent();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    document.body.style.overflow = '';
}

function navigateLightbox(direction) {
    if (!currentLightboxGroup || currentLightboxGroup.length <= 1) return;
    const nextIndex = currentLightboxIndex + direction;
    if (nextIndex < 0 || nextIndex >= currentLightboxGroup.length) return;
    currentLightboxIndex = nextIndex;
    updateLightboxContent();
}

function updateLightboxContent() {
    if (!currentLightboxGroup || currentLightboxGroup.length === 0) return;
    const currentImg = currentLightboxGroup[currentLightboxIndex];
    if (!currentImg) return;

    const modalImg = document.getElementById('lightbox-img');
    const captionEl = document.getElementById('lightbox-caption');
    const counterEl = document.getElementById('lightbox-counter');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');

    if (modalImg) {
        modalImg.src = currentImg.src;
        modalImg.alt = currentImg.alt || 'Zoom';
    }

    if (captionEl) {
        captionEl.textContent = currentImg.alt || '';
    }

    if (counterEl) {
        counterEl.textContent = `${currentLightboxIndex + 1} / ${currentLightboxGroup.length}`;
        counterEl.style.display = currentLightboxGroup.length > 1 ? 'inline-block' : 'none';
    }

    if (prevBtn && nextBtn) {
        const showNav = currentLightboxGroup.length > 1;
        prevBtn.style.display = showNav ? 'flex' : 'none';
        nextBtn.style.display = showNav ? 'flex' : 'none';

        if (showNav) {
            prevBtn.disabled = currentLightboxIndex === 0;
            nextBtn.disabled = currentLightboxIndex === currentLightboxGroup.length - 1;
        }
    }
}

// Global exposes for inline handlers
window.switchSide = switchSide;
window.scrollToBrowseSection = scrollToBrowseSection;
