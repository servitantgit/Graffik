# Unit Tests

Zero-dependency unit tests using Node.js built-in `node:test`.

**Requirements:**
- Node 18+ (any version; the runner script expands the file list itself)
- Node 22 is used in CI

## Run all tests

```bash
# Recommended — works on every Node 18+ and on Windows
node tests/run.js
```

## Why not the glob or directory form

```bash
node --test "tests/*.test.js"   # Node 21+ ONLY
node --test tests/              # fails on Windows with Node 22+
```

- The **quoted glob** is expanded by Node itself, and that support landed in
  Node 21. On Node 18/20 it fails with `Could not find 'tests/*.test.js'`
  and no tests run at all.
- The **directory form** fails on Windows with
  `MODULE_NOT_FOUND: Cannot find module 'tests\'`, because Node treats the
  trailing separator as a module path.

`node tests/run.js` avoids both problems: it reads `tests/*.test.js` with
`fs.readdirSync` and passes explicit file paths to `node --test`, then
forwards the real exit code.

CI (GitHub Actions, Ubuntu + Node 22) passes the unquoted pattern
`tests/*.test.js`, which the shell expands before Node sees it — that is why
CI works regardless of Node's own glob support.

## Run a specific test file

```bash
node --test tests/overtime-logic.test.js
```

## Run with detailed output

```bash
node --test --test-reporter=spec "tests/*.test.js"
```

## Write a new test

1. Create `tests/YOUR-MODULE.test.js`
2. Import the production module via `require('../js/path/to/module.js')`
3. Use `test()` and `assert` from `node:test` and `node:assert`
4. Only test pure functions (no DOM, no localStorage, no async I/O)

Example:

```js
const test = require('node:test');
const assert = require('node:assert');
const { myFunction } = require('../js/my-module.js');

test('myFunction returns expected value', () => {
  assert.strictEqual(myFunction(2, 3), 5);
});
```

## What to test

Priority 1 (critical business logic):

- `js/overtime-logic.js` — `categorizeOvertime`, `calcOvertimeTime`
- `js/schedules/_core.js` — `buildHolidays`, `isWolne`, `escapeHtml`
- `js/personal/sync-tracking.js` — `getSyncFingerprint`, `normalizeShiftOverrides`
- `js/core.js` — `sanitizePrefs`

NOT to test:

- UI code (`calendar.js`, `dashboard.js`) — needs DOM
- Async I/O (`sync.js`) — needs mocking
- Framework-level (`main.js`, `app-shell.js`)

## No npm required

This project uses the `window.myFunc = myFunc` pattern for cross-file access.
For Node.js tests, modules add a compatibility shim:

```js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { myFunc };
}
```

Tests import via CommonJS `require()`. No bundler, no transpilation, no npm.

## CI (GitHub Actions)

Workflow: `.github/workflows/test.yml`

Runs on push to `main`, pull requests, and manual **workflow_dispatch**.

### What you see in GitHub

1. **Actions → Unit Tests** — live log (`spec` reporter).
2. **Job summary** (bottom of the run) — table with total / failures.
3. **Checks → Test report** — visual pass/fail list (`dorny/test-reporter` + JUnit XML).
4. **Artifacts → test-results** — downloadable `test-results.xml`.

### Local commands

```bash
# Readable console output
node --test --test-reporter=spec tests/*.test.js

# Also write JUnit XML (same as CI)
node --test \
  --test-reporter=spec \
  --test-reporter=junit \
  --test-reporter-destination=stdout \
  --test-reporter-destination=test-results.xml \
  tests/*.test.js
```

No `npm install` — Node built-ins only.

### Badge (optional)

```markdown
[![Unit Tests](https://github.com/OWNER/REPO/actions/workflows/test.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/test.yml)
```

## Coverage focus

Pure modules only (no DOM / no Google API):

| File | Module under test |
|------|-------------------|
| `notes-tracking.test.js` | `js/personal/notes-tracking.js` |
| `overtime-logic.test.js` | `js/overtime-logic.js` |
| `schedules-core.test.js` | `js/schedules/_core.js` |
| `sync-tracking.test.js` | `js/personal/sync-tracking.js` (incl. fingerprint stability) |

Run: `node tests/run.js` (Node 18+).
