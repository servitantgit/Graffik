# Changelog

Wszystkie istotne zmiany w projekcie Grafik Gillette.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/).

## [Unreleased]

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

[Unreleased]: https://github.com/servitantgit/Graffik/compare/v3.3.0...HEAD
[3.3.0]: https://github.com/servitantgit/Graffik/releases/tag/v3.3.0
[3.2.0]: https://github.com/servitantgit/Graffik/releases/tag/v3.2.0
