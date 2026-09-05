/* ================================================================
   GRAFIK GILLETTE — Module 9: STATE + NAVIGATION + EVENTS + STARTUP
   ================================================================ */

/* === STAN === */

/* === SETTINGS DEFAULTS (v4.0.0 — General) === */
prefs.startView = prefs.startView || 'dashboard';
prefs.restoreLastView =
  typeof prefs.restoreLastView === 'boolean' ? prefs.restoreLastView : true;

let currentYear = prefs.year || 2026;
let currentMonth = new Date().getMonth() + 1;
let selectedShift = prefs.shift || 'A';
let compareShift = null;
let selectedDay = null;
/* Startup view: URL parameters override everything (applyUrlParams below);
   otherwise honor restoreLastView, falling back to the start view. */
let currentView = prefs.restoreLastView
  ? prefs.view || prefs.startView
  : prefs.startView;
let yearMode = prefs.yearMode || false;
let editMode = false;

let editPaletteMode = 'URLOP';
let popupFadeTimer = null;

/* === HELPER: Safe event binding === */
function bindEvent(id, event, handler) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener(event, handler);
  } else {
    console.warn(`[main.js] Element #${id} not found — event "${event}" not bound`);
  }
}

/* === URL PARAMS === */
(function applyUrlParams() {
  const p = new URLSearchParams(window.location.search);
  if (!p.toString()) return; // немає параметрів — виходимо

  // View
  const v = p.get('view');
  if (v && ['dashboard', 'month', 'table'].includes(v)) {
    currentView = v;
    prefs.view = v;
  }

  // Rok mode
  if (p.get('rok') === '1') {
    yearMode = true;
    prefs.yearMode = true;
  }

  // Year
  const y = parseInt(p.get('y'), 10);
  if (y >= MIN_YEAR && y <= MAX_YEAR) {
    currentYear = y;
    prefs.year = y;
  }

  // Month
  const m = parseInt(p.get('m'), 10);
  if (m >= 1 && m <= 12) {
    currentMonth = m;
  }

  // Day
  const d = parseInt(p.get('d'), 10);
  if (d >= 1 && d <= 31) {
    selectedDay = d;
  }

  // Brigade
  const b = (p.get('brig') || '').toUpperCase();
  if (['A', 'B', 'C', 'D'].includes(b)) {
    selectedShift = b;
    prefs.shift = b;
  }

  // Save updated prefs
  savePrefs(prefs);
})();

if (currentYear < MIN_YEAR) currentYear = MIN_YEAR;
if (currentYear > MAX_YEAR) currentYear = MAX_YEAR;

// Clear the URL after loading parameters
if (window.location.search) {
  history.replaceState({}, '', window.location.pathname);
}

/* === VIEW SWITCHER === */
function switchView(view) {
  currentView = view;
  prefs.view = view;
  savePrefs(prefs);
  if (typeof updateAppShellUI === 'function') updateAppShellUI();
  refreshViews();
}

/* View switching and Month/Year range are bound in js/app-shell.js (v4.0.0);
   updateAppShellUI() mirrors the state into the top bar, nav and toolbar. */

window.addEventListener('driveAuthChanged', () => {
  try {
    refreshViews();
  } catch (e) {
    console.warn('[main] refresh after auth', e);
  }
});

function refreshViews() {
  const views = ['dashboardView', 'monthView', 'yearView', 'tableView'];
  views.forEach((v) => (document.getElementById(v).style.display = 'none'));

  updateEditModeUI();
  if (typeof updateAppShellUI === 'function') updateAppShellUI();

  const empty =
    !hasFactoryData(currentYear) &&
    !hasCustomData(currentYear) &&
    currentView !== 'dashboard' &&
    !editMode;

  // Remove the old overtime summary when switching views
  const oldOtSum = document.getElementById('otMonthSummary');
  if (oldOtSum) oldOtSum.remove();

  if (currentView === 'dashboard') {
    document.getElementById('dashboardView').style.display = 'block';
    renderDashboard();
  } else if (currentView === 'month') {
    if (yearMode) {
      document.getElementById('yearView').style.display = 'grid';
      if (empty) {
        renderEmptyState(document.getElementById('yearView'));
        document.getElementById('yearView').style.display = 'block';
        return;
      }
      renderYearView();
    } else {
      document.getElementById('monthView').style.display = 'block';
      if (empty) {
        document.getElementById('calendar').innerHTML = '';
        renderEmptyState(document.getElementById('calendar'));
        document.getElementById('infoPanel').innerHTML = '';
        document.getElementById('monthTitle').textContent =
          `${monthNames[currentMonth - 1]} ${currentYear}`;
        return;
      }
      renderCalendar();
      renderInfo();
    }
  } else if (currentView === 'table') {
    document.getElementById('tableView').style.display = 'block';
    if (empty) {
      renderEmptyState(document.getElementById('tableView'));
      return;
    }
    renderTableView(yearMode);
  }
}

function updateShiftButtons() {
  document.querySelectorAll('.shift-btn').forEach((b) => {
    b.classList.remove('active');
    b.classList.remove('compare');
    if (b.dataset.shift === selectedShift) b.classList.add('active');
  });
}
/* Year picker removed (v4.0.0) — year lives in the context toolbar + top bar. */
function updatePrivacyMenuUI() {
  const toggle = document.getElementById('menuPrivacyToggle');
  const on = !!(prefs && prefs.privacyMode);
  if (toggle) {
    toggle.setAttribute('aria-checked', on ? 'true' : 'false');
    toggle.classList.toggle('checked', on);
  }
}

bindClick('menuPrivacyToggle', () => {
  const next = !(prefs && prefs.privacyMode);
  if (typeof setPrivacyMode === 'function') setPrivacyMode(next);
  else {
    prefs.privacyMode = next;
    savePrefs(prefs);
    refreshViews();
  }
  updatePrivacyMenuUI();
  showToast('info', next ? t('privacyOnToast') : t('privacyOffToast'), 3000);
  closeSideMenu();
});

function updateEditModeUI() {
  document.body.classList.toggle('edit-active', editMode);
  const btn = document.getElementById('editModeToggle');
  if (btn) {
    btn.classList.toggle('edit-active', editMode);
    btn.title = editMode ? t('editModeOn') : t('editModeOff');
  }
  document.getElementById('editBanner').classList.toggle('show', editMode);
  document.getElementById('editPalette').classList.toggle('show', editMode);
  updateDirtyIndicator();
}

/* === EDIT MODE === */
function requestEditModeToggle() {
  if (!editMode) {
    // Personal edits need privacy mode off (local data always available otherwise)
    if (typeof shouldShowPersonalData === 'function' && !shouldShowPersonalData()) {
      showToast('warn', t('editNeedPrivacyOff'), 4000);
      return;
    }
    if (!prefs.skipEditConfirm) {
      showConfirm(
        t('enableEditTitle'),
        t('enableEditBody'),
        () => {
          editMode = true;
          refreshViews();
          showToast('info', t('editModeOnToast'), 4000);
        },
        { primaryText: t('enableEditConfirm'), primaryClass: 'primary' }
      );
    } else {
      editMode = true;
      refreshViews();
      showToast('info', t('editModeOnShort'));
    }
  } else {
    // Auto-save model — nothing pending; just leave edit mode
    editMode = false;
    refreshViews();
  }
}
/* Bound to the hidden transitional #editModeToggle stub so legacy inline
   handlers (views.js empty state) keep working. */
bindClick('editModeToggle', requestEditModeToggle);

document.querySelectorAll('.palette-btn').forEach((btn) => {
  btn.onclick = () => {
    // Admin-only buttons (factory shift structure: R/P/N/W) must stay
    // gated even if triggered directly (e.g. via a hidden element),
    // not just hidden by CSS — keep this in sync with the keyboard
    // shortcut check below.
    if (
      btn.classList.contains('admin-only') &&
      !(typeof isCurrentUserAdmin === 'function' && isCurrentUserAdmin())
    ) {
      return;
    }
    editPaletteMode = btn.dataset.shift;
    document.querySelectorAll('.palette-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const name = shiftFullName[editPaletteMode] || editPaletteMode;
    showToast('info', t('paletteSelected', { name }), 1200);
  };
});
function setPaletteMode(mode) {
  editPaletteMode = mode;
  document
    .querySelectorAll('.palette-btn')
    .forEach((b) => b.classList.toggle('active', b.dataset.shift === mode));
  const name = shiftFullName[mode] || mode;
  showToast('info', t('paletteChanged', { name }), 1000);
}

/* === NAWIGACJA === */
function goToMonth(delta) {
  currentMonth += delta;
  if (currentMonth < 1) {
    currentMonth = 12;
    goToYear(-1, true);
    return;
  }
  if (currentMonth > 12) {
    currentMonth = 1;
    goToYear(1, true);
    return;
  }
  selectedDay = null;
  refreshViews();
}
window.goToMonth = goToMonth;
function goToYear(delta, keepMonth) {
  const newYear = currentYear + delta;
  if (newYear < MIN_YEAR || newYear > MAX_YEAR) return;
  currentYear = newYear;
  if (!keepMonth) selectedDay = null;
  prefs.year = currentYear;
  savePrefs(prefs);
  refreshViews();
}
window.goToYear = goToYear;
/* Period step: month in Month range, year in Year range. Used by the
   context toolbar arrows (js/app-shell.js) and the keyboard arrows. */
function goToPeriod(delta) {
  if (yearMode) goToYear(delta);
  else goToMonth(delta);
}
window.goToPeriod = goToPeriod;

/* === KEYBOARD === */
document.addEventListener('keydown', (e) => {
  if (
    e.target.tagName === 'INPUT' ||
    e.target.tagName === 'SELECT' ||
    e.target.tagName === 'TEXTAREA'
  )
    return;

  if (e.key === 'Escape') {
    // App panel / action sheet handle their own Escape (app-shell.js)
    if (typeof isActionSheetOpen === 'function' && isActionSheetOpen()) return;
    if (typeof isAppPanelOpen === 'function' && isAppPanelOpen()) return;
    if (document.getElementById('otOverlay').classList.contains('show')) {
      document.getElementById('otOverlay').classList.remove('show');
      return;
    }
    if (document.getElementById('modalOverlay').classList.contains('show')) {
      hideModal();
      return;
    }
    if (document.getElementById('faqOverlay').classList.contains('show')) {
      document.getElementById('faqOverlay').classList.remove('show');
      return;
    }
    if (typeof isSideMenuOpen === 'function' && isSideMenuOpen()) {
      closeSideMenu();
      return;
    }
    if (editMode) {
      requestEditModeToggle();
      return;
    }
    if (selectedDay) {
      selectedDay = null;
      refreshViews();
    }
    return;
  }

  if (editMode) {
    const k = e.key.toLowerCase();
    if (k === 'u') {
      setPaletteMode('URLOP');
      return;
    }
    if (k === 's') {
      setPaletteMode('ADDSHIFT');
      return;
    }
    if (k === '1') {
      setPaletteMode('OTBEFORE');
      return;
    }
    if (k === '2') {
      setPaletteMode('OTAFTER');
      return;
    }

    // Admin-only hotkeys for factory schedule editing
    if (typeof isCurrentUserAdmin === 'function' && isCurrentUserAdmin()) {
      if (k === 'r') {
        setPaletteMode('R');
        return;
      }
      if (k === 'p') {
        setPaletteMode('P');
        return;
      }
      if (k === 'n') {
        setPaletteMode('N');
        return;
      }
      if (k === 'w') {
        setPaletteMode('W');
        return;
      }
    }
  }

  if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.altKey) {
    requestEditModeToggle();
    return;
  }

  if (currentView === 'month' || currentView === 'table') {
    if (e.key === 'ArrowLeft') goToPeriod(-1);
    else if (e.key === 'ArrowRight') goToPeriod(1);
  }
});

/* === GESTY (swipe) === */
/* Month view only: horizontal swipe changes month.
   Table view: swipe disabled — it fights horizontal scroll (scroll position
   was reset because goToMonth() re-rendered the whole table). */
let touchStartX = 0;
let touchStartY = 0;
let touchStartTarget = null;
document.addEventListener(
  'touchstart',
  (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTarget = e.target;
  },
  { passive: true }
);
document.addEventListener('touchend', (e) => {
  if (currentView !== 'month') return;
  // Ignore swipes that started inside a horizontal scroller
  if (touchStartTarget && touchStartTarget.closest && touchStartTarget.closest('.table-scroll, .dash-upcoming-list')) {
    return;
  }
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) {
    goToMonth(dx > 0 ? -1 : 1);
  }
});

/* === BRIGADE SELECTION === */
document.querySelectorAll('.shift-btn').forEach((btn) => {
  btn.onclick = (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (btn.dataset.shift === selectedShift) return;
      if (compareShift === btn.dataset.shift) {
        compareShift = null;
        btn.classList.remove('compare');
      } else {
        document.querySelectorAll('.shift-btn').forEach((b) => b.classList.remove('compare'));
        compareShift = btn.dataset.shift;
        btn.classList.add('compare');
      }
    } else {
      document.querySelectorAll('.shift-btn').forEach((b) => {
        b.classList.remove('active');
        b.classList.remove('compare');
      });
      btn.classList.add('active');
      selectedShift = btn.dataset.shift;
      compareShift = null;
      prefs.shift = selectedShift;
      savePrefs(prefs);
    }
    refreshViews();
  };
});

/* === TODAY === */
bindClick('todayBtn', () => {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth() + 1;
  selectedDay = now.getDate(); // select today
  yearMode = false;
  prefs.year = currentYear;
  prefs.yearMode = false;
  savePrefs(prefs);
  switchView('month'); // always open Month view on today's date
});

/* beforeunload removed — all edits auto-save to localStorage */

/* === AUTO REFRESH === */
if (!window._gilletteTimer) {
  window._gilletteTimer = setInterval(() => {
    if (currentView === 'dashboard') renderDashboard();
    else if (currentView === 'month' && selectedDay) {
      const today = new Date();
      if (
        today.getFullYear() === currentYear &&
        today.getMonth() + 1 === currentMonth &&
        (today.getDate() === selectedDay || today.getDate() === selectedDay + 1)
      ) {
        renderInfo();
      }
    }
  }, 60000);
}

/* === START === */
updateShiftButtons();
if (typeof updateAppShellUI === 'function') updateAppShellUI();
refreshViews();

if (!prefs.welcomed) {
  setTimeout(() => {
    showToast('info', t('welcome'), 6000);
    prefs.welcomed = true;
    savePrefs(prefs);
  }, 500);
}

/* === LANGUAGE (v4.0.0) ===
   Top-bar language switcher removed — the language picker moves into the
   Settings panel in a later task. setLanguage() stays available globally. */

/* === APPLY LOCALIZATION === */
applyTranslations();

/* === PERSONALIZATION (cell colors) === */
if (typeof applyPersonalization === 'function') applyPersonalization();
else if (typeof applyCellColors === 'function') applyCellColors();

/* === ACCESSIBILITY PREFERENCES === */
if (typeof applyAccessibilityPreferences === 'function') applyAccessibilityPreferences();
