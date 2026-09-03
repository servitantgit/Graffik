# 🤖 AGENT.md — Guidelines for AI Agents

> **Цей документ призначений для AI агентів** (Cline, Kilo Code, Cursor, Continue, Aider, тощо), які працюють з проектом Grafik Gillette.

**READ FIRST. Read fully. Then act.**

---

## 📌 PROJECT IDENTIFICATION

| Property                  | Value                                                  |
| ------------------------- | ------------------------------------------------------ |
| **Name**                  | Grafik Gillette                                        |
| **Type**                  | Progressive Web App (PWA)                              |
| **Purpose**               | Shift schedule management for 4 brigades (P&G factory) |
| **Live URL**              | https://servitantgit.github.io/Graffik/                |
| **Repository**            | https://github.com/servitantgit/Graffik                |
| **Deployment**            | GitHub Pages via GitHub Actions                        |
| **Owner**                 | Solo developer + ~5-10 colleagues (potential 20-40)    |
| **Primary language (UI)** | Polish (with EN, UK translations)                      |
| **Owner language (chat)** | Ukrainian                                              |
| **Current version**       | v3.9.0 (in progress)                                   |

---

## 🛠 TECHNICAL STACK

**Core:**

- **Vanilla JavaScript** (ES2020+) — NO frameworks
- **HTML5 + CSS3** — Custom Properties, Flexbox, Grid
- **NO build system** — direct browser execution
- **NO npm/node dependencies** at runtime
- **NO TypeScript** — plain JS with JSDoc when useful

**Features:**

- **PWA** — Service Worker + Web App Manifest
- **Google Drive API** — OAuth 2.0 for user sync + admin identification
- **i18n** — 3 languages (pl/en/uk), ~350 keys each

**CI/CD:**

- **GitHub Actions** — auto-deploy on push to main
- **Cache busting** — dynamic `__BUILD_ID__` replaced with git hash

---

## 🏗 ARCHITECTURE PRINCIPLES

### 1. **NO ES Modules**

All code uses `<script>` tags with global scope via `window.*`. This is intentional.

**❌ WRONG:**

```javascript
import { doStuff } from './module.js';
export function myFunc() {}
```

**✅ CORRECT:**

```javascript
// In myFile.js
function myFunc() {
  /* ... */
}
window.myFunc = myFunc;

// In another file
if (typeof myFunc === 'function') myFunc();
```

### 2. **Registry Pattern for Multi-Schedule Support**

```javascript
scheduleRegistry.gillette = { data, hours, metadata };
// Backward-compat aliases:
factorySchedule[year][month][brigade];
factoryMonthHours[year][month][brigade];
```

### 3. **Privacy-by-Design**

- Personal data (edits, vacations, notes, OT) — **localStorage ONLY**
- Public data (factory schedule) — in git (js/schedules/gillette/)
- **NEVER commit personal data** to repo
- Login state = privacy control (`shouldShowPersonalData()`)

### 4. **Modular CSS (v3.8.0+)**

9 CSS files loaded in specific order (cascade matters):

```
variables.css → layout.css → components.css → calendar.css
→ overtime.css → views.css → dashboard.css → smart-popup.css
→ responsive.css → print.css
```

### 5. **Defensive Cross-Module Calls**

```javascript
if (typeof someFunction === 'function') {
  someFunction();
}
```

---

## 📁 FILE STRUCTURE (CANONICAL)

```
Graffik/
├── index.html                    ← Main entry (~370 lines)
├── manifest.json                 ← PWA manifest
├── sw.js                         ← Service Worker with __BUILD_ID__
├── .nojekyll                     ← ⚠️ CRITICAL: GitHub Pages Jekyll disable
├── AGENT.md                      ← THIS FILE
├── HANDOFF.md                    ← Chat session context (owner keeps LOCAL only)
├── CHANGELOG.md                  ← Version history
├── README.md                     ← User-facing docs
├── PROJECT_DOCS.md               ← Extended documentation
│
├── css/                          ← Modular CSS (9 files)
│   ├── variables.css             ← :root, themes (~85 lines)
│   ├── layout.css                ← top-bar, menu (~420 lines)
│   ├── components.css            ← modals, buttons (~900 lines)
│   ├── calendar.css              ← calendar grid (~584 lines)
│   ├── overtime.css              ← OT visuals (~645 lines)
│   ├── views.css                 ← week/year/table (~409 lines)
│   ├── dashboard.css             ← dashboard (~312 lines)
│   ├── smart-popup.css           ← timeline widget (v3.9.0)
│   ├── responsive.css            ← @media (max-width) (~399 lines)
│   └── print.css                 ← @media print (~193 lines)
│
├── js/
│   ├── schedules/                ← 🌍 PUBLIC data
│   │   ├── _core.js              ← constants (~180 lines)
│   │   ├── _registry.js          ← registry (~100 lines)
│   │   └── gillette/
│   │       ├── metadata.js       ← schedule definition
│   │       └── 2026.js           ← year data
│   │
│   ├── personal/                 ← 🔒 PRIVATE (localStorage only)
│   │   └── sync-tracking.js      ← unsynced detection (~90 lines)
│   │
│   ├── i18n/
│   │   ├── pl.js                 ← Polish (~350 keys)
│   │   ├── en.js                 ← English
│   │   ├── uk.js                 ← Ukrainian
│   │   └── i18n.js               ← logic + renderFAQ
│   │
│   ├── admin.js                  ← ADMIN_EMAILS check (~65 lines)
│   ├── overtime-logic.js         ← categorizeOvertime()
│   ├── core.js                   ← business logic + save hooks
│   ├── ui.js                     ← modals, toasts
│   ├── edit.js                   ← edit mode, undo/redo
│   ├── dashboard.js              ← Dashboard view
│   ├── calendar.js               ← Month view (~840 lines)
│   ├── views.js                  ← Week/Year/Table views
│   ├── actions.js                ← export/import/share/admin (~1100 lines)
│   ├── pwa.js                    ← Service Worker registration
│   ├── sync.js                   ← Google Drive + logout warning (~450 lines)
│   ├── smart-popup.js            ← timeline renderer (v3.9.0)
│   └── main.js                   ← state + init (~600 lines)
│
├── icons/                        ← PWA icons
├── screenshots/                  ← PWA screenshots
├── tools/                        ← Dev tools (not deployed)
│
└── .github/workflows/
    └── deploy.yml                ← CI/CD pipeline
```

**Load order in index.html:** CSS in `<head>`, JS at bottom of `<body>` — see actual file for exact sequence.

---

## 📊 DATA MODELS (localStorage keys)

```javascript
'gillette_prefs_v1'; // theme, lang, year, brigade
'gillette_custom_schedule_v2'; // user edits (array per day)
'gillette_urlops_v1'; // vacations per brigade
'gillette_notes_v1'; // notes per day
'gillette_overtimes_v1'; // flat key otKey()
'grafik_drive_token'; // Google OAuth token
'grafik_drive_user_email'; // logged-in user email
'gillette_sync_meta'; // {lastModified, lastSync}
```

**Brigades:** `A`, `B`, `C`, `D`  
**Shifts:** `R` (6-14), `P` (14-22), `N` (22-6), `''` (wolne/off)  
**Special:** `U` (urlop/vacation), `W` (wolne/weekend), `S` (dodatkowa/extra shift)

---

## 🚨 CRITICAL RULES (ALWAYS FOLLOW)

### RULE 1: CHARACTER PRESERVATION

**Use LITERAL characters, never hex/unicode escapes.**

**✅ CORRECT:**

```javascript
const label = '📅 Dziś';
const arrow = '→';
const emoji = '🌅';
```

**❌ WRONG (breaks source, causes encoding issues):**

```javascript
const label = '\ud83d\udcc5 Dzi\u015b';
const arrow = '\u2192';
const emoji = '\ud83c\udf05';
```

**Why:** These are JS source strings, not HTML content. No parser converts them. Literals preserve readability and prevent double-encoding.

### RULE 2: UTF-8 SAFETY

**When writing files with PowerShell, NEVER use `Get-Content | Set-Content`** — it corrupts UTF-8.

**✅ CORRECT:**

```powershell
[System.IO.File]::WriteAllText(
  (Resolve-Path "file.js").Path,
  $content,
  [System.Text.UTF8Encoding]::new($false)
)
```

**❌ WRONG:**

```powershell
Get-Content file.js | Set-Content file.js  # corrupts Polish chars
```

**Polish chars to preserve:** ą, ć, ę, ł, ń, ó, ś, ź, ż  
**Ukrainian chars:** а-я, і, ї, є, ґ

### RULE 3: NO ES MODULES

Use global scope via `window.*` (see Architecture #1).

### RULE 4: i18n IN 3 LANGUAGES

**Any user-facing string must be added to all 3 files:**

- `js/i18n/pl.js` (primary)
- `js/i18n/en.js`
- `js/i18n/uk.js`

**Missing translations break the UI.**

### RULE 5: NO PERSONAL DATA IN GIT

**NEVER commit:**

- Real employee names
- Personal edits (from localStorage)
- Vacation dates
- OT records
- Actual work notes
- Google Drive tokens
- Real user emails (beyond documented admin)

### RULE 6: CONSOLE LOG PREFIX

```javascript
console.log('[calendar]', 'Rendering month', month);
console.warn('[sync]', 'Drive token expired');
console.error('[actions]', 'Export failed', err);
```

Prefix helps filter logs during debugging.

### RULE 7: DEFENSIVE CROSS-MODULE CALLS

Always check function existence before calling:

```javascript
if (typeof updateLastModified === 'function') {
  updateLastModified();
}
```

### RULE 8: COMMENTS IN ENGLISH OR POLISH

Not Ukrainian in code (owner's convention).

### RULE 9: PRESERVE .nojekyll

Never delete `.nojekyll` (even if empty). It's required for GitHub Pages to serve files starting with `_` (like `js/schedules/_core.js`).

---

## 🐛 KNOWN GOTCHAS (Real problems, real fixes)

### GOTCHA 1: PowerShell $matches

`$matches` is an autovariable (regex). **NEVER use as regular variable name** — it conflicts.

**❌ WRONG:**

```powershell
$matches = @()  # BREAKS regex operations
```

### GOTCHA 2: PowerShell console encoding

Emoji in `Write-Host` get corrupted in console output. Use ASCII markers instead.

**✅ USE:** `[OK]`, `[WARN]`, `[ERROR]`  
**❌ AVOID:** `✅`, `⚠️`, `❌` in Write-Host

### GOTCHA 3: Combined CSS Selectors

AI has difficulty processing DELETE operations on combined selectors:

```css
.a, .b, .c { ... }  /* Hard to safely delete just .b */
```

**When refactoring:** split into separate rules first, then delete.

### GOTCHA 4: Duplicate Declarations

When refactoring, always check for duplicates:

```powershell
Select-String -Path "js/**/*.js" -Pattern "^const X"
Select-String -Path "js/**/*.js" -Pattern "^function X"
```

### GOTCHA 5: Cline Auto-Push

Cline may auto-push after commit. Monitor and configure to prevent unintended pushes.

### GOTCHA 6: Large Files (3000+ lines)

Cline reads in chunks, wastes tokens. **Solution used:** CSS split (v3.8.0) — no single file > 1000 lines.

### GOTCHA 7: Broken UTF-8 Detection

Check for corrupted encoding:

```powershell
Select-String -Path "js/*.js" -Pattern "â€|â¬|đź|Ĺ‚|Ń"
```

If matches found → encoding is broken, needs restoration.

### GOTCHA 8: Service Worker Cache

After deploy, users may see old version. Hard reload (Ctrl+Shift+R) or wait for SW auto-update (v3.6.0+ handles this).

### GOTCHA 9: Multi-file Refactor Conflicts

When touching multiple files, do them in separate commits for easy rollback.

---

## ❌ ANTI-PATTERNS (NEVER DO THIS)

### ANTI-PATTERN 1: "Figure it out" instructions

**❌ BAD Cline task:**

```
"Find the entire section and remove it"
"Paste CSS above"
"Refactor as you see fit"
```

**✅ GOOD Cline task:**

```
"LOCATE this exact block: [full code]"
"REPLACE with: [full new code]"
```

### ANTI-PATTERN 2: Vague DELETE operations

**❌ BAD:**

```
"Remove the relief-popup CSS section (may span 20-30 lines)"
```

**✅ GOOD:**

```
"LOCATE lines X-Y containing exactly these selectors: [list]"
"ACTION: DELETE"
```

### ANTI-PATTERN 3: Running commands via AI

**❌ BAD (in Cline task):**

```
"Run: git add . && git commit -m 'refactor'"
"Run: Select-String -Pattern..."
```

**✅ GOOD:**

```
"DO NOT run commands. USER will verify manually."
```

### ANTI-PATTERN 4: Combined refactors (6+ steps)

**❌ BAD:** One task with 8 STEPS across 5 files.  
**✅ GOOD:** Split into 3-4 separate tasks, each with 1-3 STEPS.

### ANTI-PATTERN 5: Modifying files outside scope

**❌ BAD:** Task says "modify calendar.js" but AI also touches ui.js "to be safe".  
**✅ GOOD:** Modify ONLY listed files. If related files need changes, STOP and ask.

### ANTI-PATTERN 6: Assuming without verification

**❌ BAD:** "The function is probably in main.js somewhere..."  
**✅ GOOD:** Verify with `Select-String` output before proposing changes.

### ANTI-PATTERN 7: Deleting `.nojekyll`

It's empty by design. Never delete.

### ANTI-PATTERN 8: Adding npm dependencies

This project has NO build system. Adding npm packages breaks the deployment model.

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

**🔴 Red → Split into multiple tasks. Do NOT run as single task.**

---

## 🔄 TASK WORKFLOW (STANDARD PROCESS)

### Phase 1: RECEIVE TASK

When user provides a task, first:

1. **READ this AGENT.md fully** (if not already loaded)
2. **Identify complexity** (Green/Yellow/Red)
3. **List files to modify** (be explicit)
4. **Ask if ambiguous** — never guess

### Phase 2: DISCOVERY (before writing code)

**Always run search commands first (mentally, not as actions if you're Cline):**

```powershell
# Find relevant file(s)
Select-String -Path "js/*.js" -Pattern "functionName"

# Verify current state
Get-Content "js/target.js" | Select-Object -Skip N -First M

# Check for duplicates
Select-String -Path "js/**/*.js" -Pattern "^function myNewFunc"
```

**Request user to run these if you can't execute commands.**

### Phase 3: PLAN

Before writing:

- What file(s) exactly?
- What lines exactly (with LOCATE block)?
- What replacement (with full new code)?
- What verification (manual, not commands)?
- Rollback strategy?

### Phase 4: EXECUTE

Follow the template (see COMMAND TEMPLATE below).

### Phase 5: RESPONSE

Structured response — see RESPONSE FORMAT below.

---

## 📝 COMMAND TEMPLATE (for tasks user gives to Cline)

Every Cline task should follow this structure:

````markdown
# TASK [ID]: [ONE-LINE GOAL]

**PROJECT:** Grafik Gillette (PWA at C:\Users\tantsiura.s\OneDrive - Procter and Gamble\Documents\AI HTML\Graffik)

**GOAL:** [1-2 sentence description]

**FILES TO MODIFY (exactly N files):**

1. `path/to/file1` — [what changes]
2. `path/to/file2` — [what changes]

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

---

## 📦 STEP N: [Descriptive title]

**FILE:** `exact/path/to/file.js`
**ACTION:** REPLACE | INSERT AFTER | INSERT BEFORE | CREATE | DELETE

**LOCATE this exact block:**

\```javascript
[EXACT source code — copy-paste from actual file]
\```

**REPLACE with:**

\```javascript
[EXACT new code — full content, no placeholders]
\```

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

## 📝 COMMIT MESSAGE (for USER later — AI does NOT commit)

\```
type(scope): brief message

Detailed body.
\```

## 🆘 IF SOMETHING GOES WRONG

**Rollback:**
\```powershell
git checkout HEAD -- path/to/file.js
\```
````

---

## 📤 RESPONSE FORMAT (What AI must return after task)

### Response Structure:

Every task completion must include these sections:

````markdown
## ✅ Task Completed

### 📁 Files Modified

- `path/to/file1.js` — [brief description]
- `path/to/file2.css` — [brief description]

### 📊 Statistics

- Lines added: N
- Lines removed: N
- Files created: N
- Files deleted: N

### 🔍 Verification Steps for USER

Run these commands to verify:
\```powershell

# 1. Check file exists (if created)

Test-Path "path/to/newfile.js"

# 2. Check function/class present

Select-String -Path "path/to/file.js" -Pattern "myNewFunction"

# 3. Check no encoding issues

Select-String -Path "path/to/file.js" -Pattern "\\x|\\u00"

# Expected: EMPTY output

# 4. Check UTF-8 not broken

Select-String -Path "path/to/file.js" -Pattern "â€|â¬|đź"

# Expected: EMPTY output

\```

### 🧪 Testing Instructions

**Local:**

1. Hard reload browser (Ctrl+Shift+R)
2. Open F12 Console — check for errors
3. Open F12 Network — verify new files load (200 OK)

**Feature-specific:**

- [ ] [Specific test 1]
- [ ] [Specific test 2]

**Mobile:**

- [ ] Test on real device via `python -m http.server 8000`
- [ ] Verify responsive at 480px, 380px

### 📝 Documentation Updates Needed

**REQUIRED before commit:**

- [ ] **CHANGELOG.md** — add entry under `[Unreleased]` or new version
- [ ] **i18n keys** — added to all 3 files (pl/en/uk)? (if applicable)

**RECOMMENDED:**

- [ ] **README.md** — update if user-facing feature
- [ ] **PROJECT_DOCS.md** — update if architecture changed
- [ ] **AGENT.md** — update if new pattern or gotcha discovered

### 💾 Suggested Commit Message

\```
type(scope): brief description

- Detail 1
- Detail 2

Related to #issue or v3.X.0
\```

**Commit types:** `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `perf`

### 🆘 Rollback Plan

If issues arise:
\```powershell
git checkout HEAD -- path/to/file

# OR

git reset --hard HEAD~1
git push --force # ⚠️ Only if not pushed to shared branch
\```

### ⚠️ Known Risks / Warnings

- [Any concerns AI has about the change]
- [Edge cases user should test]
- [Performance implications]

### 🎯 Next Steps (Optional Suggestions)

- [What could be done next]
- [Related improvements]
````

---

## 📚 DOCUMENTATION UPDATE RULES

### When to Update CHANGELOG.md

**ALWAYS update for:**

- ✅ New features (`feat`)
- ✅ Bug fixes (`fix`)
- ✅ Breaking changes
- ✅ Performance improvements (`perf`)
- ✅ Refactoring visible to users (`refactor`)

**Format:**

```markdown
## [3.9.0] - 2026-08-19

### Added

- Timeline widget for relief handoff visualization (smart-popup.js)
- CSS module smart-popup.css with shift colors

### Changed

- Info-panel now uses Timeline widget instead of classic prev/next badges
- Compact size optimized for mobile screens

### Fixed

- (bug fixes here)

### Removed

- (deleted features here)

### Technical

- New global function: window.renderReliefTimeline()
- Fallback to classic display if smart-popup.js fails
```

**Categories (in order):**

- `Added` — new features
- `Changed` — modifications to existing features
- `Deprecated` — soon-to-be-removed
- `Removed` — deleted features
- `Fixed` — bug fixes
- `Security` — vulnerability fixes
- `Technical` — internal changes not user-visible

### When to Update README.md

**Update if:**

- User-facing feature added
- Installation/setup steps changed
- Screenshots need updating
- New keyboard shortcuts
- New browser requirements

**Don't update for:**

- Internal refactoring
- Bug fixes (unless workaround needed)
- Code style changes

### When to Update PROJECT_DOCS.md

**Update if:**

- Architecture changed (new pattern, new module)
- New file structure conventions
- New localStorage keys
- New API integrations
- Data model changes

### When to Update AGENT.md (THIS FILE)

**Update if:**

- New anti-pattern discovered (from failed AI task)
- New gotcha found
- New coding convention adopted
- New file/folder in canonical structure
- New rule needed to prevent recurring issue

**Location for updates:**

- New gotcha → `KNOWN GOTCHAS` section
- New anti-pattern → `ANTI-PATTERNS` section
- New rule → `CRITICAL RULES` section

### When to Update HANDOFF.md

**HANDOFF.md is LOCAL ONLY** — owner keeps it on desktop, not in git.

Update at end of every work session to preserve chat context for next AI conversation.

### When to Bump Version

Follow **Semantic Versioning** (SemVer):

- **MAJOR (X.0.0)** — breaking changes, data model changes, incompatible refactor
- **MINOR (X.Y.0)** — new features, backward-compatible
- **PATCH (X.Y.Z)** — bug fixes, small improvements

**Where to update version:**

- `CHANGELOG.md` — new entry heading
- `manifest.json` — `"version": "X.Y.Z"` (if exists)
- Commit message often references version

---

## 🧪 TESTING CHECKLIST (before commit)

### Level 1: Syntax

```powershell
# No syntax errors (Node.js quick check if available)
# Or open in browser and check Console for errors
```

### Level 2: File Integrity

```powershell
# UTF-8 preserved
Select-String -Path "path/file.js" -Pattern "â€|â¬|đź|Ĺ‚"
# Expected: EMPTY

# No hex escapes
Select-String -Path "path/file.js" -Pattern "\\x[0-9a-f]|\\u00"
# Expected: EMPTY
```

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

### Level 6: Cross-browser (if UI change)

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if possible)

---

## 🚨 EMERGENCY PROCEDURES

### Broken UTF-8 Detected

**Symptoms:** Console shows `â€"`, `đź"", `Ĺ‚` instead of proper characters.

**Fix:**

```powershell
# Restore from git
git checkout HEAD -- js/broken-file.js

# If not in git yet, check if backup exists
Test-Path "js/broken-file.js.backup"
```

### Site Broken on Prod

```powershell
# Immediate rollback (last commit)
git revert HEAD
git push

# Or force rollback (last commit)
git reset --hard HEAD~1
git push --force  # ⚠️ Dangerous if others cloned
```

### Cline Modified Wrong File

```powershell
# Restore specific file
git checkout HEAD -- js/wrongly-modified.js

# See what changed
git diff HEAD js/wrongly-modified.js
```

### Service Worker Stuck

Owner's fix:

1. Open DevTools → Application → Service Workers
2. Click "Unregister"
3. Hard reload (Ctrl+Shift+R)

---

## 📖 COMMON PATTERNS (with real examples)

### Pattern 1: Add New i18n Key

**Files to modify:** 3 (`pl.js`, `en.js`, `uk.js`)

```javascript
// pl.js
newKey: 'Polski tekst',

// en.js
newKey: 'English text',

// uk.js
newKey: 'Український текст',
```

Then use:

```javascript
element.textContent = t('newKey');
```

### Pattern 2: Add New CSS Module

**Files to modify:** 2 (create CSS, update index.html)

**Step 1:** Create `css/new-module.css` with header:

```css
/* ================================================================
   GRAFIK GILLETTE - NEW-MODULE.CSS
   Description of purpose
   Part of modular CSS split (v3.X.0)
   ================================================================ */
```

**Step 2:** Add to `index.html` in correct cascade position:

```html
<link rel="stylesheet" href="css/new-module.css" />
```

### Pattern 3: Add New JS Module (No ES Modules!)

**Step 1:** Create `js/new-module.js`:

```javascript
/* ================================================================
   GRAFIK GILLETTE - NEW-MODULE.JS
   Description
   Part of v3.X.0
   ================================================================ */

function myFunction(param) {
  // ...
}

// Export to global scope
window.myFunction = myFunction;
```

**Step 2:** Add to `index.html`:

```html
<script src="js/new-module.js"></script>
```

**Step 3:** Use defensively elsewhere:

```javascript
if (typeof myFunction === 'function') {
  myFunction(data);
}
```

### Pattern 4: Add New localStorage Key

**Naming convention:** `gillette_<purpose>_v<N>`

```javascript
const NEW_STORAGE_KEY = 'gillette_newfeature_v1';

// Save
localStorage.setItem(NEW_STORAGE_KEY, JSON.stringify(data));
if (typeof updateLastModified === 'function') updateLastModified();

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
```

### Pattern 5: Update Info-Panel Section

Info-panel is rendered in `js/calendar.js` (around line 640-840).

**Never modify HTML directly in index.html** — info-panel content is dynamic.

**Locate the render block:**

```javascript
panel.innerHTML = `<h3>...</h3>
  ${cardOne}
  ${cardTwo}
  ...`;
```

Add new card:

```javascript
const newCard = `
  <div class="info-card" style="grid-column:1/-1;">
    <div class="label">${t('newLabel')}</div>
    <div class="value">${dataHere}</div>
  </div>
`;
```

Insert in template.

---

## 🎬 EXAMPLE: GOOD vs BAD Cline Task

### ❌ BAD Task (will fail)

```markdown
# TASK: Refactor overtime code

Please refactor the overtime handling to be cleaner.
Look at calendar.js and overtime-logic.js and make them better.
Split into smaller functions if needed.
Also update the CSS to look nicer.
```

**Problems:**

- No specific files listed
- Vague goals ("cleaner", "nicer")
- No LOCATE blocks
- Multi-file scope creep
- Encourages guessing

### ✅ GOOD Task (will succeed)

````markdown
# TASK 1/2: Extract categorizeOvertime call into helper

**PROJECT:** Grafik Gillette (workspace path)

**GOAL:** Move duplicated overtime categorization logic from calendar.js into a helper function in overtime-logic.js.

**FILES TO MODIFY (exactly 1 file):**

1. `js/calendar.js` — replace 3 duplicated calls with helper

**ESTIMATED CHANGES:**

- Lines added: ~5
- Lines removed: ~30

---

## ⚠️ CRITICAL RULES

[standard rules from AGENT.md]

## 📦 STEP 1: Locate and REPLACE first duplication

**FILE:** `js/calendar.js`
**ACTION:** REPLACE

**LOCATE this exact block (lines 183-190):**

\```javascript
const cat = categorizeOvertime(
currentYear,
currentMonth,
d,
shift,
'przed',
otToday.przed.hours
);
\```

**REPLACE with:**

\```javascript
const cat = getOvertimeCategoryForDay(d, shift, 'przed', otToday.przed.hours);
\```

[Steps 2 and 3 for other duplications...]

## ✅ VERIFICATION CHECKLIST

[standard checklist]
````

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
- Never romanize (`łańcuch`, NOT `lancuch`)
- Common patterns:
  - "Zmiana" (shift) — not "Zmiany" (multiple)
  - "Dziś" (today) — not "Dzisiaj" (formal)
  - "Nadgodziny" (overtime)
  - "Urlop" (vacation)

### Ukrainian Language (Owner)

- Use for chat responses to owner
- NOT for code comments or i18n content (unless UK translation)
- Preserve Cyrillic characters

### English Language

- Use for code comments (if not Polish)
- Function names, variable names
- Console logs (with `[module]` prefix)
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

- **Automatic** on push to `main` branch
- GitHub Actions workflow: `.github/workflows/deploy.yml`
- Cache invalidation via `__BUILD_ID__` in sw.js
- Prod URL: https://servitantgit.github.io/Graffik/

### File Naming Conventions

- **JS files:** kebab-case (`smart-popup.js`, `sync-tracking.js`)
- **CSS files:** kebab-case (`smart-popup.css`, `overtime.css`)
- **Constants:** UPPER_SNAKE_CASE (`STORAGE_KEY`, `ADMIN_EMAILS`)
- **Functions:** camelCase (`renderCalendar`, `getShiftAt`)
- **CSS classes:** kebab-case (`.day-cell`, `.timeline-widget`)
- **i18n keys:** camelCase (`infoPrevShift`, `todayLabel`)

---

## 🔐 SECURITY & PRIVACY

### Never Log

- Google Drive tokens
- User emails (in production console)
- Personal data content

### Console Logs Policy

```javascript
// ✅ OK to log
console.log('[sync]', 'Upload started');
console.log('[calendar]', 'Rendering month', month);

// ❌ NOT OK
console.log('User:', userEmail); // PII
console.log('Token:', driveToken); // Secret
console.log('Vacations:', urlopsData); // Personal
```

### GitHub Repository

Repository is **public**. Ensure:

- No emails in code (beyond documented `ADMIN_EMAILS`)
- No tokens in code
- No personal data in commits
- No real employee names

---

## 📞 CONTACT & OWNERSHIP

**Owner:**

- GitHub: `servitantgit`
- Language: Ukrainian (chat), Polish (UI dev)
- Timezone: CEST (Poland)

**AI Agent Behavior:**

- Direct, honest advice (no flattery)
- Explain WHY, not just WHAT
- Warn about tradeoffs
- Show alternatives when appropriate
- Ukrainian responses to owner
- English for code artifacts

---

## 🎓 LEARNING FROM MISTAKES

If a task fails or introduces bugs:

1. **Rollback immediately** (don't try to "fix forward")
2. **Analyze root cause** — was it:
   - Vague instructions?
   - Missing verification?
   - Wrong file scope?
   - Encoding issue?
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
- [ ] Provided full REPLACE blocks (not `...`)
- [ ] Used literal UTF-8 characters
- [ ] No commands to execute (user does verification)
- [ ] Included VERIFICATION CHECKLIST
- [ ] Suggested COMMIT MESSAGE
- [ ] Provided ROLLBACK plan
- [ ] Listed DOCUMENTATION UPDATES needed
- [ ] Warned about RISKS

If Red complexity → Split into multiple tasks BEFORE responding.

---

## 📊 VERSION HISTORY OF AGENT.md

- **v1.0** (2026-08-19) — Initial version. Based on real experience from v3.6.0 → v3.9.0 development.

---

# 🎯 END OF AGENT.md

**Remember:** You are helping a real person build a real app used by real coworkers.  
Precision > Speed. Safety > Cleverness. Ask > Guess.

**Good luck, agent! 🤖**
