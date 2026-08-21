/* ================================================================
   GRAFIK GILLETTE — Personalization (cell colors + vacation limit)
   Stored in prefs.cellColors / prefs.urlopLimits (local + Drive sync)
   ================================================================ */

const DEFAULT_CELL_COLORS = {
  R: '#f1c40f',
  P: '#82e0aa',
  N: '#aed6f1',
  U: '#14b8a6',
};

/** Preset swatches shown in the color picker */
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

/**
 * Apply cell colors to CSS custom properties on :root / body.
 */
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

/* ---------- UI: personalization modal ---------- */

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

function openPersonalizationModal() {
  if (typeof closeSideMenu === 'function') closeSideMenu();
  const colors = getCellColors();
  const brig = typeof selectedShift !== 'undefined' ? selectedShift : 'A';
  const limit =
    typeof getVacationLimit === 'function' ? getVacationLimit(brig) : 26;

  const body = `
    <div class="pers-panel">
      <p class="pers-hint">${t('persHint') || 'Personal settings are saved on this device and sync with Google Drive.'}</p>

      <h4 class="pers-section">${t('persVacationSection') || '🌴 Vacation limit'}</h4>
      <div class="pers-limit-row">
        <label for="persLimitInput">${t('persVacationLimitLabel') || 'Days for brigade'} <b>${brig}</b></label>
        <input id="persLimitInput" type="number" min="0" step="1" value="${limit}" class="pers-limit-input">
      </div>

      <h4 class="pers-section">${t('persColorsSection') || '🎨 Cell colors'}</h4>
      ${_colorRow('R', t('persColorR') || 'Morning (R)', colors.R)}
      ${_colorRow('P', t('persColorP') || 'Afternoon (P)', colors.P)}
      ${_colorRow('N', t('persColorN') || 'Night (N)', colors.N)}
      ${_colorRow('U', t('persColorU') || 'Vacation', colors.U)}

      <div class="pers-actions-inline">
        <button type="button" class="modal-btn secondary" id="persResetColors">${t('persResetColors') || 'Reset colors'}</button>
      </div>
    </div>
  `;

  showModal({
    title: t('persTitle') || '⚙️ Personalization',
    body,
    buttons: [
      { text: t('cancel') || 'Cancel', class: 'secondary' },
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

          const input = document.getElementById('persLimitInput');
          if (input && typeof setVacationLimit === 'function') {
            const parsed = Number(input.value);
            if (Number.isFinite(parsed) && parsed >= 0) {
              setVacationLimit(brig, parsed);
            }
          }
          if (typeof showToast === 'function') {
            showToast('success', t('persSaved') || 'Settings saved');
          }
          if (typeof refreshViews === 'function') refreshViews();
        },
      },
    ],
  });

  // Wire swatches + native pickers (live preview in modal only)
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
    btn.addEventListener('click', () => {
      updatePreview(btn.dataset.key, btn.dataset.hex);
    });
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

/* CSS for modal controls (injected once) */
(function injectPersStyles() {
  if (document.getElementById('persStyles')) return;
  const s = document.createElement('style');
  s.id = 'persStyles';
  s.textContent = `
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
  `;
  document.head.appendChild(s);
})();
