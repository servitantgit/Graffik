# Unit Tests

Zero-dependency unit tests using Node.js built-in `node:test` (Node 18+).

## Run all tests

From the project root, use the glob form (works on Windows and POSIX):

```bash
node --test "tests/*.test.js"
```

Or let Node discover tests from the current directory:

```bash
node --test
```

> Note: `node --test tests/` (directory form) is unreliable on Windows with
> Node 22+ — Node can try to load the directory as a module and fail with
> `MODULE_NOT_FOUND`. Prefer the glob form above.

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

Runs on every push to `main`, every pull request, and manual **workflow_dispatch**.

```bash
node --test --test-reporter=spec "tests/*.test.js"
```

No `npm install` — tests use Node built-ins only (`node:test`, `node:assert`).

Badge (optional, put in README.md):

```markdown
[![Unit Tests](https://github.com/OWNER/REPO/actions/workflows/test.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/test.yml)
```
