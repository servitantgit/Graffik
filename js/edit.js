/* ================================================================
   GRAFIK GILLETTE — Module 4: EDIT (immediate save)
   ================================================================ */

/**
 * Read shift including any in-memory overlay.
 * Kept for API compatibility — edits now write straight to customSchedule,
 * so this is identical to getShiftAt().
 */
function getShiftAtWithPending(year, month, day, brigade) {
  return getShiftAt(year, month, day, brigade);
}

/** No pending buffer — always clean. Kept so call sites don't break. */
function isDirty(/* year, month, day, brigade */) {
  return false;
}

/**
 * Apply a shift edit and save immediately (same model as urlop / overtime).
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @param {string} brigade
 * @param {string} [forcedValue] — if omitted, cycles R→P→N→free
 * @returns {string} new shift value
 */
function applyEdit(year, month, day, brigade, forcedValue) {
  let next;
  if (forcedValue !== undefined) {
    next = forcedValue;
  } else {
    const cur = getShiftAt(year, month, day, brigade) || '';
    const idx = SHIFT_CYCLE.indexOf(cur);
    next = SHIFT_CYCLE[(idx + 1) % SHIFT_CYCLE.length];
  }
  setShift(year, month, day, brigade, next);
  return next;
}

/** No-ops kept for any leftover call sites */
function updateDirtyIndicator() {}
function saveAllPendingChanges() {
  return true;
}
function discardAllPendingChanges() {
  return true;
}
function undoLastEdit() {
  return false;
}
function redoLastEdit() {
  return false;
}

// Compatibility stubs (empty buffer)
let pendingChanges = {};
let pendingOriginals = {};
let undoStack = [];
let redoStack = [];
