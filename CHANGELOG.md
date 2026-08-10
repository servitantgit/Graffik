# Changelog

Wszystkie istotne zmiany w projekcie Grafik Gillette.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/).

## [Unreleased]

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

[Unreleased]: https://github.com/servitantgit/Graffik/compare/v3.2.0...HEAD
[3.2.0]: https://github.com/servitantgit/Graffik/releases/tag/v3.2.0