# Changelog

Wszystkie istotne zmiany w projekcie Grafik Gillette.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/).

## [Unreleased]

## [3.5.0] - 2026-08-13

### Naprawione

- **Kolizja lokalnej zmiennej `t` z globalną funkcją i18n `t()`** w handlerach popupów nadgodzin (`js/calendar.js`) — powodowało `TypeError` przy usuwaniu wpisu nadgodzin z popupu (PRZED/PO)
- **Kolizja `t = new Date()` w handlerze przycisku "Dziś"** (`js/main.js`) — analogiczny problem przesłaniania funkcji tłumaczeń
- **Timer nocnej zmiany po północy** (`js/dashboard.js`) — funkcja `getLiveTimer()` nie pokazywała pozostałego czasu zmiany N po godzinie 00:00, gdy dzisiejsza zaplanowana zmiana różniła się od wczorajszej (np. wczoraj N, dziś R lub wolne). Teraz sprawdza zmianę wczorajszą i uwzględnia nadgodziny PO
- **Bezpieczne bindowanie eventów DOM w `main.js`** — 11 miejsc z `document.getElementById(...).onclick = ...` oraz 1 `.addEventListener()` zamienionych na helpery `bindClick()` i `bindEvent()`, które chronią przed `TypeError: Cannot set properties of null` gdy element brakuje w DOM
- **Martwy kod w `js/overtime-logic.js`** — usunięte nieużywane zmienne `dow` i `isSunday` w gałęzi `weekend` funkcji `categorizeOvertime()`
- **Błędy Service Workera dla zapytań `chrome-extension://`** — dodany filtr protokołu w `sw.js`, ignoruje żądania z rozszerzeń przeglądarki (fixes "Failed to execute 'put' on 'Cache': Request scheme 'chrome-extension' is unsupported")

### Dodane

- **🌙 Wskaźnik nocnej zmiany trвающей po północy** — timer teraz pokazuje ikonę 🌙 i dedykowaną etykietę gdy odlicza koniec wczorajszej zmiany N (nowy klucz i18n `timerNightEndsIn` w pl/en/uk)
- **Ochrona przed przypadkowym tap-em na popup na mobile** (`js/calendar.js`) — po wybraniu dnia (np. kliknięcie "Dziś") popupy `relief` (poprzednia/następna zmiana, urlop) are nieaktywne przez 400ms. Tap w tym oknie deselektuje dzień zamiast wykonywać akcję popupu. Zapobiega przypadkowemu przełączeniu brygady lub oznaczeniu urlopu
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

[Unreleased]: https://github.com/servitantgit/Graffik/compare/v3.5.0...HEAD
[3.5.0]: https://github.com/servitantgit/Graffik/releases/tag/v3.5.0
[3.4.0]: https://github.com/servitantgit/Graffik/releases/tag/v3.4.0
[3.3.0]: https://github.com/servitantgit/Graffik/releases/tag/v3.3.0
[3.2.0]: https://github.com/servitantgit/Graffik/releases/tag/v3.2.0
