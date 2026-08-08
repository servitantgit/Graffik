/* ================================================================
   GRAFIK GILLETTE — Moduł 4: BUFOR ZMIAN (EDIT)
   ================================================================ */

let pendingChanges = {};
let pendingOriginals = {};

function pendingKey(year, month, day, brigade) { return `${year}-${month}-${day}-${brigade}`; }
function getShiftAtWithPending(year, month, day, brigade) {
  const k = pendingKey(year, month, day, brigade);
  if (pendingChanges.hasOwnProperty(k)) return pendingChanges[k];
  return getShiftAt(year, month, day, brigade);
}
function isDirty(year, month, day, brigade) { return pendingChanges.hasOwnProperty(pendingKey(year, month, day, brigade)); }

function applyEdit(year, month, day, brigade, forcedValue) {
  const k = pendingKey(year, month, day, brigade);
  if (!pendingOriginals.hasOwnProperty(k)) {
    pendingOriginals[k] = getShiftAt(year, month, day, brigade) || '';
  }
  let next;
  if (forcedValue !== undefined) {
    next = forcedValue;
  } else {
    const cur = getShiftAtWithPending(year, month, day, brigade) || '';
    const idx = SHIFT_CYCLE.indexOf(cur);
    next = SHIFT_CYCLE[(idx + 1) % SHIFT_CYCLE.length];
  }
  const prev = getShiftAtWithPending(year, month, day, brigade) || '';
  undoStack.push({ k, prev, orig: pendingOriginals[k], wasDirty: pendingChanges.hasOwnProperty(k) });
  if (undoStack.length > 100) undoStack.shift();

  if (next === pendingOriginals[k]) {
    delete pendingChanges[k];
    delete pendingOriginals[k];
  } else {
    pendingChanges[k] = next;
  }
  updateDirtyIndicator();
  return next;
}

function undoLastEdit() {
  if (undoStack.length === 0) { showToast('info', 'Nie ma czego cofnąć'); return false; }
  const last = undoStack.pop();
  if (last.prev === last.orig) {
    delete pendingChanges[last.k];
    if (!last.wasDirty) delete pendingOriginals[last.k];
  } else {
    pendingChanges[last.k] = last.prev;
    if (!last.wasDirty) pendingOriginals[last.k] = last.orig;
  }
  updateDirtyIndicator();
  refreshViews();
  return true;
}

function saveAllPendingChanges() {
  const count = Object.keys(pendingChanges).length;
  if (count === 0) { showToast('info', 'Brak zmian do zapisania'); return false; }
  showConfirm(
    `💾 Zapisać ${count} ${count === 1 ? 'zmianę' : 'zmian'}?`,
    'Zmiany zostaną trwale zapisane w Twojej przeglądarce.',
    () => {
      Object.keys(pendingChanges).forEach(k => {
        const segments = k.split('-');
        if (segments.length !== 4) return;
        const yy = parseInt(segments[0], 10);
        const mm = parseInt(segments[1], 10);
        const dd = parseInt(segments[2], 10);
        const brig = segments[3];
        if (isNaN(yy) || isNaN(mm) || isNaN(dd) || !brig) return;
        setShift(yy, mm, dd, brig, pendingChanges[k]);
      });
      pendingChanges = {};
      pendingOriginals = {};
      undoStack = [];
      updateDirtyIndicator();
      refreshViews();
      showToast('success', `Zapisano ${count} ${count === 1 ? 'zmianę' : 'zmian'}`);
    },
    { primaryText: '💾 Zapisz', primaryClass: 'success' }
  );
  return true;
}

function discardAllPendingChanges() {
  const count = Object.keys(pendingChanges).length;
  if (count === 0) return true;
  showConfirm(
    `↶ Cofnąć wszystkie niezapisane zmiany?`,
    `Zostaną odrzucone ${count} ${count === 1 ? 'zmiana' : 'zmian'}.`,
    () => {
      pendingChanges = {};
      pendingOriginals = {};
      undoStack = [];
      updateDirtyIndicator();
      refreshViews();
      showToast('info', 'Zmiany cofnięte');
    },
    { primaryText: '↶ Cofnij', primaryClass: 'danger' }
  );
  return true;
}

function updateDirtyIndicator() {
  const count = Object.keys(pendingChanges).length;
  const ind = getElementByIdSafe('dirtyIndicator');
  const cnt = getElementByIdSafe('dirtyCount');
  const saveBtn = getElementByIdSafe('saveChangesBtn');
  const discardBtn = getElementByIdSafe('discardChangesBtn');
  if (ind) ind.style.display = count > 0 ? 'inline-block' : 'none';
  if (cnt) cnt.textContent = count;
  if (saveBtn) saveBtn.disabled = count === 0;
  if (discardBtn) discardBtn.disabled = count === 0;
}