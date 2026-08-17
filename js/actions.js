/* ================================================================
   GRAFIK GILLETTE — Moduł 8: AKCJE (ICS, JSON, SHARE, MENU)
   ================================================================ */

function bindClick(id, handler) {
  const el = document.getElementById(id);
  if (el) {
    el.onclick = handler;
  } else {
    console.warn(`[actions.js] Element #${id} not found in DOM`);
  }
}

/* === ICS EXPORT === */
function exportICS() {
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Gillette Grafik//PL\r\n';
  const ySched = getYearSchedule(currentYear);
  function pad(n) {
    return String(n).padStart(2, '0');
  }
  for (let m = 1; m <= 12; m++) {
    const arr = ySched[m][selectedShift];
    for (let i = 0; i < arr.length; i++) {
      const s = arr[i];
      if (isWolne(s)) continue;
      if (isUrlop(currentYear, m, i + 1, selectedShift)) continue;
      const [sh, eh] = shiftHours[s];
      const dt = new Date(currentYear, m - 1, i + 1);
      const startDt = new Date(dt);
      startDt.setHours(sh, 0, 0);
      const endDt = new Date(dt);
      endDt.setHours(eh, 0, 0);
      const fmt = (d) =>
        d.getFullYear() +
        pad(d.getMonth() + 1) +
        pad(d.getDate()) +
        'T' +
        pad(d.getHours()) +
        pad(d.getMinutes()) +
        '00';
      ics += `BEGIN:VEVENT\r\nUID:${currentYear}-${m}-${i + 1}-${selectedShift}@gillette\r\nDTSTART:${fmt(startDt)}\r\nDTEND:${fmt(endDt)}\r\nSUMMARY:${s} - Brygada ${selectedShift}\r\nEND:VEVENT\r\n`;
    }
  }
  (urlops[selectedShift] || []).forEach((k) => {
    const parts = k.split('-').map(Number);
    if (parts.length !== 3 || parts[0] !== currentYear) return;
    const yy = parts[0],
      mm = parts[1],
      dd = parts[2];
    const fmtD = (dt) =>
      dt.getFullYear() +
      String(dt.getMonth() + 1).padStart(2, '0') +
      String(dt.getDate()).padStart(2, '0');
    const dt = new Date(yy, mm - 1, dd);
    const dtEnd = new Date(dt);
    dtEnd.setDate(dd + 1);
    ics += `BEGIN:VEVENT\r\nUID:urlop-${k}-${selectedShift}@gillette\r\nDTSTART;VALUE=DATE:${fmtD(dt)}\r\nDTEND;VALUE=DATE:${fmtD(dtEnd)}\r\nSUMMARY:🌴 URLOP - Brygada ${selectedShift}\r\nEND:VEVENT\r\n`;
  });
  ics += 'END:VCALENDAR\r\n';
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grafik_${selectedShift}_${currentYear}.ics`;
  a.click();
  showToast('success', t('exportSuccess'));
}
/* === PRINT HEADER/FOOTER === */
function addPrintHeader() {
  const existing = document.querySelector('.print-header');
  if (existing) existing.remove();
  const header = document.createElement('div');
  header.className = 'print-header';
  const today = new Date();
  const dateStr = `${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;
  const viewName =
    {
      dashboard: t('printHeaderDashboard'),
      week: t('printHeaderWeek'),
      month: t('printHeaderMonth'),
      table: t('printHeaderTable'),
    }[currentView] || '';
  const yearSuffix = yearMode ? t('printYearSuffix') : '';
  header.textContent = `🏭 ${t('appName')} — ${viewName}${yearSuffix} • Brygada ${selectedShift} • ${dateStr}`;
  document.body.prepend(header);
}
function addPrintFooter() {
  const existing = document.querySelector('.print-footer');
  if (existing) existing.remove();
  const footer = document.createElement('div');
  footer.className = 'print-footer';
  footer.textContent = `${t('printGenerated')}: ${new Date().toLocaleString('pl-PL')} • ${t('appName')}`;
  document.body.appendChild(footer);
}
window.addEventListener('beforeprint', () => {
  addPrintHeader();
  addPrintFooter();
});
window.addEventListener('afterprint', () => {
  document.querySelectorAll('.print-header, .print-footer').forEach((el) => el.remove());
});

/* === SHARE === */
function buildShareUrl() {
  const params = new URLSearchParams();
  params.set('view', currentView);
  params.set('y', currentYear);

  // Rok mode
  if (yearMode && (currentView === 'month' || currentView === 'table')) {
    params.set('rok', '1');
  }

  // Місяць (для month/week/table без yearMode)
  if (currentView === 'month' || currentView === 'week' || (currentView === 'table' && !yearMode)) {
    params.set('m', currentMonth);
  }

  // День (тільки для month з вибраним днем, або week)
  if ((currentView === 'month' && selectedDay && !yearMode) || currentView === 'week') {
    const d = selectedDay || new Date().getDate();
    params.set('d', d);
  }

  // Бригада (для всіх видів окрім table)
  if (currentView !== 'table') {
    params.set('brig', selectedShift);
  }

  return `${location.origin}${location.pathname}?${params.toString()}`;
}

function buildShareText() {
  // Опис того, чим ділимося (для тексту повідомлення)
  const viewNames = {
    dashboard: t('viewDashboard'),
    week: t('viewWeek'),
    month: yearMode
      ? t('yearViewTitle', { year: currentYear })
      : `${monthNames[currentMonth - 1]} ${currentYear}`,
    table: yearMode
      ? t('yearViewTitle', { year: currentYear })
      : t('monthViewTitle', { month: monthNames[currentMonth - 1], year: currentYear }),
  };

  let text = `📅 ${viewNames[currentView]}`;

  if (currentView === 'week') {
    const d = selectedDay || new Date().getDate();
    text = `📆 ${t('viewWeek')} ${d} ${monthNames[currentMonth - 1]} ${currentYear}`;
  } else if (currentView === 'month' && selectedDay && !yearMode) {
    text = `📅 ${selectedDay} ${monthNames[currentMonth - 1]} ${currentYear}`;
  }

  if (currentView !== 'table') {
    text += ` • Brygada ${selectedShift}`;
  }

  return text;
}

function shareCurrent() {
  const url = buildShareUrl();
  const text = buildShareText();
  const isLocal = location.protocol === 'file:' || !location.origin || location.origin === 'null';

  // Локальний файл: копіюємо текст без URL
  if (isLocal) {
    const content = `${text}\n🏭 ${t('appName')}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(content)
        .then(() => showToast('success', t('shareCopied')))
        .catch(() => showToast('error', t('shareCopyFailed')));
    } else {
      showToast('error', t('shareCopyFailed'));
    }
    return;
  }

  // Native share (mobile)
  if (navigator.share) {
    navigator
      .share({ title: t('appName'), text, url })
      .then(() => showToast('success', t('shareSuccess')))
      .catch(() => copyToClipboard(url));
  } else {
    copyToClipboard(url);
  }
}

function copyToClipboard(url) {
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(url)
      .then(() => showToast('success', t('shareLinkCopied')))
      .catch(() => showToast('error', t('shareLinkFailed')));
  } else {
    showToast('error', t('shareLinkFailed'));
  }
}

/* === EXPORT/IMPORT JSON === */
document.getElementById('exportDataBtn').onclick = () => {
  const data = {
    _meta: { app: t('appName'), v: 3.1, date: new Date().toISOString() },
    customSchedule,
    urlops,
    notes,
    overtimes,
    prefs,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grafik_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  showToast('success', t('exportJsonSuccess'));
};

bindClick('menuIcs', () => {
  closeSideMenu();
  exportICS();
});
bindClick('menuPrint', () => {
  closeSideMenu();
  window.print();
});
bindClick('menuShare', () => {
  closeSideMenu();
  shareCurrent();
});

/* === IMPORT === */
function validateImportedData(data) {
  if (!data || typeof data !== 'object') throw new Error(t('importDataError'));
  if (!data.customSchedule && !data.urlops && !data.notes && !data.overtimes)
    throw new Error(t('importMissingKeys'));

  const brigades = ['A', 'B', 'C', 'D'];

  if (data.customSchedule) {
    if (typeof data.customSchedule !== 'object') throw new Error(t('importInvalidSchedule'));
    for (const year in data.customSchedule) {
      if (isNaN(parseInt(year, 10))) throw new Error(t('importInvalidYear', { year }));
      const months = data.customSchedule[year];
      if (typeof months !== 'object') throw new Error(t('importInvalidMonths', { year }));
      for (let m = 1; m <= 12; m++) {
        if (!months[m]) continue;
        const monthData = months[m];
        brigades.forEach((b) => {
          if (monthData[b]) {
            if (!Array.isArray(monthData[b]))
              throw new Error(t('importInvalidBrigade', { brig: b, m, year }));
            const daysInMonth = new Date(year, m, 0).getDate();
            if (monthData[b].length !== daysInMonth)
              throw new Error(
                t('importInvalidDays', {
                  brig: b,
                  m,
                  year,
                  actual: monthData[b].length,
                  expected: daysInMonth,
                })
              );
            monthData[b].forEach((dayVal, idx) => {
              if (typeof dayVal !== 'string')
                throw new Error(t('importInvalidDayValue', { idx: idx + 1, brig: b, m, year }));
            });
          }
        });
      }
    }
  }

  if (data.urlops) {
    if (typeof data.urlops !== 'object') throw new Error(t('importInvalidUrlops'));
    brigades.forEach((b) => {
      if (data.urlops[b]) {
        if (!Array.isArray(data.urlops[b])) throw new Error(t('importUrlopsArray', { brig: b }));
        data.urlops[b].forEach((d) => {
          if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d))
            throw new Error(t('importInvalidUrlopDate', { date: d }));
        });
      }
    });
  }

  if (data.overtimes) {
    if (typeof data.overtimes !== 'object') throw new Error(t('importInvalidOvertimes'));
    for (const k in data.overtimes) {
      const ot = data.overtimes[k];
      if (!ot || typeof ot !== 'object') throw new Error(t('importInvalidOtEntry', { key: k }));
      ['przed', 'po', 'weekend'].forEach((p) => {
        if (ot[p]) {
          if (typeof ot[p] !== 'object' || typeof ot[p].hours !== 'number')
            throw new Error(t('importInvalidOtValue', { pos: p, key: k }));
        }
      });
    }
  }

  if (data.notes) {
    if (typeof data.notes !== 'object') throw new Error(t('importInvalidNotes'));
    for (const k in data.notes) {
      if (typeof data.notes[k] !== 'string') throw new Error(t('importInvalidNote', { key: k }));
    }
  }
}

bindClick('importDataBtn', () => document.getElementById('importFile').click());
document.getElementById('importFile').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      validateImportedData(data);
      showConfirm(
        t('importReplaceTitle'),
        t('importReplaceBody'),
        () => {
          if (data.customSchedule) {
            customSchedule = data.customSchedule;
            saveCustomSchedule(customSchedule);
          }
          if (data.urlops) {
            Object.keys(urlops).forEach((k) => delete urlops[k]);
            Object.assign(urlops, data.urlops);
            saveUrlops(urlops);
          }
          if (data.notes) {
            Object.keys(notes).forEach((k) => delete notes[k]);
            Object.assign(notes, data.notes);
            saveNotes(notes);
          }
          if (data.overtimes) {
            overtimes = data.overtimes;
            saveOvertimes(overtimes);
          }
          showToast('success', t('importSuccess'));
          refreshViews();
        },
        { primaryText: t('importBtn'), primaryClass: 'primary' }
      );
    } catch (err) {
      const msg = err instanceof SyntaxError ? t('importJsonError') : err.message;
      showToast('error', t('importError', { msg }));
    }
  };
  reader.readAsText(file);
  e.target.value = '';
};

/* === MENU: OPCJE === */

bindClick('menuVacationLimit', () => {
  closeSideMenu();
  const currentLimit = getVacationLimit(selectedShift);
  const body = `
    <p>${t('vacationLimitBody', { brig: selectedShift })}</p>
    <input id="vacationLimitInput" type="number" min="0" step="1" value="${currentLimit}" style="width:100%; padding:10px; border:1px solid var(--border-cell); border-radius:8px; font-size:16px;">
  `;
  showModal({
    title: t('vacationLimitTitle'),
    body,
    buttons: [
      { text: t('vacationLimitCancel'), class: 'secondary' },
      {
        text: t('vacationLimitSave'),
        class: 'primary',
        onClick: () => {
          const input = document.getElementById('vacationLimitInput');
          const parsed = Number(input.value);
          if (!Number.isFinite(parsed) || parsed < 0) {
            showToast('error', t('vacationLimitInvalid'));
            return;
          }
          setVacationLimit(selectedShift, parsed);
          showToast('success', t('vacationLimitSet', { brig: selectedShift, n: parsed }));
          refreshViews();
        },
      },
    ],
  });
});

/* === CZYSZCZENIE ROKU / RESET === */
bindClick('clearYearBtn', () => {
  showConfirm(
    t('clearYearTitle', { year: currentYear }),
    t('clearYearBody'),
    () => {
      delete customSchedule[currentYear];
      saveCustomSchedule(customSchedule);
      Object.keys(pendingChanges).forEach((k) => {
        if (parseInt(k.split('-')[0], 10) === currentYear) {
          delete pendingChanges[k];
          delete pendingOriginals[k];
        }
      });
      undoStack = [];
      redoStack = [];
      updateDirtyIndicator();
      refreshViews();
      showToast('warn', t('yearCleared', { year: currentYear }));
    },
    { primaryText: t('clearYearBtn'), primaryClass: 'danger' }
  );
});

bindClick('resetCustomBtn', () => {
  showConfirm(
    t('resetTitle'),
    t('resetBody'),
    () => {
      customSchedule = {};
      saveCustomSchedule(customSchedule);
      pendingChanges = {};
      pendingOriginals = {};
      undoStack = [];
      redoStack = [];
      updateDirtyIndicator();
      refreshViews();
      showToast('warn', t('resetSuccess'));
    },
    { primaryText: t('resetBtn'), primaryClass: 'danger' }
  );
});

/* === SHARE APP (link + QR code) === */
function getAppUrl() {
  // Базовий URL додатку (без параметрів)
  return `${location.origin}${location.pathname}`;
}

function buildQRCodeUrl(text, size = 250) {
  // Використовуємо публічний сервіс QR Server (безкоштовний, без ключа)
  const encoded = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=10`;
}

function shareApp() {
  const appUrl = getAppUrl();
  const qrUrl = buildQRCodeUrl(appUrl, 280);

  const body = `
    <div style="text-align:center;">
      <p style="margin-bottom:16px; font-size:14px;">
        ${t('shareAppIntro')}
      </p>

      <div style="background:#fff; padding:12px; border-radius:12px; display:inline-block; box-shadow:0 4px 15px rgba(0,0,0,0.15); margin-bottom:16px;">
        <img src="${qrUrl}" alt="QR Code" style="display:block; width:240px; height:240px;" onerror="this.style.display='none'; document.getElementById('qrError').style.display='block';">
        <div id="qrError" style="display:none; color:#c0392b; padding:20px; font-size:13px;">
          ⚠️ ${t('shareAppQrError')}
        </div>
      </div>

      <div style="background:var(--bg-cell); border:1px solid var(--border-cell); border-radius:8px; padding:10px 12px; margin-bottom:12px; word-break:break-all; font-family:monospace; font-size:13px; color:var(--text-header);">
        ${appUrl}
      </div>

      <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-bottom:8px;">
        <button id="shareAppCopyBtn" class="modal-btn secondary" style="flex:1; min-width:130px;">
          📋 ${t('shareAppCopy')}
        </button>
        <button id="shareAppNativeBtn" class="modal-btn primary" style="flex:1; min-width:130px;">
          🔗 ${t('shareAppShare')}
        </button>
      </div>

      <p style="font-size:11px; color:var(--text-muted); margin-top:12px;">
        ${t('shareAppHint')}
      </p>
    </div>
  `;

  showModal({
    title: `📱 ${t('shareAppTitle')}`,
    body: body,
    buttons: [{ text: t('close'), class: 'secondary' }],
  });

  // Attach handlers after modal is shown
  setTimeout(() => {
    const copyBtn = document.getElementById('shareAppCopyBtn');
    const nativeBtn = document.getElementById('shareAppNativeBtn');

    if (copyBtn) {
      copyBtn.onclick = () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(appUrl)
            .then(() => showToast('success', t('shareAppCopied')))
            .catch(() => showToast('error', t('shareCopyFailed')));
        } else {
          // Fallback для старих браузерів
          const textarea = document.createElement('textarea');
          textarea.value = appUrl;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand('copy');
            showToast('success', t('shareAppCopied'));
          } catch (e) {
            showToast('error', t('shareCopyFailed'));
          }
          document.body.removeChild(textarea);
        }
      };
    }

    if (nativeBtn) {
      nativeBtn.onclick = () => {
        if (navigator.share) {
          navigator
            .share({
              title: t('appName'),
              text: t('shareAppText'),
              url: appUrl,
            })
            .then(() => showToast('success', t('shareSuccess')))
            .catch((err) => {
              // Користувач скасував — не показуємо помилку
              if (err.name !== 'AbortError') {
                showToast('error', t('shareCopyFailed'));
              }
            });
        } else {
          // Немає Web Share API — просто копіюємо
          navigator.clipboard
            .writeText(appUrl)
            .then(() => showToast('info', t('shareLinkCopied')))
            .catch(() => showToast('error', t('shareCopyFailed')));
        }
      };
    }
  }, 100);
}

bindClick('menuShareApp', () => {
  closeSideMenu();
  shareApp();
});

bindClick('menuPrivacyMode', () => {
  togglePrivacyMode();
});

/* === ADMIN: EXPORT FACTORY SCHEDULE AS data.js SNIPPET === */

/**
 * Merges factorySchedule + customSchedule for a given year.
 * customSchedule takes precedence (admin's edits override factory).
 * @param {number} year
 * @returns {object} - { 1: { A: [...], B, C, D }, 2: {...}, ... 12: {...} }
 */
function mergeFactoryWithCustom(year) {
  const merged = {};
  const factory = factorySchedule[year] || {};
  const custom = customSchedule[year] || {};
  const brigades = ['A', 'B', 'C', 'D'];

  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(year, m, 0).getDate();
    merged[m] = {};
    brigades.forEach((b) => {
      // Start with factory data (or empty array)
      const factoryArr =
        factory[m] && factory[m][b] ? [...factory[m][b]] : new Array(daysInMonth).fill('');
      // Overlay custom edits (day by day)
      if (custom[m] && custom[m][b]) {
        for (let d = 0; d < daysInMonth; d++) {
          const customVal = custom[m][b][d];
          if (customVal !== undefined && customVal !== null) {
            factoryArr[d] = customVal;
          }
        }
      }
      // Ensure exactly daysInMonth length
      while (factoryArr.length < daysInMonth) factoryArr.push('');
      if (factoryArr.length > daysInMonth) factoryArr.length = daysInMonth;
      merged[m][b] = factoryArr;
    });
  }
  return merged;
}

/**
 * Calculates factoryMonthHours automatically from schedule (R+P+N × 8h).
 * @param {object} yearData - merged schedule for one year
 * @returns {object} - { 1: { A: 168, B: 184, C: 160, D: 168 }, ... }
 */
function calculateMonthHours(yearData) {
  const hours = {};
  const brigades = ['A', 'B', 'C', 'D'];
  for (let m = 1; m <= 12; m++) {
    hours[m] = {};
    brigades.forEach((b) => {
      const arr = yearData[m] ? yearData[m][b] || [] : [];
      const workedDays = arr.filter((s) => s === 'R' || s === 'P' || s === 'N').length;
      hours[m][b] = workedDays * 8;
    });
  }
  return hours;
}

/**
 * Formats one year of schedule data as pretty-printed JS code (indented).
 * @param {number} year
 * @param {object} yearData - merged schedule
 * @returns {string} - JS code snippet
 */
function formatYearAsJs(year, yearData) {
  let out = `    ${year}: {\n`;
  for (let m = 1; m <= 12; m++) {
    out += `      ${m}: {\n`;
    ['A', 'B', 'C', 'D'].forEach((b, idx) => {
      const arr = yearData[m][b] || [];
      const formatted = arr.map((v) => `'${v}'`).join(', ');
      const comma = idx < 3 ? ',' : '';
      out += `        ${b}: [${formatted}]${comma}\n`;
    });
    const comma = m < 12 ? ',' : '';
    out += `      }${comma}\n`;
  }
  out += `    }`;
  return out;
}

/**
 * Formats factoryMonthHours as JS code.
 * @param {number} year
 * @param {object} hoursData
 * @returns {string}
 */
function formatHoursAsJs(year, hoursData) {
  let out = `    ${year}: {\n`;
  for (let m = 1; m <= 12; m++) {
    const h = hoursData[m];
    const comma = m < 12 ? ',' : '';
    out += `      ${m}: { A: ${h.A}, B: ${h.B}, C: ${h.C}, D: ${h.D} }${comma}\n`;
  }
  out += `    }`;
  return out;
}

/**
 * Main function: generates data.js snippet for a chosen year and downloads it.
 * Shows instructions modal after download.
 */
function exportFactorySchedule() {
  // Get list of available years (from factorySchedule and customSchedule combined)
  const factoryYears = Object.keys(factorySchedule || {}).map(Number);
  const customYears = Object.keys(customSchedule || {}).map(Number);
  const allYears = [...new Set([...factoryYears, ...customYears])].sort();

  if (allYears.length === 0) {
    showToast('error', t('adminExportNoData') || 'No data to export');
    return;
  }

  // Build year selection buttons
  const yearButtons = allYears
    .map((y) => {
      const hasCustom = customYears.includes(y);
      const hasFactory = factoryYears.includes(y);
      const label = hasCustom && hasFactory ? `${y} ✏️` : hasCustom ? `${y} 🆕` : `${y}`;
      const title = hasCustom
        ? t('adminExportYearWithEdits') || 'Contains your edits'
        : t('adminExportYearFactory') || 'Factory data only';
      return `<button class="admin-export-year-btn" data-year="${y}" title="${title}" style="padding:12px 20px; margin:4px; border:2px solid var(--border-cell); background:var(--bg-cell); color:var(--text-main); border-radius:8px; cursor:pointer; font-size:15px; font-weight:700;">${label}</button>`;
    })
    .join('');

  const body = `
    <p style="margin-bottom:12px;">${t('adminExportSelectYear') || 'Select year to export:'}</p>
    <div style="display:flex; flex-wrap:wrap; justify-content:center; margin-bottom:12px;">
      ${yearButtons}
    </div>
    <p style="font-size:12px; color:var(--text-muted); margin-top:8px;">
      ✏️ = ${t('adminExportYearWithEdits') || 'contains your edits'}<br>
      🆕 = ${t('adminExportYearNew') || 'new year (custom only)'}
    </p>
  `;

  showModal({
    title: '📤 ' + (t('menuAdminExport') || 'Export data.js'),
    body: body,
    buttons: [{ text: t('otCancelBtn'), class: 'secondary' }],
  });

  // Attach year button handlers
  setTimeout(() => {
    document.querySelectorAll('.admin-export-year-btn').forEach((btn) => {
      btn.onclick = () => {
        const year = parseInt(btn.dataset.year, 10);
        hideModal();
        generateAndDownloadDataJs(year);
      };
    });
  }, 50);
}

/**
 * Generates JS snippet and triggers download.
 * @param {number} year
 */
function generateAndDownloadDataJs(year) {
  try {
    const merged = mergeFactoryWithCustom(year);
    const hours = calculateMonthHours(merged);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);

    const content = `/* ================================================================
   GRAFIK GILLETTE — data.js snippet for year ${year}
   Auto-generated: ${dateStr} by Admin Panel Export
   ================================================================

   INSTRUCTIONS FOR DEPLOYMENT:
   1. Open js/data.js in your editor
   2. Find the line: "const factorySchedule = {"
   3. Find the closing "};" of factorySchedule
   4. Insert the "${year}" block below INSIDE the {} braces
      (add a comma after the previous year's closing "}" if needed)
   5. Do the same for factoryMonthHours
   6. git add js/data.js
   7. git commit -m "chore(data): add ${year} factory schedule"
   8. git push
   9. GitHub Actions will auto-deploy — users get toast "🔄 New version"

   ================================================================ */

/* === PASTE INSIDE const factorySchedule = { ... }; === */

${formatYearAsJs(year, merged)}

/* === PASTE INSIDE const factoryMonthHours = { ... }; === */

${formatHoursAsJs(year, hours)}
`;

    // Trigger download
    const blob = new Blob([content], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-${year}-snippet.js`;
    a.click();
    URL.revokeObjectURL(url);

    // Show success modal with instructions
    showInstructionsModal(year);
  } catch (err) {
    console.error('[actions.js] Export data.js error:', err);
    showToast('error', (t('adminExportError') || 'Export failed') + ': ' + err.message);
  }
}

/**
 * Shows post-download modal with deployment instructions.
 * @param {number} year
 */
function showInstructionsModal(year) {
  const body = `
    <div style="padding:12px; background:var(--bg-info); border-radius:10px; margin-bottom:15px;">
      <p style="margin:0; font-weight:600; color:var(--text-header);">
        ✅ ${t('adminExportSuccess') || 'File downloaded:'} <code>data-${year}-snippet.js</code>
      </p>
    </div>
    <p style="font-weight:600; margin-bottom:10px;">
      ${t('adminExportSteps') || 'Deployment steps:'}
    </p>
    <ol style="line-height:1.7; font-size:14px; padding-left:22px;">
      <li>${t('adminExportStep1') || 'Open the downloaded file in your editor'}</li>
      <li>${t('adminExportStep2') || 'Copy the block after "PASTE INSIDE const factorySchedule..."'}</li>
      <li>${t('adminExportStep3') || 'Paste it into <code>js/data.js</code> inside <code>factorySchedule = { ... }</code>'}</li>
      <li>${t('adminExportStep4') || 'Repeat for <code>factoryMonthHours</code>'}</li>
      <li><code>git add js/data.js && git commit -m "chore(data): add ${year}" && git push</code></li>
      <li>${t('adminExportStep6') || 'GitHub Actions deploys automatically (2-5 min)'}</li>
      <li>${t('adminExportStep7') || 'Users see toast "🔄 New version available"'}</li>
    </ol>
    <p style="font-size:12px; color:var(--text-muted); margin-top:12px; padding-top:12px; border-top:1px solid var(--border-cell);">
      💡 ${t('adminExportTip') || 'Detailed instructions are also in the downloaded file (comments at the top).'}
    </p>
  `;

  showModal({
    title: '📦 ' + (t('adminExportInstructions') || 'Deployment Instructions'),
    body: body,
    buttons: [{ text: t('gotIt') || 'OK', class: 'primary' }],
  });
}

/* === MENU HANDLER: Admin Export === */
bindClick('menuAdminExport', () => {
  closeSideMenu();
  exportFactorySchedule();
});
