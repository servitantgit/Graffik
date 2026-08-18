# PROJECT_DOCS.md — Dokumentacja techniczna projektu „Grafik Gillette"

Ten dokument służy do szybkiego zapoznania się z architekturą i strukturą projektu. Przeznaczony dla developerów i AI-asystentów.

## 1. Przegląd architektury

- **Typ projektu**: Vanilla JavaScript PWA, brak frameworków, brak build system
- **Skrypty**: Klasyczne (bez ES modules), dzielone przez global scope
- **CSS**: Wydzielony do osobnego pliku `css/styles.css`
- **Hosting**: GitHub Pages (https://servitantgit.github.io/Graffik/)
- **Kolejność ładowania skryptów** (v3.7.0+):
  1. `schedules/_core.js` — stałe i helpers
  2. `schedules/_registry.js` — registry + shouldShowPersonalData
  3. `schedules/gillette/metadata.js` — rejestracja Gillette schedule
  4. `schedules/gillette/2026.js` — dane roku 2026 (dodać kolejne 2027.js gdy powstaną)
  5. `overtime-logic.js` → `core.js` → `ui.js` → `edit.js` → `dashboard.js` → `calendar.js` → `views.js` → `actions.js` → `pwa.js` → `sync.js` → `admin.js`
  6. `i18n/pl.js` → `i18n/en.js` → `i18n/uk.js` → `i18n/i18n.js`
  7. `main.js` (na końcu — inicjalizacja)
- **Wielojęzyczność (i18n)**: 3 języki (pl/en/uk), modułowa struktura w `js/i18n/`

## 2. Modele danych

### prefs (localStorage: `gillette_prefs_v1`)

```javascript
{
  year: 2026,                    // Aktualny rok
  month: 8,                      // Aktualny miesiąc (1-12)
  shift: 'A',                    // Aktywna brygada
  view: 'month',                 // Aktywny widok
  yearMode: false,               // Tryb Rok
  theme: 'light' | 'dark',       // Motyw (TYLKO te dwie wartości)
  lang: 'pl' | 'en' | 'uk',      // Aktywny język (auto-detekcja przy pierwszym uruchomieniu)
  notifications: false,          // Powiadomienia włączone
  notificationsLead: 1,          // Wyprzedzenie powiadomień (godziny)
  vacationLimits: { A: 26, B: 26, C: 26, D: 26 },  // Limity urlopów
  welcomed: true,                // Czy pokazano ekran powitalny
  skipEditConfirm: false,        // Pomiń potwierdzenie trybu edycji
  driveTokenExpiry: null         // Wygaśnięcie tokenu Drive (jeśli sync)
}
```

### customSchedule (localStorage: `gillette_custom_schedule_v2`)

```javascript
{
  [year]: {
    [month]: {
      [brigade]: ['R', 'R', 'P', 'P', 'N', 'N', 'W', 'W', ...]  // Array, 1 element/dzień (R/P/N/W/'')
    }
  }
}
```

Uwaga: to jest **tablica**, nie string — indeks `[day - 1]` odpowiada dniu miesiąca (patrz `setShift()`/`ensureCustomYear()` w `core.js`). Długość tablicy jest zawsze równa liczbie dni w miesiącu; `ensureCustomYear()` dopełnia/przycina ją automatycznie.

Przykład: `{ 2026: { 8: { A: ['R','R','P','P',...], B: ['P','P','N','N',...] } } }`

### urlops (localStorage: `gillette_urlops_v1`)

```javascript
{
  [brigade]: ['2026-08-10', '2026-08-11', ...]  // Tablica stringów dat
}
```

### notes (localStorage: `gillette_notes_v1`)

```javascript
{
  '2026-8-10-C': 'treść notatki',
  '2026-8-15-A': 'inna notatka'
}
```

### overtimes (localStorage: `gillette_overtimes_v1`)

```javascript
{
  // Klucz płaski: `${year}-${month}-${day}-${brigade}`, generowany przez otKey() w core.js
  '2026-8-10-C': {
    przed: { hours: 2, note: 'przed zmianą' },  // ustawiane z UI (przycisk ⏱⬅ OT PRZED)
    po: { hours: 3, note: 'po zmianie' },       // ustawiane z UI (przycisk ⏱➡ OT PO)
    weekend: { hours: 8, note: '...' }          // obsługiwane przez categorizeOvertime()
                                                 // i import (validateImportedData), ale
                                                 // NIE jest jeszcze ustawiane z poziomu UI
  }
}
```

Uwaga: struktura jest **płaska** (jeden poziom kluczy string), nie zagnieżdżona przez `[brigade][year][month][day]`. Zobacz `otKey()`, `getOvertimes()`, `setOvertime()` w `core.js`.

### pendingChanges (w pamięci, tylko w trybie edycji)

```javascript
{
  '2026-8-10-C': 'R',           // Klucz: 'rok-miesiąc-dzień-brygada', wartość: nowa zmiana
  '2026-8-11-C': 'P'
}
```

### AppState

Na chwilę obecną zmienne stanu są globalne w `js/main.js`:

- `currentYear`, `currentMonth`, `selectedShift`, `compareShift`
- `selectedDay`, `currentView`, `yearMode`
- `editMode`, `editPaletteMode`, `popupFadeTimer`
- `pendingChanges`, `pendingOriginals`, `undoStack`, `redoStack` (w edit.js)

## 3. Mapa plików JS (co gdzie)

### js/schedules/ — Moduł 1: Modularna architektura danych (v3.7.0+)

**Nowa architektura** — dane rozbite na osobne pliki dla lepszej rozszerzalności:

**js/schedules/\_core.js** — stałe i helpers (niezależne od roku):

- `monthNames`, `monthNamesShort`, `dayNames`, `dayNamesFull`
- `shiftHours`, `shiftEmoji`, `shiftFullName`, `shiftLongNames`
- `SHIFT_CYCLE`, `MIN_YEAR`, `MAX_YEAR`, `URLOP_LIMIT`
- Klucze localStorage: `LS_KEY`, `NOTES_KEY`, `URLOPS_KEY`, etc.
- Helpers: `daysInMonthCal`, `isWolne`, `escapeHtml`, `formatTimeRange`
- `buildHolidays(year)` — polskie święta

**js/schedules/\_registry.js** — registry pattern + visibility:

- `scheduleRegistry` — mapa wszystkich zarejestrowanych schedules
- `AVAILABLE_YEARS` — lista dostępnych lat dla aktywnego schedule
- `factorySchedule`, `factoryMonthHours` — backward-compatible aliases
- `registerSchedule({...})` — rejestruje nowy typ schedule
- `registerYearData(scheduleId, year, {...}, {...})` — rejestruje dane roku
- `shouldShowPersonalData()` — visibility control (login-based, replaces old privacyMode)

**js/schedules/gillette/metadata.js** — metadane Gillette schedule:

- `registerSchedule({ id: 'gillette', name: 'Gillette IV brygady', ... })`
- Definiuje: 4 brygady (A/B/C/D), 3 typy zmian (R/P/N), typ 'rotating-4x3'
- Kolory brygad (matches CSS variables)

**js/schedules/gillette/YYYY.js** — dane per rok:

- `registerYearData('gillette', 2026, {...schedule...}, {...hours...})`
- Każdy rok w osobnym pliku (2026.js, 2027.js, 2028.js, ...)
- Dodanie nowego roku = utworzenie nowego pliku + jeden `<script>` tag w index.html
- Brak ryzyka zepsucia starych lat

**Struktura folderów:**

```
js/schedules/
├── _core.js                  # constants + helpers
├── _registry.js              # registry pattern + shouldShowPersonalData
└── gillette/
    ├── metadata.js           # 'gillette' schedule metadata
    ├── 2026.js               # year 2026 data
    └── 2027.js               # future year (when added)
```

**Future expansion:** Nowe typy grafików (np. office-5x1) będą w osobnych folderach:
`js/schedules/office-5x1/metadata.js` + `js/schedules/office-5x1/YYYY.js`

### js/overtime-logic.js — Moduł 1.5: Logika nadgodzin

- `categorizeOvertime(y, m, d, shift, position, hours)` — kategoryzacja
  - position: 'przed' | 'po' | 'weekend'
  - 'weekend' → święto=+200%, niedziela/wolne=+100%
- `calcOvertimeTime()` — obliczanie czasu początku/końca (dla przed/po)
- `getActualWorkTime()` — rzeczywisty czas pracy
- `getMonthOvertimeSummary()` — sumowanie miesięczne (uwzględnia przed/po/weekend)

### js/core.js — Moduł 2: Storage + logika biznesowa

- `loadPrefs` / `savePrefs(p, markSync?)` — UI prefs; `markSync=true` tylko dla personal (np. urlopLimits)
- `loadCustomSchedule/saveCustomSchedule`, `loadUrlops/saveUrlops`, `loadNotes/saveNotes`, `loadOvertimes/saveOvertimes`
  - wszystkie `save*` (poza zwykłym savePrefs) wołają `updateLastModified()`
- `getShiftAt(y, m, d, brig)` — customSchedule jeśli jest, inaczej factory
- `getYearSchedule(y)` — cały rok jako struktura
- `getMonthHours(y, m)` — sumowanie godzin w miesiącu
- `isUrlop`, `toggleUrlop`, `getVacationLimit`, `setVacationLimit` (markSync), `countWorkingUrlops`
- `getOvertimes`, `setOvertime`, `removeOvertime`
- `getRelief(y, m, d, brig, shift)` — kto przekazuje/przejmuje zmianę
- `getCycleRange`, `getFactoryCycleRange` (privacy mode), `daysToNextWolne`
- `hasFactoryData`, `hasCustomData`
- `getElementByIdSafe` — bezpieczny dostęp do DOM

> `getShiftAtWithPending` / `isDirty` → `js/edit.js`  
> `getLiveTimer` / `jumpToDate` → `js/dashboard.js`  
> `categorizeOvertime` / `getActualWorkTime` → `js/overtime-logic.js`

### js/ui.js — Moduł 3: UI helpers

- `showToast(type, msg, duration)` — powiadomienia toast
- `showModal({title, body, buttons})` — uniwersalne okno modalne
- `showConfirm(title, body, onConfirm, opts)` — potwierdzenie z 2 przyciskami
- `hideModal` — zamknięcie modala
- `openSideMenu`, `closeSideMenu` — boczne menu
- `applyTheme(themeName)`, `toggleTheme()` — przełączanie motywów
- Bindings: `themeToggleBtn`, `menuBtn`, `sideMenuClose`, `faqHelp`

### js/edit.js — Moduł 4: Tryb edycji

- `pendingChanges`, `pendingOriginals` — bufor zmian
- `undoStack`, `redoStack` — historia cofania (Ctrl+Z / Ctrl+Y)
- Przyciski UI: #undoBtn, #redoBtn w edit banner
- `applyEdit(y, m, d, brig, val)` — aplikuje edycję do bufora
- `undoLastEdit` — cofa ostatnią zmianę
- `redoLastEdit` — przywraca cofniętą zmianę
- `saveAllPendingChanges` — zapis bufora do customSchedule
- `discardAllPendingChanges` — czyszczenie bufora
- `updateDirtyIndicator` — licznik niezapisanych zmian
- `redoLastEdit()` — przywraca cofniętą zmianę (Ctrl+Y lub Ctrl+Shift+Z)

### js/dashboard.js — Moduł 5: Widok Dashboard

- `renderDashboard()` — cały widok Dashboard
  - Hero section z powitaniem i datą
  - Karta dzisiejszej zmiany z live timerem
  - Statystyki (najbliższe zmiany, urlopy, nadgodziny)
  - Upcoming days chips
- **Privacy:** `shouldShowPersonalData()` — gdy `false` (wylogowany):
  - tylko fabryczny grafik (bez urlopów / OT / notatek / live-timera)
  - ukryte karty: wykorzystane urlopy, miesięczny overtime

### js/calendar.js — Moduł 6: Widok Miesiąc

- `renderCalendar(direction)` — generowanie siatki kalendarza
- `addReliefPopups(cell, d, shiftCode, onUrlop)` — popupy z brygadą przekazującą/przejmującą
- `addOvertimePopups(cell, d, shift)` — popupy PRZED/PO w trybie nadgodzin
- `openOvertimeModal(d, shift, type)` — modal edycji nadgodzin
- `updateOvertimePreview()` — podgląd nadgodzin w modalu
- `saveOvertimeFromModal()` — zapis nadgodzin
- `renderMonthOvertimeSummary()` — podsumowanie miesięczne nadgodzin
- `renderProgress()` — pasek postępu miesiąca
- `renderInfo()` — panel informacji pod kalendarzem
- `getLiveShiftInfo()` — info o aktualnej zmianie
- **Privacy:** komórki, OT, notatki, dirty-edit — za `hidePrivate`
  - `cycleRange` / `compareShift` używają factory schedule gdy wylogowany
  - helper: `getFactoryCycleRange()` w `core.js`

### js/views.js — Moduł 7: Widoki Tydzień, Rok, Tabela

- `renderWeekView()` — widok tygodnia (7 dni)
- `ensureWeekStart()` — ustawia początek tygodnia na poniedziałek
- `prevWeek()`, `nextWeek()` — nawigacja tygodniowa
- `renderYearView()` — 12 mini-kalendarzy (Rok mode)
- `renderTableView(yearMode)` — tabela wszystkich brygad
- `buildMonthTable(year, month, yearMode)` — budowa tabeli dla miesiąca
- `renderEmptyState(container)` — placeholder gdy brak danych

### js/actions.js — Moduł 8: Akcje

- `bindClick(id, handler)` — bezpieczny helper (console.warn jeśli brak elementu)
- `exportICS()` — eksport do kalendarza .ics
- `shareCurrent()` — kontekstowe udostępnianie widoku
- `buildShareUrl()` — budowa URL z parametrami
- `buildShareText()` — budowa tekstu do udostępnienia
- `copyToClipboard(url)` — fallback dla kopiowania
- Import/eksport JSON: `exportDataBtn`, `importDataBtn`, `importFile`
- `addPrintHeader()`, `addPrintFooter()` — nagłówek/stopka druku
- Menu handlers: `menuIcs`, `menuPrint`, `menuShare`, `menuVacationLimit`
- `clearYearBtn`, `resetCustomBtn` — czyszczenie danych
- `validateImportedData(data)` — walidacja struktury JSON przy imporcie (typy, formaty dat, długości tablic)
- `getAppUrl()` — zwraca bazowy URL aplikacji (bez parametrów query)
- `buildQRCodeUrl(text, size)` — generuje URL do api.qrserver.com dla kodu QR
- `shareApp()` — otwiera modal z QR kodem, linkiem, przyciskami kopiowania i natywnego udostępniania
- Handler `menuShareApp` w side menu

### js/pwa.js — Moduł 9: PWA + Powiadomienia

- `registerServiceWorker()` — rejestracja SW z pełną obsługą auto-update:
  - Wykrywanie nowej wersji w `waiting` state
  - Nasłuchiwanie na `updatefound` event
  - Nasłuchiwanie na `controllerchange` → automatyczny reload
  - Periodyczna kontrola aktualizacji co 60 minut
- `promptUserToUpdate(waitingSW)` — wyświetla toast z przyciskiem "Odśwież"
- `showUpdateToast(onUpdate)` — buduje niestandardowy toast z akcją
- `setupInstallPrompt()` — prompt instalacji PWA
- `isIOS`, `isStandalone` — detekcja środowiska
- `requestNotificationPermission()` — prośba o uprawnienia
- `toggleNotifications()` — włącz/wyłącz powiadomienia
- `notifyCurrentShift()` — powiadomienie o zmianie
- `areNotificationsEnabled()` — status powiadomień
- `updateNotificationUI()` — aktualizacja UI powiadomień
- Timer sprawdzania rozpoczęcia zmiany (setInterval 60s)

### js/sync.js — Moduł 10: Google Drive

- Logowanie/wylogowanie (OAuth 2.0)
- `findDriveFile()` — wyszukiwanie pliku w Drive (najnowszy po modifiedTime)
- `downloadFromDrive()` — pobieranie i pełne zastąpienie lokalnych danych
- `uploadToDrive()` — wysyłanie danych do Drive
- Obsługa konfliktów (brak merge — last-write-wins)

### js/admin.js — Moduł Admin: identyfikacja administratora

- `ADMIN_EMAILS` — lista emaili administratorów (publiczna w kodzie; sama znajomość
  emaila nie daje dostępu — wymaga faktycznego zalogowania do Google)
- `isCurrentUserAdmin()` — porównuje `driveUserEmail` (ustawiane w `sync.js` po
  OAuth) z `ADMIN_EMAILS`
- `updateAdminUI()` — dodaje/usuwa klasę `body.admin-mode` i przełącza widoczność
  elementów `.admin-only` / `#adminPanelSection`
- `initAdminMode()` — nasłuchuje event `driveAuthChanged` + polling co 3s (fallback)
- **Ważne**: `.admin-only` (CSS) tylko **ukrywa** elementy — nie blokuje wykonania
  powiązanego z nimi kodu. Klawiskowe skróty R/P/N/W (`main.js`) i klik w przyciski
  palety (`main.js`) dodatkowo sprawdzają `isCurrentUserAdmin()` przed zastosowaniem
  edycji, żeby wywołanie `.click()` na ukrytym elemencie (np. z konsoli) też nie
  przechodziło. Sama zmiana w `customSchedule` i tak zostaje tylko lokalnie w
  przeglądarce danej osoby — nie ma wspólnego zapisu bez repozytorium/Drive, do
  którego dostęp ma tylko administrator.

### js/i18n/ — Moduł i18n (wielojęzyczność)

Folder z 4 plikami:

- **js/i18n/pl.js** — polski (window.translations.pl)
- **js/i18n/en.js** — angielski (window.translations.en)
- **js/i18n/uk.js** — ukraiński (window.translations.uk)
- **js/i18n/i18n.js** — logika:
  - `SUPPORTED_LANGS = ['pl', 'en', 'uk']`
  - `currentLang` — aktywny język
  - `detectLanguage()` — z prefs.lang lub navigator.language
  - `setLanguage(lang)` — zmiana + savePrefs
  - `t(key, params)` — pobranie tłumaczenia z placeholderami `{key}`
  - `applyTranslations()` — aplikuje do wszystkich `[data-i18n]`, `[data-i18n-title]`, `[data-i18n-placeholder]`
  - `renderFAQ()` — dynamiczne generowanie FAQ z tłumaczeń

### js/main.js — Moduł 11: Stan + Init

- Globalne zmienne stanu (wszystkie z sekcji 2)
- `applyUrlParams()` — parsowanie URL params (view/y/m/d/brig/rok)
- `switchView(view)` — przełączanie widoków
- `refreshViews()` — odświeżanie wszystkich widoków
- `updateShiftButtons()`, `updateYearPicker()`, `updateEditModeUI()`, `updateYearToggleState()`
- `goToMonth(delta)`, `goToYear(delta, keepMonth)` — nawigacja
- Obsługa klawiatury (keydown handler) — skróty, nawigacja
- Obsługa gestów (touchstart/touchend) — swipe
- Obsługa kliknięć: shift buttons, palette buttons, todayBtn
- `beforeunload` handler — ostrzeżenie przed niezapisanymi zmianami
- Auto-refresh timer (setInterval 60s) — aktualizacja Dashboard
- Inicjalizacja na końcu pliku

## 4. Ważne konwencje

### Klasy CSS

- Komórki dni: `.cell-R`, `.cell-P`, `.cell-N`, `.cell-W`, `.cell-U`
- Stany komórek: `.selected`, `.today`, `.urlop`, `.dirty-edit`, `.cycle-start`, `.cycle-middle`, `.cycle-end`, `.compare-match`
- Pozycja w tygodniu: `.col-first` (Poniedziałek), `.col-last` (Niedziela) — dla popupów
- Tryb edycji: `body.edit-active .day-cell:not(.empty)`

### Motywy

- Tylko 2 motywy: `:root` (jasny domyślny) i `body.theme-dark` (ciemny)
- Przełącznik: `#themeToggleBtn` w top-bar
- Ikona: 🌙 gdy jasny (można przełączyć na ciemny), ☀️ gdy ciemny
- Funkcje: `applyTheme(themeName)`, `toggleTheme()`

### URL params (po refaktoringu Share)

Wspierane parametry: `view`, `y`, `m`, `d`, `brig`, `rok`

Przykłady:

- `?view=month&y=2026&m=8&d=10&brig=C` — dzień 10 sierpnia, brygada C
- `?view=month&y=2026&m=8&brig=C` — cały sierpień, brygada C
- `?view=month&y=2026&brig=C&rok=1` — Rok view, brygada C
- `?view=week&y=2026&m=8&d=10&brig=C` — tydzień z 10 sierpnia
- `?view=table&y=2026&rok=1` — tabela cały rok

Po załadowaniu URL jest czyszczony przez `history.replaceState` (dla czystości).

### bindClick helper (js/actions.js)

```javascript
function bindClick(id, handler) {
  const el = document.getElementById(id);
  if (el) {
    el.onclick = handler;
  } else {
    console.warn(`[actions.js] Element #${id} not found in DOM`);
  }
}
```

Używany dla wszystkich przycisków w side menu i edit banner.

### Wielojęzyczność (i18n)

- Wszystkie teksty użytkownika muszą przechodzić przez funkcję `t(key)`
- Elementy HTML używają atrybutów:
  - `data-i18n="key"` — dla textContent/innerHTML
  - `data-i18n-title="key"` — dla atrybutu title
  - `data-i18n-placeholder="key"` — dla atrybutu placeholder
- Nowe klucze dodawać do WSZYSTKICH 3 języków (pl/en/uk)
- Placeholders w tłumaczeniach: `{param}` zamieniane przez drugi argument `t(key, {param: value})`
- FAQ generowane dynamicznie w `renderFAQ()` z js/i18n/i18n.js — nie edytować w HTML
- **NIE tłumaczyć** uniwersalnych symboli (×, →, ✓, emoji ikon menu)
- Ikony w bocznym menu są w HTML (`<span class="mi-icon">`), NIE w wartościach tłumaczeń

### Nadgodziny — trzy typy pozycji

- `'przed'` — przed rozpoczęciem zmiany (dni robocze, 1-6h typowo)
- `'po'` — po zakończeniu zmiany (dni robocze, 1-6h typowo)
- `'weekend'` — praca w dzień wolny/święto (8-13h max)
- Weekend NIE potrzebuje `shift` — przekazuj `null`
- Kategoryzacja weekend: automatyczna z buildHolidays() i sprawdzenia dow===0 (niedziela)

### CSS

- Wszystkie style w `css/styles.css`
- Podłączony w index.html: `<link rel="stylesheet" href="css/styles.css">`
- Zmienne CSS (custom properties) w :root i body.theme-dark

## 5. Znane zagadnienia (Known issues)

- Zmienne stanu są globalne — potencjalne konflikty przy dużych zmianach
- CSS w jednym pliku — trudno modularyzować
- Brak testów jednostkowych automatycznych (poza `test_core.js` dla obliczeń)
- Synchronizacja Google Drive: brak merge/diff — last-write-wins (patrz sekcja 6)
- `goToMonth` musi być exposed na `window` (patrz `window.goToMonth = goToMonth`)
- Klucze i18n są rozproszone po 3 plikach — brak central registry i validacji brakujących kluczy
- Genitive month names są zdublowane w kodzie (monthNames dla nagłówków vs monthNamesGenitive dla dat)
- Testowanie funkcji `getLiveTimer()` wymaga mockowania `Date`, `getShiftAt`, `isUrlop`, `getOvertimes` jednocześnie
- Kompatybilność `chrome-extension://` z Service Worker — wymaga jawnego filtra protokołu w handlerze `fetch`
- **Relief popups** (`getRelief` → `getShiftAt`) nadal czytają custom schedule nawet gdy UI pokazuje factory — niska waga, możliwe drobne niespójności podświetleń przy wylogowaniu
- **Edit mode** nie jest twardo zablokowany bez logowania — lokalne edycje customSchedule są możliwe offline; UI i tak ukrywa personal data do logowania
- Etykieta Admin „Export data.js” jest legacy naming — eksport generuje już format `YYYY.js` (registerYearData)

## 6. Strategia konfliktów synchronizacji

### 6.1. Wybór pliku w chmurze (`findDriveFile()`)

Funkcja `findDriveFile()` w `js/sync.js` wyszukuje pliki w folderze aplikacji na Google Drive i **wybiera wyłącznie najnowszy plik** według pola `modifiedTime`. Starsze duplikaty są pomijane. System **nie porównuje zawartości** plików.

### 6.2. Pobieranie danych z chmury (`downloadFromDrive()`)

Po pobraniu pliku funkcja `downloadFromDrive()` **w pełni zastępuje lokalny stan** danymi z chmury. Nie ma mechanizmu merge, diff ani scalania zmian.

### 6.3. Synchronizacja z wielu urządzeń (tryb offline)

System **nie obsługuje bezpiecznej synchronizacji z wielu urządzeń jednocześnie**. Jeśli użytkownik edytuje dane na dwóch urządzeniach:

1. Oba urządzenia pracują z własną wersją w `localStorage`
2. Po synchronizacji **wygraje urządzenie, które zapisało plik jako ostatnie**
3. **Zmiany z drugiego urządzenia zostaną bezpowrotnie utracone**
4. Jedynym ostrzeżeniem jest dialog `showConfirm` z tekstem _"Dane lokalne zostaną nadpisane"_

### 6.4. Zalecenia

- **Nie obiecuj użytkownikom "bezpiecznej synchronizacji z wielu urządzeń"**
- Wymaga to znaczącej przebudowy (wersjonowanie, historia zmian, trzyustawowe scalanie)
- Rozważ wersjonowanie plików w chmurze lub jaśniejsze ostrzeżenia o utracie danych

## 7. CI/CD (GitHub Actions)

### 7.1. Workflow: `.github/workflows/deploy.yml`

Automatyczny deployment przy każdym pushu do gałęzi `main`:

1. **Checkout** — pobranie kodu z repozytorium
2. **Replace BUILD_ID** — zamiana placeholdera `__BUILD_ID__` w `sw.js` na krótki hash commita (np. `a3f42b1`)
3. **Deploy to gh-pages** — publikacja do gałęzi `gh-pages` używanej przez GitHub Pages

### 7.2. Dynamiczne wersjonowanie cache SW

W `sw.js`:

```javascript
const CACHE_NAME = 'grafik-gillette-' + '__BUILD_ID__';
```

Placeholder `__BUILD_ID__` jest zamieniany przez CI/CD na aktualny git hash. Dzięki temu:

- Każdy commit → nowa wersja cache SW
- Klienci automatycznie widzą toast "🔄 Nowa wersja dostępna"
- Nie ma potrzeby ręcznego inkrementowania v8 → v9 → v10

### 7.3. Uprawnienia GitHub Actions

W ustawieniach repo (Settings → Actions → General → Workflow permissions) musi być włączone **Read and write permissions**.

### 7.4. GitHub Pages source

Ustawienia (Settings → Pages):

- **Source:** Deploy from a branch
- **Branch:** `gh-pages`
- **Folder:** `/ (root)`

## 8. Historia zmian (ostatnie refaktoringi)

- **v3.6.2 (2026-08-15):** Admin identification via Google OAuth email (`js/admin.js`)
- **v3.6.2:** Nowa sekcja "👑 Admin Panel" w bocznym menu (widoczna tylko dla admina)
- **v3.6.2:** Uproszczony edit-banner — 5 przycisków przeniesionych do menu "⚙️ Zarządzaj"
- **v3.6.2:** Przycisk "🆓 Wolne" w modalu AddShift — szybkie czyszczenie błędnie dodanej zmiany
- **v3.6.2:** Fix: empty state nie blokuje edycji pustego roku (dla admina zapełniającego nowy rok)
- **v3.6.2:** Fix: placeholder `{year}` w renderEmptyState teraz poprawnie substytuowany
- **v3.6.2:** Refactor pl.js — 28 sekcji z komentarzami (poprzednio bardak)
- **v3.6.0 (2026-08-14):** Dodane udostępnianie aplikacji (QR + link + Web Share API)
- **v3.6.0:** Auto-update Service Workera z toastem powiadomienia
- **v3.6.0:** GitHub Actions workflow dla automatycznego wersjonowania cache
- **v3.6.0:** Dashboard hero pokazuje notatkę na dzisiaj (jeśli istnieje)
- **v3.6.0:** Nadgodziny za dodane zmiany w święta/niedziele w podsumowaniu tygodnia
- **v3.6.0:** Połączone karty relief (poprzednia/następna zmiana) w info panelu
- Usunięto martwy kod "Podsumowania tygodnia"
- Dodano `bindClick()` helper dla bezpiecznego bindowania
- Uproszczono motywy z 8 do 2 (jasny/ciemny) + przełącznik w top-bar
- Usunięto duplikat `#actionButtons` pod kalendarzem (kontrolki są w bocznym menu)
- Refaktoring "Udostępnij" — kontekstowe udostępnianie z URL params
- Poprawiono UX Rok mode: klik na dzień prowadzi do widoku Miesiąca
- Naprawiono ReferenceError: `goToMonth` (expose na window)
- Dodano przycisk "Drukuj" w bocznym menu
- Dodano wielojęzyczność (i18n) — pl/en/uk
- Wydzielono CSS do osobnego pliku `css/styles.css`
- Wydzielono logikę nadgodzin do `js/overtime-logic.js`
- Dodano przyciski Undo/Redo w edit banner
- Dodano walidację struktury JSON przy imporcie
- FAQ generowane dynamicznie z i18n
- Usunięto pozostałości sekcji "Motyw" z bocznego menu
- Poprawiono duplikaty ikon kalendarza i dni wolnych
- Ulepszono widok urlopów i pozycję przycisków na dashboardzie
- Wprowadzono wielojęzyczność (i18n): pl/en/uk z modułową strukturą js/i18n/
- Refactor: monolithic i18n.js (1776 lines) → 4 osobne pliki (~500 linii każdy)
- Usunięto zduplikowane klucze tłumaczeń (shiftR, month1-12, dayMon-Sun)
- Dodano typ nadgodzin 'weekend' (praca w dni wolne/święta) z auto-kategoryzacją
- Rozdzielono klucze menu (menuSection* vs menu*) — naprawiono duplikowane ikony
- Dodano genitive month names dla poprawnych dat po polsku/ukraińsku
- Usunięto niepotrzebną funkcję wyszukiwania (search)
- Naprawiono modal × zastępowany słowem "Zamknij"/"Закрити"
- **v3.5.0 (2026-08-13):** Naprawiono kolizję `t` w handlerach popupów overtime (`calendar.js`) i w `todayBtn` (`main.js`)
- **v3.5.0:** Naprawiono timer nocnej zmiany po północy — teraz sprawdza zmianę wczorajszą (`getLiveTimer` w `dashboard.js`)
- **v3.5.0:** Refactor `main.js` — 12 miejsc z bezpośrednim DOM binding zamieniono na `bindClick()`/`bindEvent()`
- **v3.5.0:** Dodano ikonę 🌙 w timerze dla wczorajszej nocnej zmiany (klucz i18n `timerNightEndsIn`)
- **v3.5.0:** Mobile UX — ochrona przed przypadkowym tap-em na popupy przez 400ms po zmianie `selectedDay`
- **v3.5.0:** Filtr protokołu w Service Worker — ignoruje żądania `chrome-extension://` i `moz-extension://`
- **v3.5.0:** Usunięty martwy kod w `overtime-logic.js` (zmienne `dow`, `isSunday`)
- **v3.5.0:** Konfiguracja Prettier + `.vscode/settings.json` + rozbudowany `.gitignore`

## 9. Backlog / TODO na przyszłość

- [ ] Migracja na ES modules (plan istnieje)
- [ ] Wprowadzenie `AppState` jako obiektu (proto-krok do modułów)
- [ ] Zastąpienie inline `onclick` przez `addEventListener`
- [ ] Bundler (Vite) — dla mniejszego finalnego kodu i tree-shakingu
- [ ] TypeScript — dla lepszej dyscypliny typów
- [ ] Testy automatyczne (Vitest/Jest)
- [ ] Mechanizm merge/diff dla Google Drive sync
- [ ] Wersjonowanie plików w chmurze
- [x] Wielojęzyczność (pl/en/uk) ✅ v3.4.0
- [x] Split i18n na osobne pliki dla mów ✅ v3.4.0
- [x] Obsługa nadgodzin w dni wolne/święta ✅ v3.4.0
- [x] Wydzielenie CSS z index.html do osobnego pliku ✅ (wcześniej)
- [ ] Central rejestr kluczy i18n z ostrzeżeniami o brakujących tłumaczeniach
- [ ] Testy automatyczne dla kategoryzacji nadgodzin
- [x] Zaawansowany Service Worker z auto-update + toast "🔄 Nowa wersja" ✅ v3.6.0
- [x] Udostępnianie aplikacji z QR kodem ✅ v3.6.0
- [x] CI/CD dla automatycznego wersjonowania SW ✅ v3.6.0
- [x] Naprawa kolizji `t` z i18n w handlerach popupów ✅ v3.5.0
- [x] Naprawa timera nocnej zmiany po północy ✅ v3.5.0
- [x] Safe DOM binding (`bindClick`/`bindEvent`) w `main.js` ✅ v3.5.0
- [x] 🌙 wskaźnik dla wczorajszej nocnej zmiany ✅ v3.5.0
- [x] Mobile UX: ochrona popupów po `selectedDay` ✅ v3.5.0
- [x] Filtr protokołu w Service Worker (chrome-extension) ✅ v3.5.0
- [x] Konfiguracja Prettier ✅ v3.5.0

## 10. Dodawanie nowego roku (Admin workflow)

Nowa architektura upraszcza dodawanie nowych lat — **każdy rok w osobnym pliku**.

### 10.1. Krok po kroku:

1. **Zaloguj się** jako admin (servitant@gmail.com w Google Drive)
2. **Przejdź na nowy rok** (year picker → np. 2027)
3. **Włącz tryb edycji** ✏️
4. **Zaznacz zmiany** klikając komórki (użyj palety R/P/N/W dla admin)
5. **Zapisz** (Ctrl+S) — dane w localStorage
6. **Export data.js** (☰ Menu → 👑 Admin Panel → 📤 Export data.js → wybierz rok)
7. **Pobierz plik** `YYYY.js` (np. `2027.js`)
8. **Umieść plik** w folderze `js/schedules/gillette/`
9. **Zaktualizuj index.html** — dodaj nowy script tag:
   ```html
   <script src="js/schedules/gillette/2027.js"></script>
   ```
   (dodaj po istniejącym 2026.js)
10. **Git commit + push:**
    ```bash
    git add js/schedules/gillette/2027.js index.html
    git commit -m "chore(data): add 2027 factory schedule"
    git push
    ```
11. **GitHub Actions** zadeploi automatycznie (2-5 min)
12. Użytkownicy zobaczą toast **"🔄 Nowa wersja dostępna"** → klikną → zobaczą 2027

### 10.2. Zalety nowej architektury:

- ✅ **Zero ryzyka zepsucia starych lat** — 2026 w osobnym pliku, nie ruszamy
- ✅ **Łatwy rollback** — można cofnąć jeden rok bez wpływu na inne
- ✅ **Jasny historia w Git** — każdy rok osobny commit
- ✅ **Modułowa struktura** — łatwo dodawać nowe typy grafików w przyszłości
- ✅ **Prostszy debugging** — problemy w danym roku izolowane

### 10.3. Future: Multi-schedule support

Aktualnie tylko `gillette` schedule (4 brygady × 3 zmiany).
Struktura gotowa na przyszłe schedules (np. office 5×1, produkcja 5×3):

```
js/schedules/
├── gillette/         # 4×3 rotating
├── office-5x1/       # future: office schedule (5 days × 1 shift)
└── production-5x3/   # future: production 5×3
```

Każdy schedule ma własne metadata + dane per rok.

## 11. Szybkie odwołania

### Pliki konfiguracyjne

- `manifest.json` — PWA manifest (nazwa, kolory, ikony)
- `sw.js` — Service Worker (cache strategy)
- `.github/workflows/deploy.yml` — GitHub Actions CI/CD
- `.agent.md` — Instrukcje dla AI-asystentów

### Dokumentacja użytkownika

- FAQ w aplikacji: ☰ Menu → ❓ Pomoc
- README.md — dla użytkowników końcowych

### Kontakt

- Email: tantsiura.s@pg.com
- Demo: https://servitantgit.github.io/Graffik/
