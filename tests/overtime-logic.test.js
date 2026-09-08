/* ================================================================
   Tests for js/overtime-logic.js

   Covers pure functions:
   - categorizeOvertime(year, month, day, shift, position, hours)
     → { h50, h100, h200 } — hours by pay rate
   - calcOvertimeTime(shift, position, hours)
     → { from, to } — start/end hours

   Rules being tested (as of current code):
   - Holiday work → +200% always
   - Sunday overtime → +100% always
   - Weekend OT type → +100% always
   - Day hours (06:00-22:00) → +50%
   - Night hours (22:00-06:00) → +100%

   Note: Business rules may need adjustment per Polish/Ukrainian
   labor law. Tests reflect CURRENT code behavior, not "correct" rates.
   Update tests when categorizeOvertime logic changes.
   ================================================================ */

'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { categorizeOvertime, calcOvertimeTime } = require('../js/overtime-logic.js');

// ============================================================
// categorizeOvertime — Regular workday OT (przed)
// ============================================================

test('categorizeOvertime: przed on regular workday R shift, pre-dawn night hours', () => {
  // R shift = 06:00-14:00. OT przed 2h = 04:00-06:00.
  // Night window per code: h >= 22 || h < 6 → 04:00 and 05:00 are night hours.
  // Wednesday (regular workday), no holiday
  const result = categorizeOvertime(2026, 3, 4, 'R', 'przed', 2);
  assert.deepStrictEqual(result, { h50: 0, h100: 2, h200: 0 });
});

test('categorizeOvertime: przed on regular workday R shift, night hours only', () => {
  // R shift = 06:00-14:00. OT przed 4h = 02:00-06:00 (all night hours)
  const result = categorizeOvertime(2026, 3, 4, 'R', 'przed', 4);
  assert.deepStrictEqual(result, { h50: 0, h100: 4, h200: 0 });
});

test('categorizeOvertime: przed on regular workday R shift, mixed hours', () => {
  // R shift = 06:00-14:00. OT przed 3h = 03:00-06:00 (all night hours)
  // 03-04, 04-05, 05-06 — all before 06:00 = night
  const result = categorizeOvertime(2026, 3, 4, 'R', 'przed', 3);
  assert.deepStrictEqual(result, { h50: 0, h100: 3, h200: 0 });
});

// ============================================================
// categorizeOvertime — Regular workday OT (po)
// ============================================================

test('categorizeOvertime: po on regular workday R shift, day hours', () => {
  // R shift = 06:00-14:00. OT po 2h = 14:00-16:00 (all day hours)
  const result = categorizeOvertime(2026, 3, 4, 'R', 'po', 2);
  assert.deepStrictEqual(result, { h50: 2, h100: 0, h200: 0 });
});

test('categorizeOvertime: po on regular workday P shift, mixed day/night', () => {
  // P shift = 14:00-22:00. OT po 3h = 22:00-01:00
  // 22-23, 23-00, 00-01 = all night hours
  const result = categorizeOvertime(2026, 3, 4, 'P', 'po', 3);
  assert.deepStrictEqual(result, { h50: 0, h100: 3, h200: 0 });
});

test('categorizeOvertime: po on N shift crosses to next day', () => {
  // N shift = 22:00-06:00 (next day). OT po 2h = 06:00-08:00 (day hours)
  const result = categorizeOvertime(2026, 3, 4, 'N', 'po', 2);
  assert.deepStrictEqual(result, { h50: 2, h100: 0, h200: 0 });
});

// ============================================================
// categorizeOvertime — Holidays (always +200%)
// ============================================================

test('categorizeOvertime: holiday work → all hours +200% (przed)', () => {
  // 1 May 2026 = Święto Pracy (Polish holiday)
  const result = categorizeOvertime(2026, 5, 1, 'R', 'przed', 3);
  assert.deepStrictEqual(result, { h50: 0, h100: 0, h200: 3 });
});

test('categorizeOvertime: holiday work → all hours +200% (po)', () => {
  // 25 December 2026 = Boże Narodzenie
  const result = categorizeOvertime(2026, 12, 25, 'R', 'po', 5);
  assert.deepStrictEqual(result, { h50: 0, h100: 0, h200: 5 });
});

test('categorizeOvertime: holiday weekend type → still +200%', () => {
  // 1 November 2026 = Wszystkich Świętych. Weekend OT type
  const result = categorizeOvertime(2026, 11, 1, null, 'weekend', 8);
  assert.deepStrictEqual(result, { h50: 0, h100: 0, h200: 8 });
});

// ============================================================
// categorizeOvertime — Sunday special rules
// ============================================================

test('categorizeOvertime: Sunday przed → normal day rate (4-brigade)', () => {
  // 4 January 2026 = Sunday (not holiday). R shift, OT przed 2h.
  // R = 06:00-14:00, so OT przed 2h = 04:00-06:00 (pre-dawn = night hours)
  // For 4-brigade schedule, Sunday is a regular workday → night hours = +100%
  const result = categorizeOvertime(2026, 1, 4, 'R', 'przed', 2);
  assert.deepStrictEqual(result, { h50: 0, h100: 2, h200: 0 });
});

test('categorizeOvertime: Sunday weekend type → +100%', () => {
  // Any Sunday, weekend OT
  const result = categorizeOvertime(2026, 1, 4, null, 'weekend', 8);
  assert.deepStrictEqual(result, { h50: 0, h100: 8, h200: 0 });
});

// ============================================================
// categorizeOvertime — Weekend type (non-Sunday)
// ============================================================

test('categorizeOvertime: Saturday weekend type → +100%', () => {
  // 3 January 2026 = Saturday (not holiday). Weekend OT
  const result = categorizeOvertime(2026, 1, 3, null, 'weekend', 8);
  assert.deepStrictEqual(result, { h50: 0, h100: 8, h200: 0 });
});

test('categorizeOvertime: Sunday po day hours → +50% (4-brigade regular workday)', () => {
  // 4 January 2026 = Sunday. R shift 06-14, OT po 2h = 14:00-16:00 (day)
  const result = categorizeOvertime(2026, 1, 4, 'R', 'po', 2);
  assert.deepStrictEqual(result, { h50: 2, h100: 0, h200: 0 });
});

test('categorizeOvertime: Saturday po day hours → +50% (4-brigade regular workday)', () => {
  // 3 January 2026 = Saturday. R shift 06-14, OT po 2h = 14:00-16:00 (day)
  const result = categorizeOvertime(2026, 1, 3, 'R', 'po', 2);
  assert.deepStrictEqual(result, { h50: 2, h100: 0, h200: 0 });
});

test('categorizeOvertime: Sunday night OT → +100% (regular night rate)', () => {
  // Sunday, P shift 14-22, OT po 2h = 22:00-24:00 (all night)
  const result = categorizeOvertime(2026, 1, 4, 'P', 'po', 2);
  assert.deepStrictEqual(result, { h50: 0, h100: 2, h200: 0 });
});

// ============================================================
// categorizeOvertime — Edge cases
// ============================================================

test('categorizeOvertime: 0 hours returns all zeros', () => {
  const result = categorizeOvertime(2026, 3, 4, 'R', 'przed', 0);
  assert.deepStrictEqual(result, { h50: 0, h100: 0, h200: 0 });
});

test('categorizeOvertime: 1 hour minimum', () => {
  const result = categorizeOvertime(2026, 3, 4, 'R', 'po', 1);
  assert.deepStrictEqual(result, { h50: 1, h100: 0, h200: 0 });
});

// ============================================================
// calcOvertimeTime — Start/end hour calculation
// ============================================================

test('calcOvertimeTime: przed R shift 2h → 04:00-06:00', () => {
  const result = calcOvertimeTime('R', 'przed', 2);
  assert.deepStrictEqual(result, { from: 4, to: 6 });
});

test('calcOvertimeTime: przed R shift 8h → crosses midnight backwards', () => {
  // 06:00 - 8h = -2 → 22:00 previous day
  const result = calcOvertimeTime('R', 'przed', 8);
  assert.deepStrictEqual(result, { from: 22, to: 6 });
});

test('calcOvertimeTime: po R shift 2h → 14:00-16:00', () => {
  const result = calcOvertimeTime('R', 'po', 2);
  assert.deepStrictEqual(result, { from: 14, to: 16 });
});

test('calcOvertimeTime: po P shift 3h → 22:00-01:00 (crosses midnight)', () => {
  const result = calcOvertimeTime('P', 'po', 3);
  assert.deepStrictEqual(result, { from: 22, to: 1 });
});

test('calcOvertimeTime: po N shift 2h → 06:00-08:00', () => {
  // N ends at 30 (= 06:00 next day). +2h = 08:00
  const result = calcOvertimeTime('N', 'po', 2);
  assert.deepStrictEqual(result, { from: 6, to: 8 });
});

test('calcOvertimeTime: przed N shift 2h → 20:00-22:00', () => {
  // N starts at 22:00. -2h = 20:00
  const result = calcOvertimeTime('N', 'przed', 2);
  assert.deepStrictEqual(result, { from: 20, to: 22 });
});

// ============================================================
// Regression protection
// ============================================================

test('categorizeOvertime: returns object with exact keys h50/h100/h200', () => {
  const result = categorizeOvertime(2026, 3, 4, 'R', 'przed', 2);
  const keys = Object.keys(result).sort();
  assert.deepStrictEqual(keys, ['h100', 'h200', 'h50']);
});

test('categorizeOvertime: all values are non-negative numbers', () => {
  const result = categorizeOvertime(2026, 3, 4, 'R', 'przed', 3);
  assert.ok(typeof result.h50 === 'number' && result.h50 >= 0);
  assert.ok(typeof result.h100 === 'number' && result.h100 >= 0);
  assert.ok(typeof result.h200 === 'number' && result.h200 >= 0);
});

test('categorizeOvertime: total hours equals input', () => {
  // Sum of h50+h100+h200 should equal input hours
  const testCases = [
    { y: 2026, m: 3, d: 4, s: 'R', pos: 'przed', h: 2 },
    { y: 2026, m: 3, d: 4, s: 'P', pos: 'po', h: 3 },
    { y: 2026, m: 5, d: 1, s: 'R', pos: 'po', h: 5 }, // holiday
    { y: 2026, m: 1, d: 4, s: 'R', pos: 'przed', h: 2 }, // sunday
  ];

  for (const tc of testCases) {
    const result = categorizeOvertime(tc.y, tc.m, tc.d, tc.s, tc.pos, tc.h);
    const total = result.h50 + result.h100 + result.h200;
    assert.strictEqual(total, tc.h,
      `Total ${total} !== input ${tc.h} for ${JSON.stringify(tc)}`);
  }
});