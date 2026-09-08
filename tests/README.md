# Unit Tests

Zero-dependency unit tests using Node.js built-in `node:test`.

**Requirements:**
- Node 20+ (recommended for local development)
- Node 22+ (used in CI, most reliable)
- Node 18 works but has slower test discovery

## Run all tests

```bash
# Recommended (cross-platform, works everywhere)
node --test "tests/*.test.js"

# Alternative (may fail on Windows/Node 22+, see below)
node --test tests/
```

## Windows/Node 22+ compatibility

The directory form `node --test tests/` may fail on Windows with Node 22+
with error `MODULE_NOT_FOUND: Cannot find module 'tests\'`. Node treats
the trailing separator as a module path instead of a directory glob.

Always use glob form on Windows:

```bash
node --test "tests/*.test.js"
```

Linux/macOS work with both forms. CI (GitHub Actions on Ubuntu + Node 22)
uses glob form for consistency.

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
