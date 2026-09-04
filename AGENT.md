# 🤖 AGENT.md — Guidelines for AI Agents

> **Цей документ призначений для AI агентів** (Cline, Kilo Code, Cursor, Continue, Aider, ChatPG, etc.), які працюють з проектом Grafik Gillette.

**READ FIRST. Read fully. Then act.**

**Version:** v2.0 (2026-08-22) — updated with actual project state (v3.9.0 in progress)

---

## 📌 PROJECT IDENTIFICATION

| Property                  | Value                                                  |
| ------------------------- | ------------------------------------------------------ |
| **Name**                  | Grafik Gillette                                        |
| **Type**                  | Progressive Web App (PWA)                              |
| **Purpose**               | Shift schedule management for 4 brigades (P&G factory) |
| **Live URL**              | https://servitantgit.github.io/Graffik/                |
| **Repository**            | https://github.com/servitantgit/Graffik (public)       |
| **Deployment**            | GitHub Pages via GitHub Actions                        |
| **Owner**                 | Solo developer + ~5-10 colleagues (potential 20-40)    |
| **Primary language (UI)** | Polish (with EN, UK translations)                      |
| **Owner language (chat)** | Ukrainian                                              |
| **Current version**       | v3.9.0 (in progress — Timeline widget + cell skins)    |

---

## 🛠 TECHNICAL STACK

**Core:**

- **Vanilla JavaScript** (ES2020+) — NO frameworks
- **HTML5 + CSS3** — Custom Properties, Flexbox, Grid
- **NO build system** — direct browser execution
- **NO npm/node dependencies** at runtime (only tools/)
- **NO TypeScript** — plain JS with JSDoc when useful
- **NO ES Modules** — global scope via `window.*` (see Architecture #1)

**Features:**

- **PWA** — Service Worker + Web App Manifest
- **Google Drive API** — OAuth 2.0 for user sync + admin identification
- **i18n** — 3 languages (pl/en/uk), ~350 keys each
- **Multi-schedule ready** — Registry pattern (currently only Gillette)
- **Personalization** — 3 cell skin styles (full/strip/quiet)

**CI/CD:**

- **GitHub Actions** — auto-deploy on push to main
- **Cache busting** — dynamic `__BUILD_ID__` replaced with git hash (see sw.js)

---

## 🏗 ARCHITECTURE PRINCIPLES

### 1. **NO ES Modules** ⚠️ CRITICAL

All code uses `<script>` tags with global scope via `window.*`. This is intentional and mandatory.

**❌ WRONG:**
\`\`\`javascript
import { doStuff } from './module.js';
export function myFunc() {}
export { myFunc, anotherFunc };
\`\`\`

**✅ CORRECT:**
\`\`\`javascript
// In myFile.js
function myFunc() {
/_ ... _/
}
window.myFunc = myFunc;

// In another file
if (typeof myFunc === 'function') myFunc();
\`\`\`

**Why:** No build step → browsers must parse directly. ES modules require `type="module"` which changes execution semantics.

### 2. **Registry Pattern for Multi-Schedule**

\`\`\`javascript
scheduleRegistry.gillette = { data, hours, metadata };
// Backward-compat aliases (used everywhere in legacy code):
factorySchedule[year][month][brigade];
factoryMonthHours[year][month][brigade];
\`\`\`

Structure ready for future schedules (office-5x1, production-5x3), but currently only `gillette` is registered.

### 3. **Privacy-by-Design**

- Personal data (edits, vacations, notes, OT) — **localStorage ONLY**
- Public data (factory schedule) — in git (`js/schedules/gillette/`)
- **NEVER commit personal data** to repo
- **Privacy Mode** — optional toggle in side menu (`body.privacy-mode`)
- **Google login** — for backup/sync only, NOT for privacy control

### 4. **Modular CSS (v3.8.0+)**

**10 CSS files** loaded in this exact order (cascade matters!):

\`\`\`
variables.css ← themes, custom properties
→ layout.css ← top-bar, menu, controls
→ components.css ← modals, banners, buttons, palette
→ calendar.css ← calendar grid, day-cells, info-panel
→ overtime.css ← OT visuals, popups (relief + ot-detail)
→ views.css ← year, table views
→ dashboard.css ← dashboard cards, chips
→ responsive.css ← ALL @media (max-width) queries
→ print.css ← ALL @media print queries
→ smart-popup.css ← Timeline widget (v3.9.0, LAST in cascade)
\`\`\`

**Actual load order in `index.html` (lines 19-28):**
\`\`\`html

<link rel="stylesheet" href="css/variables.css">
<link rel="stylesheet" href="css/layout.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/calendar.css">
<link rel="stylesheet" href="css/overtime.css">
<link rel="stylesheet" href="css/views.css">
<link rel="stylesheet" href="css/dashboard.css">
<link rel="stylesheet" href="css/responsive.css">
<link rel="stylesheet" href="css/print.css">
<link rel="stylesheet" href="css/smart-popup.css">  <!-- LAST -->
\`\`\`

### 5. **Cell Skin System (v3.9.0)**

Users can switch calendar cell appearance via **Personalization** (`js/personalization.js`).

**Three skins** applied via `body.skin-*` class:

| Class        | UI Name              | Behavior                                  |
| ------------ | -------------------- | ----------------------------------------- |
| `skin-full`  | Pełne wypełnienie    | Full color fill (classic, default)        |
| `skin-strip` | Spokojny pasek       | Neutral body + colored left stripe        |
| `skin-quiet` | Kolorowe obramowanie | Neutral cell + colored border + date ring |

**Note:** Technical name `quiet` is kept for backward compat. Do NOT rename it. UI label uses "Kolorowe obramowanie".

Shift colors (R/P/N) remain identical across all skins — only presentation changes.

### 6. **Defensive Cross-Module Calls**

\`\`\`javascript
if (typeof someFunction === 'function') {
someFunction();
}
\`\`\`

Especially important for:

- `updateLastModified()` (sync tracking)
- `renderReliefTimeline()` (smart-popup)
- `applyPersonalization()` (personalization)
- `isCurrentUserAdmin()` (admin)

### 7. **Info-Panel is Dynamic**

Info-panel content in `index.html` is placeholder ONLY. Actual content generated in `js/calendar.js` via `panel.innerHTML = ...` (line ~640-840).

**Never modify info-panel HTML in index.html** — modify the JS template.

### 8. **Login State vs Privacy**

- **Login (Google Drive)** = backup/sync capability
- **Privacy Mode** = separate toggle in side menu
- These are **INDEPENDENT** (unlike old v3.7.0 where they were tied)
- `shouldShowPersonalData()` in `_registry.js` handles both

---

## 📁 FILE STRUCTURE (CANONICAL — as of v3.9.0)

\`\`\`
Graffik/
├── index.html ← Main entry (~370 lines)
├── manifest.json ← PWA manifest
├── sw.js ← Service Worker with **BUILD_ID**
├── .nojekyll ← ⚠️ CRITICAL: GitHub Pages Jekyll disable
├── AGENT.md ← THIS FILE (v2.0)
├── HANDOFF.md ← Chat session context (owner keeps LOCAL only, NOT in git)
├── CHANGELOG.md ← Version history (Keep a Changelog format)
├── README.md ← User-facing docs (Polish)
├── PROJECT*DOCS.md ← Extended technical docs
│
├── mockup-*.html ← Design mockups (NOT deployed, kept for reference)
│ ├── mockup-dashboard-mobile.html
│ ├── mockup-month-cells.html
│ ├── mockup-ui-ideas.html
│ ├── mockup-year-table.html
│ └── (other mockup-\_.html files)
│
├── css/ ← Modular CSS (10 files)
│ ├── variables.css ← :root, themes (~85 lines)
│ ├── layout.css ← top-bar, menu (~420 lines)
│ ├── components.css ← modals, buttons, palette (~900 lines)
│ ├── calendar.css ← calendar grid + cell skins (~584 lines)
│ ├── overtime.css ← OT visuals + relief popups (~645 lines)
│ ├── views.css ← year/table views (~409 lines)
│ ├── dashboard.css ← dashboard + chips (~312 lines)
│ ├── responsive.css ← @media (max-width) (~399 lines)
│ ├── print.css ← @media print (~193 lines)
│ └── smart-popup.css ← Timeline widget (v3.9.0, ~180 lines)
│
├── js/
│ ├── schedules/ ← 🌍 PUBLIC data (in git)
│ │ ├── \_core.js ← constants + helpers (~180 lines)
│ │ ├── \_registry.js ← registry + shouldShowPersonalData (~100 lines)
│ │ └── gillette/
│ │ ├── metadata.js ← Gillette schedule definition
│ │ └── 2026.js ← Year 2026 data (add 2027.js later)
│ │
│ ├── personal/ ← 🔒 PRIVATE (localStorage only)
│ │ └── sync-tracking.js ← lastModified / lastSync tracking (~90 lines)
│ │
│ ├── i18n/
│ │ ├── pl.js ← Polish (~350 keys) [PRIMARY]
│ │ ├── en.js ← English
│ │ ├── uk.js ← Ukrainian
│ │ └── i18n.js ← t(), setLanguage(), renderFAQ()
│ │
│ ├── admin.js ← ADMIN_EMAILS check (~65 lines)
│ ├── overtime-logic.js ← categorizeOvertime() + helpers
│ ├── core.js ← business logic + save hooks
│ ├── ui.js ← modals, toasts, theme toggle
│ ├── edit.js ← edit mode, undo/redo, pending buffer
│ ├── dashboard.js ← Dashboard view
│ ├── smart-popup.js ← Timeline widget (v3.9.0)
│ ├── calendar.js ← Month view (~840 lines)
│ ├── views.js ← Year/Table views
│ ├── actions.js ← export/import/share (~1100 lines)
│ ├── pwa.js ← Service Worker registration + notifications
│ ├── sync.js ← Google Drive OAuth + upload/download (~450 lines)
│ ├── personalization.js ← Cell skins + preferences (v3.9.0)
│ └── main.js ← state + init (~600 lines)
│
├── icons/ ← PWA icons (192, 512, 512-maskable)
├── screenshots/ ← PWA screenshots
├── tools/ ← Dev tools (NOT deployed to prod)
│
├── .github/workflows/
│ └── deploy.yml ← CI/CD pipeline
│
├── .prettierrc.json ← Prettier config
├── .prettierignore
└── .vscode/ ← VS Code workspace settings
└── settings.json
\`\`\`

### 📜 Script Load Order (index.html lines 340-361)

\`\`\`html

<!-- 1. Schedule data (public) -->
<script src="js/schedules/_core.js"></script>
<script src="js/schedules/_registry.js"></script>
<script src="js/schedules/gillette/metadata.js"></script>
<script src="js/schedules/gillette/2026.js"></script>

<!-- 2. Personal tracking (localStorage) -->
<script src="js/personal/sync-tracking.js"></script>

<!-- 3. Core logic -->
<script src="js/overtime-logic.js"></script>
<script src="js/core.js"></script>
<script src="js/ui.js"></script>
<script src="js/edit.js"></script>

<!-- 4. Views (dashboard BEFORE smart-popup BEFORE calendar!) -->
<script src="js/dashboard.js"></script>
<script src="js/smart-popup.js"></script>  <!-- 🆕 Between dashboard and calendar -->
<script src="js/calendar.js"></script>
<script src="js/views.js"></script>

<!-- 5. Actions + integrations -->
<script src="js/actions.js"></script>
<script src="js/pwa.js"></script>
<script src="js/sync.js"></script>
<script src="js/admin.js"></script>

<!-- 6. i18n (pl → en → uk → logic) -->
<script src="js/i18n/pl.js"></script>
<script src="js/i18n/en.js"></script>
<script src="js/i18n/uk.js"></script>
<script src="js/i18n/i18n.js"></script>

<!-- 7. Personalization + main init -->
<script src="js/personalization.js"></script>
<script src="js/main.js"></script>  <!-- LAST -->

\`\`\`

**⚠️ Order matters:**

- Schedule data BEFORE core.js (core needs it)
- smart-popup BEFORE calendar (calendar calls `renderReliefTimeline`)
- i18n loaded per-lang BEFORE i18n.js (which uses them)
- main.js ALWAYS last (initializes app)

---

## 📊 DATA MODELS (localStorage keys)

\`\`\`javascript
'gillette_prefs_v1' // theme, lang, year, brigade, cellSkin, cellColors
'gillette_custom_schedule_v2' // user edits (array per day)
'gillette_urlops_v1' // vacations per brigade
'gillette_notes_v1' // notes per day
'gillette_overtimes_v1' // flat key otKey() = 'year-month-day-brigade'
'grafik_drive_token' // Google OAuth token
'grafik_drive_user_email' // logged-in user email
'gillette_sync_meta' // {lastModified, lastSync, changeCount}
\`\`\`

**Brigades:** \`A\`, \`B\`, \`C\`, \`D\`
**Shifts:** \`R\` (6-14), \`P\` (14-22), \`N\` (22-6), \`''\` (wolne/off)
**Special:** \`U\` (urlop/vacation), \`W\` (wolne/weekend), \`S\` (dodatkowa/extra shift)

### Overtime Positions

\`\`\`javascript
overtimes['2026-8-15-C'] = {
przed: { hours: 2, note: 'przed zmianą' }, // OT before shift
po: { hours: 3, note: 'po zmianie' }, // OT after shift
weekend: { hours: 8, note: 'praca w wolne' } // Weekend/holiday work
}
\`\`\`

### Prefs Structure

\`\`\`javascript
{
year: 2026, month: 8, shift: 'A', view: 'month', yearMode: false,
theme: 'light' | 'dark',
lang: 'pl' | 'en' | 'uk',
cellSkin: 'full' | 'strip' | 'quiet', // v3.9.0
cellColors: {...}, // custom shift colors (optional)
privacyMode: false, // separate from login
notifications: false,
notificationsLead: 1,
vacationLimits: { A: 26, B: 26, C: 26, D: 26 },
welcomed: true,
skipEditConfirm: false
}
\`\`\`

---

## 🚨 CRITICAL RULES (ALWAYS FOLLOW)

### RULE 1: CHARACTER PRESERVATION

**Use LITERAL characters, never hex/unicode escapes.**

**✅ CORRECT:**
\`\`\`javascript
const label = '📅 Dziś';
const arrow = '→';
const emoji = '🌅';
const polishChar = 'ą';
\`\`\`

**❌ WRONG:**
\`\`\`javascript
const label = '\\ud83d\\udcc5 Dzi\\u015b';
const arrow = '\\u2192';
const emoji = '\\ud83c\\udf05';
\`\`\`

**Why:** These are JS source strings, not HTML content. Literals preserve readability and prevent double-encoding.

### RULE 2: UTF-8 SAFETY

**When writing files with PowerShell, NEVER use \`Get-Content | Set-Content\`** — it corrupts UTF-8.

**✅ CORRECT:**
\`\`\`powershell
[System.IO.File]::WriteAllText(
(Resolve-Path "file.js").Path,
\$content,
[System.Text.UTF8Encoding]::new(\$false)
)
\`\`\`

**❌ WRONG:**
\`\`\`powershell
Get-Content file.js | Set-Content file.js # corrupts Polish chars
\`\`\`

**Polish chars:** ą, ć, ę, ł, ń, ó, ś, ź, ż
**Ukrainian chars:** а-я, і, ї, є, ґ

### RULE 3: NO ES MODULES

Use global scope via \`window.\*\`. See Architecture #1.

**No \`import\` / \`export\` statements EVER.** They will silently fail or throw at runtime.

### RULE 4: i18n IN 3 LANGUAGES

**Any user-facing string must be added to all 3 files:**

- \`js/i18n/pl.js\` (primary)
- \`js/i18n/en.js\`
- \`js/i18n/uk.js\`

**Missing translations break the UI** (undefined labels).

**Use in HTML:**
\`\`\`html
<button data-i18n="menuHelp">Pomoc</button>
<input data-i18n-placeholder="notePlaceholder">
<button data-i18n-title="theme" title="Motyw">🌙</button>
\`\`\`

**Use in JS:**
\`\`\`javascript
element.textContent = t('newKey');
element.textContent = t('greeting', { name: userName }); // with params
\`\`\`

### RULE 5: NO PERSONAL DATA IN GIT

**NEVER commit:**

- Real employee names
- Personal edits (from localStorage)
- Vacation dates
- OT records
- Actual work notes
- Google Drive tokens
- Real user emails (beyond documented \`ADMIN_EMAILS\`)

**Repository is PUBLIC.** Everything committed is world-visible.

### RULE 6: CONSOLE LOG PREFIX

\`\`\`javascript
console.log('[calendar]', 'Rendering month', month);
console.warn('[sync]', 'Drive token expired');
console.error('[actions]', 'Export failed', err);
\`\`\`

Prefix helps filter logs during debugging.

### RULE 7: DEFENSIVE CROSS-MODULE CALLS

Always check function existence before calling:

\`\`\`javascript
if (typeof updateLastModified === 'function') {
updateLastModified();
}

if (typeof renderReliefTimeline === 'function') {
const html = renderReliefTimeline(info, y, m, d, shift, brig, otData);
}
\`\`\`

**Why:** Script load order matters, race conditions possible.

### RULE 8: COMMENTS IN ENGLISH OR POLISH

Not Ukrainian in code (owner's convention). Ukrainian only in chat responses.

### RULE 9: PRESERVE .nojekyll

**Never delete \`.nojekyll\`** (even if empty). It's required for GitHub Pages to serve files starting with \`\_\` (like \`js/schedules/\_core.js\`).

### RULE 10: NO DUPLICATE FUNCTION DECLARATIONS

Check before adding new functions:

\`\`\`powershell
Select-String -Path "js/\*_/_.js" -Pattern "^function myNewFunc"
\`\`\`

**Duplicates cause silent overrides** — last declaration wins, earlier logic is lost.

### RULE 11: MOCKUP FILES NAMING

Design experiments live in \`mockup-\*.html\` at project root.

**Rules:**

- ✅ Kept in git (for reference)
- ✅ NOT loaded by app
- ✅ Not deployed via Service Worker cache
- ❌ Don't reference from index.html
- ❌ Don't require them for production

---

## 🐛 KNOWN GOTCHAS (Real problems, real fixes)

### GOTCHA 1: PowerShell \$matches Autovariable

\`\$matches\` is a PowerShell autovariable (used by \`-match\` operator). **NEVER use as regular variable name** — it conflicts.

**❌ WRONG:**
\`\`\`powershell
\$matches = @() # BREAKS all subsequent regex operations
\`\`\`

### GOTCHA 2: PowerShell Console Encoding

Emoji in \`Write-Host\` get corrupted in console output. Use ASCII markers instead.

**✅ USE:** \`[OK]\`, \`[WARN]\`, \`[ERROR]\`
**❌ AVOID:** \`✅\`, \`⚠️\`, \`❌\` in Write-Host

**File contents are fine** — this is only about console output.

### GOTCHA 3: Combined CSS Selectors + DELETE

AI has difficulty processing DELETE operations on combined selectors:

\`\`\`css
.a, .b, .c { ... } /_ Hard to safely delete just .b _/
\`\`\`

**When refactoring:** split into separate rules first, then delete.

### GOTCHA 4: Duplicate Declarations

**Real example (v3.9.0):** \`sync-tracking.js\` had \`hasUnsyncedChanges\` declared twice.

\`\`\`javascript
// Line 90:
function hasUnsyncedChanges() {
const { lastModified, lastSync } = getSyncMeta();
return lastModified > lastSync;
}

// Line 130 (DUPLICATE — overrides!):
function hasUnsyncedChanges() {
const meta = getSyncMeta();
return meta.lastModified > meta.lastSync;
}
\`\`\`

**Always check before adding:**
\`\`\`powershell
Select-String -Path "js/\*_/_.js" -Pattern "^function functionName"
\`\`\`

### GOTCHA 5: Cline Auto-Push

Cline may auto-push after commit. Configure to prevent unintended pushes. Monitor \`git log\` after every Cline session.

### GOTCHA 6: Large Files (3000+ lines)

Cline reads in chunks, wastes tokens. **Solution used:** CSS split (v3.8.0) — no single file > 1000 lines.

**When file grows > 800 lines:** consider splitting.

### GOTCHA 7: Broken UTF-8 Detection

Check for corrupted encoding:

\`\`\`powershell
Select-String -Path "js/\*.js" -Pattern "â€|â¬|đź|Ĺ‚|Ń"
\`\`\`

If matches found → encoding is broken, needs restoration from git or backup.

**Symptoms:** Console shows \`â€"\`, \`đź"", \`Ĺ‚\` instead of proper characters.

### GOTCHA 8: Service Worker Cache

After deploy, users may see old version. Solutions:

- **Hard reload** (Ctrl+Shift+R)
- **Auto-update toast** (v3.6.0+ handles this automatically)
- **Manual unregister** in DevTools → Application → Service Workers

### GOTCHA 9: Multi-file Refactor Conflicts

When touching multiple files, do them in **separate commits** for easy rollback:

\`\`\`bash
git add js/file1.js && git commit -m "feat: change A"
git add js/file2.js && git commit -m "feat: change B"
\`\`\`

### GOTCHA 10: ES Module Syntax in No-Modules Project

**Real example (v3.9.0):** \`sync-tracking.js\` had \`export\` statement at end:

\`\`\`javascript
export { getSyncMeta, setSyncMeta, hasUnsyncedChanges, resetSyncMeta };
\`\`\`

**Result:** Silent SyntaxError in browser. Functions still work IF loaded via \`<script>\` (not \`type="module"\`), but \`export\` is invalid at top-level of classic script.

**Fix:** Remove \`export\` statement. Use \`window.MyModule = {...}\` pattern instead.

### GOTCHA 11: Chrome Extensions in Service Worker

Service Worker can receive requests from browser extensions (\`chrome-extension://\`). Ignore them:

\`\`\`javascript
if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
\`\`\`

Otherwise: \`Failed to execute 'put' on 'Cache': Request scheme unsupported\`.

### GOTCHA 12: \`t\` Variable Collision with i18n

\`\`\`javascript
// ❌ WRONG (shadows global t() function):
const t = new Date();
element.textContent = t('someKey'); // TypeError: t is not a function

// ✅ CORRECT:
const now = new Date();
element.textContent = t('someKey');
\`\`\`

### GOTCHA 13: Cell Skin Backward Compat

Technical class name \`skin-quiet\` refers to what UI calls "Kolorowe obramowanie".

**Do NOT rename** the class — it's persisted in localStorage. Users with old prefs would break.

**When updating UI labels** — only change i18n keys, not CSS class names.

### GOTCHA 14: AI Model Quality Depends on Task Structure (v2.1 update)

**Real evidence (2026-08-22):**

Cline + DeepSeek (free tier) successfully:

- Detected discrepancy between LOCATE block and named file
- Cross-referenced usage in 16 code locations
- Read AGENT.md canonical structure and applied rules
- STOPPED before making changes (per RULE 6)
- Presented 4 clear options with detailed justification

**Key insight:** Model quality gap between free and paid narrows dramatically
when tasks include:

- Explicit LOCATE + REPLACE blocks (not "find the section")
- STOP-if-ambiguous rule
- VERIFY checklist
- Small scope (1-3 STEPS, 1-2 files)

**Practical recommendation:**

| Task type             | Recommended model                     |
| --------------------- | ------------------------------------- |
| Simple 1-file edit    | Any (DeepSeek free, Kilo, Cline+paid) |
| Multi-file refactor   | Kilo Code preferred, or Cline+paid    |
| Ambiguous exploration | ChatPG/Claude direct chat             |
| Emergency debugging   | Cline + Claude Sonnet (paid)          |

**AGENT.md ROI:** Well-written task + AGENT.md rules = free models perform
like paid models. This project's ~1.5h investment in AGENT.md v2.0 already
paid back multiple times.

### GOTCHA 15: Orphaned Files with Same Name

**Real case (v3.9.0 cleanup, 2026-08-22):**

Two files with identical basename existed:

- `sync-tracking.js` (root, 148 lines, buggy, git-tracked but orphaned)
- `js/personal/sync-tracking.js` (real module, 116 lines, active, clean)

**How it happened:** During v3.9.0 refactor, the module was MOVED from root
to `js/personal/`, but git preserved the old copy at root instead of deleting.
The old file has no `.gitignore` protection and no auto-cleanup.

**How AI got confused:**

1. ChatPG read raw workspace dump that included root file
2. Generated Cline task using root file's content as LOCATE
3. Task named `js/personal/sync-tracking.js` as target — mismatch!
4. Cline correctly refused to apply wrong content to wrong file

**Prevention:**

- After moving files during refactor, always `git rm` the old location
- Regular check: `Get-ChildItem -Recurse -Filter "*.js" | Group-Object Name | Where { $_.Count -gt 1 }`
- Include cleanup step in refactor CHANGELOG entries
- Update AGENT.md's FILE STRUCTURE to explicitly note deleted paths

**Detection command:**

\`\`\`powershell

# Find any duplicate JS/CSS files by basename

Get-ChildItem -Recurse -Filter "\*.js" | Group-Object Name |
Where-Object { $\_.Count -gt 1 } |
Select-Object Name, Count
\`\`\`

**Fix:**

\`\`\`powershell

# Verify which file is loaded

Select-String -Path "index.html","sw.js" -Pattern "filename\.js"

# Delete orphan (if git-tracked)

git rm path/to/orphan.js

# OR delete if not tracked

Remove-Item path/to/orphan.js
\`\`\`

---

## ❌ ANTI-PATTERNS (NEVER DO THIS)

### ANTI-PATTERN 1: "Figure it out" Instructions

**❌ BAD Cline task:**

\`\`\`
"Find the entire section and remove it"
"Paste CSS above"
"Refactor as you see fit"
\`\`\`

**✅ GOOD Cline task:**

\`\`\`
"LOCATE this exact block: [full code]"
"REPLACE with: [full new code]"
\`\`\`

### ANTI-PATTERN 2: Vague DELETE Operations

**❌ BAD:**

\`\`\`
"Remove the relief-popup CSS section (may span 20-30 lines)"
\`\`\`

**✅ GOOD:**

\`\`\`
"LOCATE lines X-Y containing exactly these selectors: [list]"
"ACTION: DELETE"
\`\`\`

### ANTI-PATTERN 3: Running Commands via AI

**❌ BAD (in Cline task):**

\`\`\`
"Run: git add . && git commit -m 'refactor'"
"Run: Select-String -Pattern..."
\`\`\`

**✅ GOOD:**

\`\`\`
"DO NOT run commands. USER will verify manually."
\`\`\`

### ANTI-PATTERN 4: Combined Refactors (6+ steps)

**❌ BAD:** One task with 8 STEPS across 5 files.
**✅ GOOD:** Split into 3-4 separate tasks, each with 1-3 STEPS.

### ANTI-PATTERN 5: Modifying Files Outside Scope

**❌ BAD:** Task says "modify calendar.js" but AI also touches ui.js "to be safe".
**✅ GOOD:** Modify ONLY listed files. If related files need changes, STOP and ask.

### ANTI-PATTERN 6: Assuming Without Verification

**❌ BAD:** "The function is probably in main.js somewhere..."
**✅ GOOD:** Verify with \`Select-String\` output before proposing changes.

### ANTI-PATTERN 7: Deleting \`.nojekyll\`

It's empty by design. **Never delete.**

### ANTI-PATTERN 8: Adding NPM Dependencies

This project has NO build system. Adding npm packages breaks the deployment model.

### ANTI-PATTERN 9: Using ES Module Syntax

\`\`\`javascript
// ❌ NEVER:
import { helper } from './helper.js';
export function myFunc() {}
export default MyClass;
export { A, B, C };

// ✅ ALWAYS:
function myFunc() {}
window.myFunc = myFunc;
\`\`\`

### ANTI-PATTERN 10: Adding Files Without Registering

Creating \`new-module.js\` without adding \`<script src="js/new-module.js">\` to \`index.html\` = code never runs.

**Same for CSS** — new files must be registered in \`index.html\` AND \`sw.js\` ASSETS list.

### ANTI-PATTERN 11: Renaming CSS Skin Classes

Class names (\`skin-full\`, \`skin-strip\`, \`skin-quiet\`) are persisted in localStorage. Renaming breaks existing users' prefs.

**Only change display labels** via i18n.

### ANTI-PATTERN 12: Modifying HTML in index.html for Dynamic Content

Info-panel, dashboard, calendar cells — all rendered dynamically in JS.

**Modifying \`<div id="infoPanel">...</div>\` in HTML does nothing** — it's a placeholder.

### ANTI-PATTERN 13: Trusting Raw File Listings

**❌ BAD:** Assuming a file exists at path X because it appeared in a workspace
dump, code.txt export, or `ls` output.

**✅ GOOD:** Verify the file is:

1. Referenced in `index.html` (as `<script>` or `<link>`)
2. Referenced in `sw.js` (in ASSETS array)
3. Not listed as deprecated/orphan in CHANGELOG or AGENT.md

**Real case (v3.9.0):**

ChatPG saw root `sync-tracking.js` in a workspace code dump and assumed
it was the active module. Generated Cline task using its content as LOCATE.
Cline+DeepSeek correctly refused to apply changes because:

- The task named `js/personal/sync-tracking.js` as target
- But the LOCATE block matched a different file (root orphan)
- Applying anyway would break `js/core.js` (5 calls) and `js/sync.js` (6 calls)

**Lesson:** Always cross-check file paths against `index.html` script tags
before generating LOCATE blocks. Workspace listings can include orphaned files.

---

## 🎯 TASK COMPLEXITY GUIDE

Rate your task before starting:

| Metric                | 🟢 Green (OK) | 🟡 Yellow (careful) | 🔴 Red (SPLIT) |
| --------------------- | ------------- | ------------------- | -------------- |
| STEPS                 | 1-3           | 4-5                 | 6+             |
| Files modified        | 1-2           | 3-4                 | 5+             |
| Lines in LOCATE block | <50           | 50-150              | 200+           |
| Total task tokens     | <3000         | 3000-6000           | 6000+          |
| DELETE operations     | 0-1 simple    | 2-3 careful         | Any complex    |
| Cross-file changes    | 0             | 1-2                 | 3+             |

**🔴 Red → Split into multiple tasks. Do NOT run as single task.**

### Complexity Examples

**🟢 Green — safe to do in one task:**

- Add new i18n key to 3 files
- Create new CSS module file
- Add new function to existing JS file
- Update single localStorage key format

**🟡 Yellow — proceed with caution:**

- Refactor function used in 3 files
- Add new modal (JS + CSS + HTML + i18n)
- Migrate localStorage key from v1 to v2

**🔴 Red — MUST split:**

- Refactor entire module across 5+ files
- Remove old feature with cleanup in JS/CSS/HTML/i18n
- Change data model with backward compat
- Multi-language + multi-file UI changes

---

## 🔄 TASK WORKFLOW (STANDARD PROCESS)

### Phase 1: RECEIVE TASK

When user provides a task, first:

1. **READ this AGENT.md fully** (if not already loaded)
2. **Identify complexity** (Green/Yellow/Red)
3. **List files to modify** (be explicit)
4. **Ask if ambiguous** — never guess

### Phase 2: DISCOVERY (before writing code)

**Always search first (mentally, or request user to run):**

\`\`\`powershell

# Find relevant file(s)

Select-String -Path "js/\*.js" -Pattern "functionName"

# Verify current state (show N lines starting from line X)

Get-Content "js/target.js" | Select-Object -Skip N -First M

# Check for duplicates

Select-String -Path "js/\*_/_.js" -Pattern "^function myNewFunc"

# Check for UTF-8 issues

Select-String -Path "js/\*.js" -Pattern "â€|â¬|đź"

# Check for ES module syntax (should be empty!)

Select-String -Path "js/\*.js" -Pattern "^import |^export "
\`\`\`

**If AI can't execute:** ask user to run and share output.

### Phase 3: PLAN

Before writing:

- What file(s) exactly?
- What lines exactly (with LOCATE block)?
- What replacement (with full new code)?
- What verification (manual, not commands)?
- Rollback strategy?
- Documentation updates needed?

### Phase 4: EXECUTE

Follow the COMMAND TEMPLATE below.

### Phase 5: RESPONSE

Structured response — see RESPONSE FORMAT below.

---

## 📝 COMMAND TEMPLATE (for tasks user gives to Cline)

Every Cline task should follow this exact structure:

\`\`\`markdown

# TASK [ID]: [ONE-LINE GOAL]

**PROJECT:** Grafik Gillette (PWA at C:\\Users\\tantsiura.s\\OneDrive - Procter and Gamble\\Documents\\AI HTML\\Graffik)

**GOAL:** [1-2 sentence description]

**FILES TO MODIFY (exactly N files):**

1. \`path/to/file1\` — [what changes]
2. \`path/to/file2\` — [what changes]

**ESTIMATED CHANGES:**

- Lines added: ~N
- Lines removed: ~N

---

## ⚠️ CRITICAL RULES

1. WORK ONLY IN CURRENT WORKSPACE
2. DO NOT access files outside workspace
3. DO NOT modify files other than specified
4. DO NOT run ANY commands (no npm, no git, no PowerShell)
5. DO NOT create files unless explicitly listed
6. STOP if ambiguous — don't guess

## 🚨 CHARACTER PRESERVATION

7. Use LITERAL characters — never hex/unicode escapes
8. UTF-8 must be preserved (Polish + Ukrainian + emoji)

## 🚫 NO ES MODULES

9. NEVER use import/export statements
10. Use window.\* for global scope

---

## 📦 STEP N: [Descriptive title]

**FILE:** \`exact/path/to/file.js\`
**ACTION:** REPLACE | INSERT AFTER | INSERT BEFORE | CREATE | DELETE

**LOCATE this exact block:**

\\\`\\\`\\\`javascript
[EXACT source code — copy-paste from actual file]
\\\`\\\`\\\`

**REPLACE with:**

\\\`\\\`\\\`javascript
[EXACT new code — full content, no placeholders]
\\\`\\\`\\\`

**CONTEXT NOTES:**

- [Why this change]
- [What's preserved]

**VERIFY after STEP N (manual, not commands!):**

- File contains "X"
- File does NOT contain "Y"
- File is ~N lines longer

---

## ✅ VERIFICATION CHECKLIST

- [ ] [Manual checkbox]
- [ ] No hex/unicode escapes used
- [ ] No other files modified
- [ ] No commands executed
- [ ] No ES module syntax added

## 📝 COMMIT MESSAGE (for USER later — AI does NOT commit)

\\\`\\\`\\\`
type(scope): brief message

Detailed body.
\\\`\\\`\\\`

## 🆘 IF SOMETHING GOES WRONG

**Rollback:**
\\\`\\\`\\\`powershell
git checkout HEAD -- path/to/file.js
\\\`\\\`\\\`
\`\`\`

---

## 📤 RESPONSE FORMAT (What AI must return after task)

### Response Structure

Every task completion must include these sections:

\`\`\`markdown

## ✅ Task Completed

### 📁 Files Modified

- \`path/to/file1.js\` — [brief description]
- \`path/to/file2.css\` — [brief description]

### 📊 Statistics

- Lines added: N
- Lines removed: N
- Files created: N
- Files deleted: N

### 🔍 Verification Steps for USER

Run these commands to verify:

\\\`\\\`\\\`powershell

# 1. Check file exists (if created)

Test-Path "path/to/newfile.js"

# 2. Check function/class present

Select-String -Path "path/to/file.js" -Pattern "myNewFunction"

# 3. Check no encoding issues

Select-String -Path "path/to/file.js" -Pattern "\\\\x|\\\\u00"

# Expected: EMPTY output

# 4. Check UTF-8 not broken

Select-String -Path "path/to/file.js" -Pattern "â€|â¬|đź"

# Expected: EMPTY output

# 5. Check no ES modules

Select-String -Path "path/to/file.js" -Pattern "^import |^export "

# Expected: EMPTY output

\\\`\\\`\\\`

### 🧪 Testing Instructions

**Local:**

1. Hard reload browser (Ctrl+Shift+R)
2. Open F12 Console — check for errors
3. Open F12 Network — verify new files load (200 OK)

**Feature-specific:**

- [ ] [Specific test 1]
- [ ] [Specific test 2]

**Cross-cutting:**

- [ ] Works in dark theme
- [ ] Works in light theme
- [ ] Works with pl / en / uk language
- [ ] Works with all 3 cell skins (full / strip / quiet)
- [ ] Works when logged out (privacy)
- [ ] Works when logged in

**Mobile:**

- [ ] Test on real device via \`python -m http.server 8000\`
- [ ] Verify responsive at 480px, 380px
- [ ] Verify touch gestures work

### 📝 Documentation Updates Needed

**REQUIRED before commit:**

- [ ] **CHANGELOG.md** — add entry under \`## [Unreleased]\`
- [ ] **i18n keys** — added to all 3 files (pl/en/uk)? (if applicable)
- [ ] **sw.js ASSETS list** — updated if new CSS/JS file added? (if applicable)
- [ ] **index.html \`<script>\` / \`<link>\`** — registered? (if new file)

**RECOMMENDED:**

- [ ] **README.md** — update if user-facing feature added/removed
- [ ] **PROJECT_DOCS.md** — update if architecture changed
- [ ] **AGENT.md** — update if new pattern or gotcha discovered

### 💾 Suggested Commit Message

\\\`\\\`\\\`
type(scope): brief description

- Detail 1
- Detail 2

Related to v3.X.0
\\\`\\\`\\\`

**Commit types:** \`feat\`, \`fix\`, \`refactor\`, \`docs\`, \`style\`, \`test\`, \`chore\`, \`perf\`

### 🆘 Rollback Plan

If issues arise:

\\\`\\\`\\\`powershell

# Single file

git checkout HEAD -- path/to/file

# All changes since last commit

git reset --hard HEAD

# Undo last commit (local only)

git reset --hard HEAD~1

# Undo last pushed commit (⚠️ dangerous)

git reset --hard HEAD~1
git push --force
\\\`\\\`\\\`

### ⚠️ Known Risks / Warnings

- [Any concerns AI has about the change]
- [Edge cases user should test]
- [Performance implications]
- [Backward compat issues]

### 🎯 Next Steps (Optional Suggestions)

- [What could be done next]
- [Related improvements]
- [Follow-up tasks]
  \`\`\`

---

## 📚 DOCUMENTATION UPDATE RULES

### When to Update CHANGELOG.md

**ALWAYS update for:**

- ✅ New features (\`feat\`)
- ✅ Bug fixes (\`fix\`)
- ✅ Breaking changes
- ✅ Performance improvements (\`perf\`)
- ✅ Refactoring visible to users (\`refactor\`)

**Format (Keep a Changelog style):**

\`\`\`markdown

## [Unreleased]

### Added

- New Timeline widget for relief handoff visualization
- Personalization module with 3 cell skin styles

### Changed

- Info-panel now uses Timeline widget instead of classic prev/next badges
- Sync menu unified into single primary action button

### Fixed

- Duplicate function declarations in sync-tracking.js
- ES module syntax breaking silent SyntaxError

### Removed

- Old cell relief popups (replaced by timeline)
- ot-detail-popup on cells (details in info-panel)

### Technical

- New global function: window.renderReliefTimeline()
- Fallback to classic display if smart-popup.js fails
  \`\`\`

**Categories (in this order):**

- \`Added\` — new features
- \`Changed\` — modifications to existing features
- \`Deprecated\` — soon-to-be-removed
- \`Removed\` — deleted features
- \`Fixed\` — bug fixes
- \`Security\` — vulnerability fixes
- \`Technical\` — internal changes not user-visible

### When to Update README.md

**Update if:**

- User-facing feature added/removed
- Installation/setup steps changed
- Screenshots need updating
- New keyboard shortcuts
- New browser requirements
- File structure changed (affects "Struktura projektu" section)

**Don't update for:**

- Internal refactoring
- Bug fixes (unless workaround needed)
- Code style changes
- AGENT.md changes

### When to Update PROJECT_DOCS.md

**Update if:**

- Architecture changed (new pattern, new module)
- New file structure conventions
- New localStorage keys
- New API integrations
- Data model changes
- New patterns in JS/CSS

### When to Update AGENT.md (THIS FILE)

**Update if:**

- New anti-pattern discovered (from failed AI task)
- New gotcha found (real bug, real fix)
- New coding convention adopted
- New file/folder in canonical structure
- New rule needed to prevent recurring issue

**Location for updates:**

- New gotcha → \`KNOWN GOTCHAS\` section
- New anti-pattern → \`ANTI-PATTERNS\` section
- New rule → \`CRITICAL RULES\` section
- New architecture → \`ARCHITECTURE PRINCIPLES\` section

### When to Update sw.js

**Update if:**

- New CSS file added → add to \`ASSETS\` array
- New JS file added → add to \`ASSETS\` array
- New icons added → add to \`ASSETS\` array

**Don't update for:**

- Content changes in existing files (cache-busting via \`**BUILD_ID**\`)

### When to Update HANDOFF.md

**HANDOFF.md is LOCAL ONLY** — owner keeps it on desktop, not in git.

Update at end of every work session to preserve chat context for next AI conversation.

### When to Bump Version

Follow **Semantic Versioning** (SemVer):

- **MAJOR (X.0.0)** — breaking changes, data model changes, incompatible refactor
- **MINOR (X.Y.0)** — new features, backward-compatible
- **PATCH (X.Y.Z)** — bug fixes, small improvements

**Where to update version:**

- \`CHANGELOG.md\` — new entry heading (move \`[Unreleased]\` to versioned)
- \`AGENT.md\` — \`Current version\` in table
- \`manifest.json\` — \`"version"\` field (if exists)
- Commit message often references version

---

## 🧪 TESTING CHECKLIST (before commit)

### Level 1: Syntax

\`\`\`powershell

# No syntax errors (Node.js quick check if available)

node -c js/target.js # or open in browser and check Console
\`\`\`

### Level 2: File Integrity

\`\`\`powershell

# UTF-8 preserved

Select-String -Path "path/file.js" -Pattern "â€|â¬|đź|Ĺ‚"

# Expected: EMPTY

# No hex escapes

Select-String -Path "path/file.js" -Pattern "\\\\x[0-9a-f]|\\\\u00"

# Expected: EMPTY

# No ES module syntax

Select-String -Path "path/file.js" -Pattern "^import |^export "

# Expected: EMPTY

\`\`\`

### Level 3: Functionality

- [ ] Feature works as expected (manually test)
- [ ] Existing features still work (regression test)
- [ ] Works in dark theme
- [ ] Works in light theme
- [ ] Works with pl / en / uk language

### Level 4: Responsive

- [ ] Desktop (1920x1080)
- [ ] Tablet (768px)
- [ ] Mobile 400px
- [ ] Small 320px

### Level 5: PWA / Offline

- [ ] Service Worker cache invalidation works
- [ ] Offline mode still functional
- [ ] localStorage data preserved
- [ ] New files in \`sw.js\` ASSETS?

### Level 6: Cell Skins (v3.9.0+)

- [ ] Works with \`skin-full\`
- [ ] Works with \`skin-strip\`
- [ ] Works with \`skin-quiet\`

### Level 7: Privacy States

- [ ] Works when logged out
- [ ] Works when logged in
- [ ] Works with Privacy Mode ON
- [ ] Works with Privacy Mode OFF

### Level 8: Cross-browser (if UI change)

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if possible)

---

## 🚨 EMERGENCY PROCEDURES

### Broken UTF-8 Detected

**Symptoms:** Console shows \`â€"\`, \`đź"", \`Ĺ‚\` instead of proper characters.

**Fix:**

\`\`\`powershell

# Restore from git

git checkout HEAD -- js/broken-file.js

# If not in git yet, check if backup exists

Test-Path "js/broken-file.js.backup"
\`\`\`

### Site Broken on Prod

\`\`\`powershell

# Immediate rollback (last commit)

git revert HEAD
git push

# Or force rollback (last commit) — ⚠️ dangerous if shared branch

git reset --hard HEAD~1
git push --force
\`\`\`

### Cline Modified Wrong File

\`\`\`powershell

# Restore specific file

git checkout HEAD -- js/wrongly-modified.js

# See what changed

git diff HEAD js/wrongly-modified.js
\`\`\`

### Service Worker Stuck

Owner's fix:

1. Open DevTools → Application → Service Workers
2. Click "Unregister"
3. Hard reload (Ctrl+Shift+R)

### Duplicate Function Declaration

Symptoms: Function behavior wrong, silent overrides.

\`\`\`powershell

# Find duplicates

Select-String -Path "js/\*_/_.js" -Pattern "^function myFunc"
\`\`\`

**Fix:** Delete older declaration, keep newest logic.

### ES Module Syntax Error

Symptoms: Silent \`Uncaught SyntaxError: Unexpected token 'export'\` in console.

**Fix:** Remove all \`import\`/\`export\` statements. Use \`window.MyModule = {...}\` instead.

---

## 📖 COMMON PATTERNS (with real examples)

### Pattern 1: Add New i18n Key

**Files to modify:** 3 (\`pl.js\`, \`en.js\`, \`uk.js\`)

\`\`\`javascript
// pl.js
newKey: 'Polski tekst',

// en.js
newKey: 'English text',

// uk.js
newKey: 'Український текст',
\`\`\`

Then use:

\`\`\`javascript
element.textContent = t('newKey');
element.textContent = t('greeting', { name: 'John' }); // with params
\`\`\`

**HTML usage:**

\`\`\`html
<button data-i18n="newKey">Fallback</button>
<input data-i18n-placeholder="notePlaceholder">
<button data-i18n-title="themeSwitch" title="Switch theme">🌙</button>
\`\`\`

### Pattern 2: Add New CSS Module

**Files to modify:** 3 (create CSS, update index.html, update sw.js)

**Step 1:** Create \`css/new-module.css\` with header:

\`\`\`css
/_ ================================================================
GRAFIK GILLETTE - NEW-MODULE.CSS
Description of purpose
Part of modular CSS split (v3.X.0)
================================================================ _/
\`\`\`

**Step 2:** Add to \`index.html\` in correct cascade position:

\`\`\`html

<link rel="stylesheet" href="css/new-module.css" />
\`\`\`

**Step 3:** Add to \`sw.js\` ASSETS array:

\`\`\`javascript
const ASSETS = [
// ...
'./css/new-module.css',
// ...
];
\`\`\`

### Pattern 3: Add New JS Module (No ES Modules!)

**Files to modify:** 3 (create JS, update index.html, update sw.js)

**Step 1:** Create \`js/new-module.js\`:

\`\`\`javascript
/_ ================================================================
GRAFIK GILLETTE - NEW-MODULE.JS
Description
Part of v3.X.0
================================================================ _/

function myFunction(param) {
// ...
}

// Export to global scope
window.myFunction = myFunction;
\`\`\`

**Step 2:** Add to \`index.html\` (correct load order):

\`\`\`html

<script src="js/new-module.js"></script>

\`\`\`

**Step 3:** Add to \`sw.js\` ASSETS array.

**Step 4:** Use defensively elsewhere:

\`\`\`javascript
if (typeof myFunction === 'function') {
myFunction(data);
}
\`\`\`

### Pattern 4: Add New localStorage Key

**Naming convention:** \`gillette\_<purpose>\_v<N>\`

\`\`\`javascript
const NEW_STORAGE_KEY = 'gillette_newfeature_v1';

// Save
function saveNewFeature(data) {
try {
localStorage.setItem(NEW_STORAGE_KEY, JSON.stringify(data));
if (typeof updateLastModified === 'function') updateLastModified();
} catch (e) {
console.warn('[newfeature]', 'Save failed:', e);
}
}

// Load
function loadNewFeature() {
try {
const raw = localStorage.getItem(NEW_STORAGE_KEY);
return raw ? JSON.parse(raw) : {};
} catch (e) {
console.warn('[newfeature]', 'Load failed:', e);
return {};
}
}
\`\`\`

### Pattern 5: Update Info-Panel Section

Info-panel is rendered in \`js/calendar.js\` (around line 640-840).

**Never modify HTML directly in index.html** — info-panel content is dynamic.

**Locate the render block:**

\`\`\`javascript
panel.innerHTML = \`<h3>...</h3>
\${cardOne}
\${cardTwo}
...\`;
\`\`\`

Add new card:

\`\`\`javascript
const newCard = \`

  <div class="info-card" style="grid-column:1/-1;">
    <div class="label">\${t('newLabel')}</div>
    <div class="value">\${dataHere}</div>
  </div>
\`;
\`\`\`

Insert in template.

### Pattern 6: Add Cell Skin Support

If your feature adds visual elements to \`.day-cell\`, respect all 3 skins:

\`\`\`css
/_ Default (skin-full) _/
.day-cell.my-feature {
background: var(--color-R);
color: #fff;
}

/_ skin-strip: neutral body + color strip _/
body.skin-strip .day-cell.my-feature {
background: var(--bg-cell);
color: var(--text-main);
}
body.skin-strip .day-cell.my-feature::before {
content: '';
position: absolute;
left: 0;
top: 0;
bottom: 0;
width: 4px;
background: var(--color-R);
}

/_ skin-quiet: neutral body + colored border _/
body.skin-quiet .day-cell.my-feature {
background: var(--bg-cell);
color: var(--text-main);
border-color: var(--color-R);
}
\`\`\`

### Pattern 7: Add Timeline Node

Timeline widget in \`js/smart-popup.js\` supports custom nodes.

**Extend \`renderReliefTimeline\`:**

\`\`\`javascript
// New node type
if (info.customField) {
parts.push(tlRenderNode({
type: 'custom',
brig: info.customField,
shift: 'R',
label: 'my-label'
}));
parts.push(tlRenderArrow());
}
\`\`\`

**Add CSS:**

\`\`\`css
.tl-node.tl-custom {
background: linear-gradient(135deg, #color1, #color2);
border: 1px solid #border;
}
\`\`\`

---

## 🎬 EXAMPLE: GOOD vs BAD Cline Task

### ❌ BAD Task (will fail)

\`\`\`markdown

# TASK: Refactor overtime code

Please refactor the overtime handling to be cleaner.
Look at calendar.js and overtime-logic.js and make them better.
Split into smaller functions if needed.
Also update the CSS to look nicer.
\`\`\`

**Problems:**

- No specific files listed
- Vague goals ("cleaner", "nicer")
- No LOCATE blocks
- Multi-file scope creep
- Encourages guessing

### ✅ GOOD Task (will succeed)

\`\`\`markdown

# TASK 1/2: Extract categorizeOvertime call into helper

**PROJECT:** Grafik Gillette (workspace path)

**GOAL:** Move duplicated overtime categorization logic from calendar.js into a helper function in overtime-logic.js.

**FILES TO MODIFY (exactly 1 file):**

1. \`js/calendar.js\` — replace 3 duplicated calls with helper

**ESTIMATED CHANGES:**

- Lines added: ~5
- Lines removed: ~30

---

## ⚠️ CRITICAL RULES

[standard rules from AGENT.md]

## 📦 STEP 1: Locate and REPLACE first duplication

**FILE:** \`js/calendar.js\`
**ACTION:** REPLACE

**LOCATE this exact block (lines 183-190):**

\\\`\\\`\\\`javascript
const cat = categorizeOvertime(
currentYear,
currentMonth,
d,
shift,
'przed',
otToday.przed.hours
);
\\\`\\\`\\\`

**REPLACE with:**

\\\`\\\`\\\`javascript
const cat = getOvertimeCategoryForDay(d, shift, 'przed', otToday.przed.hours);
\\\`\\\`\\\`

[Steps 2 and 3 for other duplications...]

## ✅ VERIFICATION CHECKLIST

[standard checklist]
\`\`\`

**Why it works:**

- ✅ Explicit file
- ✅ Explicit lines
- ✅ Full LOCATE block
- ✅ Full REPLACE block
- ✅ Small scope (1-3 STEPS)

---

## 🌐 LANGUAGE-SPECIFIC NOTES

### Polish Language (Primary UI)

- Use proper diacritics: **ą, ć, ę, ł, ń, ó, ś, ź, ż**
- Never romanize (\`łańcuch\`, NOT \`lancuch\`)
- Common patterns:
  - "Zmiana" (shift) — not "Zmiany" (multiple)
  - "Dziś" (today) — not "Dzisiaj" (formal)
  - "Nadgodziny" (overtime)
  - "Urlop" (vacation)
- Genitive months for dates:
  - \`monthNames\` — nominative ("Sierpień")
  - \`monthNamesGenitive\` — genitive ("15 sierpnia")

### Ukrainian Language (Owner)

- Use for chat responses to owner
- NOT for code comments or i18n content (unless UK translation)
- Preserve Cyrillic characters

### English Language

- Use for code comments (if not Polish)
- Function names, variable names
- Console logs (with \`[module]\` prefix)
- Commit messages

---

## 🎯 QUICK REFERENCE

### Owner's Workflow

1. AI (Claude) plans the task
2. AI writes Cline command
3. Owner runs in VS Code (Cline extension)
4. Cline executes (2-5 min)
5. Owner verifies with commands
6. Owner commits locally (not push yet)
7. Continue to next task
8. After phase complete → single push
9. Prod test after ~1-2 min deploy

### Deployment

- **Automatic** on push to \`main\` branch
- GitHub Actions workflow: \`.github/workflows/deploy.yml\`
- Cache invalidation via \`**BUILD_ID**\` in sw.js
- Prod URL: https://servitantgit.github.io/Graffik/

### File Naming Conventions

- **JS files:** kebab-case (\`smart-popup.js\`, \`sync-tracking.js\`)
- **CSS files:** kebab-case (\`smart-popup.css\`, \`overtime.css\`)
- **Constants:** UPPER_SNAKE_CASE (\`STORAGE_KEY\`, \`ADMIN_EMAILS\`)
- **Functions:** camelCase (\`renderCalendar\`, \`getShiftAt\`)
- **CSS classes:** kebab-case (\`.day-cell\`, \`.timeline-widget\`)
- **i18n keys:** camelCase (\`infoPrevShift\`, \`todayLabel\`)
- **Mockup files:** \`mockup-\*.html\` (kept in git, not deployed)

### Common File Locations

| Feature              | File                                       |
| -------------------- | ------------------------------------------ |
| Business logic       | \`js/core.js\`                             |
| Overtime calculation | \`js/overtime-logic.js\`                   |
| Month view rendering | \`js/calendar.js\`                         |
| Info-panel content   | \`js/calendar.js\` (line ~640-840)         |
| Dashboard rendering  | \`js/dashboard.js\`                        |
| Google Drive sync    | \`js/sync.js\`                             |
| Cell skins           | \`js/personalization.js\` + \`css/\*.css\` |
| Timeline widget      | \`js/smart-popup.js\`                      |
| Admin identification | \`js/admin.js\`                            |
| i18n translations    | \`js/i18n/pl.js\` (primary)                |
| Modal system         | \`js/ui.js\` (showModal, showToast)        |

---

## 🔐 SECURITY & PRIVACY

### Never Log

- Google Drive tokens
- User emails (in production console)
- Personal data content

### Console Logs Policy

\`\`\`javascript
// ✅ OK to log
console.log('[sync]', 'Upload started');
console.log('[calendar]', 'Rendering month', month);

// ❌ NOT OK
console.log('User:', userEmail); // PII
console.log('Token:', driveToken); // Secret
console.log('Vacations:', urlopsData); // Personal
\`\`\`

### GitHub Repository

Repository is **public**. Ensure:

- No emails in code (beyond documented \`ADMIN_EMAILS\`)
- No tokens in code
- No personal data in commits
- No real employee names
- No corporate document references

---

## 📞 CONTACT & OWNERSHIP

**Owner:**

- GitHub: \`servitantgit\`
- Language: Ukrainian (chat), Polish (UI dev)
- Timezone: CEST (Poland)

**AI Agent Behavior:**

- Direct, honest advice (no flattery)
- Explain WHY, not just WHAT
- Warn about tradeoffs
- Show alternatives when appropriate
- Ukrainian responses to owner
- English for code artifacts
- Polish for i18n content

---

## 🎓 LEARNING FROM MISTAKES

If a task fails or introduces bugs:

1. **Rollback immediately** (don't try to "fix forward")
2. **Analyze root cause** — was it:
   - Vague instructions?
   - Missing verification?
   - Wrong file scope?
   - Encoding issue?
   - ES module syntax?
   - Duplicate declarations?
3. **Update this AGENT.md** — add new gotcha or anti-pattern
4. **Retry with better plan** — smaller scope, more explicit

**The goal:** Every mistake becomes a documented rule for the next AI.

---

## ✅ AGENT CHECKLIST (before submitting task)

Before returning your response to user, verify:

- [ ] Read AGENT.md fully
- [ ] Identified complexity (Green/Yellow/Red)
- [ ] Listed only files that will be modified
- [ ] Provided exact LOCATE blocks (not paraphrased)
- [ ] Provided full REPLACE blocks (not \`...\`)
- [ ] Used literal UTF-8 characters
- [ ] No ES module syntax
- [ ] No commands to execute (user does verification)
- [ ] Included VERIFICATION CHECKLIST
- [ ] Suggested COMMIT MESSAGE
- [ ] Provided ROLLBACK plan
- [ ] Listed DOCUMENTATION UPDATES needed
- [ ] Warned about RISKS
- [ ] Considered ALL 3 cell skins (if visual change)
- [ ] Considered PRIVACY states (logged in/out)

If Red complexity → Split into multiple tasks BEFORE responding.

---

## 📊 VERSION HISTORY OF AGENT.md

- **v2.0** (2026-08-22) — Updated with actual project state:
  - 10 CSS modules (added smart-popup.css)
  - Timeline widget documented
  - Cell skin system (skin-full/strip/quiet)
  - Personalization module
  - New gotchas: ES module syntax, duplicate declarations
  - Actual script load order from index.html
  - Mockup files convention
  - Testing checklist for cell skins + privacy states

- **v1.0** (2026-08-19) — Initial version. Based on experience v3.6.0 → v3.9.0.

---

# 🎯 END OF AGENT.md

**Remember:** You are helping a real person build a real app used by real coworkers.
Precision > Speed. Safety > Cleverness. Ask > Guess.

**Good luck, agent! 🤖**
