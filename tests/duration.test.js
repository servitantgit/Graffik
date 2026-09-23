/* ================================================================
   Tests for js/duration.js — duration contract
   ================================================================ */

'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  DURATION_LIMITS,
  formatClockTime,
  formatTimeRange,
  formatDurationHours,
  formatHoursCompact,
  decimalHoursToParts,
  partsToDecimalHours,
  isValidWeekendDuration,
  isValidPrzedPoDuration,
} = require('../js/duration.js');

test('DURATION_LIMITS are fixed contract values', () => {
  assert.strictEqual(DURATION_LIMITS.minWeekendHours, 0.5);
  assert.strictEqual(DURATION_LIMITS.maxWeekendHours, 24);
  assert.strictEqual(DURATION_LIMITS.maxPrzedPoHours, 5);
  assert.strictEqual(DURATION_LIMITS.maxMinutes, 59);
});

test('partsToDecimalHours + decimalHoursToParts round-trip minutes', () => {
  assert.deepStrictEqual(decimalHoursToParts(partsToDecimalHours(4, 41)), {
    hours: 4,
    minutes: 41,
  });
  assert.deepStrictEqual(decimalHoursToParts(4.8), { hours: 4, minutes: 48 });
  assert.strictEqual(partsToDecimalHours(0, 30), 0.5);
  assert.strictEqual(partsToDecimalHours(1, 99), 1 + 59 / 60);
});

test('formatDurationHours never shows raw long floats', () => {
  assert.strictEqual(formatDurationHours(4 + 41 / 60), '4h 41m');
  assert.strictEqual(formatDurationHours(4.8), '4h 48m');
  assert.strictEqual(formatDurationHours(2), '2h');
  assert.strictEqual(formatDurationHours(0.5), '30m');
});

test('formatHoursCompact: one decimal, no trailing .0', () => {
  assert.strictEqual(formatHoursCompact(4 + 41 / 60), '4.7h');
  assert.strictEqual(formatHoursCompact(4.5), '4.5h');
  assert.strictEqual(formatHoursCompact(4), '4h');
  assert.strictEqual(formatHoursCompact(0), '0h');
});

test('formatClockTime / formatTimeRange support fractions', () => {
  assert.strictEqual(formatClockTime(14.5), '14:30');
  assert.strictEqual(formatTimeRange(14, 14.5), '14:00–14:30');
});

test('isValidWeekendDuration / isValidPrzedPoDuration', () => {
  assert.strictEqual(isValidWeekendDuration(0.5), true);
  assert.strictEqual(isValidWeekendDuration(24), true);
  assert.strictEqual(isValidWeekendDuration(0.4), false);
  assert.strictEqual(isValidWeekendDuration(25), false);
  assert.strictEqual(isValidPrzedPoDuration(5), true);
  assert.strictEqual(isValidPrzedPoDuration(5.1), false);
  assert.strictEqual(isValidPrzedPoDuration(0), false);
});
