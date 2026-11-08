document.addEventListener('DOMContentLoaded', () => {
    updateAllMapBadges();
});

async function updateAllMapBadges() {
    const mapCards = document.querySelectorAll('.map-card');

    const fetchPromises = Array.from(mapCards).map(async (card) => {
        const href = card.getAttribute('href') || '';
        const match = href.match(/[?&]map=([^&]+)/i);
        if (!match) return;

        const mapId = match[1].toLowerCase();
        const badgeEl = card.querySelector('.map-badge');
        if (!badgeEl) return;

        try {
            const response = await fetch(`./data/${mapId}.json`);
            if (!response.ok) {
                setBadgeEmpty(badgeEl);
                return;
            }

            const data = await response.json();
            let count = 0;

            Object.values(data).forEach((section) => {
                if (Array.isArray(section)) {
                    count += section.length;
                }
            });

            if (count > 0) {
                badgeEl.textContent = formatLineupCount(count);
                badgeEl.classList.remove('empty');
            } else {
                setBadgeEmpty(badgeEl);
            }
        } catch {
            // Plik nie istnieje lub błąd ładowania
            setBadgeEmpty(badgeEl);
        }
    });

    await Promise.all(fetchPromises);
}

function setBadgeEmpty(badgeEl) {
    badgeEl.textContent = 'Wkrótce';
    badgeEl.classList.add('empty');
}

function formatLineupCount(count) {
    if (count === 1) return '1 lineup';
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    if (lastTwoDigits >= 12 && lastTwoDigits <= 14) {
        return `${count} lineupów`;
    }
    if (lastDigit >= 2 && lastDigit <= 4) {
        return `${count} lineupy`;
    }
    return `${count} lineupów`;
}
