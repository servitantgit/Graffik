# Changelog

Wszystkie istotne zmiany w projekcie Grafik Gillette.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/).

## [Unreleased]

### Removed
- **Status card** in month info-panel (redundant — free/vacation already visible on the cell and in the header)
- **Week view** tab and all related UI/logic (`renderWeekView`, week navigation, week detail panel)

### Fixed
- **Google Drive session** — silent access-token refresh before expiry, on tab focus and after reload; no more false “logout” when token hits ~1h TTL (prompt:'' when possible)
- **Login state** — UI/personal data stay “logged in” until explicit logout (`isDriveLoggedIn`); token refresh is separate from session
- **Month info-panel flow** — removed undefined `cycleInfo` reference that broke the entire panel render
- **Cycle «До вільного»** — `getCyclePath` uses same shift source as UI (`getShiftAtWithPending`)
- **Dashboard** — flow block moved below greeting + today shift card
- **Dashboard** — removed Tomorrow and Until-day-off cards; shows handoff flow + until-free cycle as two blocks (no tabs)
- **Month info** — handoff flow only, mode switcher removed


## [Unreleased]

### Changed
- **Local-first personal data** — visible without Google login; account is for backup/sync only
- **Privacy mode** — toggle in side menu (above Help), not in the header
- **No auto Google popups** on load; user signs in when they want to sync
- **Sync status** in side menu (unsaved changes vs last sync)

- **Menu:** Limit urlopu przeniesiony do edit banner (🌴); sekcja Zaawansowane usunięta
- **Menu Info** na końcu listy: Pomoc/FAQ + link GitHub dewelopera
- Personal JSON import/export usunięty (backup = Drive)
- **Flow przekazania zmiany** — panel w info-panel zgodny z mockupem U4:
  `prevBrig → dzień+typ zmiany → [OT h +%] → nextBrig` (dzień jako węzeł self, nie litera brygady)
- OT z przed/po wpinany w timeline gdy istnieje
- i18n: `reliefFlowTitle`, `tlYesterday` / `tlToday` / `tlTomorrow` (pl/en/uk)
- **Timeline OT order** — OT *przed* appears before the day/shift node, OT *po* after it
- **Info panel** — OT before/after cards ordered around the shift block; monthly OT summary moved to end of month view
- **Dashboard** — shift handoff flow as first item; removed unused “This week” block
- **Dates** — day+month strings use genitive month names (uk: «18 липня», pl: «18 lipca»)
- **Info panel (month)** — removed redundant “current shift” card; vacation is display-only used/remaining at end
- **Until day off** — shows remaining day/night shifts (or “tomorrow”), not a calendar date
- Removed cell `+200%` / `+100%` rate badge stripe on dates
- **Info panel** — removed detailed OT cards (before/after + daily summary); OT is shown only in the handoff flow
- **Flow modes** — segment «Handoff | Until free»: cycle strip shows own shifts until day off; separate «До вихідного» card removed
- **Visual polish** — table date headers neutral gray (not blue≈N); weekend/holiday headers use accent line; dashboard hero neutral; week cards top strip; year titles neutral. Shift R/P/N colors unchanged (factory palette)
- **Week view** — tap day opens detail panel (flow handoff/cycle, live timer, notes) instead of jumping to month calendar
- **Calm UI (mockup)** — month cells: neutral body + R/P/N color strip; week: top strip + neutral body (shift text in factory colors); dashboard chips: quiet + color dots; year: weekend columns/days highlighted (red ring / tint for free weekends)


### Usunięte
- Cell relief popups (`addReliefPopups`) — funkcjonalność w timeline widget info-panel
- Cell overtime detail popups (`ot-detail-popup`) — details in info-panel / timeline; ⏱ marker kept
- Dashboard “This week” stats block and related dead code

### Naprawione
- CSS `smart-popup.css`: uszkodzony komentarz i `@keyframes` (ZWSP) — animacja strzałek działa


- **PWA Service Worker install** — `sw.js` ASSETS zawierał nieistniejący `js/data.js`
  i pomijał realne moduły (`schedules/*`, `personal/sync-tracking.js`, `admin.js`).
  `cache.addAll()` mógł failować przy instalacji PWA. Lista ASSETS zsynchronizowana
  z `<script>` w `index.html`.
- **Dashboard privacy leak** — `renderDashboard()` nie sprawdzał `shouldShowPersonalData()`.
  Urlopy, overtime, notatki, live-timer i statystyki były widoczne bez logowania.
  Teraz pełne gating jak w calendar/views.
- **Calendar cycleRange / compareShift** — przy `hidePrivate` nadal liczone z personal
  schedule (`getShiftAt` / `getShiftAtWithPending`). Dodano `getFactoryCycleRange()`
  i factory path dla compare — spójne z widocznymi komórkami.
- **prefs / lastModified** — `savePrefs()` nie oznaczał unsynced. Zmiana `urlopLimits`
  (dane osobiste na Drive) mogła nie wywołać ostrzeżenia przed logout.
  `savePrefs(p, markSync?)` + `setVacationLimit()` woła z `markSync=true`.
  UI prefs (lang/theme/view) nadal **nie** blokują logout.
- **Spójność uprawnień admina** — klik w przyciski palety `.admin-only` (R/P/N/W)
  teraz też sprawdza `isCurrentUserAdmin()`, tak samo jak skróty klawiszowe.
- **Layout przycisków admin w trybie admina** — `body.admin-mode .palette-btn.admin-only
  { display: flex !important; }` zamiast `display: block`.

### Usunięte

- **`tools/apply_calendar_privacy.js`** — jednorazowy skrypt z hardcoded Windows path
  i niedefiniowanym `calSaveOriginal`. Rola już wykonana.

### Poprawione (dokumentacja)

- **README.md** — aktualna struktura katalogów (schedules/, personal/, admin.js…);
  sekcja Prywatność opisuje model login-based zamiast starego Privacy Mode
- **PROJECT_DOCS.md** — dashboard/calendar privacy, `savePrefs(markSync)`,
  `getFactoryCycleRange`, known issues (relief popups, edit mode, export naming)
- Model danych `customSchedule` / `overtimes` i obecność `admin.js` w mapie plików

## [3.7.0] - 2026-08-17

### Zmienione (BREAKING CHANGE ARCHITEKTURY)

- **🏗️ Modularna architektura danych** — `js/data.js` rozbite na wiele plików:
  - `js/schedules/_core.js` — stałe i helpers (`monthNames`, `shiftHours`, `buildHolidays`, etc.)
  - `js/schedules/_registry.js` — registry pattern + `shouldShowPersonalData()` helper
  - `js/schedules/gillette/metadata.js` — metadane Gillette schedule (nazwa, brygady, typy zmian)
  - `js/schedules/gillette/2026.js` — dane roku 2026 (używa `registerYearData()`)
  - Struktura gotowa na przyszłe schedules (office, production, etc.)
  - Każdy rok w osobnym pliku — dodanie 2027 = jeden nowy plik + jeden `<script>` tag
- **`index.html`** — zaktualizowane script tags (4 nowe zamiast starego `js/data.js`)
- **Backward-compatible** — `factorySchedule` i `factoryMonthHours` nadal dostępne globalnie (aliased)

### Usunięte

- **🗑️ `js/data.js`** — stary monolityczny plik (2000+ linii) usunięty
  - Wszystkie dane przeniesione do nowej struktury `js/schedules/`
  - Zero data loss — wartości zachowane 1:1
- **🔒 Privacy Mode** — usunięta stara funkcja z osobnym przełącznikiem
  - Zastąpiona automatyczną logiką: **login = pokazuj personal data, logout = tylko fabryczny grafik**
  - Prostsze UX (nie trzeba pamiętać o przełączniku)
  - Usunięte: `menuPrivacyMode` button, `togglePrivacyMode()` function, 5 i18n keys × 3 języki

### Zmienione

- **Admin Export** — generuje pliki w nowym formacie `YYYY.js` (zamiast `data-YYYY-snippet.js`):
  - Standalone valid JS z `registerYearData()` — można wrzucić bezpośrednio do `js/schedules/gillette/`
  - Instrukcje deploymentu po ukraińsku (dopasowane do Admin FAQ)
  - 10 kroków zamiast 7 — dokładniejsze wskazówki dla nowej architektury
- **PROJECT_DOCS.md** — nowa sekcja "10. Dodawanie nowego roku" z krok-po-kroku
- **Admin FAQ** — zaktualizowane sekcje 2 i 4 dla nowej architektury

### Zalety nowej architektury

- ✅ **Zero ryzyka** przy dodawaniu nowego roku — 2026 zostaje nietknięty
- ✅ **Modułowość** — łatwo dodawać przyszłe schedules (np. office 5×1)
- ✅ **Prostsze debugging** — problemy izolowane w plikach per rok
- ✅ **Jaśniejsza historia w Git** — commit "add 2027" pokazuje jeden nowy plik

## [3.6.2] - 2026-08-15

### Dodane

- **👑 Admin identification** — moduł `js/admin.js` z listą `ADMIN_EMAILS` do rozpoznawania administratorów
- Sprawdzenie emaila z Google OAuth (nie fałszowalne przez F12)
- Nowa sekcja "👑 Admin Panel" w bocznym menu (widoczna tylko dla admina, złoty kolor)
- Automatyczna aktywacja po zalogowaniu do Google Drive (polling co 3s)
- CSS class `.admin-only` + `body.admin-mode` do warunkowej widoczności
- **Nowy scope `openid email`** w Google Drive OAuth — pobranie emaila zalogowanego użytkownika
- Funkcja `fetchDriveUserEmail()` w `js/sync.js`
- Email zapisywany do `localStorage` (`grafik_drive_user_email`)
- Ekspozycja przez `window.driveUserEmail` (getter via defineProperty)
- Użytkownicy zobaczą jednorazowy nowy consent screen przy następnym logowaniu
- **🆓 Przycisk "Wolne"** w modalu dodawania zmiany (`openAddShiftModal`)
- 4-ty przycisk obok R/P/N — pozwala szybko wyczyścić błędnie dodaną zmianę
- Bez potrzeby wielokrotnego klikania Undo
- Pokazuje aktualną zmianę ("Obecnie: R") gdy komórka jest już edytowana
- **Nowe klucze i18n** (pl/en/uk): `addShiftCurrent`, `addShiftEraseTitle`, `addShiftEraseButton`

### Zmienione

- **Uproszczony edit-banner** — usunięto 5 przycisków, przeniesiono do bocznego menu "⚙️ Zarządzaj"
- Banner pokazuje teraz tylko: Undo/Redo (icon-only) + Save (green primary) + Done (grey)
- Ciemne tło (`#2c3e50`) con pomarańczowym akcentem po lewej (border-left) — spokój wizualny
- Icon-only Undo/Redo w grupie z shared background
- Danger buttons (Wyczyść rok, Reset) — czerwony akcent, ukryte в menu
- **Refactor pl.js** — reorganizacja ~330 kluczy w 28 sekcji z komentarzami (poprzednio bardak)
- Kolejność sekcji zsynchronizowana z en.js/uk.js
- Wszystkie 3 pliki językowe teraz mają identyczną strukturę
- Łatwiej znaleźć każdy klucz przez Ctrl+F

### Naprawione

- **Empty state blokował edycję pustego roku** (`js/main.js`, `refreshViews`)
- Warunek `empty` teraz uwzględnia `!editMode` — в trybie edycji pokazuje pustą siatkę
- Umożliwia adminowi ręczne wypełnienie graficznego szkieletu na nowy rok (np. 2027)
- **Placeholder `{year}` nie był podmieniany** в `renderEmptyState` (`js/views.js`)
- Zmieniono `t('yearIsEmptyTitle') + currentYear` na `t('yearIsEmptyTitle', { year: currentYear })`
- Poprawna substytucja i18n zamiast literalnego "{year}"
- **Modal AddShift blokował ponowne edytowanie** dodanych zmian (`js/calendar.js`)
- Sprawdzenie `dayIsCustomEdited` — modal otwiera się także dla dni z user-added shifts
- Pozwala natychmiast poprawić błąd bez wielokrotnego klikania Undo

## [3.6.0] - 2026-08-14

### Dodane

- **📱 Udostępnianie aplikacji** — nowa pozycja w bocznym menu z modalnym oknem zawierającym:
  - Automatycznie generowany kod QR (przez api.qrserver.com) do szybkiego zeskanowania telefonem
  - Link do aplikacji z możliwością kopiowania jednym kliknięciem
  - Przycisk "🔗 Udostępnij" wykorzystujący natywne Web Share API (SMS, WhatsApp, Messenger, Email itp.)
  - Fallback do kopiowania linku na desktopie bez Web Share API
- **🔄 Auto-update Service Workera** — automatyczne wykrywanie nowej wersji aplikacji z powiadomieniem toast:
  - Wykrywanie nowej wersji SW w tle (co 60 minut lub przy każdym otwarciu)
  - Toast "🔄 Nowa wersja dostępna" z przyciskiem odświeżenia
  - Obsługa `SKIP_WAITING` message dla natychmiastowej aktywacji
  - Automatyczny reload strony po zatwierdzeniu przez użytkownika
- **🤖 GitHub Actions CI/CD** — workflow `.github/workflows/deploy.yml`:
  - Automatyczne wersjonowanie cache SW przy każdym pushu (na podstawie git commit hash)
  - Deploy do gałęzi `gh-pages`
  - Placeholder `__BUILD_ID__` w `sw.js` zamieniany na krótki hash commita
- **Nowe klucze i18n** (pl/en/uk): `menuShareApp`, `shareAppTitle`, `shareAppIntro`, `shareAppCopy`, `shareAppShare`, `shareAppCopied`, `shareAppHint`, `shareAppQrError`, `shareAppText`, `updateAvailable`, `updateHint`, `updateNow`

### Zmienione

- **`sw.js`** — dynamiczny `CACHE_NAME` z hash commita zamiast ręcznego inkrementowania wersji
- **`js/pwa.js`** — funkcja `registerServiceWorker()` z pełną obsługą auto-update i toastów
- **`js/actions.js`** — dodane funkcje `getAppUrl()`, `buildQRCodeUrl()`, `shareApp()`
- **Dashboard** — dodano automatyczne liczenie nadgodzin dla dodanych zmian w święta (+200%) i niedziele (+100%) w podsumowaniu tygodniowym
- **Dashboard hero** — jeśli istnieje notatka na dzisiaj, wyświetlana zamiast standardowego powitania "Cześć!"
- **Info panel** — połączone karty "Kto przekazał" i "Kto przejmie" w jedną kompaktową kartę z badges i strzałkami kierunku

### Naprawione

- Nadgodziny za dodane zmiany w dni wolne były liczone tylko w podsumowaniu miesięcznym — teraz również w widoku tygodnia na Dashboard

## [3.5.1] - 2026-08-13

### Naprawione

- **Krytyczny bug UX na mobile** — przypadkowe tapy na popupy urlopu i nadgodzin po wybraniu dnia (np. przez przycisk "Dziś") powodowały przełączenie brygady lub oznaczenie urlopu

### Zmienione

- **Refactor UI dla urlopów i nadgodzin** — usunięte popupy z komórek kalendarza, przeniesione do info-panel poniżej:
  - Przycisk urlopu (zielony `+ 🌴` / czerwony `❌ 🌴`)
  - Przyciski nadgodzin `+ ⬅ PRZED` i `+ PO ➡` (niebieskie)
  - Przycisk `+ 🛠 Praca w dzień wolny` (turkusowy) dla dni wolnych/świąt
  - Przyciski `✏️` do edycji istniejących nadgodzin
- **Uproszczona paleta edycji** — 5 przycisków (R, P, N, W, CYCLE) zamiast 6 (usunięty ⏱ OT)
- **Usunięto skrót klawiaturowy `O`** — nadgodziny dostępne przez info-panel w każdym trybie

### Usunięte

- Popup urlopu (🌴 +) z komórki dnia w widoku Miesiąc
- Popup nadgodzin (⏱ PRZED/PO) z komórki dnia w edit mode + OT palette
- Przycisk ⏱ z palety edycji
- Skrót klawiaturowy `O` dla trybu OT palette
- Martwy blok kodu `editPaletteMode === 'OT'` w handlerze kliknięcia komórki

## [3.5.0] - 2026-08-13

### Naprawione

- **Kolizja lokalnej zmiennej `t` z globalną funkcją i18n `t()`** w handlerach popupów nadgodzin (`js/calendar.js`) — powodowało `TypeError` przy usuwaniu wpisu nadgodzin z popupu (PRZED/PO)
- **Kolizja `t = new Date()` w handlerze przycisku "Dziś"** (`js/main.js`) — analogiczny problem przesłaniania funkcji tłumaczeń
- **Timer nocnej zmiany po północy** (`js/dashboard.js`) — funkcja `getLiveTimer()` nie pokazywała pozostałego czasu zmiany N po godzinie 00:00, gdy dzisiejsza zaplanowana zmiana różniła się od wczorajszej (np. wczoraj N, dziś R lub wolne). Teraz sprawdza zmianę wczorajszą i uwzględnia nadgodziny PO
- **Bezpieczne bindowanie eventów DOM w `main.js`** — 11 miejsc z `document.getElementById(...).onclick = ...` oraz 1 `.addEventListener()` zamienionych na helpery `bindClick()` i `bindEvent()`, które chronią przed `TypeError: Cannot set properties of null` gdy element brakuje w DOM
- **Martwy kod w `js/overtime-logic.js`** — usunięte nieużywane zmienne `dow` i `isSunday` w gałęzi `weekend` funkcji `categorizeOvertime()`
- **Błędy Service Workera dla zapytań `chrome-extension://`** — dodany filtr protokołu w `sw.js`, ignoruje żądania z rozszerzeń przeglądarki (fixes "Failed to execute 'put' on 'Cache': Request scheme 'chrome-extension' is unsupported")

### Dodane

- **🌙 Wskaźnik nocnej zmiany trwającej po północy** — timer teraz pokazuje ikonę 🌙 i dedykowaną etykietę gdy odlicza koniec wczorajszej zmiany N (nowy klucz i18n `timerNightEndsIn` w pl/en/uk)
- **Ochrona przed przypadkowym tap-em na popup na mobile** (`js/calendar.js`) — po wybraniu dnia (np. kliknięcie "Dziś") popupy `relief` (poprzednia/następna zmiana, urlop) są nieaktywne przez 400ms. Tap w tym oknie deselektuje dzień zamiast wykonywać akcję popupu. Zapobiega przypadkowemu przełączeniu brygady lub oznaczeniu urlopu
- **Konfiguracja Prettier** — dodane pliki `.prettierrc.json`, `.prettierignore` oraz `.vscode/settings.json` dla automatycznego formatowania kodu przy zapisie

### Zmienione

- Wersja cache Service Workera z `v7` na `v8` — wymusza odświeżenie cache u wszystkich użytkowników
- Refactor `main.js` — użycie helperów `bindClick()` (z `actions.js`) i `bindEvent()` (nowy, lokalny w `main.js`)

## [3.4.0] - 2026-08-12

### Dodane

- **Wielojęzyczność (i18n)** — obsługa 3 języków: polski, angielski, ukraiński
- Przełącznik języka 🌐 w górnym pasku (dropdown z flagami krajów)
- Automatyczne wykrywanie języka przeglądarki przy pierwszym uruchomieniu
- System tłumaczeń `t(key, params)` z placeholderami `{name}`
- Modułowa struktura i18n: `js/i18n/pl.js` + `en.js` + `uk.js` + `i18n.js` (logika)
- **Nadgodziny w dniach wolnych i świętach**:
  - Nowy typ 'weekend' — praca w niedzielę, sobotę, dzień wolny za grafik
  - Automatyczna kategoryzacja: święto państwowe → +200%, niedziela/wolne → +100%
  - Osobny popup w kolorze teal (odróżnia się od zwykłych PRZED/PO)
  - Wizualny pasek na komórce dnia wolnego pokazujący godziny + stawkę
  - Zakres godzin: 1-13h (zwiększone z poprzednich 1-8h)
  - Uwzględnione w podsumowaniu miesięcznym nadgodzin
- Klucze tłumaczeń dla `otWeekend*`, `otRate` w pl/en/uk
- Genitive month names dla poprawnego formatowania dat (np. "12 sierpnia 2026" zamiast "12 Sierpień 2026")

### Zmienione

- Podzielono monolityczny plik `js/i18n.js` (1776 linii, 3 języki) na 4 mniejsze pliki
- Usunięto duplikaty kluczy tłumaczeń (shiftR, month1-12, dayMon-Sun występowały 2 razy)
- Rozdzielono klucze menu na `menuSection*` (nagłówki) i `menu*` (pozycje) — naprawia duplikowanie ikon
- Modal-close (×) nie jest już tłumaczony (`data-i18n="close"` usunięty) — hint był zastępowany słowem "Zamknij"/"Закрити"
- Zaktualizowano cache Service Worker do wersji v5

### Usunięte

- **Funkcja wyszukiwania (search)** — nie była potrzebna, kalendarz i tak pokazuje wszystko wizualnie
- Blokada dodawania nadgodzin w dni wolne (toast "Nadgodziny tylko do dnia ze zmianą")
- Emoji ikon z wartości kluczy menu (ikony są w HTML jako `<span class="mi-icon">`)

### Naprawione

- Duplikowane ikony w bocznym menu (były w HTML I w wartościach tłumaczeń)
- Przycisk × w modalach był zastępowany słowem tłumaczenia — teraz zawsze symbol ×
- Nieprawidłowa forma nazwy miesiąca w dacie ("12 Sierpień" → "12 sierpnia")
- 404 błąd dla `js/i18n.js` po refactorze (plik został przeniesiony do `js/i18n/i18n.js`)

## [3.3.0] - 2026-08-12

### Dodane

- **Wielojęzyczność (i18n)** — obsługa 3 języków: polski (domyślny), angielski, ukraiński
- Przełącznik języka 🌐 w górnym pasku (z dropdown wyboru flag)
- Automatyczne wykrywanie języka przeglądarki
- System tłumaczeń z funkcją `t(key, params)` i atrybutami `data-i18n`, `data-i18n-title`, `data-i18n-placeholder`
- Plik `js/i18n.js` z pełnym słownikiem tłumaczeń dla pl/en/uk
- Przyciski **Undo/Redo** w edit banner (↶ Cofnij / ↷ Ponów)
- Skrót klawiszowy `Ctrl+Y` (lub `Ctrl+Shift+Z`) dla Redo
- Stos `redoStack` do przywracania cofniętych zmian
- Walidacja struktury importowanego JSON (`validateImportedData()`) — sprawdza typy, formaty dat, długości tablic
- Nowy plik `js/overtime-logic.js` — wydzielona logika nadgodzin
- FAQ generowane dynamicznie z JavaScript (renderFAQ) z pełnym wsparciem i18n

### Zmienione

- **CSS wydzielone do osobnego pliku** `css/styles.css` (wcześniej inline w `<style>` w index.html)
- FAQ w index.html to teraz pusty `<div class="faq-list"></div>` — treść generowana z i18n
- Zaktualizowano pozycję przycisków Miesiąc/Tydzień na dashboardzie
- Ulepszono widok urlopów
- Poprawione tłumaczenia (seria commitów)

### Usunięte

- Sekcja "🎨 Motyw" z paletą kolorów w bocznym menu (przełącznik teraz w top-bar)
- Dolne przyciski dashboardu (dashboardBtn week i month)
- Duplikaty ikon kalendarza
- Duplikaty wyświetlania dni wolnych

### Naprawione

- Błędy tłumaczeń (kilka poprawek: "Fix translate", "Lang fix", "Lang fix +1", "Fix lang bug")
- Podwójne wyświetlanie dnia wolnego
- Podwójne ikony kalendarza
- Drobne poprawki dnia (Small day fix)
- Widok urlopów (Edit vacation view)

## [3.2.0] - 2026-08-10

### Dodane

- Kontekstowy przycisk "Udostępnij widok" — link zawiera parametry URL odpowiadające aktualnemu widokowi (view, y, m, d, brig, rok)
- Obsługa parametrów URL przy ładowaniu — link otwiera dokładnie taki widok, jaki został udostępniony
- Przełącznik motywu (🌙/☀️) w górnym pasku aplikacji
- Przycisk "Drukuj" w bocznym menu
- Helper `bindClick()` w actions.js — bezpieczne bindowanie z ostrzeżeniem w konsoli gdy element nie istnieje

### Zmienione

- Uproszczono liczbę motywów z 8 do 2 (jasny/ciemny) — usunięto Ocean, Las, Zachód, Neon, Pastel, Kontrast
- Klik na dzień w widokach "Miesiąc + Rok" i "Tabela + Rok" prowadzi teraz do szczegółowego widoku miesiąca z podświetlonym dniem (wcześniej pozostawał w widoku Rok)
- Zaktualizowano FAQ (Pomoc) zgodnie z aktualnym stanem aplikacji
- Zaktualizowano README.md i PROJECT_DOCS.md

### Usunięte

- Funkcja "Podsumowanie tygodnia" (widget boczny) — dublowała informacje z kalendarza
- Blok duplikujących się przycisków pod kalendarzem (#actionButtons: .ics, Drukuj, Udostępnij) — te akcje są teraz TYLKO w bocznym menu
- 6 nieużywanych motywów (Ocean, Las, Zachód, Neon, Pastel, Kontrast)
- Sekcja "🎨 Motyw" z paletą kolorów w bocznym menu

### Naprawione

- `ReferenceError: goToMonth is not defined` — funkcja poprawnie eksportowana na `window`
- `Cannot set properties of null (setting 'onclick')` — dzięki nowemu helperowi bindClick, brakujące elementy DOM nie powodują już crash'a skryptu

## [Wcześniejsze wersje]

Historia wcześniejszych wersji nie była śledzona.

[Unreleased]: https://github.com/servitantgit/Graffik/compare/v3.6.2...HEAD
[3.6.2]: https://github.com/servitantgit/Graffik/releases/tag/v3.6.2
[3.6.0]: https://github.com/servitantgit/Graffik/releases/tag/v3.6.0
[3.5.1]: https://github.com/servitantgit/Graffik/releases/tag/v3.5.1
[3.5.0]: https://github.com/servitantgit/Graffik/releases/tag/v3.5.0
[3.4.0]: https://github.com/servitantgit/Graffik/releases/tag/v3.4.0
[3.3.0]: https://github.com/servitantgit/Graffik/releases/tag/v3.3.0
[3.2.0]: https://github.com/servitantgit/Graffik/releases/tag/v3.2.0
