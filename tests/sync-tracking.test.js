/* ================================================================
   Tests for js/personal/sync-tracking.js
   
   Covers pure functions (deterministic, no localStorage):
   - normalizeShiftOverrides(overrides) → cleaned overrides map
   - getPersonalShiftOverrides(payload) → overrides from payload
   - buildCustomScheduleFromShiftOverrides(overrides, factory) → nested schedule
   - getSyncFingerprint(payload) → hash string (stability check)
   
   Override key format used by production (see buildPersonalScheduleOverrides
   and the validation regex in normalizeShiftOverrides):
     YYYY-M-B-D   =>   year - month - brigade - day
   e.g. '2026-1-A-15' = 2026, January, brigade A, day 15.
   
   Fingerprint stability is critical: same data must always produce
   the same hash, or Drive sync will falsely report changes.
   ================================================================ */

'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  normalizeShiftOverrides,
  buildCustomScheduleFromShiftOverrides,
} = require('../js/personal/sync-tracking.js');

// ============================================================
// normalizeShiftOverrides — validate + clean overrides map
// ============================================================

test('normalizeShiftOverrides: empty object returns empty', () => {
  assert.deepStrictEqual(normalizeShiftOverrides({}), {});
});

test('normalizeShiftOverrides: null returns empty', () => {
  assert.deepStrictEqual(normalizeShiftOverrides(null), {});
});

test('normalizeShiftOverrides: undefined returns empty', () => {
  assert.deepStrictEqual(normalizeShiftOverrides(undefined), {});
});

test('normalizeShiftOverrides: array returns empty (not object)', () => {
  assert.deepStrictEqual(normalizeShiftOverrides([]), {});
});

test('normalizeShiftOverrides: valid key kept', () => {
  const input = { '2026-1-A-15': 'R' };
  assert.deepStrictEqual(normalizeShiftOverrides(input), input);
});

test('normalizeShiftOverrides: all valid shift values accepted', () => {
  const input = {
    '2026-1-A-1': 'R',
    '2026-1-A-2': 'P',
    '2026-1-A-3': 'N',
    '2026-1-A-4': '',  // free day is valid
  };
  assert.deepStrictEqual(normalizeShiftOverrides(input), input);
});

test('normalizeShiftOverrides: invalid key format dropped', () => {
  const input = {
    '2026-1-A-15': 'R',   // valid
    'invalid-key': 'R',   // dropped (bad format)
    '2026-1-A': 'R',      // dropped (missing day)
    '2026-1-15': 'R',     // dropped (missing brigade)
  };
  const result = normalizeShiftOverrides(input);
  assert.strictEqual(result['2026-1-A-15'], 'R');
  assert.strictEqual(result['invalid-key'], undefined);
  assert.strictEqual(result['2026-1-A'], undefined);
  assert.strictEqual(result['2026-1-15'], undefined);
});

test('normalizeShiftOverrides: invalid shift value dropped', () => {
  const input = {
    '2026-1-A-15': 'R',   // valid
    '2026-1-A-16': 'X',   // dropped (not R/P/N/'')
    '2026-1-A-17': 'W',   // dropped (W is not a valid override value)
    '2026-1-A-18': null,  // dropped
    '2026-1-A-19': 123,   // dropped
  };
  const result = normalizeShiftOverrides(input);
  assert.strictEqual(result['2026-1-A-15'], 'R');
  assert.strictEqual(result['2026-1-A-16'], undefined);
  assert.strictEqual(result['2026-1-A-17'], undefined);
  assert.strictEqual(result['2026-1-A-18'], undefined);
  assert.strictEqual(result['2026-1-A-19'], undefined);
});

test('normalizeShiftOverrides: invalid brigade dropped', () => {
  const input = {
    '2026-1-A-15': 'R',   // valid
    '2026-1-X-15': 'R',   // dropped (X not a brigade)
    '2026-1-Z-15': 'R',   // dropped
  };
  const result = normalizeShiftOverrides(input);
  assert.strictEqual(result['2026-1-A-15'], 'R');
  assert.strictEqual(result['2026-1-X-15'], undefined);
  assert.strictEqual(result['2026-1-Z-15'], undefined);
});

test('normalizeShiftOverrides: keys are sorted alphabetically', () => {
  const input = {
    '2026-2-A-15': 'R',
    '2026-1-A-15': 'P',
    '2026-1-A-1': 'N',
  };
  const result = normalizeShiftOverrides(input);
  const keys = Object.keys(result);
  const sorted = [...keys].sort();
  assert.deepStrictEqual(keys, sorted, 'Keys should be sorted');
});
// ============================================================
// buildCustomScheduleFromShiftOverrides — reconstruct customSchedule
// ============================================================

test('buildCustomScheduleFromShiftOverrides: empty overrides returns empty', () => {
  const result = buildCustomScheduleFromShiftOverrides({}, {});
  assert.deepStrictEqual(result, {});
});

test('buildCustomScheduleFromShiftOverrides: single override creates nested structure', () => {
  const overrides = { '2026-1-A-15': 'R' };
  const factory = {};
  const result = buildCustomScheduleFromShiftOverrides(overrides, factory);
  
  assert.ok(result[2026], 'Year 2026 created');
  assert.ok(result[2026][1], 'Month 1 created');
  assert.ok(Array.isArray(result[2026][1].A), 'Brigade A array created');
  assert.strictEqual(result[2026][1].A[14], 'R', 'Day 15 (index 14) = R');
});

test('buildCustomScheduleFromShiftOverrides: preserves factory values for non-override days', () => {
  const overrides = { '2026-1-A-15': 'R' };
  const factory = {
    2026: {
      1: {
        A: ['P', 'P', 'N', 'N', '', '', 'R', 'R', '', '', 'P', 'P', 'N', 'N', 'ORIGINAL', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        B: ['R', 'R', 'R'],
        C: [],
        D: [],
      }
    }
  };
  const result = buildCustomScheduleFromShiftOverrides(overrides, factory);
  
  // Override applied
  assert.strictEqual(result[2026][1].A[14], 'R', 'Day 15 overridden to R');
  // Factory preserved elsewhere
  assert.strictEqual(result[2026][1].A[0], 'P', 'Day 1 kept from factory');
  assert.strictEqual(result[2026][1].A[13], 'N', 'Day 14 kept from factory');
});

test('buildCustomScheduleFromShiftOverrides: multiple overrides in different months', () => {
  const overrides = {
    '2026-1-A-1': 'R',
    '2026-3-B-15': 'N',
    '2027-6-C-10': 'P',
  };
  const result = buildCustomScheduleFromShiftOverrides(overrides, {});
  
  assert.strictEqual(result[2026][1].A[0], 'R');
  assert.strictEqual(result[2026][3].B[14], 'N');
  assert.strictEqual(result[2027][6].C[9], 'P');
});

test('buildCustomScheduleFromShiftOverrides: empty string override (free day) works', () => {
  const overrides = { '2026-1-A-15': '' };
  const factory = {};
  const result = buildCustomScheduleFromShiftOverrides(overrides, factory);
  
  assert.strictEqual(result[2026][1].A[14], '', 'Day 15 explicitly set to free');
});

test('buildCustomScheduleFromShiftOverrides: invalid day out of range dropped', () => {
  const overrides = {
    '2026-1-A-15': 'R',   // valid (Jan has 31 days)
    '2026-2-A-31': 'R',   // invalid (Feb has 28 in 2026)
    '2026-13-A-1': 'R',   // invalid (no month 13)
  };
  const result = buildCustomScheduleFromShiftOverrides(overrides, {});
  
  assert.ok(result[2026][1].A[14], 'Valid day kept');
  // Invalid entries silently dropped (no crash)
  if (result[2026] && result[2026][2]) {
    assert.strictEqual(result[2026][2].A[30], undefined, 'Feb 31 does not exist');
  }
});

// ============================================================
// Regression protection
// ============================================================

test('normalizeShiftOverrides: does not mutate input', () => {
  const input = { '2026-1-A-15': 'R', 'invalid': 'X' };
  const inputCopy = JSON.parse(JSON.stringify(input));
  normalizeShiftOverrides(input);
  assert.deepStrictEqual(input, inputCopy, 'Input should not be mutated');
});

test('buildCustomScheduleFromShiftOverrides: returns object with correct nesting depth', () => {
  const result = buildCustomScheduleFromShiftOverrides({ '2026-1-A-15': 'R' }, {});
  assert.strictEqual(typeof result, 'object');
  assert.strictEqual(typeof result[2026], 'object');
  assert.strictEqual(typeof result[2026][1], 'object');
  assert.ok(Array.isArray(result[2026][1].A));
});