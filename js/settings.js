/* ================================================================
   GRAFIK GILLETTE — Settings panel (v4.0.0)
   Full-screen Settings built on window.openAppPanel / pushAppPanel.
   This task implements the General and Appearance sections; the
   remaining cards on the main screen are disabled placeholders that
   the next tasks will activate (title only — no placeholder text,
   so nothing is hardcoded). Low-level personalization logic stays
   in js/personalization.js.
   ================================================================ */

(function () {
  'use strict';

  function tr(key) {
    return typeof t === 'function' ? t(key) : key;
  }

  /* ---------- small helpers ---------- */

  function savePrefsSafe() {
    if (typeof savePrefs === 'function') {
      try {
        savePrefs(prefs);
      } catch (e) {
        /* ignore */
      }
    }
  }

  function refreshViewsSafe() {
    if (typeof refreshViews === 'function') {
      try {
        refreshViews();
      } catch (e) {
        /* ignore */
      }
    }
  }

  function toast(type, key) {
    if (typeof showToast === 'function') showToast(type, tr(key));
  }

  function segBtn(label, value, current, dataAttr) {
    const on = value === current;
    return (
      '<button type="button" class="seg-btn' + (on ? ' active' : '') +
      '" ' + dataAttr + '="' + value + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
      label + '</button>'
    );
  }

  function setActive(scope, attr, value) {
    if (!scope) return;
    scope.querySelectorAll('.seg-btn[data-' + attr + ']').forEach(function (btn) {
      const on = btn.getAttribute('data-' + attr) === value;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /* ---------- main screen (cards) ---------- */

  const SECTIONS = [
    { id: 'general', titleKey: 'settingsGeneral', icon: '🧭', active: true },
    { id: 'appearance', titleKey: 'settingsAppearance', icon: '🎨', active: true },
    { id: 'notifications', titleKey: 'settingsNotifications', icon: '🔔', active: true },
    { id: 'vacation', titleKey: 'settingsVacation', icon: '🌴', active: true },
    { id: 'privacy', titleKey: 'settingsDataPrivacy', icon: '🔒', active: false },
    { id: 'accessibility', titleKey: 'settingsAccessibility', icon: '♿', active: true },
  ];

  const SECTION_TITLES = {
    general: 'settingsGeneral',
    appearance: 'settingsAppearance',
    notifications: 'settingsNotifications',
    vacation: 'settingsVacation',
    accessibility: 'settingsAccessibility',
  };

  let currentScreen = 'main'; // 'main' | 'general' | 'appearance'

  function mainCardsHtml() {
    return (
      '<div class="settings-cards">' +
      SECTIONS.map(function (s) {
        const body =
          '<span class="sc-body"><span class="sc-title">' + tr(s.titleKey) + '</span></span>';
        if (s.active) {
          return (
            '<button type="button" class="settings-card" data-section="' + s.id + '">' +
            '<span class="sc-icon">' + s.icon + '</span>' + body +
            '<span class="sc-arrow" aria-hidden="true">›</span></button>'
          );
        }
        return (
          '<div class="settings-card is-disabled" aria-disabled="true">' +
          '<span class="sc-icon">' + s.icon + '</span>' + body + '</div>'
        );
      }).join('') +
      '</div>'
    );
  }

  function bindMainCards(body) {
    if (!body) return;
    body.querySelectorAll('.settings-card[data-section]').forEach(function (card) {
      card.addEventListener('click', function () {
        openSection(card.getAttribute('data-section'));
      });
    });
  }

  /* ---------- GENERAL section (immediate save) ---------- */

  function generalHtml() {
    const lang = prefs.lang || 'pl';
    const startView = prefs.startView || 'dashboard';
    const brigade = prefs.shift || 'A';
    const restore = prefs.restoreLastView !== false;
    return (
      '<div class="settings-section">' +
      '<div class="st-group"><div class="st-label">' + tr('settingsLanguage') + '</div>' +
      '<div class="seg" role="group" aria-label="' + tr('settingsLanguage') + '">' +
      segBtn('Polski', 'pl', lang, 'data-lang') +
      segBtn('English', 'en', lang, 'data-lang') +
      segBtn('Українська', 'uk', lang, 'data-lang') +
      '</div></div>' +
      '<div class="st-group"><div class="st-label">' + tr('settingsStartView') + '</div>' +
      '<div class="seg" role="group" aria-label="' + tr('settingsStartView') + '">' +
      segBtn(tr('viewDashboard'), 'dashboard', startView, 'data-view') +
      segBtn(tr('viewMonth'), 'month', startView, 'data-view') +
      segBtn(tr('viewTable'), 'table', startView, 'data-view') +
      '</div></div>' +
      '<div class="st-group"><div class="st-label">' + tr('settingsDefaultBrigade') + '</div>' +
      '<div class="seg" role="group" aria-label="' + tr('settingsDefaultBrigade') + '">' +
      segBtn('A', 'A', brigade, 'data-brig') +
      segBtn('B', 'B', brigade, 'data-brig') +
      segBtn('C', 'C', brigade, 'data-brig') +
      segBtn('D', 'D', brigade, 'data-brig') +
      '</div></div>' +
      '<button type="button" class="st-row st-switch" id="stRestoreView" role="switch" aria-checked="' +
      (restore ? 'true' : 'false') + '">' +
      '<span class="st-row-label">' + tr('settingsRestoreLastView') + '</span>' +
      '<span class="ui-switch" aria-hidden="true"><span class="ui-switch-knob"></span></span>' +
      '</button>' +
      '</div>'
    );
  }

  function bindGeneral(body) {
    if (!body) return;

    body.querySelectorAll('.seg-btn[data-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const lang = btn.getAttribute('data-lang');
        if (typeof setLanguage === 'function') setLanguage(lang);
        else {
          prefs.lang = lang;
          savePrefsSafe();
        }
        refreshViewsSafe();
        if (typeof updateAppShellUI === 'function') {
          try {
            updateAppShellUI();
          } catch (e) {
            /* ignore */
          }
        }
        rerenderCurrentScreen(); // translate the open panel immediately
      });
    });

    body.querySelectorAll('.seg-btn[data-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        prefs.startView = btn.getAttribute('data-view');
        savePrefsSafe();
        setActive(body, 'view', prefs.startView);
      });
    });

    body.querySelectorAll('.seg-btn[data-brig]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        /* default brigade only — the active brigade keeps its current
           value until the next app start */
        prefs.shift = btn.getAttribute('data-brig');
        savePrefsSafe();
        setActive(body, 'brig', prefs.shift);
      });
    });

    const restoreBtn = body.querySelector('#stRestoreView');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', function () {
        prefs.restoreLastView = !(prefs.restoreLastView !== false);
        savePrefsSafe();
        restoreBtn.setAttribute('aria-checked', prefs.restoreLastView ? 'true' : 'false');
      });
    }
  }

  /* ---------- APPEARANCE section (immediate save) ---------- */

  function previewHtml() {
    const colors = getCellColors();
    const cells = [
      { k: 'R', label: 'R' },
      { k: 'P', label: 'P' },
      { k: 'N', label: 'N' },
      { k: 'U', label: '🌴' },
    ];
    return (
      '<div class="st-preview skin-' + getCellSkin() + '" id="stPreview">' +
      cells.map(function (c) {
        return (
          '<span class="st-cell" data-pkey="' + c.k + '" style="--pc:' + colors[c.k] +
          ';--pc-text:' + _textOn(colors[c.k]) + '">' + c.label + '</span>'
        );
      }).join('') +
      '</div>'
    );
  }

  function colorRowHtml(key, label) {
    const value = getCellColors()[key];
    return (
      '<div class="st-row" data-key="' + key + '">' +
      '<span class="st-row-label">' + label + '</span>' +
      '<span class="st-hex" data-hex>' + value + '</span>' +
      '<input type="color" class="st-color" data-key="' + key + '" value="' + value +
      '" aria-label="' + label + '">' +
      '</div>'
    );
  }

  function appearanceHtml() {
    const theme = ['system', 'light', 'dark'].indexOf(prefs.theme) !== -1
      ? prefs.theme
      : 'light';
    const skin = typeof getCellSkin === 'function' ? getCellSkin() : 'full';
    return (
      '<div class="settings-section">' +
      '<div class="st-group"><div class="st-label">' + tr('menuTheme') + '</div>' +
      '<div class="seg" role="group" aria-label="' + tr('menuTheme') + '">' +
      segBtn(tr('themeSystem'), 'system', theme, 'data-theme') +
      segBtn(tr('themeLight'), 'light', theme, 'data-theme') +
      segBtn(tr('themeDark'), 'dark', theme, 'data-theme') +
      '</div></div>' +
      '<div class="st-group"><div class="st-label">' + tr('settingsSkin') + '</div>' +
      '<div class="seg" role="group" aria-label="' + tr('settingsSkin') + '">' +
      segBtn(tr('skinFull'), 'full', skin, 'data-skin') +
      segBtn(tr('skinStrip'), 'strip', skin, 'data-skin') +
      segBtn(tr('skinQuiet'), 'quiet', skin, 'data-skin') +
      '</div>' + previewHtml() + '</div>' +
      '<div class="st-group"><div class="st-label">' + tr('settingsColors') + '</div>' +
      colorRowHtml('R', tr('persColorR')) +
      colorRowHtml('P', tr('persColorP')) +
      colorRowHtml('N', tr('persColorN')) +
      colorRowHtml('U', tr('persColorU')) +
      '</div>' +
      '<button type="button" class="st-row" id="stResetAppearance">' +
      '<span class="st-row-label">↺ ' + tr('persResetColors') + '</span>' +
      '</button>' +
      '</div>'
    );
  }

  function updatePreview() {
    const box = document.getElementById('stPreview');
    if (!box) return;
    const colors = getCellColors();
    ['R', 'P', 'N', 'U'].forEach(function (k) {
      const cell = box.querySelector('[data-pkey="' + k + '"]');
      if (cell) {
        cell.style.setProperty('--pc', colors[k]);
        cell.style.setProperty('--pc-text', _textOn(colors[k]));
      }
    });
    box.className = 'st-preview skin-' + getCellSkin();
  }

  function bindAppearance(body) {
    if (!body) return;

    body.querySelectorAll('.seg-btn[data-theme]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (typeof applyTheme === 'function') applyTheme(btn.getAttribute('data-theme'));
        else {
          prefs.theme = btn.getAttribute('data-theme');
          savePrefsSafe();
        }
        setActive(body, 'theme', prefs.theme);
      });
    });

    body.querySelectorAll('.seg-btn[data-skin]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        saveCellSkin(btn.getAttribute('data-skin'), true);
        setActive(body, 'skin', getCellSkin());
        updatePreview();
        refreshViewsSafe();
      });
    });

    const draft = {};
    const applyDraft = function () {
      if (typeof applyCellColors !== 'function') return;
      const merged = getCellColors();
      Object.keys(draft).forEach(function (k) {
        merged[k] = draft[k];
      });
      applyCellColors(merged);
      updatePreview();
    };

    body.querySelectorAll('.st-color').forEach(function (inp) {
      const key = inp.getAttribute('data-key');
      inp.addEventListener('input', function () {
        const hex = typeof _normalizeHex === 'function' ? _normalizeHex(inp.value) : null;
        if (!hex) return;
        draft[key] = hex;
        inp.value = hex;
        const hexLabel = inp.parentNode.querySelector('[data-hex]');
        if (hexLabel) hexLabel.textContent = hex;
        applyDraft(); // live preview — CSS variables update instantly
      });
      inp.addEventListener('change', function () {
        const next = getCellColors();
        Object.keys(draft).forEach(function (k) {
          next[k] = draft[k];
        });
        saveCellColors(next, true);
        toast('success', 'persSaved');
        refreshViewsSafe();
        updatePreview();
      });
    });

    const resetBtn = body.querySelector('#stResetAppearance');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (typeof resetCellColors === 'function') resetCellColors();
        if (typeof saveCellSkin === 'function') saveCellSkin('full', true);
        if (typeof applyTheme === 'function') applyTheme('system');
        refreshViewsSafe();
        toast('success', 'persSaved');
        renderSettingsSection('appearance', body); // refresh all controls
      });
    }
  }

  /* ---------- NOTIFICATIONS section ---------- */

  function notificationsHtml() {
    const raw = typeof getNotificationStatus === 'function' ? getNotificationStatus() : null;
    const supported = raw ? raw.supported : 'Notification' in window;
    const permission = raw ? raw.permission : 'Notification' in window ? Notification.permission : 'unsupported';
    const enabled = raw ? raw.enabled : false;
    const lead = raw ? raw.lead : prefs.notificationsLead || 1;

    let permLabel = '';
    let permClass = '';
    if (!supported) {
      permLabel = tr('settingsNotificationsUnsupported');
      permClass = 'error';
    } else if (permission === 'denied') {
      permLabel = tr('settingsNotificationsBlocked');
      permClass = 'error';
    } else if (permission === 'granted') {
      permLabel = tr('settingsNotificationsSupported');
      permClass = 'ok';
    } else {
      permLabel = tr('settingsNotificationsSupported');
      permClass = 'info';
    }

    const leadRows = ['1', '2', '3'].map(function (v) {
      return segBtn(v + 'h', v, String(lead), 'data-lead');
    }).join('');

    return (
      '<div class="settings-section">' +
      '<div class="st-group"><div class="st-label">' + tr('settingsNotificationsDesc') + '</div>' +
      '<div class="st-perm st-perm-' + permClass + '">' + permLabel + '</div>' +
      '</div>' +
      '<button type="button" class="st-row st-switch" id="stNotifEnable" role="switch" aria-checked="' +
      (enabled ? 'true' : 'false') + '">' +
      '<span class="st-row-label">' + tr('settingsNotifications') + '</span>' +
      '<span class="ui-switch" aria-hidden="true"><span class="ui-switch-knob"></span></span>' +
      '</button>' +
      '<div class="st-group"><div class="st-label">' + tr('settingsNotificationLead') + '</div>' +
      '<div class="seg" role="group" aria-label="' + tr('settingsNotificationLead') + '">' +
      leadRows +
      '</div></div>' +
      '<button type="button" class="st-row" id="stNotifTest">' +
      '<span class="st-row-label">' + tr('settingsNotificationTest') + '</span>' +
      '</button>' +
      (permission === 'denied' ? '<p class="st-hint">' + tr('notificationsBlockedInBrowser') + '</p>' : '') +
      '</div>'
    );
  }

  function bindNotifications(body) {
    if (!body) return;

    const enableBtn = body.querySelector('#stNotifEnable');
    if (enableBtn) {
      enableBtn.addEventListener('click', function () {
        const next = enableBtn.getAttribute('aria-checked') !== 'true';
        if (typeof setNotificationsEnabled === 'function') {
          setNotificationsEnabled(next).then(function () {
            renderSettingsSection('notifications', body);
          }).catch(function () {
            renderSettingsSection('notifications', body);
          });
        }
      });
    }

    body.querySelectorAll('.seg-btn[data-lead]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const val = btn.getAttribute('data-lead');
        if (typeof setNotificationLead === 'function') {
          setNotificationLead(val);
          setActive(body, 'lead', val);
        }
      });
    });

    const testBtn = body.querySelector('#stNotifTest');
    if (testBtn) {
      testBtn.addEventListener('click', function () {
        if (typeof sendTestNotification === 'function') sendTestNotification();
      });
    }
  }

  /* ---------- VACATION section ---------- */

  function vacationHtml() {
    const brigade = prefs.shift || 'A';
    const limit = typeof getVacationLimit === 'function' ? getVacationLimit(brigade) : 26;
    const used = typeof countWorkingUrlops === 'function' ? countWorkingUrlops(currentYear, brigade) : 0;
    const remaining = Math.max(0, limit - used);

    const brigades = ['A', 'B', 'C', 'D'];

    const brigButtons = brigades.map(function (b) {
      return segBtn(b, b, brigade, 'data-vac-brig');
    }).join('');

    return (
      '<div class="settings-section">' +
      '<div class="st-group"><div class="st-label">' + tr('settingsVacationDesc') + '</div>' +
      '<div class="seg" role="group" aria-label="' + tr('settingsVacationDesc') + '">' +
      brigButtons +
      '</div></div>' +
      '<div class="st-group">' +
      '<div class="st-row"><span class="st-row-label">' + tr('settingsVacationDesc') + '</span>' +
      '<input type="number" class="st-number" id="stVacLimit" value="' + limit + '" min="0" max="365" aria-label="' + tr('settingsVacationDesc') + '">' +
      '</div>' +
      '<div class="st-row"><span class="st-row-label">' + tr('settingsVacationUsed') + '</span>' +
      '<span class="st-mono">' + used + '</span>' +
      '</div>' +
      '<div class="st-row"><span class="st-row-label">' + tr('settingsVacationRemaining') + '</span>' +
      '<span class="st-mono">' + remaining + '</span>' +
      '</div>' +
      '<p class="st-hint">' + tr('infoUrlopWorking') + ': ' + used + ' / ' + limit + '</p>' +
      '</div>' +
      '</div>'
    );
  }

  function bindVacation(body) {
    if (!body) return;

    body.querySelectorAll('.seg-btn[data-vac-brig]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const b = btn.getAttribute('data-vac-brig');
        prefs.shift = b;
        savePrefsSafe();
        setActive(body, 'vac-brig', b);
        renderSettingsSection('vacation', body);
      });
    });

    const limitInput = body.querySelector('#stVacLimit');
    if (limitInput) {
      limitInput.addEventListener('change', function () {
        const val = parseInt(limitInput.value, 10);
        if (Number.isFinite(val) && val >= 0) {
          const brigade = prefs.shift || 'A';
          if (typeof setVacationLimit === 'function') {
            setVacationLimit(brigade, val);
            toast('success', 'persSaved');
            renderSettingsSection('vacation', body);
          }
        }
      });
    }
  }

  /* ---------- ACCESSIBILITY section ---------- */

  function accessibilityHtml() {
    const reduceMotion = prefs.reduceMotion === true;
    const largeText = prefs.largeText === true;
    const compactCells = prefs.compactCells === true;

    return (
      '<div class="settings-section">' +
      '<button type="button" class="st-row st-switch" id="stReduceMotion" role="switch" aria-checked="' +
      (reduceMotion ? 'true' : 'false') + '">' +
      '<span class="st-row-label">' + tr('settingsReduceMotion') + '</span>' +
      '<span class="ui-switch" aria-hidden="true"><span class="ui-switch-knob"></span></span>' +
      '</button>' +
      '<button type="button" class="st-row st-switch" id="stLargeText" role="switch" aria-checked="' +
      (largeText ? 'true' : 'false') + '">' +
      '<span class="st-row-label">' + tr('settingsLargeText') + '</span>' +
      '<span class="ui-switch" aria-hidden="true"><span class="ui-switch-knob"></span></span>' +
      '</button>' +
      '<button type="button" class="st-row st-switch" id="stCompactCells" role="switch" aria-checked="' +
      (compactCells ? 'true' : 'false') + '">' +
      '<span class="st-row-label">' + tr('settingsCompactCells') + '</span>' +
      '<span class="ui-switch" aria-hidden="true"><span class="ui-switch-knob"></span></span>' +
      '</button>' +
      '</div>'
    );
  }

  function bindAccessibility(body) {
    if (!body) return;

    function togglePref(key, btnId) {
      const btn = body.querySelector('#' + btnId);
      if (!btn) return;
      btn.addEventListener('click', function () {
        const next = btn.getAttribute('aria-checked') !== 'true';
        prefs[key] = next;
        savePrefsSafe();
        btn.setAttribute('aria-checked', next ? 'true' : 'false');
        if (typeof applyAccessibilityPreferences === 'function') applyAccessibilityPreferences();
      });
    }

    togglePref('reduceMotion', 'stReduceMotion');
    togglePref('largeText', 'stLargeText');
    togglePref('compactCells', 'stCompactCells');
  }

  /* ---------- public API ---------- */

  function renderSettingsSection(section, container) {
    const body = container || document.getElementById('appPanelBody');
    if (!body) return;
    if (section === 'general') {
      body.innerHTML = generalHtml();
      bindGeneral(body);
    } else if (section === 'appearance') {
      body.innerHTML = appearanceHtml();
      bindAppearance(body);
    } else if (section === 'notifications') {
      body.innerHTML = notificationsHtml();
      bindNotifications(body);
    } else if (section === 'vacation') {
      body.innerHTML = vacationHtml();
      bindVacation(body);
    } else if (section === 'accessibility') {
      body.innerHTML = accessibilityHtml();
      bindAccessibility(body);
    }
  }
  window.renderSettingsSection = renderSettingsSection;

  function openSection(id) {
    if (!SECTION_TITLES[id]) return;
    currentScreen = id;
    if (typeof pushAppPanel !== 'function') return;
    pushAppPanel({
      id: 'settings-' + id,
      title: tr(SECTION_TITLES[id]),
      html: '',
      onMount: function (body) {
        renderSettingsSection(id, body);
      },
    });
  }

  function openSettingsPanel() {
    if (typeof closeSideMenu === 'function') {
      try {
        closeSideMenu();
      } catch (e) {
        /* ignore */
      }
    }
    currentScreen = 'main';
    if (typeof openAppPanel !== 'function') return;
    openAppPanel({
      id: 'settings',
      title: tr('menuSettings'),
      html: mainCardsHtml(),
      onMount: function (body) {
        bindMainCards(body);
      },
    });
  }
  window.openSettingsPanel = openSettingsPanel;

  /* Re-render the open screen after a language change so the panel
     translates immediately. */
  function rerenderCurrentScreen() {
    if (typeof isAppPanelOpen !== 'function' || !isAppPanelOpen()) return;
    const body = document.getElementById('appPanelBody');
    const title = document.getElementById('appPanelTitle');
    if (!body) return;
    if (currentScreen === 'main') {
      if (title) title.textContent = tr('menuSettings');
      body.innerHTML = mainCardsHtml();
      bindMainCards(body);
    } else if (SECTION_TITLES[currentScreen]) {
      if (title) title.textContent = tr(SECTION_TITLES[currentScreen]);
      renderSettingsSection(currentScreen, body);
    }
  }

  /* ---------- menu button ----------
     #menuSettings previously carried a temporary listener bound by
     app-shell.js, which is not part of this task's file set. The button is
     clone-replaced here: cloning drops all listeners, and because this
     module's DOMContentLoaded handler is registered after app-shell.js's
     (script order), it also runs last — leaving exactly one handler that
     opens the real settings panel. */
  function bindMenuSettingsButton() {
    const btn = document.getElementById('menuSettings');
    if (!btn || !btn.parentNode || typeof btn.cloneNode !== 'function') return;
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener('click', function () {
      openSettingsPanel();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindMenuSettingsButton);
  } else {
    bindMenuSettingsButton();
  }
})();
