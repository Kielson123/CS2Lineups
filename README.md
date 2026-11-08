# CS2 Lineups

Interaktywna strona z lineupami granatów do gry Counter-Strike 2.

## 🚀 Struktura projektu

```text
CS2Lineups/
├── index.html                 # Strona główna z kafelkami wszystkich map
├── map.html                   # Dynamiczny szablon dla widoku mapy (?map=mirage)
├── data/
│   ├── maps.json              # Lista map, nazwy i miniatury
│   ├── mirage.json            # Lineupy dla mapy Mirage
│   └── ...                    # Kolejne mapy (np. inferno.json)
└── assets/
    ├── css/
    │   └── main.css           # Główne style CSS (motyw, karty, nawigacja)
    ├── js/
    │   └── map.js             # Skrypt obsługi widoku mapy, zakładek i powiększania zdjęć
    ├── icons/                 # Ikony przycisków myszy
    │   ├── left-click.png
    │   ├── right-click.png
    │   └── ...
    └── images/
        ├── maps/              # Zoptymalizowane okładki map (.webp)
        └── lineups/           # Zoptymalizowane zrzuty ekranu lineupów (.webp)
            └── mirage/
```

## 🖼️ Automatyczna optymalizacja obrazów (.exe)

W głównym katalogu projektu znajduje się narzędzie `optimize-images.exe`:

* **Przeciągnij i upuść (Drag & Drop):** Możesz zaznaczyć dowolne pliki `.png` lub `.jpg` (np. zrzuty ekranu z gry) i przeciągnąć je bezpośrednio na plik `optimize-images.exe` w Eksploratorze Windows.
* **Automatyczne skanowanie:** Uruchomienie `optimize-images.exe` bez parametrów (poprzez podwójne kliknięcie) automatycznie przeszuka katalog `assets/images/` i przekonwertuje wszelkie nowo dodane pliki `.png`/`.jpg` do `.webp`.
* **Co robi optymalizator?**
  * Zmniejsza rozdzielczość z 4K / 1440p do maksymalnie 1080p (Lanczos).
  * Zapisuje zoptymalizowany plik `.webp` (jakość 85%).
  * Normalizuje nazwę pliku (usuwa spacje i nawiasy, np. `ramp_jungle (1).png` -> `ramp_jungle_1.webp`).
  * Usuwa stary, ciężki plik `.png`, oszczędzając miejsce na dysku.


1. W pliku `data/maps.json` upewnij się, że mapa jest na liście, np.:
   ```json
   {
     "id": "inferno",
     "name": "Inferno",
     "image": "./assets/images/maps/inferno.webp",
     "hasData": true
   }
   ```
2. Umieść plik `data/inferno.json` z lineupami podzielonymi na bombsite'y (`Bombsite-A`, `Bombsite-B`, `Mid`, itp.).
3. Dodaj zrzuty ekranu w formacie `.webp` do katalogu `assets/images/lineups/inferno/`.
4. Gotowe! Mapa automatycznie wygeneruje zakładki i karty po wejściu na `map.html?map=inferno`.

## 🎯 Format lineupu w JSON

```json
{
  "id": "jungle",
  "title": "Jungle",
  "side": "t",
  "grenade": "smoke",
  "preview": "./assets/images/lineups/mirage/ramp_jungle.webp",
  "images": [
    "./assets/images/lineups/mirage/ramp_jungle_1.webp",
    "./assets/images/lineups/mirage/ramp_jungle_2.webp"
  ],
  "throw": {
    "mouse": "left-click",
    "keys": ["W"],
    "action": "jump"
  }
}
```

* `side`: strona (`"t"`, `"ct"`, lub `"both"`) — przypisuje lineup do filtru Terrorystów / Antyterrorystów oraz dodaje plakietkę na karcie.
* `grenade`: typ granatu (`smoke`, `flash`, `molotov`, `he`) — określa kolor obramowania karty.
* `throw.mouse`: nazwa ikony z `assets/icons/` (np. `left-click`, `right-click`, `both-click`).
* `throw.keys`: opcjonalna tablica klawiszy (np. `["W"]`, `["Shift"]`).
* `throw.action`: typ rzutu (`jump` -> Skok, `run` -> W biegu, `stand` -> W miejscu).
