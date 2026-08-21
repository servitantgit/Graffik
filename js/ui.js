/* ================================================================
   GRAFIK GILLETTE — Module 3: UI (TOAST, MODAL, MENU, THEMES)
   ================================================================ */

/* === THEMES === */
const THEMES = ['light', 'dark'];
function applyTheme(themeName) {
  THEMES.forEach((t) => document.body.classList.remove('theme-' + t));
  if (themeName !== 'light') document.body.classList.add('theme-' + themeName);
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    toggleBtn.textContent = themeName === 'dark' ? '☀️' : '🌙';
  }
  prefs.theme = themeName;
  savePrefs(prefs);
}
if (prefs.dark && !prefs.theme) prefs.theme = 'dark';
applyTheme(prefs.theme || 'light');

function toggleTheme() {
  const current = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
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
      b.textContent = btn.text;
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

/* === SIDE MENU === */
const sideMenu = document.getElementById('sideMenu');
const sideMenuOverlay = document.getElementById('sideMenuOverlay');
function openSideMenu() {
  sideMenu.classList.add('show');
  sideMenuOverlay.classList.add('show');
  if (typeof updateMenuSyncStatus === 'function') updateMenuSyncStatus();
  if (typeof updatePrivacyMenuUI === 'function') updatePrivacyMenuUI();
  if (typeof updateDriveUI === 'function') updateDriveUI();
  if (typeof checkDriveRemoteStatus === 'function' && typeof isDriveLoggedIn === 'function' && isDriveLoggedIn()) {
    checkDriveRemoteStatus(false).catch(() => {});
  }
}
function closeSideMenu() {
  sideMenu.classList.remove('show');
  sideMenuOverlay.classList.remove('show');
}
document.getElementById('menuBtn').onclick = openSideMenu;
document.getElementById('sideMenuClose').onclick = closeSideMenu;
sideMenuOverlay.onclick = closeSideMenu;

/* === THEME TOGGLE === */
const themeToggleBtn = document.getElementById('themeToggleBtn');
if (themeToggleBtn) {
  themeToggleBtn.onclick = toggleTheme;
}

/* === THEMES — clicks (backward compatibility) === */
document.querySelectorAll('.theme-swatch').forEach((el) => {
  el.onclick = () => {
    applyTheme(el.dataset.theme);
    showToast('info', 'Motyw: ' + el.dataset.name, 1500);
  };
});

document.getElementById('menuHelp').onclick = () => {
  closeSideMenu();
  document.getElementById('faqOverlay').classList.add('show');
  renderFAQ();
};
document.getElementById('faqClose').onclick = () =>
  document.getElementById('faqOverlay').classList.remove('show');
document.getElementById('faqOverlay').onclick = (e) => {
  if (e.target.id === 'faqOverlay') document.getElementById('faqOverlay').classList.remove('show');
};

/* === ZAMYKANIE MODALI === */
document.getElementById('modalClose').onclick = hideModal;
document.getElementById('modalOverlay').onclick = (e) => {
  if (e.target.id === 'modalOverlay') hideModal();
};


/* Settings hub */
const menuSettingsBtn = document.getElementById('menuSettings') || document.getElementById('menuPersonalization');
if (menuSettingsBtn) {
  menuSettingsBtn.onclick = () => {
    if (typeof openSettingsHub === 'function') openSettingsHub();
    else if (typeof openPersonalizationModal === 'function') openPersonalizationModal();
  };
}
