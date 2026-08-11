/* ================================================================
   GRAFIK GILLETTE — Moduł 3: UI (TOAST, MODAL, MENU, TEMATY)
   ================================================================ */

/* === THEMES === */
const THEMES = ['light','dark'];
function applyTheme(themeName) {
  THEMES.forEach(t => document.body.classList.remove('theme-' + t));
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
  (opts.buttons || [{text: t('ok'), class:'primary', onClick: () => hideModal()}]).forEach(btn => {
    const b = document.createElement('button');
    b.className = 'modal-btn ' + (btn.class || 'secondary');
    b.textContent = btn.text;
    b.onclick = () => { if (btn.onClick) btn.onClick(); if (btn.closeOnClick !== false) hideModal(); };
    footer.appendChild(b);
  });
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
      { text: opts.primaryText || t('ok'), class: opts.primaryClass || 'primary', onClick: onConfirm }
    ]
  });
}

/* === SIDE MENU === */
const sideMenu = document.getElementById('sideMenu');
const sideMenuOverlay = document.getElementById('sideMenuOverlay');
function openSideMenu() { sideMenu.classList.add('show'); sideMenuOverlay.classList.add('show'); }
function closeSideMenu() { sideMenu.classList.remove('show'); sideMenuOverlay.classList.remove('show'); }
document.getElementById('menuBtn').onclick = openSideMenu;
document.getElementById('sideMenuClose').onclick = closeSideMenu;
sideMenuOverlay.onclick = closeSideMenu;

/* === THEME TOGGLE === */
const themeToggleBtn = document.getElementById('themeToggleBtn');
if (themeToggleBtn) {
  themeToggleBtn.onclick = toggleTheme;
}

/* === TEMATY — kliknięcia (backward compatibility) === */
document.querySelectorAll('.theme-swatch').forEach(el => {
  el.onclick = () => { applyTheme(el.dataset.theme); showToast('info', 'Motyw: ' + el.dataset.name, 1500); };
});

/* === FAQ === */
function renderFAQ() {
  const faqOverlay = document.getElementById('faqOverlay');
  if (!faqOverlay) return;
  const faqList = faqOverlay.querySelector('.faq-list');
  if (!faqList) return;

  const faqData = [
    {
      title: t('faqStartTitle'),
      open: true,
      content: `
        <ol>
          <li>${t('faqStart1')}</li>
          <li>${t('faqStart2')}</li>
          <li>${t('faqStart3')}</li>
          <li>${t('faqStart4')}</li>
        </ol>
        <p>${t('faqStartNote')}</p>
      `
    },
    {
      title: t('faqViewsTitle'),
      content: `
        <p>${t('faqViewsDesc')}</p>
        <ul>
          <li><b>🏠 Dashboard</b> — ${t('faqViewsDashboard')}</li>
          <li><b>📆 Tydzień</b> — ${t('faqViewsWeek')}</li>
          <li><b>📅 Miesiąc</b> — ${t('faqViewsMonth')}</li>
          <li><b>📋 Tabela</b> — ${t('faqViewsTable')}</li>
          <li><b>📊 Rok</b> — ${t('faqViewsYear')}</li>
        </ul>
        <p>${t('faqViewsNote')}</p>
      `
    },
    {
      title: t('faqFeaturesTitle'),
      content: `
        <p>${t('faqFeaturesDesc')}</p>
        <ul>
          <li><b>${t('faqFeaturesShift')}</b></li>
          <li><b>${t('faqFeaturesLive')}</b></li>
          <li><b>${t('faqFeaturesVacation')}</b></li>
          <li><b>${t('faqFeaturesOvertime')}</b></li>
          <li><b>${t('faqFeaturesNotes')}</b></li>
          <li><b>${t('faqFeaturesSearch')}</b></li>
          <li><b>${t('faqFeaturesCompare')}</b></li>
          <li><b>${t('faqFeaturesExport')}</b></li>
          <li><b>${t('faqFeaturesPrint')}</b></li>
          <li><b>${t('faqFeaturesNote')}</b></li>
        </ul>
      `
    },
    {
      title: t('faqOvertimeTitle'),
      content: `
        <ol>
          <li>${t('faqOvertime1')}</li>
          <li>${t('faqOvertime2')}</li>
          <li>${t('faqOvertime3')}
            <ul>
              <li><b>⏱ ${t('otPositionBefore')}</b> — ${t('faqOvertime3a')}</li>
              <li><b>⏱ ${t('otPositionAfter')}</b> — ${t('faqOvertime3b')}</li>
            </ul>
          </li>
          <li>${t('faqOvertime4')}</li>
        </ol>
        <p><b>${t('faqOvertimeCategory')}</b></p>
        <ul>
          <li><b>+200%</b> — ${t('faqOvertimeCat200')}</li>
          <li><b>+100%</b> — ${t('faqOvertimeCat100')}</li>
          <li><b>+50%</b> — ${t('faqOvertimeCat50')}</li>
        </ul>
        <p>${t('faqOvertimeNote')}</p>
      `
    },
    {
      title: t('faqVacationTitle'),
      content: `
        <p>${t('faqVacationDesc')}</p>
        <p>${t('faqVacationRemove')}</p>
        <p>${t('faqVacationStats')}</p>
      `
    },
    {
      title: t('faqNotesTitle'),
      content: `
        <p>${t('faqNotesDesc')}</p>
        <p>${t('faqNotesIcon')}</p>
      `
    },
    {
      title: t('faqKeyboardTitle'),
      content: `
        <b>${t('faqKeyboardEdit')}:</b>
        <ul>
          <li><b>R / P / N / W</b> — ${t('faqKeyboardEdit1')}</li>
          <li><b>C</b> — ${t('faqKeyboardEdit2')}</li>
          <li><b>O</b> — ${t('faqKeyboardEdit3')}</li>
          <li><b>Ctrl+Z</b> — ${t('faqKeyboardEdit4')}</li>
          <li><b>Ctrl+S</b> — ${t('faqKeyboardEdit5')}</li>
        </ul>
        <b>${t('faqKeyboardNav')}:</b>
        <ul>
          <li><b>← / →</b> — ${t('faqKeyboardNav1')}</li>
          <li><b>Esc</b> — ${t('faqKeyboardNav2')}</li>
          <li><b>E</b> — ${t('faqKeyboardNav3')}</li>
        </ul>
      `
    },
    {
      title: t('faqSaveTitle'),
      content: `
        <p>${t('faqSaveDesc')}</p>
        <p>${t('faqSaveNote')}</p>
      `
    },
    {
      title: t('faqSyncTitle'),
      content: `
        <p>${t('faqSyncDesc')}</p>
        <ol>
          <li>${t('faqSync1')}</li>
          <li>${t('faqSync2')}</li>
          <li>${t('faqSync3')}</li>
          <li>${t('faqSync4')}</li>
          <li>${t('faqSync5')}</li>
        </ol>
        <p>${t('faqSyncNote')}</p>
      `
    },
    {
      title: t('faqExportTitle'),
      content: `
        <p>${t('faqExportDesc')}</p>
      `
    },
    {
      title: t('faqInstallTitle'),
      content: `
        <p>${t('faqInstallDesc')}</p>
        <ol>
          <li>${t('faqInstall1')}</li>
          <li>${t('faqInstall2')}</li>
          <li>${t('faqInstall3')}</li>
          <li>${t('faqInstall4')}</li>
        </ol>
        <p>${t('faqInstallNote')}</p>
        <p>${t('faqInstallMenuNote')}</p>
      `
    },
    {
      title: t('faqBugTitle'),
      content: `
        <div style="background:linear-gradient(135deg, #667eea, #764ba2); color:#fff; padding:15px; border-radius:10px; text-align:center;">
          <b>📧 ${t('faqBugDesc')}</b><br>
          <a href="mailto:tantsiura.s@pg.com?subject=Grafik Gillette" style="color:#fff; font-weight:bold; text-decoration:none;">tantsiura.s@pg.com</a>
        </div>
        <p>${t('faqBugNote')}</p>
      `
    }
  ];

  faqList.innerHTML = '';
  faqData.forEach(item => {
    const details = document.createElement('details');
    details.className = 'faq-item';
    if (item.open) details.setAttribute('open', '');
    details.innerHTML = `
      <summary>${item.title}</summary>
      <div class="faq-answer">${item.content}</div>
    `;
    faqList.appendChild(details);
  });
}

document.getElementById('menuHelp').onclick = () => { closeSideMenu(); document.getElementById('faqOverlay').classList.add('show'); renderFAQ(); };
document.getElementById('faqClose').onclick = () => document.getElementById('faqOverlay').classList.remove('show');
document.getElementById('faqOverlay').onclick = (e) => { if (e.target.id === 'faqOverlay') document.getElementById('faqOverlay').classList.remove('show'); };

/* === ZAMYKANIE MODALI === */
document.getElementById('modalClose').onclick = hideModal;
document.getElementById('modalOverlay').onclick = (e) => { if (e.target.id === 'modalOverlay') hideModal(); };