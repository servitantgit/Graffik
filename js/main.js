/* ================================================================
   GRAFIK GILLETTE — Moduł 9: STAN + NAWIGACJA + ZDARZENIA + START
   ================================================================ */

/* === STAN === */
let currentYear = prefs.year || 2026;
let currentMonth = new Date().getMonth() + 1;
let selectedShift = prefs.shift || 'A';
let compareShift = null;
let selectedDay = null;
let currentView = prefs.view || 'dashboard';
let yearMode = prefs.yearMode || false;
let editMode = false;
let editPaletteMode = 'CYCLE';
let weekSummaryClosed = false;
let popupFadeTimer = null;
let undoStack = [];

/* === URL === */
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('year')) currentYear = parseInt(urlParams.get('year'), 10) || currentYear;
if (urlParams.get('date')) {
  const parts = urlParams.get('date').split('-');
  if (parts.length === 3) {
    currentYear = parseInt(parts[0], 10) || currentYear;
    currentMonth = parseInt(parts[1], 10) || currentMonth;
    selectedDay = parseInt(parts[2], 10) || selectedDay;
  }
}
if (urlParams.get('brig')) selectedShift = urlParams.get('brig').toUpperCase();
if (currentYear < MIN_YEAR) currentYear = MIN_YEAR;
if (currentYear > MAX_YEAR) currentYear = MAX_YEAR;

/* === VIEW SWITCHER === */
function switchView(view) {
  currentView = view;
  prefs.view = view;
  savePrefs(prefs);
  document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  updateYearToggleState();
  refreshViews();
}

function updateYearToggleState() {
  const lbl = document.getElementById('yearToggleLabel');
  const cb = document.getElementById('yearToggle');
  const isSupported = currentView === 'month' || currentView === 'table';
  if (!isSupported) {
    lbl.classList.add('disabled');
    lbl.classList.remove('active');
    cb.checked = false;
  } else {
    lbl.classList.remove('disabled');
    cb.checked = yearMode;
    lbl.classList.toggle('active', yearMode);
  }
}
document.querySelectorAll('#viewSwitcher .view-btn').forEach(b => {
  b.onclick = () => switchView(b.dataset.view);
});
document.getElementById('yearToggle').addEventListener('change', (e) => {
  yearMode = e.target.checked;
  prefs.yearMode = yearMode;
  savePrefs(prefs);
  document.getElementById('yearToggleLabel').classList.toggle('active', yearMode);
  refreshViews();
});

function refreshViews() {
  const views = ['dashboardView', 'monthView', 'weekView', 'yearView', 'tableView'];
  views.forEach(v => document.getElementById(v).style.display = 'none');

  updateYearPicker();
  updateEditModeUI();
  updateYearToggleState();

  const empty = !hasFactoryData(currentYear) && !hasCustomData(currentYear) && currentView !== 'dashboard';
  const actionButtons = getElementByIdSafe('actionButtons');
  if (actionButtons) actionButtons.style.display = currentView === 'dashboard' ? 'none' : 'block';

  // Usuwamy stare podsumowanie nadgodzin przy przełączaniu widoku
  const oldOtSum = document.getElementById('otMonthSummary');
  if (oldOtSum) oldOtSum.remove();

  if (currentView === 'dashboard') {
    document.getElementById('dashboardView').style.display = 'block';
    renderDashboard();
  } else if (currentView === 'week') {
    document.getElementById('weekView').style.display = 'block';
    if (empty) { renderEmptyState(document.getElementById('weekViewGrid')); document.getElementById('weekTitle').textContent = `📆 ${currentYear}`; return; }
    renderWeekView();
  } else if (currentView === 'month') {
    if (yearMode) {
      document.getElementById('yearView').style.display = 'grid';
      if (empty) { renderEmptyState(document.getElementById('yearView')); document.getElementById('yearView').style.display = 'block'; return; }
      renderYearView();
    } else {
      document.getElementById('monthView').style.display = 'block';
      if (empty) { document.getElementById('calendar').innerHTML = ''; renderEmptyState(document.getElementById('calendar')); document.getElementById('infoPanel').innerHTML=''; document.getElementById('monthTitle').textContent=`${monthNames[currentMonth-1]} ${currentYear}`; return; }
      renderCalendar();
      renderInfo();
    }
  } else if (currentView === 'table') {
    document.getElementById('tableView').style.display = 'block';
    if (empty) { renderEmptyState(document.getElementById('tableView')); return; }
    renderTableView(yearMode);
  }
}

function updateShiftButtons() {
  document.querySelectorAll('.shift-btn').forEach(b => {
    b.classList.remove('active');
    b.classList.remove('compare');
    if (b.dataset.shift === selectedShift) b.classList.add('active');
  });
}
function updateYearPicker() {
  document.getElementById('yearCurrent').textContent = currentYear;
  const yp = document.getElementById('yearPicker');
  if (hasFactoryData(currentYear) || hasCustomData(currentYear)) {
    yp.classList.remove('no-data');
    yp.title = hasCustomData(currentYear) ? `Rok ${currentYear} — z Twoimi zmianami` : `Rok ${currentYear} — dane fabryczne`;
  } else {
    yp.classList.add('no-data');
    yp.title = `Rok ${currentYear} — brak danych, użyj ✏️`;
  }
}
function updateEditModeUI() {
  document.body.classList.toggle('edit-active', editMode);
  const btn = document.getElementById('editModeToggle');
  btn.classList.toggle('edit-active', editMode);
  btn.title = editMode ? 'Wyłącz tryb edycji (E)' : 'Włącz tryb edycji (E)';
  document.getElementById('editBanner').classList.toggle('show', editMode);
  document.getElementById('editPalette').classList.toggle('show', editMode);
  updateDirtyIndicator();
}

/* === EDIT MODE === */
document.getElementById('editModeToggle').onclick = () => {
  if (!editMode) {
    if (!prefs.skipEditConfirm) {
      showConfirm(
        '✏️ Włączyć tryb edycji?',
        'Kliknięcia w komórki zmienią zmiany.<br><br>Wybierz "malowaną" zmianę w palecie na dole (lub użyj skrótu R/P/N/W).<br>Aby dodać <b>nadgodziny</b> — wybierz <b>⏱</b> (lub klawisz O).<br><br>Zmiany <b>NIE zapisują się automatycznie</b> — trzeba kliknąć <b>💾 Zapisz</b>.',
        () => { editMode = true; refreshViews(); showToast('info', 'Tryb edycji WŁ. Skróty: R/P/N/W/C/O', 4000); },
        { primaryText: '✏️ Włącz', primaryClass: 'primary' }
      );
    } else {
      editMode = true;
      refreshViews();
      showToast('info', 'Tryb edycji WŁ');
    }
  } else {
    const pc = Object.keys(pendingChanges).length;
    if (pc > 0) {
      showConfirm(
        `⚠️ Masz ${pc} niezapisanych zmian`,
        'Wybierz co zrobić:',
        () => { pendingChanges = {}; pendingOriginals = {}; undoStack = []; editMode = false; refreshViews(); showToast('warn', 'Zmiany odrzucone'); },
        { primaryText: 'Odrzuć i wyjdź', primaryClass: 'danger' }
      );
    } else {
      editMode = false;
      refreshViews();
    }
  }
};

document.querySelectorAll('.palette-btn').forEach(btn => {
  btn.onclick = () => {
    editPaletteMode = btn.dataset.shift;
    document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    let name;
    if (editPaletteMode === 'CYCLE') name = 'Cykl';
    else if (editPaletteMode === 'OT') name = '⏱ Nadgodziny';
    else if (editPaletteMode === '') name = 'Wolne';
    else name = editPaletteMode;
    showToast('info', `Wybrano: ${name}`, 1200);
    if (editPaletteMode === 'OT' && selectedDay) refreshViews();
  };
});
function setPaletteMode(mode) {
  editPaletteMode = mode;
  document.querySelectorAll('.palette-btn').forEach(b => b.classList.toggle('active', b.dataset.shift === mode));
  let name;
  if (mode === 'CYCLE') name = 'Cykl';
  else if (mode === 'OT') name = '⏱ Nadgodziny';
  else if (mode === '') name = 'Wolne';
  else name = mode;
  showToast('info', `Paleta: ${name}`, 1000);
  if (mode === 'OT' && selectedDay) refreshViews();
}

document.getElementById('saveChangesBtn').onclick = saveAllPendingChanges;
document.getElementById('discardChangesBtn').onclick = discardAllPendingChanges;

/* === NAWIGACJA === */
function goToMonth(delta) {
  currentMonth += delta;
  if (currentMonth < 1) { currentMonth = 12; goToYear(-1, true); return; }
  if (currentMonth > 12) { currentMonth = 1; goToYear(1, true); return; }
  selectedDay = null;
  refreshViews();
}
function goToYear(delta, keepMonth) {
  const newYear = currentYear + delta;
  if (newYear < MIN_YEAR || newYear > MAX_YEAR) return;
  const pFY = Object.keys(pendingChanges).filter(k => parseInt(k.split('-')[0], 10) === currentYear).length;
  if (editMode && pFY > 0) {
    showConfirm(
      `⚠️ ${pFY} niezapisanych zmian dla ${currentYear}`,
      'Zmiany pozostaną w buforze, ale nie będą widoczne po przełączeniu roku.',
      () => { currentYear = newYear; if (!keepMonth) selectedDay = null; prefs.year = currentYear; savePrefs(prefs); refreshViews(); },
      { primaryText: 'Przełącz', primaryClass: 'primary' }
    );
    return;
  }
  currentYear = newYear;
  if (!keepMonth) selectedDay = null;
  prefs.year = currentYear;
  savePrefs(prefs);
  refreshViews();
}
document.getElementById('prevMonthBtn').onclick = () => goToMonth(-1);
document.getElementById('nextMonthBtn').onclick = () => goToMonth(1);
document.getElementById('prevYearBtn').onclick = () => goToYear(-1);
document.getElementById('nextYearBtn').onclick = () => goToYear(1);

/* === KEYBOARD === */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

  if (e.key === 'Escape') {
    if (document.getElementById('otOverlay').classList.contains('show')) { document.getElementById('otOverlay').classList.remove('show'); return; }
    if (document.getElementById('modalOverlay').classList.contains('show')) { hideModal(); return; }
    if (document.getElementById('faqOverlay').classList.contains('show')) { document.getElementById('faqOverlay').classList.remove('show'); return; }
    if (sideMenu.classList.contains('show')) { closeSideMenu(); return; }
    if (editMode) { document.getElementById('editModeToggle').click(); return; }
    if (selectedDay) { selectedDay = null; refreshViews(); }
    return;
  }

  if (editMode) {
    if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveAllPendingChanges(); return; }
    if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undoLastEdit(); return; }
    const k = e.key.toLowerCase();
    if (k === 'r') { setPaletteMode('R'); return; }
    if (k === 'p') { setPaletteMode('P'); return; }
    if (k === 'n') { setPaletteMode('N'); return; }
    if (k === 'w') { setPaletteMode(''); return; }
    if (k === 'c') { setPaletteMode('CYCLE'); return; }
    if (k === 'o') { setPaletteMode('OT'); return; }
  }

  if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.altKey) { document.getElementById('editModeToggle').click(); return; }

  if (currentView === 'month' || currentView === 'table') {
    if (e.key === 'ArrowLeft') goToMonth(-1);
    else if (e.key === 'ArrowRight') goToMonth(1);
  } else if (currentView === 'week') {
    if (e.key === 'ArrowLeft') { ensureWeekStart(); weekStartDate.setDate(weekStartDate.getDate() - 7); renderWeekView(); }
    else if (e.key === 'ArrowRight') { ensureWeekStart(); weekStartDate.setDate(weekStartDate.getDate() + 7); renderWeekView(); }
  }
});

/* === GESTY (swipe) === */
let touchStartX = 0;
document.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, {passive:true});
document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 60) {
    if (currentView === 'month' || currentView === 'table') goToMonth(dx > 0 ? -1 : 1);
    else if (currentView === 'week') { ensureWeekStart(); weekStartDate.setDate(weekStartDate.getDate() + (dx > 0 ? -7 : 7)); renderWeekView(); }
  }
});

/* === WYBÓR BRYGADY === */
document.querySelectorAll('.shift-btn').forEach(btn => {
  btn.onclick = e => {
    if (e.ctrlKey || e.metaKey) {
      if (btn.dataset.shift === selectedShift) return;
      if (compareShift === btn.dataset.shift) { compareShift = null; btn.classList.remove('compare'); }
      else {
        document.querySelectorAll('.shift-btn').forEach(b => b.classList.remove('compare'));
        compareShift = btn.dataset.shift;
        btn.classList.add('compare');
      }
    } else {
      document.querySelectorAll('.shift-btn').forEach(b => { b.classList.remove('active'); b.classList.remove('compare'); });
      btn.classList.add('active');
      selectedShift = btn.dataset.shift;
      compareShift = null;
      prefs.shift = selectedShift;
      savePrefs(prefs);
    }
    refreshViews();
  };
});

/* === DZIŚ === */
document.getElementById('todayBtn').onclick = () => {
  const t = new Date();
  currentYear = t.getFullYear();
  currentMonth = t.getMonth() + 1;
  selectedDay = t.getDate();
  prefs.year = currentYear;
  savePrefs(prefs);
  if (currentView === 'dashboard') refreshViews();
  else switchView('month');
};

/* === WEEK SUMMARY CLOSE === */
document.getElementById('wsCloseBtn').onclick = () => {
  document.getElementById('weekSummary').style.display = 'none';
  weekSummaryClosed = true;
};

/* === beforeunload === */
window.addEventListener('beforeunload', (e) => {
  if (Object.keys(pendingChanges).length > 0) { e.preventDefault(); e.returnValue = ''; }
});

/* === AUTO REFRESH === */
if (!window._gilletteTimer) {
  window._gilletteTimer = setInterval(() => {
    if (currentView === 'dashboard') renderDashboard();
    else if (currentView === 'month' && selectedDay) {
      const today = new Date();
      if (today.getFullYear() === currentYear && (today.getMonth()+1) === currentMonth &&
          (today.getDate() === selectedDay || today.getDate() === selectedDay + 1)) {
        renderInfo();
      }
    }
  }, 60000);
}

/* === START === */
updateShiftButtons();
updateYearPicker();
document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === currentView));
document.getElementById('yearToggle').checked = yearMode;
refreshViews();

if (!prefs.welcomed) {
  setTimeout(() => {
    showToast('info', '👋 Witaj! Kliknij ☰ Menu → Pomoc, aby zobaczyć wszystkie funkcje.', 6000);
    prefs.welcomed = true;
    savePrefs(prefs);
  }, 500);
}