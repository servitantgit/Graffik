/* ================================================================
   Tests for js/schedules/_core.js
   
   Covers pure functions:
   - buildHolidays(year) → { 'M-D': 'name', ... }
   - isWolne(shift) → boolean
   - escapeHtml(str) → string
   - daysInMonthCal(year, month) → number
   - formatTimeRange(from, to) → string
   
   These are foundational helpers used across the app.
   Any regression here would break calendar/overtime/dashboard.
   ================================================================ */

'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  buildHolidays,
  isWolne,
  escapeHtml,
  daysInMonthCal,
  formatTimeRange,
} = require('../js/schedules/_core.js');

// ============================================================
// buildHolidays — Polish public holidays
// ============================================================

test('buildHolidays: returns object for valid year', () => {
  const holidays = buildHolidays(2026);
  assert.strictEqual(typeof holidays, 'object');
  assert.ok(!Array.isArray(holidays));
  assert.ok(Object.keys(holidays).length > 0);
});

test('buildHolidays: includes fixed-date Polish holidays', () => {
  const h = buildHolidays(2026);
  // Fixed holidays that never change date
  assert.ok(h['1-1'], 'New Year missing');
  assert.ok(h['1-6'], 'Epiphany missing');
  assert.ok(h['5-1'], 'Labor Day missing');
  assert.ok(h['5-3'], 'Constitution Day missing');
  assert.ok(h['8-15'], 'Assumption missing');
  assert.ok(h['11-1'], 'All Saints missing');
  assert.ok(h['11-11'], 'Independence Day missing');
  assert.ok(h['12-25'], 'Christmas Day 1 missing');
  assert.ok(h['12-26'], 'Christmas Day 2 missing');
});

test('buildHolidays: calculates Easter for 2026 (April 5)', () => {
  const h = buildHolidays(2026);
  assert.ok(h['4-5'], 'Easter 2026 should be April 5');
  assert.ok(h['4-6'], 'Easter Monday 2026 should be April 6');
});

test('buildHolidays: calculates Easter for 2024 (March 31)', () => {
  const h = buildHolidays(2024);
  assert.ok(h['3-31'], 'Easter 2024 should be March 31');
});

test('buildHolidays: calculates Easter for 2025 (April 20)', () => {
  const h = buildHolidays(2025);
  assert.ok(h['4-20'], 'Easter 2025 should be April 20');
});

test('buildHolidays: includes 13 total holidays for 2026', () => {
  const h = buildHolidays(2026);
  const count = Object.keys(h).length;
  // 9 fixed + Easter + Easter Monday + Pentecost + Corpus Christi = 13
  assert.strictEqual(count, 13, 'Expected 13 holidays, got ' + count);
});

test('buildHolidays: same year returns same result (deterministic)', () => {
  const h1 = buildHolidays(2026);
  const h2 = buildHolidays(2026);
  assert.deepStrictEqual(h1, h2);
});

// ============================================================
// isWolne — free day detection
// ============================================================

test('isWolne: empty string is free', () => {
  assert.strictEqual(isWolne(''), true);
});

test('isWolne: W is free', () => {
  assert.strictEqual(isWolne('W'), true);
});

test('isWolne: undefined is free', () => {
  assert.strictEqual(isWolne(undefined), true);
});

test('isWolne: null is free', () => {
  assert.strictEqual(isWolne(null), true);
});

test('isWolne: R is NOT free', () => {
  assert.strictEqual(isWolne('R'), false);
});

test('isWolne: P is NOT free', () => {
  assert.strictEqual(isWolne('P'), false);
});

test('isWolne: N is NOT free', () => {
  assert.strictEqual(isWolne('N'), false);
});
// ============================================================
// escapeHtml — XSS prevention
// ============================================================

test('escapeHtml: plain text unchanged', () => {
  assert.strictEqual(escapeHtml('Hello world'), 'Hello world');
});

test('escapeHtml: escapes < and >', () => {
  assert.strictEqual(escapeHtml('<script>'), '&lt;script&gt;');
});

test('escapeHtml: escapes & properly', () => {
  assert.strictEqual(escapeHtml('a & b'), 'a &amp; b');
});

test('escapeHtml: escapes ampersand first to avoid double-encoding', () => {
  assert.strictEqual(escapeHtml('&lt;'), '&amp;lt;');
});

test('escapeHtml: escapes quotes', () => {
  assert.strictEqual(escapeHtml('"double"'), '&quot;double&quot;');
  assert.strictEqual(escapeHtml("'single'"), '&#39;single&#39;');
});

test('escapeHtml: XSS attack vector neutralized', () => {
  const attack = '<img src=x onerror="alert(1)">';
  const escaped = escapeHtml(attack);
  assert.ok(!escaped.includes('<img'), 'Should escape <img tag');
  assert.ok(!escaped.includes('onerror="'), 'Should escape onerror attribute');
});

test('escapeHtml: non-string input returned as-is', () => {
  // Function returns non-strings unchanged (defensive)
  assert.strictEqual(escapeHtml(123), 123);
  assert.strictEqual(escapeHtml(null), null);
});

// ============================================================
// daysInMonthCal — days in month
// ============================================================

test('daysInMonthCal: January has 31 days', () => {
  assert.strictEqual(daysInMonthCal(2026, 1), 31);
});

test('daysInMonthCal: February 2026 has 28 days (non-leap)', () => {
  assert.strictEqual(daysInMonthCal(2026, 2), 28);
});

test('daysInMonthCal: February 2024 has 29 days (leap)', () => {
  assert.strictEqual(daysInMonthCal(2024, 2), 29);
});

test('daysInMonthCal: April has 30 days', () => {
  assert.strictEqual(daysInMonthCal(2026, 4), 30);
});

test('daysInMonthCal: December has 31 days', () => {
  assert.strictEqual(daysInMonthCal(2026, 12), 31);
});

test('daysInMonthCal: century leap year rules (2000 = leap)', () => {
  assert.strictEqual(daysInMonthCal(2000, 2), 29);
});

test('daysInMonthCal: century non-leap year rules (2100 = not leap)', () => {
  assert.strictEqual(daysInMonthCal(2100, 2), 28);
});

// ============================================================
// formatTimeRange — hour formatting
// ============================================================

test('formatTimeRange: simple range 6-14', () => {
  assert.strictEqual(formatTimeRange(6, 14), '06:00\u201314:00');
});

test('formatTimeRange: night shift 22-6 (crosses midnight)', () => {
  assert.strictEqual(formatTimeRange(22, 30), '22:00\u201306:00');
});

test('formatTimeRange: pads single digits with zero', () => {
  assert.strictEqual(formatTimeRange(0, 5), '00:00\u201305:00');
});

test('formatTimeRange: hour 24 wraps to 00', () => {
  assert.strictEqual(formatTimeRange(20, 24), '20:00\u201300:00');
});