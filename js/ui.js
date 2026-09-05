/* ================================================================
   GRAFIK GILLETTE — Module 3: UI (TOAST, MODAL, MENU, THEMES)
   ================================================================ */

/* === THEMES (v4.0.0: 'system' | 'light' | 'dark') ===
   prefs.theme stores the user PREFERENCE; the body class always reflects
   the EFFECTIVE theme. While the preference is 'system' we follow
   prefers-color-scheme and listen for OS changes; the listener is
   removed as soon as an explicit theme is chosen. */
const THEME_VALUES = ['system', 'light', 'dark'];
let _systemThemeQuery = null;
let _systemThemeListener = null;

function _getSystemTheme() {
  if (typeof window.matchMedia !== 'function') return 'light';
  if (!_systemThemeQuery) {
    _systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  }
  return _systemThemeQuery.matches ? 'dark' : 'light';
}

function _getEffectiveTheme() {
  if (prefs.theme === 'dark') return 'dark';
  if (prefs.theme === 'light') return 'light';
  return _getSystemTheme();
}

function _applyThemeClass(effective) {
  document.body.classList.remove('theme-light', 'theme-dark');
  if (effective !== 'light') document.body.classList.add('theme-' + effective);
}

function _watchSystemTheme() {
  if (typeof window.matchMedia !== 'function') return;
  if (!_systemThemeQuery) {
    _systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  }
  if (prefs.theme === 'system') {
    if (!_systemThemeListener) {
      _systemThemeListener = function () {
        _applyThemeClass(_getEffectiveTheme());
      };
      if (typeof _systemThemeQuery.addEventListener === 'function') {
        _systemThemeQuery.addEventListener('change', _systemThemeListener);
      } else if (typeof _systemThemeQuery.addListener === 'function') {
        _systemThemeQuery.addListener(_systemThemeListener); // older Safari
      }
    }
  } else if (_systemThemeListener) {
    if (typeof _systemThemeQuery.removeEventListener === 'function') {
      _systemThemeQuery.removeEventListener('change', _systemThemeListener);
    } else if (typeof _systemThemeQuery.removeListener === 'function') {
      _systemThemeQuery.removeListener(_systemThemeListener);
    }
    _systemThemeListener = null;
  }
}

function applyTheme(themeName) {
  if (!THEME_VALUES.includes(themeName)) themeName = 'light';
  prefs.theme = themeName;
  savePrefs(prefs);
  _applyThemeClass(_getEffectiveTheme());
  _watchSystemTheme();
}

if (prefs.dark && !prefs.theme) prefs.theme = 'dark';
applyTheme(THEME_VALUES.includes(prefs.theme) ? prefs.theme : 'light');

function toggleTheme() {
  applyTheme(_getEffectiveTheme() === 'dark' ? 'light' : 'dark');
}

/* === TOAST === */
function showToast(type, message, duration) {
  duration = duration || 3000;
  const icons = { success: '✅', error: '❌', warn: '⚠️', info: 'ℹ️' };
  const container = getElementByIdSafe('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* === MODAL === */
function showModal(opts) {
  const overlay = getElementByIdSafe('modalOverlay');
  const titleEl = getElementByIdSafe('modalTitle');
  const bodyEl = getElementByIdSafe('modalBody');
  const footer = getElementByIdSafe('modalFooter');
  if (!overlay || !titleEl || !bodyEl || !footer) return;
  titleEl.textContent = opts.title || t('ok');
  bodyEl.innerHTML = opts.body || '';
  footer.innerHTML = '';
  (opts.buttons || [{ text: t('ok'), class: 'primary', onClick: () => hideModal() }]).forEach(
    (btn) => {
      const b = document.createElement('button');
      b.className = 'modal-btn ' + (btn.class || 'secondary');
      if (btn.html) {
        b.innerHTML = btn.html;
      } else {
        b.textContent = btn.text;
      }
      if (btn.title) b.title = btn.title;
      b.onclick = () => {
        if (btn.onClick) btn.onClick();
        if (btn.closeOnClick !== false) hideModal();
      };
      footer.appendChild(b);
    }
  );
  overlay.classList.add('show');
}
function hideModal() {
  const overlay = getElementByIdSafe('modalOverlay');
  if (overlay) overlay.classList.remove('show');
  const footer = getElementByIdSafe('modalFooter');
  if (footer) footer.classList.remove('modal-footer-single-row');
}
function showConfirm(title, body, onConfirm, opts) {
  opts = opts || {};
  showModal({
    title: title,
    body: `<p>${body}</p>`,
    buttons: [
      { text: t('cancel'), class: 'secondary' },
      {
        text: opts.primaryText || t('ok'),
        class: opts.primaryClass || 'primary',
        onClick: onConfirm,
      },
    ],
  });
}

/* === SIDE MENU ===
   Drawer open/close moved to js/app-shell.js (v4.0.0) — it owns focus
   restoration, Escape, overlay click, body.side-menu-open and the
   defensive Drive/privacy state refresh. window.openSideMenu /
   window.closeSideMenu remain the public API. */

/* === THEME BUTTONS (v4.0.0) ===
   The top-bar theme toggle and the settings-hub theme swatches are gone
   with the old top bar and the settings hub; the theme is now chosen in
   Settings → Appearance (js/settings.js). */

document.getElementById('menuHelp').onclick = () => {
  closeSideMenu();
  openAppPanel({
    id: 'faq-panel',
    title: t('menuHelp'),
    html: '<div id="faq-container"></div>',
    onMount: (body) => {
      renderFAQ(body.querySelector('#faq-container'));
    }
  });
};

/* === ZAMYKANIE MODALI === */
document.getElementById('modalClose').onclick = hideModal;
document.getElementById('modalOverlay').onclick = (e) => {
  if (e.target.id === 'modalOverlay') hideModal();
};


/* Settings hub binding removed (v4.0.0) — #menuSettings is bound by
   js/settings.js and opens the full-screen settings panel. */
