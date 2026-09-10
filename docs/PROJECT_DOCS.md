# PROJECT_DOCS.md — Dokumentacja techniczna projektu „Grafik Gillette"

Ten dokument służy do szybkiego zapoznania się z architekturą i strukturą projektu. Przeznaczony dla developerów i AI-asystentów.

## 1. Przegląd architektury

- **Typ projektu**: Vanilla JavaScript PWA, brak frameworków, brak build system
- **Skrypty**: Klasyczne (bez ES modules), dzielone przez global scope
- **CSS**: Modułowy, podzielony na pliki w `css/`
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
  driveTokenExpiry: null,        // Wygaśnięcie tokenu Drive (jeśli sync)
  uiMode: 'simple' | 'advanced', // Simple/Advanced UI mode (auto-detected on first run)
  uiModeToastShown: boolean,     // One-time toast flag для migrating users
  privacyMode: boolean,          // Приховати особисті дані на екрані
  personalDataMigratedV5: true   // One-shot migration flag (customSchedule cleanup)
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

Unified per-day notes list (2026-09 refactor — replaces three previously
separate note stores: free-form day note string, `overtimes[key].przed.note`,
`overtimes[key].po.note`). Each day/shift key holds an **array** of entries:

```javascript
{
  '2026-8-10-C': [
    { id: 'note-abc123', tag: null,      text: 'вільна нотатка' },
    { id: 'note-def456', tag: 'before',  text: 'запізнились з наладкою' },
    { id: 'note-ghi789', tag: 'after',   text: 'здали зміну пізніше' }
  ]
}
```

- `tag: null` — free-form note the user typed directly in the day info panel.
- `tag: 'before'` / `'after'` — note attached to the overtime "przed"/"po"
  record for that day (set from the overtime modal); kept in sync via
  `upsertDayNoteByTag()` so re-saving updates the entry instead of duplicating it.
- Multiple entries per day are supported (any number of free-form notes, plus
  at most one `'before'` and one `'after'` entry, since those are singletons
  tied 1:1 to an overtime record).
- Pure list logic (add/remove/upsert-by-tag, legacy-data migration) lives in
  `js/personal/notes-tracking.js` — unit-tested in `tests/notes-tracking.test.js`.
- Legacy string values and legacy `overtimes[key].przed/po.note` fields are
  migrated once by `migrateUnifiedNotes()` in `core.js` (flagged by
  `prefs.notesUnifiedMigratedV1`).

### overtimes (localStorage: `gillette_overtimes_v1`)

```javascript
{
  // Klucz płaski: `${year}-${month}-${day}-${brigade}`, generowany przez otKey() w core.js
  '2026-8-10-C': {
    przed: { hours: 2 },   // ustawiane z UI (przycisk ⏱⬅ OT PRZED); note text now lives in `notes[key]` (tag:'before')
    po: { hours: 3 },      // ustawiane z UI (przycisk ⏱➡ OT PO); note text now lives in `notes[key]` (tag:'after')
    weekend: { hours: 8, note: '...' }          // obsługiwane przez categorizeOvertime()
                                                 // i import (validateImportedData), ale
                                                 // NIE jest jeszcze ustawiane z poziomu UI —
                                                 // NIE migrowane do notes[] (poza zakresem 2026-09 refactoru)
  }
}
```

Uwaga: struktura jest **płaska** (jeden poziom kluczy string), nie zagnieżdżona przez `[brigade][year][month][day]`. Zobacz `otKey()`, `getOvertimes()`, `setOvertime()` w `core.js`.

### syncMeta (localStorage: `gillette_sync_meta`)

```javascript
{
  lastModified: 1725900000000,   // Date.now() при останньому save (будь-який модуль)
  lastSync: 1725900500000,       // Date.now() при останньому успішному upload/download
  changeCount: 0,                // Лічильник save-операцій з моменту lastSync (fallback-евристика)
  syncedFingerprint: 'v1-...',   // Хеш стану даних на момент останньої синхронізації (js/personal/sync-tracking.js)
  lastKnownDiffCount: 0,         // Точна кількість відмінностей, порахована при відкритті sync modal
  revision: 3,                   // Монотонний лічильник ревізій (2026-09 fix). Інкрементується
                                  // при кожному uploadToDrive(); при download встановлюється
                                  // з payload.revision. Порівнюється замість/поряд з mtime, щоб
                                  // не залежати від годинників пристроїв (див. §6.3).
}
```

Керується виключно через `js/personal/sync-tracking.js` (`getSyncMeta()`/`setSyncMeta()`) — інші модулі не повинні читати `localStorage.gillette_sync_meta` напряму.

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
- Immediate shift edits via `applyEdit` / `getShiftAtWithPending` (`js/edit.js`; no pending buffer)

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
- `sanitizePrefs(raw)` — валідує структуру prefs при завантаженні (safety net, exported to window)
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

### Personalizacja: style komórek

W `js/personalization.js` dostępne są trzy style komórek:

- **Pełne wypełnienie** (`full`) — pełne wypełnienie kolorem zmiany.
- **Spokojny pasek** (`strip`) — neutralna komórka z kolorową smużką po lewej.
- **Kolorowe obramowanie** (`quiet`) — neutralna komórka z kolorowym obramowaniem całej komórki oraz kolorowym okręgiem wokół daty.

W stylu `quiet` kolory zmian R/P/N nie są zmieniane. Kolor odpracowania/urlopu korzysta z `--color-U`. Nazwa techniczna `quiet` pozostaje zachowana dla kompatybilności zapisanych preferencji; w interfejsie użytkownika nie należy nazywać tego stylu „kropkami”.

### js/edit.js — Moduł 4: Natychmiastowa edycja zmian

Cienka warstwa nad `customSchedule`:
- `getShiftAtWithPending(year, month, day, brigade)` — alias `getShiftAt` (kompatybilność API)
- `applyEdit(year, month, day, brigade, forcedValue?)` — zapisuje zmianę od razu (cykl R→P→N→wolne lub wymuszona wartość)

Brak bufora `pendingChanges` / undo-redo; zapis jest natychmiastowy, tak jak urlop i nadgodziny.


### js/dashboard.js — Moduł 5: Widok Dashboard

- `renderDashboard()` — cały widok Dashboard
  - Hero section z powitaniem i datą (genitive month names)
  - **Flow przekazania zmiany** jako pierwszy blok (timeline U4)
  - Karta dzisiejszej zmiany z live timerem
  - Statystyki (jutro, najbliższy wolny, urlopy, nadgodziny miesięczne)
  - Upcoming days chips
- **Privacy:** `shouldShowPersonalData()` — zwraca `false`, gdy użytkownik włączy Privacy Mode:
  - tylko fabryczny grafik (bez urlopów / OT / notatek / live-timera)
  - ukryte karty: wykorzystane urlopy, miesięczny overtime
  - tryb jest niezależny od logowania Google i służy jako opcjonalny tryb prezentacyjny

### js/calendar.js — Moduł 6: Widok Miesiąc

- `renderCalendar(direction)` — generowanie siatki kalendarza
- Relief handoff: **timeline widget** w info-panel (`renderReliefTimeline` z `smart-popup.js`) — layout U4 + segment Handoff|Cycle: handoff = prev→[OT]→day→next; cycle = own shifts → 🏖️ free (`getCyclePath` / `renderCycleTimeline`)
- Cell relief popups usunięte (funkcjonalność w panelu)
- OT marker ⏱ na komórce (title); `ot-detail-popup` usunięty — szczegóły w info-panel
- Miesięczne OT summary (`#otMonthSummary`) wstawiane **po** info-panel
- Daty «dzień + miesiąc» przez `monthNamesGenitive`
- Info panel: bez karty «Zmiana» i bez osobnych kart OT (szczegóły OT tylko w timeline flow); urlop used/remaining na końcu; «Do wolnego» = dzienne/nocne lub jutro
- Badge `+200%` na komórce usunięty; `getUntilDayOff()` w core.js
- `openOvertimeModal(d, shift, type)` — modal edycji nadgodzin
- `updateOvertimePreview()` — podgląd nadgodzin w modalu
- `saveOvertimeFromModal()` — zapis nadgodzin
- `renderMonthOvertimeSummary()` — podsumowanie miesięczne nadgodzin
- `renderProgress()` — pasek postępu miesiąca
- `renderInfo()` — panel informacji pod kalendarzem (zawiera Flow przekazania zmiany)
- `getLiveShiftInfo()` — info o aktualnej zmianie
- **Privacy:** komórki, OT, notatki, dirty-edit — za `hidePrivate`
  - `cycleRange` / `compareShift` używają factory schedule, gdy Privacy Mode jest włączony
  - helper: `getFactoryCycleRange()` w `core.js`

### js/views.js — Moduł 7: Widoki Rok, Tabela

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
- `addPrintHeader()`, `addPrintFooter()` — nagłówek/stopka druku
- Menu handlers: `menuIcs`, `menuPrint`, `menuShare`, `menuShareApp`
- Edit banner: `editVacationLimitBtn` → `openVacationLimitModal()` (limit urlopu)
- Menu Info (ostatnia sekcja): `menuHelp`, `menuGitHub` → https://github.com/servitantgit/Graffik
- `clearYearBtn`, `resetCustomBtn` — czyszczenie danych
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
- `uploadToDrive()` — wysyłanie danych do Drive; przypisuje monotoniczny `revision`
- `handleAutoSyncCheck()` — auto-check przy load/visibilitychange/otwarciu menu;
  próbuje cichy (`prompt:''`) refresh tokenu, potem weryfikuje pozorny konflikt
  fingerprintem i licznikiem `revision` przed ostrzeżeniem użytkownika (§6.3)
- Obsługa konfliktów (brak trójstronnego merge — last-write-wins po realnej
  weryfikacji treści; patrz §6 pełny opis)
- `syncWithDrive()` — modal synchronizacji: krótki log różnic lokalnie vs Drive
  (`countSyncPayloadStats`, `formatSyncDiffLog`, `fetchDriveRemotePayload`)
  — liczby urlopów / nadgodzin / notatek / własnych zmian / limitów urlopów
  oraz ostatni czas sync przy `hasUnsyncedChanges()`; przyciski w jednym rzędzie
  (klasa `modal-footer-single-row` na `#modalFooter`)

### Wygląd (UI skins + tabela)

W Ustawienia → Wygląd: **Industrial / Paper / Neon** (`prefs.uiSkin`), gęstość tabeli **Standard / Capsule** (`prefs.tableDensity`), oraz skórki komórek full/strip/quiet.

### js/admin-center.js — Panel administratora

Pełny UI Admin Center (fabryczny edytor R/P/N/W, eksport `YYYY.js`, poradnik, strefa ryzyka).
Wejście: ☰ → 👑 Admin Panel → `openAdminCenter()` (tylko `ADMIN_EMAILS`).

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

### tools/ — Development utilities

Standalone scripts для dev/QA. НЕ включаються в production build.

- **`tools/i18n-audit.js`** — аудит translation keys (див. §3.7)
- Не імпортуються з app коду
- Запускаються через `node tools/*.js` з project root

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

## 3.5. Simple/Advanced Mode

Двошаровий інтерфейс для новачків і досвідчених користувачів.

### API (js/ui.js)
- `getUiMode()` → 'simple' | 'advanced'
- `isAdvancedMode()` → boolean
- `setUiMode(mode)` — зберігає + apply CSS + refresh + toast
- `applyUiModeFromPrefs()` — на старті додає body class

### CSS
- `body.ui-mode-simple` / `body.ui-mode-advanced`
- Елементи з класом `.advanced-only` приховуються в Simple mode

### Default logic
- Новий юзер (без даних) → Simple mode
- Migrating юзер (має customSchedule/urlops/overtimes/notes) → Advanced mode + one-time toast

### Що в якому mode
- **Simple**: Views (Dashboard/Month/Table), brigade, vacations, base settings, Drive, Share, Export ICS, Help, About
- **Advanced**: усе Simple + overtime, notes, extra shift, notifications, privacy, custom colors, monthly OT summary, dashboard OT/vacation cards
- **Admin**: незалежний вимір, доступний тільки для `ADMIN_EMAILS`

### Edge case: Privacy trap prevention
Якщо юзер увімкнув Privacy Mode в Advanced, а потім перемикається на Simple:
- Privacy toggle зникає (це `.advanced-only`)
- Юзер не міг би вимкнути privacy → trap
- **Solution:** `setUiMode('simple')` автоматично встановлює `prefs.privacyMode = false`
- Другий toast (info) інформує юзера про це через `uiModePrivacyAutoDisabled`

## 3.6. Prefs Validation (sanitizePrefs)

Internal safety net в `js/core.js` що валідує структуру `prefs` при завантаженні з localStorage.

### API
- `sanitizePrefs(rawPrefs)` — приймає object (можливо invalid), повертає sanitized
- Викликається з `loadPrefs()` після `JSON.parse`
- Non-destructive: unknown keys **зберігаються**
- Invalid known keys → replaced with safe defaults + console warning

### Захищає від
- Corrupted localStorage (сторонні скрипти, ручне редагування)
- Legacy formats зі старих версій app
- Missing keys після upgrade
- Wrong types (string замість number, тощо)
- Malformed JSON (fallback до порожнього об'єкта)
- Non-object inputs (null, array, string)

### Приклад
```javascript
sanitizePrefs({ year: 'abc', shift: 'X', lang: 'de' })
// → { year: 2026, shift: 'A', lang: 'pl', ... + console warnings }
```

### Validation schema (не exhaustive)
- `year`: number, MIN_YEAR..MAX_YEAR → default `new Date().getFullYear()`
- `shift`: 'A'/'B'/'C'/'D' → default 'A'
- `view`: 'dashboard'/'month'/'table' → default 'dashboard'
- `theme`: 'system'/'light'/'dark' → default 'light'
- `lang`: 'pl'/'en'/'uk' → default 'pl'
- `uiMode`: 'simple'/'advanced' → залишається undefined якщо не було (для auto-detect)
- `urlopLimits[A|B|C|D]`: number >= 0 → default URLOP_LIMIT (26)
- `cellColors[R|P|N|U]`: valid hex #RRGGBB → invalid removed
- Booleans: yearMode, notifications, privacyMode, etc.

### Console output
При виявленні issue:
```
[core] Invalid prefs.year: abc -> 2026 (out of range)
[core] sanitizePrefs fixed 5 invalid field(s)
```

## 3.7. i18n Audit Tool

Standalone Node.js script `tools/i18n-audit.js` для аудиту translation keys.

### Запуск
```
node tools/i18n-audit.js
```

### Що перевіряє
- Missing keys — used in code but not defined
- Unused keys — defined but never used (candidate для cleanup)
- Parity mismatches — key в pl.js але не в en.js
- Untranslated values — value === key (fallback text)
- Placeholder mismatches — `{name}` в PL але не в EN

### Output
- Кольоровий report у console
- Exit code 0 = clean, 1 = critical issues
- Read-only: не модифікує production files

### Scan patterns
- `t('key')` / `t("key")` в JS
- `tr('key')` в settings.js
- `data-i18n="key"` / `data-i18n-title="key"` / `data-i18n-placeholder="key"` в HTML

## 3.8. Unified Day Notes (2026-09)

Раніше було три окремі, паралельні місця для нотаток одного дня: вільна
нотатка (`notes[key]` рядок), нотатка "до зміни" (`overtimes[key].przed.note`),
нотатка "після зміни" (`overtimes[key].po.note`) — з окремими UI-елементами,
що дублювали один одного. Тепер це єдиний список `notes[key]` (масив, див. §2).

### Архітектура
- **Чиста логіка** (без DOM/localStorage) — `js/personal/notes-tracking.js`:
  `addNoteEntry()`, `removeNoteEntry()`, `updateNoteText()`, `upsertNoteByTag()`,
  `getNoteTextByTag()`, `noteEntryHasContent()`, `computeUnifiedNotesMigration()`.
  Юніт-тести: `tests/notes-tracking.test.js` (32 тести).
- **Обгортки зі станом** (localStorage-backed) — `js/core.js`:
  `getDayNotes()`, `addDayNote()`, `removeDayNote()`, `updateDayNote()`,
  `upsertDayNoteByTag()`, `removeDayNoteByTag()`, `getDayNoteTextByTag()`.
- **Підрахунок нотаток для sync-diff і Privacy-панелі** — `countNoteEntries()`
  в `notes-tracking.js` рахує загальну кількість нотаток по всіх днях, а не
  кількість day-keys з нотатками. Використовується і в `sync.js`
  (`countSyncPayloadStats`), і в `core.js` (`countNonEmptyNotes`) — інакше
  додавання другої/третьої нотатки до дня, де вже була одна, не змінювало
  лічильник day-keys, і sync-бейдж/деталі показували "без змін".
- **UI** — `js/calendar.js` `renderInfo()`: список нотаток з іконкою за тегом
  (📝 вільна / ⏱⬅ before / ⏱➡ after), кнопкою видалення (`data-remove-note`),
  клікабельним текстом для редагування на місці (`data-edit-note` → inline
  `<input>`, Enter/клік поза полем — зберегти, Escape — скасувати; порожній
  текст при збереженні НЕ видаляє нотатку — видалення лишається окремою дією
  через ✕), і полем додавання нової нотатки (Enter/blur → `addDayNote()`,
  поле завжди лишається порожнім — можна додати другу, третю і т.д.).
- **Overtime modal** (`openOvertimeModal()`/`saveOvertimeFromModal()`) більше
  не зберігає `.note` всередині `overtimes[key]` — читає/пише через
  `getDayNoteTextByTag()`/`upsertDayNoteByTag()` з тегом `'before'`/`'after'`.
  Видалення overtime-запису (`removeOvertime()`) також прибирає прив'язану
  тегом нотатку.

### Міграція
Одноразова (`migrateUnifiedNotes()` в `core.js`, прапорець
`prefs.notesUnifiedMigratedV1`, викликається з `main.js` поруч з іншими
one-shot міграціями): старі рядкові нотатки → запис з `tag: null`; старі
`overtimes[key].przed/po.note` → запис з `tag: 'before'/'after'` і поле
`.note` видаляється з overtime-запису (лишається тільки `.hours`).
`overtimes[key].weekend.note` **не мігрується** — ця позиція ще не
виставляється з UI, поза межами цього рефакторингу.

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

- Style są podzielone na модулі: `calendar.css`, `components.css`, `dashboard.css`, `layout.css`, `overtime.css`, `print.css`, `responsive.css`, `smart-popup.css`, `variables.css`, `views.css`.
- `index.html` ładuje moduły CSS osobnymi `<link>` tags.
- Zmienne CSS (custom properties) znajdują się w `variables.css`.

## 5. Znane zagadnienia (Known issues)

- Zmienne stanu są globalne — potencjalne konflikty przy dużych zmianach
- CSS jest podzielony na moduły według funkcji
- Brak testów jednostkowych automatycznych (poza `test_core.js` dla obliczeń)
- Synchronizacja Google Drive: brak merge/diff — last-write-wins (patrz sekcja 6)
- `goToMonth` musi być exposed na `window` (patrz `window.goToMonth = goToMonth`)
- Klucze i18n są rozproszone po 3 plikach — brak central registry i validacji brakujących kluczy
- Genitive month names są zdublowane w kodzie (monthNames dla nagłówków vs monthNamesGenitive dla dat)
- Testowanie funkcji `getLiveTimer()` wymaga mockowania `Date`, `getShiftAt`, `isUrlop`, `getOvertimes` jednocześnie
- Kompatybilność `chrome-extension://` z Service Worker — wymaga jawnego filtra protokołu w handlerze `fetch`
- **Relief timeline** (`getRelief` → `getShiftAt`) nadal czyta custom schedule nawet gdy UI pokazuje factory — niska waga, możliwe drobne niespójności przy wylogowaniu
- **Edit mode** pozostaje lokalny/offline; Privacy Mode wpływa na widoczność danych, a nie na możliwość edycji
- Admin Export generuje pliki `YYYY.js` przez `registerYearData` (schedules architecture)

## 6. Strategia konfliktów synchronizacji

### 6.1. Wybір файлу в хмарі (`findDriveFile()`)

Функція `findDriveFile()` в `js/sync.js` шукає файли в appData папці Google Drive і **обирає лише найновіший файл** за полем `modifiedTime`. Старіші дублікати видаляються. Порівняння вмісту тут не робиться — це лише дешева метадата-перевірка.

### 6.2. Тихе оновлення токена (fix 2026-09)

Access token живе ~1 годину. Раніше не було жодного автоматичного оновлення — після протухання токена всі auto-sync перевірки (бейдж, `visibilitychange`, відкриття меню) мовчки нічого не робили аж до ручного logout/login. Тепер:

- `ensureDriveToken(false)` намагається тихий (`prompt:''`) refresh перед відмовою — викликається з `handleAutoSyncCheck()` і з відкриття бокового меню.
- `scheduleDriveTokenRefresh()` проактивно оновлює токен за ~5 хв до закінчення строку, поки вкладка видима (best-effort — не рятує довго-фонові вкладки, для цього і є (1)).
- Якщо тихий refresh не вдався (реально протухла Google-сесія) — стан позначається як **stale** (`gDriveCheckStale`), а не мовчки "все ок": бейдж і `title` в меню показують окреме попередження (`syncStatusStale` / `driveCardStaleWarn`) замість зеленого "Active".

### 6.3. Перевірка конфлікту (`handleAutoSyncCheck()`)

`checkDriveRemoteStatus()` — дешева mtime-евристика (порівнює `modifiedTime` файлу з локальним `meta.lastSync`, 8с slack на розсинхрон годинників). Коли ця евристика підказує "remote newer" **і** локально є незбережені зміни, перед тим як показати користувачу попередження про конфлікт, `handleAutoSyncCheck()` довантажує реальний payload і перевіряє два додаткові сигнали:

1. **Fingerprint reconciliation** (`reconcileSyncedFingerprint()`) — якщо дані насправді ідентичні (локальні зміни вже були завантажені раніше, просто fingerprint не встиг позначитись як synced), конфлікту немає.
2. **Revision counter** (`getSyncRevision()` / `isRemoteAheadByRevision()`) — кожен payload несе монотонний лічильник `revision`, який інкрементується при кожному upload і зберігається локально при upload/download. Порівняння лічильників не залежить від годинників пристроїв взагалі. Якщо remote-версія за лічильником не випереджає те, що пристрій вже знає — mtime-евристика була хибним спрацюванням (clock skew), а не реальним конфліктом.

Лише якщо жоден з цих двох сигналів не спростував конфлікт — показується `driveSyncConflictWarn`.

### 6.4. Синхронізація з кількох пристроїв (офлайн-режим)

Система і досі **не робить справжній merge/diff** змінених полів — це свідомий компроміс (не CRDT). Але завдяки (6.2)+(6.3):

1. Кожен пристрій працює зі своєю копією в `localStorage`.
2. Коли реального конфлікту немає (дані ідентичні або локальний пристрій просто відстає) — синхронізація відбувається автоматично й тихо.
3. Коли конфлікт реальний (обидва пристрої дійсно змінили дані після спільної точки) — користувач отримує попередження і вирішує вручну через `syncWithDrive()` modal (Upload/Download).
4. "Останній записаний файл перемагає" — і досі правда для випадку реального конфлікту; це не змінилось, змінилось лише те, що фальшиві конфлікти (найчастіша причина скарг користувачів) більше не виникають.

### 6.5. Зауваження на майбутнє

- Справжній трьохсторонній merge (base/local/remote по кожному полю) — велика архітектурна робота, окрема задача, не робити разом з баг-фіксами.
- `revision` зараз читається лише з повністю довантаженого payload (`fetchDriveRemotePayload()`), а не з легкої Drive-метадати (`appProperties`) — простіше в реалізації, ціна: один додатковий network-запит лише в гілці "схоже на конфлікт", не на кожній перевірці.

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
- CSS podzielono na moduły w katalogu `css/``
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

## 10. Publikacja fabrycznego grafiku (Admin workflow)

Fabryczny grafik jest **publiczny** (w plikach `js/schedules/gillette/YYYY.js`). Edycja w Admin Center zapisuje tylko **lokalne szkice** (factory drafts) w przeglądarce admina. Użytkownicy zobaczą zmiany dopiero po eksporcie + deployu.

### 10.1. Szkic (lokalnie)

1. Zaloguj się Google Drive jako admin (`ADMIN_EMAILS` w `js/admin.js`).
2. ☰ → **Admin Panel** (pod blokiem Drive) → **Edytor fabryczny**.
3. Wybierz rok → **Start editing**.
4. Maluj R / P / N / W (klawisze lub pasek narzędzi); szkice zapisują się automatycznie.
5. Publiczny grafik w aplikacji **nie zmienia się** na tym etapie.

### 10.2. Eksport („gdy gotowy do publikacji”)

1. Admin Center → zakładka **Eksport**.
2. Wybierz rok → **Eksport factory-roku (.js)**.
3. Pobierany jest plik `YYYY.js` w formacie `registerYearData('gillette', year, schedule, hours)`.
4. Eksport **nie** wysyła nic na Drive i **nie** publikuje strony — tylko generuje plik.

### 10.3. Deploy („rozwiń .js, aby był dostępny dla wszystkich”)

1. Skopiuj `YYYY.js` do `js/schedules/gillette/` (nadpisz, jeśli rok już istnieje).
2. **Nowy rok:** dodaj w `index.html`:
   ```html
   <script src="js/schedules/gillette/YYYY.js"></script>
   ```
   oraz wpis `./js/schedules/gillette/YYYY.js` w `ASSETS` w `sw.js`.
3. **Istniejący rok:** wystarczy wymienić plik `.js` — bez zmian `index.html` / `sw.js`.
4. Commit + push do `main` → GitHub Actions (Pages) → użytkownicy dostają update przez Service Worker.

### 10.4. Zalety

- Szkice admina nie psują produkcji, dopóki nie zrobisz deployu
- Każdy rok w osobnym pliku — łatwy rollback
- Osobiste dane użytkowników (urlopy, custom shifts) są poza tym pipeline’em


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

- Email: servitant@gmail.com
- Demo: https://servitantgit.github.io/Graffik/

## Privacy & Google Drive (local-first)

- **Personal data** (vacation, overtime, notes, custom shifts) is stored locally and is shown by default.
- **Privacy Mode** is an optional presentation mode. When enabled, personal additions are hidden and the factory schedule is shown instead.
- **Google account** is optional and is used only for backup/synchronization.
- The side menu shows sync status and unsaved local changes.
- Opening the Drive sync menu shows a short change log (local counts vs Drive)
  before Upload / Download; action buttons stay on one row.

