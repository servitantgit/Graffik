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
  isRemoteAheadByRevision,
  getPersonalShiftOverrides,
  getSyncFingerprint,
  hashSyncString,
  stableSyncSerialize,
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

// ============================================================
// isRemoteAheadByRevision — revision-based ordering (clock-skew safe)
//
// Compares a device's last-known sync revision against a downloaded Drive
// payload's own `revision` counter, instead of relying on device clocks
// (which can drift or differ across timezones between a phone and laptop).
// ============================================================

test('isRemoteAheadByRevision: remote revision greater than local => true', () => {
  assert.strictEqual(isRemoteAheadByRevision(3, { revision: 5 }), true);
});

test('isRemoteAheadByRevision: remote revision equal to local => false (not ahead)', () => {
  assert.strictEqual(isRemoteAheadByRevision(5, { revision: 5 }), false);
});

test('isRemoteAheadByRevision: remote revision less than local => false', () => {
  assert.strictEqual(isRemoteAheadByRevision(7, { revision: 2 }), false);
});

test('isRemoteAheadByRevision: missing revision field on payload => null (unknown, caller must fall back)', () => {
  assert.strictEqual(isRemoteAheadByRevision(5, { version: 4 }), null);
});

test('isRemoteAheadByRevision: null payload => null', () => {
  assert.strictEqual(isRemoteAheadByRevision(5, null), null);
});

test('isRemoteAheadByRevision: non-numeric revision field => null', () => {
  assert.strictEqual(isRemoteAheadByRevision(5, { revision: 'five' }), null);
});

test('isRemoteAheadByRevision: missing/undefined local revision treated as 0', () => {
  assert.strictEqual(isRemoteAheadByRevision(undefined, { revision: 1 }), true);
  assert.strictEqual(isRemoteAheadByRevision(undefined, { revision: 0 }), false);
});

test('isRemoteAheadByRevision: negative or NaN local revision treated as 0', () => {
  assert.strictEqual(isRemoteAheadByRevision(NaN, { revision: 1 }), true);
  assert.strictEqual(isRemoteAheadByRevision(-3, { revision: 0 }), false);
  assert.strictEqual(isRemoteAheadByRevision(-3, { revision: 1 }), true);
});


// ============================================================
// stableSyncSerialize / hashSyncString / getSyncFingerprint
// Key invariant: same logical data → same fingerprint (key order independent)
// ============================================================

test('stableSyncSerialize: object keys are sorted so insertion order does not matter', () => {
  const a = stableSyncSerialize({ b: 1, a: 2 });
  const b = stableSyncSerialize({ a: 2, b: 1 });
  assert.strictEqual(a, b);
});

test('stableSyncSerialize: nested objects are order-independent', () => {
  const a = stableSyncSerialize({ outer: { z: 1, y: 2 }, n: 0 });
  const b = stableSyncSerialize({ n: 0, outer: { y: 2, z: 1 } });
  assert.strictEqual(a, b);
});

test('stableSyncSerialize: arrays keep element order', () => {
  assert.notStrictEqual(stableSyncSerialize([1, 2]), stableSyncSerialize([2, 1]));
  assert.strictEqual(stableSyncSerialize([1, 2]), stableSyncSerialize([1, 2]));
});

test('stableSyncSerialize: undefined object fields are omitted', () => {
  const withUndef = stableSyncSerialize({ a: 1, b: undefined });
  const without = stableSyncSerialize({ a: 1 });
  assert.strictEqual(withUndef, without);
});

test('stableSyncSerialize: NaN and Infinity become null', () => {
  assert.strictEqual(stableSyncSerialize(NaN), 'null');
  assert.strictEqual(stableSyncSerialize(Infinity), 'null');
  assert.strictEqual(stableSyncSerialize(-Infinity), 'null');
});

test('hashSyncString: deterministic for same input', () => {
  const h1 = hashSyncString('hello');
  const h2 = hashSyncString('hello');
  assert.strictEqual(h1, h2);
  assert.match(h1, /^v1-[0-9a-f]{8}-[0-9a-f]{8}$/);
});

test('hashSyncString: different inputs produce different hashes (smoke)', () => {
  assert.notStrictEqual(hashSyncString('a'), hashSyncString('b'));
});

test('getSyncFingerprint: same payload content is stable regardless of key order', () => {
  const p1 = {
    notes: { '2026-1-1-A': [{ id: '1', tag: null, text: 'x' }] },
    overtimes: {},
    urlops: { A: ['2026-01-02'] },
    prefs: { cellSkin: 'full', cellColors: {}, urlopLimits: { A: 26 } },
  };
  const p2 = {
    urlops: { A: ['2026-01-02'] },
    overtimes: {},
    notes: { '2026-1-1-A': [{ id: '1', tag: null, text: 'x' }] },
    prefs: { urlopLimits: { A: 26 }, cellColors: {}, cellSkin: 'full' },
  };
  assert.strictEqual(getSyncFingerprint(p1), getSyncFingerprint(p2));
});

test('getSyncFingerprint: changing a note changes the fingerprint', () => {
  const base = {
    notes: { '2026-1-1-A': [{ id: '1', tag: null, text: 'x' }] },
    overtimes: {},
    urlops: {},
    prefs: {},
  };
  const changed = {
    notes: { '2026-1-1-A': [{ id: '1', tag: null, text: 'y' }] },
    overtimes: {},
    urlops: {},
    prefs: {},
  };
  assert.notStrictEqual(getSyncFingerprint(base), getSyncFingerprint(changed));
});

test('getSyncFingerprint: empty / null payload is stable and non-empty string', () => {
  const a = getSyncFingerprint(null);
  const b = getSyncFingerprint({});
  const c = getSyncFingerprint(undefined);
  assert.strictEqual(typeof a, 'string');
  assert.ok(a.startsWith('v1-'));
  // null and undefined both fall back to empty comparable state
  assert.strictEqual(a, c);
  assert.strictEqual(typeof b, 'string');
});

// ============================================================
// getPersonalShiftOverrides — read overrides from a Drive payload shape
// ============================================================

test('getPersonalShiftOverrides: empty/null payload → empty object', () => {
  assert.deepStrictEqual(getPersonalShiftOverrides(null), {});
  assert.deepStrictEqual(getPersonalShiftOverrides({}), {});
});

test('getPersonalShiftOverrides: prefers shiftOverrides map when present', () => {
  const payload = {
    shiftOverrides: { '2026-1-A-15': 'N' },
    customSchedule: { 2026: { 1: { A: ['R'] } } },
  };
  const result = getPersonalShiftOverrides(payload);
  assert.strictEqual(result['2026-1-A-15'], 'N');
});

test('getPersonalShiftOverrides: invalid shiftOverrides are normalized away', () => {
  const payload = {
    shiftOverrides: {
      '2026-1-A-15': 'R',
      'bad-key': 'R',
      '2026-1-A-15-extra': 'P',
      '2026-1-X-1': 'R',
    },
  };
  const result = getPersonalShiftOverrides(payload);
  assert.deepStrictEqual(result, { '2026-1-A-15': 'R' });
});
