# PROJECT_DOCS.md — Dokumentacja techniczna projektu „Grafik Gillette”

Ten dokument służy do szybkiego zapoznania się z architekturą i strukturą projektu.

## 1. OPIS OGÓLNY
**Grafik Gillette** — to aplikacja webowa (PWA) do wizualizacji i zarządzania grafikiem pracy czterech brygad (A, B, C, D) w zakładzie Gillette. Aplikacja pozwala śledzić zmiany (Rano, Popołudnie, Noc), planować urlopy, dodawać nadgodziny oraz synchronizować dane przez Google Drive.

### Stos technologiczny
- **Frontend**: Vanilla HTML5, CSS3 (Custom Properties, Flexbox, Grid), Vanilla JavaScript (ES6+).
- **Backend**: Brak (w pełni aplikacja kliencka).
- **Trwałość danych**: `localStorage` do przechowywania lokalnego + Google Drive API do synchronizacji.
- **PWA**: Service Worker (`sw.js`) do pracy w trybie offline.

---

## 2. STRUKTURA PLIKÓW

### Pliki główne
- `index.html` — **Główny plik roboczy**. Jedyny punkt wejścia, zawiera strukturę UI oraz style.
- `manifest.json` — Konfiguracja PWA (nazwa, kolory, ikony).
- `sw.js` — Service Worker do cache'owania zasobów i dostępu offline.
- `.agent.md` — Instrukcje dla asystentów AI dotyczące stylu kodowania i przeglądu.

### Katalog `js/` (Logika modułowa)
Projekt został zrefaktorowany: stary monolityczny JS podzielono na logiczne moduły:
1. `data.js` — Grafik fabryczny (`factorySchedule`), nazwy miesięcy, stałe oraz klucze `localStorage`.
2. `core.js` — Podstawowa logika biznesowa: obliczanie świąt (Wielkanoc), praca z `localStorage`, obliczanie kategorii nadgodzin (50%/100%/200%).
3. `ui.js` — Narzędzia interfejsu: okna modalne, toasty (powiadomienia), escapowanie HTML.
4. `edit.js` — Logika trybu edycji, bufor niezapisanych zmian (`pendingChanges`), pełna obsługa Undo/Redo.
5. `dashboard.js` — Renderowanie ekranu głównego (statystyki, aktualna zmiana, najbliższe dni).
6. `calendar.js` — Generowanie siatki kalendarza dla widoku „Miesiąc”.
7. `views.js` — Renderowanie alternatywnych widoków: „Tydzień”, „Rok”, „Tabela”.
8. `actions.js` — Obsługa akcji menu: eksport JSON/ICS, import, czyszczenie danych, zarządzanie limitami urlopów.
9. `pwa.js` — Rejestracja Service Worker oraz logika aktualizacji aplikacji.
10. `sync.js` — Integracja z Google Drive API do backupu w chmurze.
11. `main.js` — Punkt wejścia: inicjalizacja stanu, routing (przez parametry URL), obsługa zdarzeń klawiatury i gestów.

### Katalog `tools/`
- `split_html.py` — Skrypt użyty do podziału starego monolitycznego HTML na obecną strukturę modułową.
- `generate_icons.py` — Narzędzie do generowania ikon PWA.

### Pliki przestarzałe (History)
Wcześniej projekt składał się z jednego pliku `Gillette 2026 New UI overtime.html`. Obecny `index.html` jest jego nowoczesną, modułową i w pełni funkcjonalną wersją. Wszystkie inne pliki o nazwie `Gillette 2026...html` w katalogu głównym są przestarzałymi szkicami.

---

## 3. ARCHITEKTURA I STAN

### Globalne zmienne stanu (`js/main.js`)
- `currentYear`: Aktualnie wybrany rok (domyślnie: 2026).
- `currentMonth`: Aktualny miesiąc (1-12).
- `selectedShift`: Wybrana brygada (A, B, C lub D).
- `currentView`: Aktywny widok (`dashboard`, `month`, `week`, `year`, `table`).
- `editMode`: Boolean, czy włączony jest tryb rysowania grafiku.

### Przechowywanie danych (localStorage)
| Klucz | Przeznaczenie |
| :--- | :--- |
| `gillette_prefs_v1` | Ustawienia: rok, brygada, motyw, widok, limity urlopów. |
| `gillette_notes_v1` | Notatki tekstowe użytkownika do konkretnych dat. |
| `gillette_urlops_v1` | Tablice dat urlopów dla każdej brygady. |
| `gillette_custom_schedule_v2` | Obiekt z ręcznymi zmianami w grafiku (nadpisuje factorySchedule). |
| `gillette_overtimes_v1` | Dane o nadgodzinach (liczba godzin, typ). |

---

## 4. MODEL DANYCH

### Grafik zmian
Przechowywany w `factorySchedule` (js/data.js) oraz `customSchedule` (localStorage).
Format: `Rok -> Miesiąc -> Brygada -> Array[dni]`.
Wartości: `'R'` (Rano), `'P'` (Popołudnie), `'N'` (Noc), `''` (Dzień wolny).

### Format kluczy do mapowania
- **Urlopy/Notatki**: `YYYY-MM-DD` (np. `2026-05-01`).
- **Nadgodziny**: `YYYY-MM-DD-Brygada` (np. `2026-05-01-A`).
- **Obiekt nadgodzin**: `{ przed: { hours: 4 }, po: { hours: 2 } }`.

---

## 5. ZNANE FUNKCJE / TODO
- **Nadgodziny**: Obliczane automatycznie w zależności od czasu (nocne/dzienne) oraz kalendarza świąt (200% w dni świąteczne).
- **Synchronizacja**: Używa `appDataFolder` w Google Drive, co gwarantuje prywatność (aplikacja widzi tylko swoje pliki).
- **Eksport ICS**: Generuje plik kalendarza do importu w Google Calendar/iOS.
- **Plany na przyszłość**: Możliwość dodawania niestandardowych typów zmian oraz wsparcie dla wielu profili użytkowników.