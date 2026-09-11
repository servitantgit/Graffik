/* ================================================================
   Tests for js/personal/notes-tracking.js

   Covers the pure, dependency-free logic behind the unified per-day
   notes list: adding/removing entries, upserting a tagged (before/after
   overtime) entry, and the one-shot legacy-data migration transform.
   ================================================================ */

'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  genNoteId,
  noteEntryHasContent,
  addNoteEntry,
  removeNoteEntry,
  updateNoteText,
  upsertNoteByTag,
  getNoteTextByTag,
  countNoteEntries,
  computeUnifiedNotesMigration,
} = require('../js/personal/notes-tracking.js');

// ============================================================
// noteEntryHasContent
// ============================================================

test('noteEntryHasContent: legacy non-empty string => true', () => {
  assert.strictEqual(noteEntryHasContent('hello'), true);
});

test('noteEntryHasContent: legacy whitespace-only string => false', () => {
  assert.strictEqual(noteEntryHasContent('   '), false);
});

test('noteEntryHasContent: null/undefined => false', () => {
  assert.strictEqual(noteEntryHasContent(null), false);
  assert.strictEqual(noteEntryHasContent(undefined), false);
});

test('noteEntryHasContent: array with at least one non-empty entry => true', () => {
  assert.strictEqual(noteEntryHasContent([{ id: '1', tag: null, text: '  ' }, { id: '2', tag: 'before', text: 'x' }]), true);
});

test('noteEntryHasContent: array of only empty/whitespace entries => false', () => {
  assert.strictEqual(noteEntryHasContent([{ id: '1', tag: null, text: '' }, { id: '2', tag: null, text: '   ' }]), false);
});

test('noteEntryHasContent: empty array => false', () => {
  assert.strictEqual(noteEntryHasContent([]), false);
});

// ============================================================
// countNoteEntries — total entries across all days, not day-key count
// (this was the actual bug: sync diff counted days-with-notes, so adding
// a 2nd/3rd note to a day that already had one showed no change at all)
// ============================================================

test('countNoteEntries: counts individual entries, not day-keys', () => {
  const notesMap = {
    '2026-1-10-A': [
      { id: 'a', tag: null, text: 'first' },
      { id: 'b', tag: null, text: 'second' },
      { id: 'c', tag: 'before', text: 'third' },
    ],
  };
  // One day-key, but three separate notes — must count as 3, not 1.
  assert.strictEqual(countNoteEntries(notesMap), 3);
});

test('countNoteEntries: sums across multiple days', () => {
  const notesMap = {
    '2026-1-10-A': [{ id: 'a', tag: null, text: 'x' }],
    '2026-1-11-A': [
      { id: 'b', tag: null, text: 'y' },
      { id: 'c', tag: 'after', text: 'z' },
    ],
  };
  assert.strictEqual(countNoteEntries(notesMap), 3);
});

test('countNoteEntries: ignores empty/whitespace-only entries', () => {
  const notesMap = {
    '2026-1-10-A': [
      { id: 'a', tag: null, text: '   ' },
      { id: 'b', tag: null, text: 'real note' },
    ],
  };
  assert.strictEqual(countNoteEntries(notesMap), 1);
});

test('countNoteEntries: tolerates legacy string values (pre-migration data)', () => {
  const notesMap = { '2026-1-10-A': 'legacy note' };
  assert.strictEqual(countNoteEntries(notesMap), 1);
});

test('countNoteEntries: legacy whitespace-only string does not count', () => {
  assert.strictEqual(countNoteEntries({ '2026-1-10-A': '   ' }), 0);
});

test('countNoteEntries: empty/undefined map => 0', () => {
  assert.strictEqual(countNoteEntries({}), 0);
  assert.strictEqual(countNoteEntries(undefined), 0);
  assert.strictEqual(countNoteEntries(null), 0);
});

// ============================================================
// addNoteEntry
// ============================================================

test('addNoteEntry: appends a new entry with a generated id and given tag', () => {
  const { list, id } = addNoteEntry([], 'first note', null);
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].text, 'first note');
  assert.strictEqual(list[0].tag, null);
  assert.strictEqual(typeof id, 'string');
  assert.strictEqual(list[0].id, id);
});

test('addNoteEntry: does not mutate the input array (returns a new one)', () => {
  const original = [{ id: 'a', tag: null, text: 'existing' }];
  const { list } = addNoteEntry(original, 'second', null);
  assert.strictEqual(original.length, 1);
  assert.strictEqual(list.length, 2);
});

test('addNoteEntry: multiple additions accumulate (several notes per day)', () => {
  let { list } = addNoteEntry([], 'one', null);
  ({ list } = addNoteEntry(list, 'two', null));
  ({ list } = addNoteEntry(list, 'three', 'before'));
  assert.strictEqual(list.length, 3);
  assert.deepStrictEqual(list.map((n) => n.text), ['one', 'two', 'three']);
});

test('addNoteEntry: empty/whitespace text is a no-op, returns null id', () => {
  const { list, id } = addNoteEntry([{ id: 'a', tag: null, text: 'x' }], '   ', null);
  assert.strictEqual(id, null);
  assert.strictEqual(list.length, 1);
});

test('addNoteEntry: trims surrounding whitespace from text', () => {
  const { list } = addNoteEntry([], '  padded  ', null);
  assert.strictEqual(list[0].text, 'padded');
});

// ============================================================
// removeNoteEntry
// ============================================================

test('removeNoteEntry: removes only the matching id', () => {
  const list = [
    { id: 'a', tag: null, text: 'keep' },
    { id: 'b', tag: null, text: 'remove me' },
  ];
  const next = removeNoteEntry(list, 'b');
  assert.strictEqual(next.length, 1);
  assert.strictEqual(next[0].id, 'a');
});

test('removeNoteEntry: unknown id is a no-op (same length)', () => {
  const list = [{ id: 'a', tag: null, text: 'x' }];
  const next = removeNoteEntry(list, 'does-not-exist');
  assert.strictEqual(next.length, 1);
});

test('removeNoteEntry: non-array input returns empty array', () => {
  assert.deepStrictEqual(removeNoteEntry(undefined, 'a'), []);
  assert.deepStrictEqual(removeNoteEntry('not-an-array', 'a'), []);
});

// ============================================================
// updateNoteText — inline editing of an existing entry (tag preserved)
// ============================================================

test('updateNoteText: replaces the text of the matching entry', () => {
  const list = [{ id: 'a', tag: null, text: 'old text' }];
  const next = updateNoteText(list, 'a', 'new text');
  assert.strictEqual(next[0].text, 'new text');
  assert.strictEqual(next[0].id, 'a');
});

test('updateNoteText: preserves the tag of the edited entry', () => {
  const list = [{ id: 'a', tag: 'before', text: 'old' }];
  const next = updateNoteText(list, 'a', 'edited');
  assert.strictEqual(next[0].tag, 'before');
  assert.strictEqual(next[0].text, 'edited');
});

test('updateNoteText: does not touch other entries', () => {
  const list = [
    { id: 'a', tag: null, text: 'first' },
    { id: 'b', tag: 'after', text: 'second' },
  ];
  const next = updateNoteText(list, 'b', 'second edited');
  assert.strictEqual(next[0].text, 'first');
  assert.strictEqual(next[1].text, 'second edited');
});

test('updateNoteText: does not mutate the input array (returns a new one)', () => {
  const original = [{ id: 'a', tag: null, text: 'old' }];
  const next = updateNoteText(original, 'a', 'new');
  assert.strictEqual(original[0].text, 'old');
  assert.strictEqual(next[0].text, 'new');
});

test('updateNoteText: trims surrounding whitespace', () => {
  const list = [{ id: 'a', tag: null, text: 'old' }];
  const next = updateNoteText(list, 'a', '  padded  ');
  assert.strictEqual(next[0].text, 'padded');
});

test('updateNoteText: empty/whitespace text is a no-op (does not delete the entry)', () => {
  const list = [{ id: 'a', tag: null, text: 'keep me' }];
  const next = updateNoteText(list, 'a', '   ');
  assert.strictEqual(next.length, 1);
  assert.strictEqual(next[0].text, 'keep me');
});

test('updateNoteText: unknown id is a no-op (list unchanged in content)', () => {
  const list = [{ id: 'a', tag: null, text: 'x' }];
  const next = updateNoteText(list, 'does-not-exist', 'new text');
  assert.deepStrictEqual(next, list);
});

test('updateNoteText: non-array input returns empty array', () => {
  assert.deepStrictEqual(updateNoteText(undefined, 'a', 'x'), []);
});

// ============================================================
// upsertNoteByTag — overtime "before"/"after" notes as a singleton per tag
// ============================================================

test('upsertNoteByTag: adds a new tagged entry when none exists', () => {
  const next = upsertNoteByTag([], 'before', 'ran late setting up');
  assert.strictEqual(next.length, 1);
  assert.strictEqual(next[0].tag, 'before');
  assert.strictEqual(next[0].text, 'ran late setting up');
});

test('upsertNoteByTag: updates the existing tagged entry in place (no duplicate)', () => {
  const list = [{ id: 'ot1', tag: 'before', text: 'first version' }];
  const next = upsertNoteByTag(list, 'before', 'edited version');
  assert.strictEqual(next.length, 1);
  assert.strictEqual(next[0].id, 'ot1'); // same entry, id preserved
  assert.strictEqual(next[0].text, 'edited version');
});

test('upsertNoteByTag: does not touch entries with a different tag', () => {
  const list = [
    { id: 'ot1', tag: 'before', text: 'before text' },
    { id: 'plain1', tag: null, text: 'free note' },
  ];
  const next = upsertNoteByTag(list, 'after', 'after text');
  assert.strictEqual(next.length, 3);
  assert.ok(next.some((n) => n.tag === 'before' && n.text === 'before text'));
  assert.ok(next.some((n) => n.tag === null && n.text === 'free note'));
  assert.ok(next.some((n) => n.tag === 'after' && n.text === 'after text'));
});

test('upsertNoteByTag: empty text removes the existing tagged entry', () => {
  const list = [
    { id: 'ot1', tag: 'before', text: 'something' },
    { id: 'plain1', tag: null, text: 'keep me' },
  ];
  const next = upsertNoteByTag(list, 'before', '');
  assert.strictEqual(next.length, 1);
  assert.strictEqual(next[0].id, 'plain1');
});

test('upsertNoteByTag: empty text with no matching entry is a no-op', () => {
  const list = [{ id: 'plain1', tag: null, text: 'keep me' }];
  const next = upsertNoteByTag(list, 'after', '');
  assert.strictEqual(next.length, 1);
});

// ============================================================
// getNoteTextByTag
// ============================================================

test('getNoteTextByTag: returns text of the matching tag', () => {
  const list = [{ id: 'a', tag: 'after', text: 'left early' }];
  assert.strictEqual(getNoteTextByTag(list, 'after'), 'left early');
});

test('getNoteTextByTag: returns empty string when no match', () => {
  assert.strictEqual(getNoteTextByTag([{ id: 'a', tag: 'before', text: 'x' }], 'after'), '');
});

test('getNoteTextByTag: returns empty string for non-array input', () => {
  assert.strictEqual(getNoteTextByTag(undefined, 'before'), '');
});

// ============================================================
// computeUnifiedNotesMigration — legacy data → unified array format
// ============================================================

test('computeUnifiedNotesMigration: converts a legacy string note to a tag:null entry', () => {
  const result = computeUnifiedNotesMigration({ '2026-1-15-A': 'legacy note text' }, {});
  const entries = result.notes['2026-1-15-A'];
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].tag, null);
  assert.strictEqual(entries[0].text, 'legacy note text');
});

test('computeUnifiedNotesMigration: drops legacy empty/whitespace string notes', () => {
  const result = computeUnifiedNotesMigration({ '2026-1-15-A': '   ' }, {});
  assert.strictEqual(result.notes['2026-1-15-A'], undefined);
});

test('computeUnifiedNotesMigration: leaves already-migrated array notes untouched', () => {
  const existing = [{ id: 'x1', tag: null, text: 'already unified' }];
  const result = computeUnifiedNotesMigration({ '2026-1-15-A': existing }, {});
  assert.deepStrictEqual(result.notes['2026-1-15-A'], existing);
});

test('computeUnifiedNotesMigration: moves overtime "przed" note into a tag:before entry and strips it from overtimes', () => {
  const overtimes = { '2026-1-15-A': { przed: { hours: 2, note: 'started early' }, po: null } };
  const result = computeUnifiedNotesMigration({}, overtimes);
  const entries = result.notes['2026-1-15-A'];
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].tag, 'before');
  assert.strictEqual(entries[0].text, 'started early');
  assert.strictEqual(result.overtimes['2026-1-15-A'].przed.hours, 2);
  assert.strictEqual('note' in result.overtimes['2026-1-15-A'].przed, false);
});

test('computeUnifiedNotesMigration: moves overtime "po" note into a tag:after entry', () => {
  const overtimes = { '2026-1-15-A': { przed: null, po: { hours: 1.5, note: 'stayed late' } } };
  const result = computeUnifiedNotesMigration({}, overtimes);
  const entries = result.notes['2026-1-15-A'];
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].tag, 'after');
  assert.strictEqual(entries[0].text, 'stayed late');
});

test('computeUnifiedNotesMigration: merges a legacy day note with przed/po notes on the same day into one array', () => {
  const rawNotes = { '2026-1-15-A': 'free note' };
  const overtimes = {
    '2026-1-15-A': {
      przed: { hours: 1, note: 'before note' },
      po: { hours: 2, note: 'after note' },
    },
  };
  const result = computeUnifiedNotesMigration(rawNotes, overtimes);
  const entries = result.notes['2026-1-15-A'];
  assert.strictEqual(entries.length, 3);
  const tags = entries.map((n) => n.tag).sort();
  assert.deepStrictEqual(tags, ['after', 'before', null]);
});

test('computeUnifiedNotesMigration: overtime entries without a note are left as-is (only .note stripped if present)', () => {
  const overtimes = { '2026-1-15-A': { przed: { hours: 3 }, po: null } };
  const result = computeUnifiedNotesMigration({}, overtimes);
  assert.strictEqual(result.overtimes['2026-1-15-A'].przed.hours, 3);
  assert.strictEqual(result.notes['2026-1-15-A'], undefined);
});

test('computeUnifiedNotesMigration: handles empty/undefined inputs gracefully', () => {
  const result = computeUnifiedNotesMigration(undefined, undefined);
  assert.deepStrictEqual(result.notes, {});
  assert.deepStrictEqual(result.overtimes, {});
});

test('computeUnifiedNotesMigration: non-object overtime record is passed through unchanged', () => {
  const result = computeUnifiedNotesMigration({}, { '2026-1-15-A': null });
  assert.strictEqual(result.overtimes['2026-1-15-A'], null);
});


// ============================================================
// Additional edge cases
// ============================================================

test('genNoteId: returns non-empty string', () => {
  const id = genNoteId();
  assert.strictEqual(typeof id, 'string');
  assert.ok(id.length > 0);
});

test('genNoteId: successive ids are unique (smoke 50)', () => {
  const set = new Set();
  for (let i = 0; i < 50; i++) set.add(genNoteId());
  assert.strictEqual(set.size, 50);
});

test('removeNoteEntry: unknown id leaves list unchanged (new array)', () => {
  const list = [{ id: 'a', tag: null, text: 'x' }];
  const next = removeNoteEntry(list, 'missing');
  assert.notStrictEqual(next, list);
  assert.deepStrictEqual(next, list);
});

test('updateNoteText: unknown id leaves list unchanged', () => {
  const list = [{ id: 'a', tag: null, text: 'x' }];
  const next = updateNoteText(list, 'nope', 'y');
  assert.deepStrictEqual(next, list);
});

test('addNoteEntry: trims text and assigns id', () => {
  const result = addNoteEntry([], '  hello  ', null);
  assert.strictEqual(result.list.length, 1);
  assert.strictEqual(result.list[0].text, 'hello');
  assert.strictEqual(result.list[0].tag, null);
  assert.ok(result.id);
  assert.strictEqual(result.list[0].id, result.id);
});

test('addNoteEntry: blank text is not added', () => {
  const result = addNoteEntry([], '   ', null);
  assert.strictEqual(result.list.length, 0);
  assert.strictEqual(result.id, null);
});

test('computeUnifiedNotesMigration: does not mutate input objects', () => {
  const rawNotes = { '2026-1-1-A': '  hi  ' };
  const overtimes = {
    '2026-1-1-A': { przed: { hours: 1, note: ' early ' }, po: null },
  };
  const notesCopy = JSON.parse(JSON.stringify(rawNotes));
  const otCopy = JSON.parse(JSON.stringify(overtimes));
  computeUnifiedNotesMigration(rawNotes, overtimes);
  assert.deepStrictEqual(rawNotes, notesCopy);
  assert.deepStrictEqual(overtimes, otCopy);
});

test('computeUnifiedNotesMigration: whitespace-only overtime note is dropped and stripped', () => {
  const overtimes = {
    '2026-1-1-A': { przed: { hours: 2, note: '  ' }, po: null },
  };
  const result = computeUnifiedNotesMigration({}, overtimes);
  assert.strictEqual(result.notes['2026-1-1-A'], undefined);
  assert.strictEqual('note' in result.overtimes['2026-1-1-A'].przed, false);
  assert.strictEqual(result.overtimes['2026-1-1-A'].przed.hours, 2);
});
