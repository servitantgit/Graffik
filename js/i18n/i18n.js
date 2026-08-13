/* ================================================================
   GRAFIK GILLETTE — Moduł i18n: Logika lokalizacji
   Słowniki tłumaczeń: pl.js / en.js / uk.js (ładowane wcześniej)
   ================================================================ */

const SUPPORTED_LANGS = ['pl', 'en', 'uk'];

/* === AKTYWNY JĘZYK === */
let currentLang = 'pl';

function detectLanguage() {
  const saved = prefs.lang;
  if (SUPPORTED_LANGS.includes(saved)) return saved;
  const browserLang = (navigator.language || '').toLowerCase();
  if (browserLang.startsWith('uk')) return 'uk';
  if (browserLang.startsWith('en')) return 'en';
  return 'pl';
}

function setLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) lang = 'pl';
  currentLang = lang;
  prefs.lang = lang;
  savePrefs(prefs);
  if (typeof updateLocalizedNames === 'function') updateLocalizedNames();
  applyTranslations();
}

/* === POBIERZ TŁUMACZENIE === */
function t(key, params) {
  const translations = window.translations || {};
  const langObj = translations[currentLang] || translations.pl || {};
  const fallback = translations.pl || {};
  let text =
    langObj[key] !== undefined ? langObj[key] : fallback[key] !== undefined ? fallback[key] : key;
  if (params) {
    Object.keys(params).forEach((p) => {
      text = text.replace(new RegExp('{' + p + '}', 'g'), params[p]);
    });
  }
  return text;
}

/* === RENDER FAQ === */
function renderFAQ() {
  const container = document.querySelector('.faq-list');
  if (!container) return;

  const faqItems = [
    {
      title: t('faqStartTitle'),
      content: `
                <ol>
                    <li>${t('faqStart1')}</li>
                    <li>${t('faqStart2')}</li>
                    <li>${t('faqStart3')}</li>
                    <li>${t('faqStart4')}</li>
                </ol>
                <p>${t('faqStartNote')}</p>
            `,
    },
    {
      title: t('faqLangTitle'),
      content: `
                <p>${t('faqLangDesc')}</p>
                <ul>
                    <li>${t('faqLangPl')}</li>
                    <li>${t('faqLangEn')}</li>
                    <li>${t('faqLangUk')}</li>
                </ul>
                <p>${t('faqLangNote')}</p>
            `,
    },
    {
      title: t('faqViewsTitle'),
      content: `
                <p>${t('faqViewsDesc')}</p>
                <ul>
                    <li>${t('faqViewsDashboard')}</li>
                    <li>${t('faqViewsWeek')}</li>
                    <li>${t('faqViewsMonth')}</li>
                    <li>${t('faqViewsTable')}</li>
                    <li>${t('faqViewsYear')}</li>
                </ul>
                <p>${t('faqViewsNote')}</p>
            `,
    },
    {
      title: t('faqFeaturesTitle'),
      content: `
                <p>${t('faqFeaturesDesc')}</p>
                <ul>
                    <li>${t('faqFeaturesShift')}</li>
                    <li>${t('faqFeaturesLive')}</li>
                    <li>${t('faqFeaturesVacation')}</li>
                    <li>${t('faqFeaturesOvertime')}</li>
                    <li>${t('faqFeaturesNotes')}</li>
                    <li>${t('faqFeaturesCompare')}</li>
                    <li>${t('faqFeaturesExport')}</li>
                    <li>${t('faqFeaturesPrint')}</li>
                </ul>
                <p>${t('faqFeaturesNote')}</p>
            `,
    },
    {
      title: t('faqOvertimeTitle'),
      content: `
                <ol>
                    <li>${t('faqOvertime1')}</li>
                    <li>${t('faqOvertime2')}</li>
                    <li>${t('faqOvertime3')}
                        <ul>
                            <li>${t('faqOvertime3a')}</li>
                            <li>${t('faqOvertime3b')}</li>
                        </ul>
                    </li>
                    <li>${t('faqOvertime4')}</li>
                </ol>
                <p>${t('faqOvertimeCategory')}</p>
                <ul>
                    <li>${t('faqOvertimeCat200')}</li>
                    <li>${t('faqOvertimeCat100')}</li>
                    <li>${t('faqOvertimeCat50')}</li>
                </ul>
                <p><strong>${t('faqOvertimeWeekend')}</strong></p>
                <p>${t('faqOvertimeWeekendDesc')}</p>
                <p>${t('faqOvertimeNote')}</p>
            `,
    },
    {
      title: t('faqVacationTitle'),
      content: `
                <p>${t('faqVacationDesc')}</p>
                <p>${t('faqVacationRemove')}</p>
                <p>${t('faqVacationStats')}</p>
            `,
    },
    {
      title: t('faqNotesTitle'),
      content: `
                <p>${t('faqNotesDesc')}</p>
                <p>${t('faqNotesIcon')}</p>
            `,
    },
    {
      title: t('faqKeyboardTitle'),
      content: `
                <b>${t('faqKeyboardEdit')}</b>
                <ul>
                    <li>${t('faqKeyboardEdit1')}</li>
                    <li>${t('faqKeyboardEdit2')}</li>
                    <li>${t('faqKeyboardEdit3')}</li>
                    <li>${t('faqKeyboardEdit4')}</li>
                    <li>${t('faqKeyboardEdit5')}</li>
                </ul>
                <b>${t('faqKeyboardNav')}</b>
                <ul>
                    <li>${t('faqKeyboardNav1')}</li>
                    <li>${t('faqKeyboardNav2')}</li>
                    <li>${t('faqKeyboardNav3')}</li>
                </ul>
            `,
    },
    {
      title: t('faqSaveTitle'),
      content: `
                <p>${t('faqSaveDesc')}</p>
                <p>${t('faqSaveNote')}</p>
            `,
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
            `,
    },
    {
      title: t('faqExportTitle'),
      content: `<p>${t('faqExportDesc')}</p>`,
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
            `,
    },
    {
      title: t('faqBugTitle'),
      content: `
                <div style="background:linear-gradient(135deg, #667eea, #764ba2); color:#fff; padding:15px; border-radius:10px; text-align:center;">
                    <b>${t('faqBugDesc')}</b><br>
                    <a href="mailto:${t('faqBugEmail')}?subject=Grafik Gillette" style="color:#fff; font-weight:bold; text-decoration:none;">${t('faqBugEmail')}</a>
                </div>
                <p>${t('faqBugNote')}</p>
            `,
    },
  ];

  container.innerHTML = faqItems
    .map(
      (item, idx) => `
        <details class="faq-item" ${idx === 0 ? 'open' : ''}>
            <summary>${item.title}</summary>
            <div class="faq-answer">
                ${item.content}
            </div>
        </details>
    `
    )
    .join('');
}

/* === ZASTOSUJ TŁUMACZENIA DO DOM === */
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'BUTTON' || el.tagName === 'SELECT') {
      el.textContent = val;
    } else {
      el.innerHTML = val;
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });

  const langIcon = document.getElementById('langToggleBtn');
  if (langIcon) {
    const flags = { pl: '🇵🇱', en: '🇺🇸', uk: '🇺🇦' };
    langIcon.textContent = flags[currentLang] || '🌐';
  }

  if (typeof refreshViews === 'function') refreshViews();
  renderFAQ();
}

/* === INICJALIZACJA === */
currentLang = detectLanguage();
if (typeof updateLocalizedNames === 'function') updateLocalizedNames();
