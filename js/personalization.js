/* ================================================================
   GRAFIK GILLETTE — Settings hub + cell colors + skins
   prefs.cellColors, prefs.cellSkin, prefs.urlopLimits
   ================================================================ */

const DEFAULT_CELL_COLORS = {
  R: '#f1c40f',
  P: '#82e0aa',
  N: '#aed6f1',
  U: '#14b8a6',
};

const CELL_SKINS = ['full', 'strip', 'quiet'];
const DEFAULT_CELL_SKIN = 'full';

const COLOR_PRESETS = [
  '#f1c40f', '#f39c12', '#e67e22', '#e74c3c', '#c0392b',
  '#82e0aa', '#27ae60', '#1abc9c', '#16a085', '#0e6655',
  '#aed6f1', '#5dade2', '#3498db', '#2980b9', '#1a5276',
  '#2dd4bf', '#14b8a6', '#0f766e', '#f9a8d4', '#a78bfa',
  '#8b7a9e', '#7b6b8f', '#94a3b8', '#64748b', '#1e293b',
];

function _hexToRgb(hex) {
  const h = String(hex || '').replace('#', '').trim();
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  if (h.length !== 6) return { r: 128, g: 128, b: 128 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function _normalizeHex(hex) {
  let h = String(hex || '').trim();
  if (!h.startsWith('#')) h = '#' + h;
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(h)) return null;
  return h.toLowerCase();
}

function _luminance(hex) {
  const { r, g, b } = _hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function _textOn(hex) {
  return _luminance(hex) > 0.55 ? '#1a1a1a' : '#ffffff';
}

function _darken(hex, factor) {
  const { r, g, b } = _hexToRgb(hex);
  const f = Math.max(0, Math.min(1, factor));
  const d = (c) => Math.round(c * (1 - f));
  return (
    '#' +
    [d(r), d(g), d(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

function getCellColors() {
  const c = (prefs && prefs.cellColors) || {};
  return {
    R: _normalizeHex(c.R) || DEFAULT_CELL_COLORS.R,
    P: _normalizeHex(c.P) || DEFAULT_CELL_COLORS.P,
    N: _normalizeHex(c.N) || DEFAULT_CELL_COLORS.N,
    U: _normalizeHex(c.U) || DEFAULT_CELL_COLORS.U,
  };
}

function applyCellColors(colors) {
  const c = colors || getCellColors();
  const root = document.documentElement;
  const set = (k, v) => root.style.setProperty(k, v);

  set('--color-R', c.R);
  set('--color-R-border', _darken(c.R, 0.18));
  set('--color-R-text', _textOn(c.R));

  set('--color-P', c.P);
  set('--color-P-border', _darken(c.P, 0.18));
  set('--color-P-text', _textOn(c.P));

  set('--color-N', c.N);
  set('--color-N-border', _darken(c.N, 0.18));
  set('--color-N-text', _textOn(c.N));
  set('--color-N-grad', `linear-gradient(135deg, ${c.N}, ${_darken(c.N, 0.25)})`);

  set('--color-U', c.U);
  set('--color-U-border', _darken(c.U, 0.2));
  set('--color-U-text', _textOn(c.U));
  set('--color-U-grad', `linear-gradient(135deg, ${c.U}, ${_darken(c.U, 0.28)})`);
}

function saveCellColors(colors, markSync) {
  if (!prefs.cellColors) prefs.cellColors = {};
  ['R', 'P', 'N', 'U'].forEach((k) => {
    const n = _normalizeHex(colors[k]);
    if (n) prefs.cellColors[k] = n;
  });
  savePrefs(prefs, markSync !== false);
  applyCellColors(getCellColors());
}

function resetCellColors() {
  prefs.cellColors = { ...DEFAULT_CELL_COLORS };
  savePrefs(prefs, true);
  applyCellColors(getCellColors());
}

function getCellSkin() {
  const s = prefs && prefs.cellSkin;
  return CELL_SKINS.includes(s) ? s : DEFAULT_CELL_SKIN;
}

function applyCellSkin(skin) {
  const s = CELL_SKINS.includes(skin) ? skin : getCellSkin();
  document.body.classList.remove('skin-full', 'skin-strip', 'skin-quiet');
  document.body.classList.add('skin-' + s);
}

function saveCellSkin(skin, markSync) {
  if (!CELL_SKINS.includes(skin)) skin = DEFAULT_CELL_SKIN;
  prefs.cellSkin = skin;
  savePrefs(prefs, markSync !== false);
  applyCellSkin(skin);
}

function applyPersonalization() {
  applyCellColors();
  applyCellSkin(getCellSkin());
}

/* ---------- Styles (once) ---------- */
(function injectPersStyles() {
  if (document.getElementById('persStyles')) return;
  const s = document.createElement('style');
  s.id = 'persStyles';
  s.textContent = `
    .settings-hub { display: flex; flex-direction: column; gap: 10px; }
    .settings-card {
      display: flex; align-items: flex-start; gap: 12px;
      width: 100%; text-align: left; padding: 12px 14px;
      border-radius: 12px; border: 1px solid var(--border-cell);
      background: var(--bg-controls); color: var(--text-main);
      cursor: pointer; font: inherit;
    }
    .settings-card:hover { border-color: var(--text-header); }
    .settings-card .sc-icon { font-size: 1.35rem; line-height: 1; width: 28px; text-align: center; }
    .settings-card .sc-body { flex: 1; min-width: 0; }
    .settings-card .sc-title { font-weight: 700; font-size: 0.95rem; }
    .settings-card .sc-desc { font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; }
    .settings-card .sc-arrow { color: var(--text-muted); font-size: 1.1rem; align-self: center; }

    .pers-panel { font-size: 14px; }
    .pers-hint { color: var(--text-muted); font-size: 13px; margin: 0 0 12px; }
    .pers-section { margin: 16px 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-header); }
    .pers-limit-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .pers-limit-input { width: 80px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-cell); background: var(--bg-info-card); color: var(--text-main); font-size: 16px; }
    .pers-row { margin-bottom: 12px; padding: 10px; border-radius: 10px; background: var(--bg-controls); border: 1px solid var(--border-cell); }
    .pers-row-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .pers-label { flex: 1; font-weight: 600; }
    .pers-preview { width: 36px; height: 28px; border-radius: 6px; display: grid; place-items: center; font-size: 12px; font-weight: 700; border: 1px solid rgba(0,0,0,.15); }
    .pers-native { width: 42px; height: 28px; padding: 0; border: none; background: transparent; cursor: pointer; }
    .pers-swatches { display: flex; flex-wrap: wrap; gap: 6px; }
    .color-swatch { width: 22px; height: 22px; border-radius: 6px; border: 2px solid transparent; cursor: pointer; padding: 0; }
    .color-swatch.active { border-color: var(--text-header); box-shadow: 0 0 0 2px var(--bg-container); }
    .pers-actions-inline { margin-top: 8px; }

    .skin-options { display: flex; flex-direction: column; gap: 10px; }
    .skin-option {
      display: flex; gap: 12px; align-items: center;
      padding: 10px 12px; border-radius: 12px;
      border: 2px solid var(--border-cell); background: var(--bg-controls);
      cursor: pointer; text-align: left; font: inherit; color: inherit; width: 100%;
    }
    .skin-option.active { border-color: var(--text-header); }
    .skin-option .so-meta { flex: 1; min-width: 0; }
    .skin-option .so-title { font-weight: 700; font-size: 0.9rem; }
    .skin-option .so-desc { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
    .skin-mini {
      display: grid; grid-template-columns: repeat(4, 22px); gap: 3px; flex-shrink: 0;
    }
    .skin-mini span {
      width: 22px; height: 26px; border-radius: 5px; border: 1px solid rgba(0,0,0,.12);
      position: relative; overflow: hidden; background: var(--bg-cell, #1a2438);
    }
    .skin-mini .sm-R { background: var(--color-R); }
    .skin-mini .sm-P { background: var(--color-P); }
    .skin-mini .sm-N { background: var(--color-N); }
    .skin-mini .sm-U { background: var(--color-U); }
    .skin-mini.strip .sm-R,
    .skin-mini.strip .sm-P,
    .skin-mini.strip .sm-N,
    .skin-mini.strip .sm-U {
      background: var(--bg-cell, #1a2438);
    }
    .skin-mini.strip .sm-R::before,
    .skin-mini.strip .sm-P::before,
    .skin-mini.strip .sm-N::before {
      content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
    }
    .skin-mini.strip .sm-R::before { background: var(--color-R); }
    .skin-mini.strip .sm-P::before { background: var(--color-P); }
    .skin-mini.strip .sm-N::before { background: var(--color-N); }
    .skin-mini.strip .sm-U::before { background: var(--color-U); }
    .skin-mini.quiet .sm-R,
    .skin-mini.quiet .sm-P,
    .skin-mini.quiet .sm-N,
    .skin-mini.quiet .sm-U {
      background: var(--bg-cell, #1a2438);
      box-shadow: inset 0 0 0 2px var(--border-cell, #334155);
    }
    .skin-mini.quiet .sm-R { box-shadow: inset 0 0 0 2px var(--color-R); }
    .skin-mini.quiet .sm-P { box-shadow: inset 0 0 0 2px var(--color-P); }
    .skin-mini.quiet .sm-N { box-shadow: inset 0 0 0 2px var(--color-N); }
    .skin-mini.quiet .sm-U { box-shadow: inset 0 0 0 2px var(--color-U); }
  `;
  document.head.appendChild(s);
})();

/* ---------- Hub ---------- */

function openSettingsHub() {
  if (typeof closeSideMenu === 'function') closeSideMenu();

  const body = `
    <div class="settings-hub">
      <button type="button" class="settings-card" data-settings="colors">
        <span class="sc-icon">🎨</span>
        <span class="sc-body">
          <div class="sc-title">${t('settingsColors') || 'Cell colors'}</div>
          <div class="sc-desc">${t('settingsColorsDesc') || 'Morning, afternoon, night, vacation'}</div>
        </span>
        <span class="sc-arrow">›</span>
      </button>
      <button type="button" class="settings-card" data-settings="skin">
        <span class="sc-icon">🖼️</span>
        <span class="sc-body">
          <div class="sc-title">${t('settingsSkin') || 'Cell skin'}</div>
          <div class="sc-desc">${t('settingsSkinDesc') || 'Full fill, strip, or quiet dots'}</div>
        </span>
        <span class="sc-arrow">›</span>
      </button>
      <button type="button" class="settings-card" data-settings="vacation">
        <span class="sc-icon">🌴</span>
        <span class="sc-body">
          <div class="sc-title">${t('settingsVacation') || 'Vacation limit'}</div>
          <div class="sc-desc">${t('settingsVacationDesc') || 'Days per brigade'}</div>
        </span>
        <span class="sc-arrow">›</span>
      </button>
      <button type="button" class="settings-card" data-settings="notifications">
        <span class="sc-icon">🔔</span>
        <span class="sc-body">
          <div class="sc-title">${t('settingsNotifications') || 'Shift notifications'}</div>
          <div class="sc-desc">${t('settingsNotificationsDesc') || 'Reminders before shift'}</div>
        </span>
        <span class="sc-arrow">›</span>
      </button>
      <button type="button" class="settings-card" data-settings="privacy">
        <span class="sc-icon">🔒</span>
        <span class="sc-body">
          <div class="sc-title">${t('settingsPrivacy') || 'Privacy mode'}</div>
          <div class="sc-desc">${t('settingsPrivacyDesc') || 'Hide personal data on screen'}</div>
        </span>
        <span class="sc-arrow">›</span>
      </button>
    </div>
  `;

  showModal({
    title: t('settingsTitle') || '⚙️ Settings',
    body,
    buttons: [{ text: t('close') || t('ok') || 'OK', class: 'secondary' }],
  });

  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;
  modalBody.querySelectorAll('[data-settings]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.settings;
      hideModal();
      setTimeout(() => {
        if (id === 'colors') openColorsModal();
        else if (id === 'skin') openSkinModal();
        else if (id === 'vacation') openVacationModal();
        else if (id === 'notifications') {
          const el = document.getElementById('menuNotifications');
          if (el) el.click();
        } else if (id === 'privacy') {
          const el = document.getElementById('menuPrivacyToggle');
          if (el) el.click();
          else if (typeof openSettingsHub === 'function') {
            /* privacy only via menu item */
          }
        }
      }, 180);
    });
  });
}

/* back-compat alias */
function openPersonalizationModal() {
  openSettingsHub();
}

function _colorRow(key, label, value) {
  const presets = COLOR_PRESETS.map(
    (hex) =>
      `<button type="button" class="color-swatch${hex.toLowerCase() === value.toLowerCase() ? ' active' : ''}" data-key="${key}" data-hex="${hex}" style="background:${hex}" title="${hex}"></button>`
  ).join('');
  return `
    <div class="pers-row" data-key="${key}">
      <div class="pers-row-head">
        <span class="pers-label">${label}</span>
        <span class="pers-preview" style="background:${value};color:${_textOn(value)}">${key === 'U' ? '🌴' : key}</span>
        <input type="color" class="pers-native" data-key="${key}" value="${value}">
      </div>
      <div class="pers-swatches">${presets}</div>
    </div>`;
}

function openColorsModal() {
  const colors = getCellColors();
  const body = `
    <div class="pers-panel">
      <p class="pers-hint">${t('persHint') || ''}</p>
      ${_colorRow('R', t('persColorR') || 'R', colors.R)}
      ${_colorRow('P', t('persColorP') || 'P', colors.P)}
      ${_colorRow('N', t('persColorN') || 'N', colors.N)}
      ${_colorRow('U', t('persColorU') || 'U', colors.U)}
      <div class="pers-actions-inline">
        <button type="button" class="modal-btn secondary" id="persResetColors">${t('persResetColors') || 'Reset'}</button>
      </div>
    </div>`;

  showModal({
    title: t('settingsColors') || '🎨 Colors',
    body,
    buttons: [
      {
        text: t('back') || '←',
        class: 'secondary',
        onClick: () => setTimeout(openSettingsHub, 120),
      },
      {
        text: t('save') || 'Save',
        class: 'primary',
        onClick: () => {
          const next = {
            R: document.querySelector('.pers-native[data-key="R"]').value,
            P: document.querySelector('.pers-native[data-key="P"]').value,
            N: document.querySelector('.pers-native[data-key="N"]').value,
            U: document.querySelector('.pers-native[data-key="U"]').value,
          };
          saveCellColors(next, true);
          if (typeof showToast === 'function') showToast('success', t('persSaved') || 'Saved');
          if (typeof refreshViews === 'function') refreshViews();
        },
      },
    ],
  });

  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;
  const updatePreview = (key, hex) => {
    const n = _normalizeHex(hex);
    if (!n) return;
    const row = modalBody.querySelector(`.pers-row[data-key="${key}"]`);
    if (!row) return;
    const prev = row.querySelector('.pers-preview');
    const native = row.querySelector('.pers-native');
    if (prev) {
      prev.style.background = n;
      prev.style.color = _textOn(n);
    }
    if (native) native.value = n;
    row.querySelectorAll('.color-swatch').forEach((b) => {
      b.classList.toggle('active', b.dataset.hex.toLowerCase() === n);
    });
  };
  modalBody.querySelectorAll('.color-swatch').forEach((btn) => {
    btn.addEventListener('click', () => updatePreview(btn.dataset.key, btn.dataset.hex));
  });
  modalBody.querySelectorAll('.pers-native').forEach((inp) => {
    inp.addEventListener('input', () => updatePreview(inp.dataset.key, inp.value));
  });
  const resetBtn = document.getElementById('persResetColors');
  if (resetBtn) {
    resetBtn.onclick = () => {
      ['R', 'P', 'N', 'U'].forEach((k) => updatePreview(k, DEFAULT_CELL_COLORS[k]));
    };
  }
}

function openSkinModal() {
  const current = getCellSkin();
  const options = [
    {
      id: 'full',
      title: t('skinFull') || 'Full fill',
      desc: t('skinFullDesc') || 'Solid colors like the paper schedule',
      mini: 'full',
    },
    {
      id: 'strip',
      title: t('skinStrip') || 'Calm strip',
      desc: t('skinStripDesc') || 'Color strip on the left; vacation is calm too',
      mini: 'strip',
    },
    {
      id: 'quiet',
      title: t('skinQuiet') || 'Quiet rings',
      desc: t('skinQuietDesc') || 'Neutral cells with a colored date ring',
      mini: 'quiet',
    },
  ];

  const body = `
    <div class="skin-options">
      ${options
        .map(
          (o) => `
        <button type="button" class="skin-option${current === o.id ? ' active' : ''}" data-skin="${o.id}">
          <div class="skin-mini ${o.mini}">
            <span class="sm-R"></span><span class="sm-P"></span>
            <span class="sm-N"></span><span class="sm-U"></span>
          </div>
          <div class="so-meta">
            <div class="so-title">${o.title}</div>
            <div class="so-desc">${o.desc}</div>
          </div>
        </button>`
        )
        .join('')}
    </div>`;

  let selected = current;
  showModal({
    title: t('settingsSkin') || '🖼️ Skin',
    body,
    buttons: [
      {
        text: t('back') || '←',
        class: 'secondary',
        onClick: () => setTimeout(openSettingsHub, 120),
      },
      {
        text: t('save') || 'Save',
        class: 'primary',
        onClick: () => {
          saveCellSkin(selected, true);
          if (typeof showToast === 'function') showToast('success', t('persSaved') || 'Saved');
          if (typeof refreshViews === 'function') refreshViews();
        },
      },
    ],
  });

  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;
  modalBody.querySelectorAll('.skin-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      selected = btn.dataset.skin;
      modalBody.querySelectorAll('.skin-option').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      applyCellSkin(selected); // live preview
    });
  });
}

function openVacationModal() {
  const brig = typeof selectedShift !== 'undefined' ? selectedShift : 'A';
  const limit =
    typeof getVacationLimit === 'function' ? getVacationLimit(brig) : 26;
  const body = `
    <div class="pers-panel">
      <p class="pers-hint">${t('persVacationHint') || ''}</p>
      <div class="pers-limit-row">
        <label for="persLimitInput">${t('persVacationLimitLabel') || 'Days'} <b>${brig}</b></label>
        <input id="persLimitInput" type="number" min="0" step="1" value="${limit}" class="pers-limit-input">
      </div>
    </div>`;

  showModal({
    title: t('settingsVacation') || '🌴 Vacation',
    body,
    buttons: [
      {
        text: t('back') || '←',
        class: 'secondary',
        onClick: () => setTimeout(openSettingsHub, 120),
      },
      {
        text: t('save') || 'Save',
        class: 'primary',
        onClick: () => {
          const input = document.getElementById('persLimitInput');
          if (input && typeof setVacationLimit === 'function') {
            const parsed = Number(input.value);
            if (Number.isFinite(parsed) && parsed >= 0) {
              setVacationLimit(brig, parsed);
              if (typeof showToast === 'function') {
                showToast('success', t('persSaved') || 'Saved');
              }
              if (typeof refreshViews === 'function') refreshViews();
            }
          }
        },
      },
    ],
  });
}
