# Graffik → Plan Zmian (redirect only)

Це **не** застосунок і **не** дзеркало коду.

Репозиторій існує лише для того, щоб стара адреса GitHub Pages після rename репо не віддавала 404:

- було: https://servitantgit.github.io/Graffik/
- треба: https://planzmian.pages.dev/

GitHub після перейменування `Graffik` → `PlanZmian` сам редиректить лише
`github.com/servitantgit/Graffik`, але **не** гарантує живий Pages на старому
шляху `/Graffik/`. Тому тут окреме міні-репо з тією ж старою назвою і Pages
з кореня `main`.

## Що тут лежить

- `index.html` — meta-refresh + `location.replace` на https://planzmian.pages.dev/
- (опційно) `sw.js` — якщо колись знадобиться прибрати старий Service Worker на цьому origin

Код Plan Zmian **не** дублювати. Джерело продукту:

- репо: https://github.com/servitantgit/PlanZmian
- прод: https://planzmian.pages.dev/
- legacy stub уже *всередині* PlanZmian: `docs/` → https://servitantgit.github.io/PlanZmian/

## Налаштування Pages

Settings → Pages → Deploy from a branch → `main` / `/ (root)`.

## Не робити

- не деплоїти сюди повний PWA
- не вести сюди нову розробку
- не вважати це «другою версією» графіка

Якщо редирект більше не потрібен (ніхто не ходить на старий URL) — репо можна
архівувати або видалити.
