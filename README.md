# 📅 Grafik Gillette

Aplikacja PWA do zarządzania grafikami zmian dla 4 brygad pracujących w systemie 3-zmianowym (Rano/Popołudnie/Noc). Zastępuje papierowy kalendarz w plakietce.

**Demo:** [https://servitantgit.github.io/Graffik/](https://servitantgit.github.io/Graffik/)

![Status](https://img.shields.io/badge/status-production-brightgreen)
![PWA](https://img.shields.io/badge/PWA-ready-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 📸 Zrzuty ekranu

Kliknij dowolny zrzut, aby zobaczyć w pełnym rozmiarze.

<table>
  <tr>
    <td align="center">
      <a href="screenshots/1.jpg"><img src="screenshots/1.jpg" width="180" alt="Dashboard"/></a><br>
      <sub><b>🏠 Dashboard</b></sub>
    </td>
    <td align="center">
      <a href="screenshots/2.jpg"><img src="screenshots/2.jpg" width="180" alt="Tydzień"/></a><br>
      <sub><b>📆 Tydzień</b></sub>
    </td>
    <td align="center">
      <a href="screenshots/3.jpg"><img src="screenshots/3.jpg" width="180" alt="Miesiąc"/></a><br>
      <sub><b>📅 Miesiąc</b></sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="screenshots/4.jpg"><img src="screenshots/4.jpg" width="180" alt="Miesiąc Rok"/></a><br>
      <sub><b>📋 Tabela</b></sub>
    </td>
    <td align="center">
      <a href="screenshots/5.jpg"><img src="screenshots/5.jpg" width="180" alt="Tabela Rok"/></a><br>
      <sub><b>📊 Rok</b></sub>
    </td>
    <td></td>
  </tr>
</table>

## ✨ Główne funkcje

- 📊 **4 brygady** (A/B/C/D) z systemem 3 zmian (R/P/N) + Wolne + Urlop
- 🏠 **4 widoki**: Dashboard, Tydzień, Miesiąc, Tabela
- 📈 **Tryb Rok** — rozszerza Miesiąc/Tabelę na cały rok (12 mini-kalendarzy/tabel)
- ✏️ **Edycja grafiku** z historią cofania (undo/redo)
- 🌴 **Urlopy** z limitem per brygada i automatycznym liczeniem dni roboczych
- ⏱ **Nadgodziny** z auto-kategoryzacją (+50%/+100%/+200%) — dla dni roboczych ORAZ dni wolnych/świąt
- 📝 **Notatki** do dowolnych dni
- 🔍 **Wyszukiwanie** zmian, wolnych, urlopów
- ⚖️ **Porównywanie brygad** (Ctrl+klik)
- 🎨 **2 motywy**: jasny/ciemny (przełącznik w top-bar)
- 🌐 **Wielojęzyczność**: polski, angielski, ukraiński (przełącznik 🌐 w top-bar)
- 📱 **PWA** — instalacja na telefonie, tryb offline, powiadomienia
- ☁️ **Google Drive sync** — dane między urządzeniami
- 🔗 **Kontekstowe udostępnianie** — link do dokładnie tego widoku
- 📥 **Eksport .ics** do kalendarza, **drukowanie**, **backup JSON**

## 🚀 Szybki start

1. Otwórz [https://servitantgit.github.io/Graffik/](https://servitantgit.github.io/Graffik/)
2. Wybierz brygadę (A/B/C/D) i rok
3. Dashboard pokaże dzisiejszą zmianę z timerem
4. Przełączaj widoki górnym menu

**Szczegóły funkcji:** zobacz sekcję Pomoc w aplikacji (☰ Menu → ❓)

## 📱 Instalacja jako PWA

### Android (Chrome)
- Menu przeglądarki (⋮) → "Dodaj do ekranu głównego"
- Lub: ☰ Menu → 📲 Zainstaluj aplikację

### iPhone / iPad (Safari)
1. Otwórz stronę w **Safari** (nie w innej przeglądarce!)
2. Dotknij **Udostępnij** ⬆️ na dole ekranu
3. Przewiń w dół → **„Dodaj do ekranu głównego"**
4. Dotknij **„Dodaj"**

Po instalacji aplikacja działa w pełnym ekranie, bez paska adresu, i jest dostępna offline.

## 🔗 Udostępnianie i URL params

Funkcja **🔗 Udostępnij widok** w bocznym menu tworzy link do dokładnie tego, co widzisz. Odbiorca zobaczy ten sam widok.

### Parametry URL

| Parametr | Znaczenie | Przykład | Opcjonalny |
|----------|-----------|----------|------------|
| `view` | Typ widoku: `dashboard`, `week`, `month`, `table` | `view=month` | Nie |
| `y` | Rok | `y=2026` | Nie |
| `m` | Miesiąc (1-12) | `m=8` | Tak* |
| `d` | Dzień (1-31) | `d=10` | Tak* |
| `brig` | Brygada (A/B/C/D) | `brig=C` | Tak* |
| `rok` | Tryb Rok (1 = włączony) | `rok=1` | Tak* |

\* Parametr jest dodawany automatycznie, jeśli ma sens w danym widoku.

### Przykłady URL

```
# Dzień 10 sierpnia, brygada C
?view=month&y=2026&m=8&d=10&brig=C

# Cały sierpień, brygada C
?view=month&y=2026&m=8&brig=C

# Rok view, brygada C
?view=month&y=2026&brig=C&rok=1

# Tydzień z 10 sierpnia, brygada C
?view=week&y=2026&m=8&d=10&brig=C

# Tabela — cały rok
?view=table&y=2026&rok=1
```

## 🛠 Dla developerów

### Stos technologiczny
- **Vanilla JavaScript** (ES2020+, bez frameworków, bez build system)
- **HTML5 + CSS3** (Custom Properties, Flexbox, Grid)
- **i18n**: własny prosty system tłumaczeń w `js/i18n/` (3 języki, bez zależności zewnętrznych)
- **PWA**: Service Worker + Web App Manifest
- **Google Drive API** (OAuth 2.0)
- **Hosting**: GitHub Pages

### Wymagania
- Nowoczesna przeglądarka z obsługą ES2020, Service Worker, localStorage
- **Uwaga**: PWA i moduły JS wymagają HTTP (nie działa z `file://`)

### Uruchomienie lokalne

```bash
# Python 3
python -m http.server 8000

# Node.js (jeśli masz http-server)
npx http-server -p 8000
```

Następnie otwórz: `http://localhost:8000`

### Struktura projektu

    ```
    Graffik/
    ├── index.html          # HTML (bez inline CSS)
    ├── manifest.json       # PWA manifest
    ├── sw.js               # Service Worker
    ├── css/
    │   └── styles.css      # Wszystkie style (wcześniej inline)
    ├── js/
    │   ├── data.js         # Stałe, factorySchedule
    │   ├── overtime-logic.js # Logika nadgodzin (kategoryzacja +50%/100%/200%)
    │   ├── core.js         # Biznes-logika (getShiftAt, isWolne, isUrlop)
    │   ├── ui.js           # Toast, Modal, Confirm, motyw
    │   ├── edit.js         # Tryb edycji, undo/redo
    │   ├── dashboard.js    # Renderowanie Dashboard
    │   ├── calendar.js     # Kalendarz, popupy, nadgodziny
    │   ├── views.js        # Tydzień, Rok, Tabela
    │   ├── actions.js      # Eksport .ics, share, import/eksport JSON, walidacja
    │   ├── pwa.js          # Service Worker, powiadomienia
    │   ├── sync.js         # Google Drive sync
    │   ├── i18n/           # 🆕 Wielojęzyczność
    │   │   ├── pl.js       # Polski
    │   │   ├── en.js       # Angielski
    │   │   ├── uk.js       # Ukraiński
    │   │   └── i18n.js     # Logika (t, setLanguage, renderFAQ)
    │   └── main.js         # Stan aplikacji, events, init
    ├── icons/
    │   ├── icon-192.png
    │   ├── icon-512.png
    │   └── icon-512-maskable.png
    ├── CHANGELOG.md
    ├── PROJECT_DOCS.md
    └── README.md
    ```

## ⌨️ Skróty klawiszowe

### Tryb edycji
| Skrót | Działanie |
|-------|-----------|
| `R` / `P` / `N` / `W` | Wybór zmiany do malowania |
| `C` | Tryb cyklu (rotacja zmian) |
| `O` | Tryb nadgodzin (przed/po zmianie ORAZ praca w dzień wolny/święto) |
| `Ctrl+Z` | Cofnij ostatnią zmianę |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Ponów cofniętą zmianę |
| `Ctrl+S` | Zapisz wszystkie zmiany |
| `Esc` | Wyjdź z trybu edycji |

### Nawigacja
| Skrót | Działanie |
|-------|-----------|
| `←` / `→` | Poprzedni/następny miesiąc lub tydzień |
| `E` | Włącz/wyłącz tryb edycji |
| `Esc` | Zamknij popup/modal lub wyjdź z edycji |

### Wybór brygady
| Akcja | Działanie |
|-------|-----------|
| `Klik` | Zmień aktywną brygadę |
| `Ctrl + klik` | Porównaj z inną brygadą (podświetla wspólne zmiany) |

## 🌐 Języki

Aplikacja obsługuje 3 języki (wybór przyciskiem 🌐 w górnym pasku):

- 🇵🇱 **Polski** (domyślny)
- 🇺🇸 **English**
- 🇺🇦 **Українська**

Język jest automatycznie wykrywany z ustawień przeglądarki przy pierwszym uruchomieniu.
Wybrany język zapisuje się w localStorage i zostaje po restarcie.

**Dla developerów** — dodawanie nowych tłumaczeń:
1. Otwórz `js/i18n/pl.js` (lub en.js/uk.js) — dodaj nowy klucz z wartością
2. **Ważne**: dodaj ten sam klucz w WSZYSTKICH 3 plikach
3. W HTML używaj `data-i18n="klucz"` lub w JS: `t('klucz')` / `t('klucz', {param: 'wartość'})`

## 💾 Przechowywanie danych

Aplikacja przechowuje dane w trzech miejscach:

1. **localStorage** (podstawowe) — urlopy, nadgodziny, notatki, ustawienia, edycje grafiku
2. **Google Drive** (opcjonalne) — ręczna synchronizacja między urządzeniami
3. **Backup JSON** — eksport/import pliku z całą kopią danych

**Uwaga:** Dane w localStorage można stracić przy wyczyszczeniu pamięci przeglądarki. Regularnie rób backup przez 📥 JSON lub ☁️ Google Drive.

## 🔒 Prywatność

Wszystkie dane przechowywane są lokalnie w przeglądarce użytkownika. Synchronizacja Google Drive używa własnego konta użytkownika — brak zewnętrznych serwerów. Aplikacja nie wysyła żadnych danych do innych serwisów.

## 🐛 Zgłaszanie błędów

Znaleziono błąd lub masz sugestię? Napisz na: [tantsiura.s@pg.com](mailto:tantsiura.s@pg.com)

Przy zgłoszeniu podaj:
- Rok, datę, brygadę
- Nazwę przeglądarki i urządzenie
- Krótki opis problemu
- Zrzut ekranu (jeśli możliwy)

## 📝 Licencja

MIT License (lub wewnętrzne narzędzie fabryczne — wg wyboru autora)

## 🙏 Autor

**Servitant**  
📧 [servitant@gmail.com](mailto:servitant@gmail.com)

---

**Uwaga dla developerów:** Szczegółowa dokumentacja techniczna (architektura, sync, edge cases) znajduje się w [PROJECT_DOCS.md](./PROJECT_DOCS.md). FAQ w aplikacji (☰ Menu → ❓) zawiera przewodnik dla użytkowników.