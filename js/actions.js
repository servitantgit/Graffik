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

/* === ADMIN: DETAILED FAQ MODAL (Ukrainian, for admin only) === */
/**
 * Renders the Admin FAQ modal — comprehensive documentation for
 * administrator use cases. Language: Ukrainian only (single admin).
 * Purpose: "future-proof" self-documentation — if admin returns after
 * 6 months, they should be able to understand what to do without external help.
 */
function renderAdminFaq() {
  const sections = [
    {
      icon: '🎯',
      title: 'Як я редагую графік? (базові концепції)',
      content: `
        <p><b>У додатку є 2 типи графіка:</b></p>
        <ul>
          <li><b>Фабричний (<code>factorySchedule</code>)</b> — базовий графік з файлу <code>js/data.js</code>. Його бачать <b>усі</b> користувачі. Зашитий у код.</li>
          <li><b>Персональний (<code>customSchedule</code>)</b> — редагування конкретного користувача, зберігається в <code>localStorage</code> його браузера. Інші не бачать.</li>
        </ul>
        <p><b>Коли ти адмін і редагуєш через палету R/P/N/W:</b></p>
        <ul>
          <li>Зміни спочатку йдуть у <b>твій</b> customSchedule (як для звичайного юзера)</li>
          <li>Щоб зміни побачили <b>усі</b> — треба <b>експорт → git commit → git push</b></li>
          <li>Тоді GitHub Actions задеплоїть → data.js оновиться → всі юзери отримають toast "🔄 Nowa wersja"</li>
        </ul>
        <p style="padding:10px; background:var(--bg-info); border-radius:8px; margin-top:12px;">
          💡 <b>Головне правило:</b> Редагування в браузері = тільки твоє. Deploy через Git = для всіх.
        </p>
      `,
    },
    {
      icon: '✨',
      title: 'Як додати новий рік (2027, 2028...)',
      content: `
        <ol style="line-height:1.7;">
          <li><b>Увійди в Google Drive</b> як admin (servitant@gmail.com)</li>
          <li>Дочекайся появи "👑 Admin Panel" у боковому меню (до 3 сек)</li>
          <li><b>У year picker</b> (правий верх edit banner) натискай ›  до нового року (напр. 2027)</li>
          <li>Побачиш "Rok 2027 jest pusty" — це нормально</li>
          <li>Натисни <b>✏️ Włącz tryb edycji</b> → підтверди</li>
          <li>Empty state зникне → з'явиться <b>пуста сітка</b> календаря</li>
          <li>У палеті внизу активуй <b>R</b> (клавіша R або клік)</li>
          <li>Клікай на клітинки → фарбуй R (ранок)</li>
          <li>Аналогічно для P (день), N (ніч), W (вихідний)</li>
          <li>Перемикайся між <b>бригадами A/B/C/D</b> у top-bar</li>
          <li>Пройди всі 12 місяців для всіх 4 бригад</li>
          <li>Періодично тисни <b>💾 Zapisz</b> (Ctrl+S)</li>
          <li>Коли готово → див. секцію "📤 Як експортувати"</li>
        </ol>
        <p style="padding:10px; background:var(--bg-info); border-radius:8px; margin-top:12px;">
          ⏱️ <b>Реалістичний час:</b> 1500 клітинок (12 міс × 4 бриг × ~31 день). При 2 сек/клітинка = ~50 хв на рік.
        </p>
        <p style="padding:10px; background:#fff3cd; border-left:3px solid #f39c12; border-radius:6px; margin-top:8px;">
          ⚠️ <b>Порада:</b> Заводські графіки повторюються по циклах (наприклад, 8-денний цикл RRPPNNWW). Заповни один цикл, потім використовуй copy-paste у VS Code після експорту, щоб прискорити.
        </p>
      `,
    },
    {
      icon: '✏️',
      title: 'Як виправити помилку в існуючому році',
      content: `
        <p><b>Сценарій:</b> Ти вже задеплоїв графік, але потім знайшов помилку.</p>
        <ol style="line-height:1.7;">
          <li>Увійди як admin</li>
          <li>Перейди на потрібний рік і місяць</li>
          <li>Едит режим ✏️</li>
          <li>У палеті вибери <b>W</b> (чи потрібну зміну) → клікни клітинку → перезапис</li>
          <li>💾 Zapisz</li>
          <li>Експорт → deploy (див. наступну секцію)</li>
        </ol>
        <p><b>Швидкі способи стерти:</b></p>
        <ul>
          <li>Клавіша <code>W</code> + клік → ставить порожню зміну</li>
          <li>Ctrl+Z → скасовує останню дію</li>
          <li>Ctrl+Y → повторює скасовану</li>
        </ul>
        <p style="padding:10px; background:var(--bg-info); border-radius:8px; margin-top:12px;">
          💡 <b>Якщо помилок багато:</b> Простіше видалити рік через <b>☰ Menu → 👑 Admin Panel → 🗑 Wyczyść rok</b> і заповнити заново.
        </p>
      `,
    },
    {
      icon: '📤',
      title: 'Як експортувати та задеплоїти (git flow)',
      content: `
        <p><b>Крок 1: Експорт у додатку</b></p>
        <ol style="line-height:1.7;">
          <li>☰ Menu → 👑 Admin Panel → <b>📤 Export data.js</b></li>
          <li>Виберіть рік (напр. 2027)</li>
          <li>Скачається файл <code>data-2027-snippet.js</code></li>
          <li>Прочитай інструкцію у модалці, що з'явиться</li>
        </ol>
        <p><b>Крок 2: Оновлення репозиторію</b></p>
        <ol style="line-height:1.7;">
          <li>Відкрий скачаний файл у VS Code (або будь-якому редакторі)</li>
          <li>Відкрий <code>js/data.js</code> у репо</li>
          <li>Знайди рядок <code>const factorySchedule = {</code></li>
          <li>Скопіюй блок <b>"PASTE INSIDE const factorySchedule..."</b> зі скачаного файла</li>
          <li>Встав його <b>всередину</b> <code>{ ... }</code> — після року 2026, додай кому <code>,</code> між роками</li>
          <li>Аналогічно для <code>factoryMonthHours</code></li>
        </ol>
        <p><b>Крок 3: Git commit + push</b></p>
        <pre style="background:#2c3e50; color:#fff; padding:10px; border-radius:6px; overflow-x:auto; font-size:12px;">cd Graffik
git add js/data.js
git commit -m "chore(data): add 2027 factory schedule"
git push</pre>
        <p><b>Крок 4: Автоматичний деплой</b></p>
        <ul>
          <li>GitHub Actions запуститься автоматично (2-5 хв)</li>
          <li>Замінить <code>__BUILD_ID__</code> на git hash</li>
          <li>Задеплоїть на <code>gh-pages</code></li>
          <li>Юзери побачать toast: <b>"🔄 Nowa wersja dostępna"</b></li>
          <li>Клікнуть Odśwież → отримають графік на 2027 🎉</li>
        </ul>
      `,
    },
    {
      icon: '⌨️',
      title: 'Клавіатурні скорочення адміна',
      content: `
        <p><b>Palette (тільки в edit mode):</b></p>
        <table style="width:100%; border-collapse:collapse; margin:8px 0;">
          <tr style="background:var(--bg-cell);"><th style="padding:6px; text-align:left;">Клавіша</th><th style="padding:6px; text-align:left;">Дія</th></tr>
          <tr><td style="padding:6px;"><code>U</code></td><td style="padding:6px;">🌴 Urlop</td></tr>
          <tr><td style="padding:6px;"><code>S</code></td><td style="padding:6px;">➕ Дод. зміна (для юзерів)</td></tr>
          <tr><td style="padding:6px;"><code>1</code> / <code>2</code></td><td style="padding:6px;">⏱ OT PRZED / PO</td></tr>
          <tr style="background:#fff3cd;"><td style="padding:6px;"><code>R</code></td><td style="padding:6px;"><b>🌅 Ранок (тільки admin)</b></td></tr>
          <tr style="background:#fff3cd;"><td style="padding:6px;"><code>P</code></td><td style="padding:6px;"><b>🌤️ День (тільки admin)</b></td></tr>
          <tr style="background:#fff3cd;"><td style="padding:6px;"><code>N</code></td><td style="padding:6px;"><b>🌙 Ніч (тільки admin)</b></td></tr>
          <tr style="background:#fff3cd;"><td style="padding:6px;"><code>W</code></td><td style="padding:6px;"><b>🏖️ Вихідний (тільки admin)</b></td></tr>
        </table>
        <p><b>Загальні:</b></p>
        <ul>
          <li><code>Ctrl+Z</code> — скасувати</li>
          <li><code>Ctrl+Y</code> / <code>Ctrl+Shift+Z</code> — повторити</li>
          <li><code>Ctrl+S</code> — зберегти</li>
          <li><code>Esc</code> — вийти з edit mode / закрити modal</li>
          <li><code>E</code> — увімкнути/вимкнути edit mode</li>
          <li><code>←</code> / <code>→</code> — попередній/наступний місяць</li>
        </ul>
      `,
    },
    {
      icon: '🚨',
      title: 'Що робити коли щось пішло не так',
      content: `
        <p><b>Проблема 1: Помилково задеплоїв неправильний графік</b></p>
        <pre style="background:#2c3e50; color:#fff; padding:10px; border-radius:6px; font-size:12px;"># Відкат останнього коміту
cd Graffik
git revert HEAD
git push
# → GitHub Actions задеплоїть попередню версію</pre>
        <p><b>Проблема 2: Юзери скаржаться "не бачу нової версії"</b></p>
        <ul>
          <li>Юзер має клікнути <b>Ctrl+Shift+R</b> (hard reload)</li>
          <li>Або: DevTools → Application → Service Workers → Unregister → Reload</li>
          <li>Або: почекати 1 годину (auto-check у SW)</li>
        </ul>
        <p><b>Проблема 3: Admin режим не активується після login</b></p>
        <ul>
          <li>Переконайся що логінишся як <code>servitant@gmail.com</code></li>
          <li>Почекай 3 секунди (polling)</li>
          <li>Відкрий Console → перевір: <code>console.log(driveUserEmail)</code></li>
          <li>Якщо email не той → перелогінься</li>
        </ul>
        <p><b>Проблема 4: GitHub Actions failed</b></p>
        <ul>
          <li>Відкрий: <a href="https://github.com/servitantgit/Graffik/actions" target="_blank">https://github.com/servitantgit/Graffik/actions</a></li>
          <li>Клікни на червоний workflow</li>
          <li>Прочитай помилку</li>
          <li>Найчастіші причини: syntax error у data.js, недостатньо прав</li>
          <li>Виправ → git commit --amend → git push --force (обережно!)</li>
        </ul>
        <p><b>Проблема 5: Втратив локальні зміни в браузері</b></p>
        <ul>
          <li>Google Drive backup: ☰ Menu → Google Drive → Pobierz</li>
          <li>JSON backup: ☰ Menu → 📥 Eksport JSON (робити регулярно!)</li>
        </ul>
        <p style="padding:10px; background:#fadbd8; border-left:3px solid #c0392b; border-radius:6px; margin-top:12px;">
          🚨 <b>Nuclear option:</b> Якщо все зовсім погано → <code>git reset --hard <останній робочий commit></code> + <code>git push --force</code>. Втратиш деякі коміти, але сайт запрацює.
        </p>
      `,
    },
    {
      icon: '🔐',
      title: 'Безпека та бекапи',
      content: `
        <p><b>Що зберігається де:</b></p>
        <ul>
          <li><b>Код + factorySchedule</b> → GitHub repo (backup через Git history)</li>
          <li><b>Твої персональні дані</b> (urlopy, OT, notatki) → браузер localStorage</li>
          <li><b>Синхронізація</b> → Google Drive (лише твого акаунта)</li>
        </ul>
        <p><b>Регулярний бекап (раз на місяць):</b></p>
        <ol>
          <li>☰ Menu → 👑 Admin Panel → 📥 Eksport JSON</li>
          <li>Збережи файл у безпечному місці (Google Drive / Dropbox / USB)</li>
          <li>Це резервна копія на випадок якщо браузер очистять</li>
        </ol>
        <p><b>Хто має admin права:</b></p>
        <ul>
          <li>Тільки email у списку <code>ADMIN_EMAILS</code> у файлі <code>js/admin.js</code></li>
          <li>Зараз: <code>servitant@gmail.com</code></li>
          <li>Щоб додати нового admin — треба редагувати цей файл + git push</li>
          <li>Знання email <b>НЕ дає доступу</b> — треба фактичний Google login</li>
        </ul>
        <p><b>Що робити якщо admin-email скомпрометований:</b></p>
        <ol>
          <li>Зміни пароль Google акаунта негайно</li>
          <li>Google → Security → Third-party apps → Revoke Grafik Gillette</li>
          <li>Опційно: заміни ADMIN_EMAILS на новий email + git push</li>
        </ol>
      `,
    },
    {
      icon: '📞',
      title: 'Контакти на випадок катастрофи',
      content: `
        <p><b>Розробник (я):</b></p>
        <ul>
          <li>📧 Особистий: <a href="mailto:servitant@gmail.com">servitant@gmail.com</a></li>
          <li>📧 Робочий: <a href="mailto:tantsiura.s@pg.com">tantsiura.s@pg.com</a></li>
        </ul>
        <p><b>Технічні ресурси:</b></p>
        <ul>
          <li>🔧 GitHub repo: <a href="https://github.com/servitantgit/Graffik" target="_blank">github.com/servitantgit/Graffik</a></li>
          <li>🚀 Live app: <a href="https://servitantgit.github.io/Graffik/" target="_blank">servitantgit.github.io/Graffik</a></li>
          <li>⚙️ GitHub Actions: <a href="https://github.com/servitantgit/Graffik/actions" target="_blank">Actions page</a></li>
          <li>📚 Docs: <a href="https://github.com/servitantgit/Graffik/blob/main/PROJECT_DOCS.md" target="_blank">PROJECT_DOCS.md</a></li>
          <li>📝 CHANGELOG: <a href="https://github.com/servitantgit/Graffik/blob/main/CHANGELOG.md" target="_blank">CHANGELOG.md</a></li>
        </ul>
        <p><b>Якщо треба передати проект іншій людині:</b></p>
        <ol>
          <li>Дай доступ до GitHub repo (Settings → Collaborators)</li>
          <li>Додай її email у <code>ADMIN_EMAILS</code> в <code>js/admin.js</code></li>
          <li>Покажи цей FAQ — тут вся інформація</li>
          <li>Розкажи де знайти <code>PROJECT_DOCS.md</code> у корені repo</li>
        </ol>
        <p><b>Якщо треба відновити з нуля (все зламано):</b></p>
        <ol>
          <li>Склонуй repo: <code>git clone https://github.com/servitantgit/Graffik.git</code></li>
          <li>Відкрий в VS Code</li>
          <li>Прочитай <code>PROJECT_DOCS.md</code> + <code>CHANGELOG.md</code></li>
          <li>Дивись цей FAQ (він у самому додатку)</li>
        </ol>
        <p style="padding:10px; background:var(--bg-info); border-radius:8px; margin-top:12px; text-align:center;">
          💚 <b>Головне — не панікуй.</b> Все у Git. Все можна відкотити.
        </p>
      `,
    },
  ];

  // Build HTML with collapsible sections
  const sectionsHtml = sections
    .map(
      (s, idx) => `
    <details class="admin-faq-item" ${idx === 0 ? 'open' : ''} style="background:var(--bg-cell); border-radius:10px; border:1px solid var(--border-cell); overflow:hidden; margin-bottom:8px;">
      <summary style="padding:12px 16px; cursor:pointer; font-weight:600; font-size:15px; color:var(--text-header); list-style:none; display:flex; align-items:center; gap:8px;">
        <span style="font-size:20px;">${s.icon}</span>
        <span>${s.title}</span>
      </summary>
      <div style="padding:12px 16px 16px; font-size:13px; line-height:1.55; color:var(--text-main); border-top:1px solid var(--border-cell);">
        ${s.content}
      </div>
    </details>
  `
    )
    .join('');

  const body = `
    <p style="color:var(--text-muted); font-size:13px; margin-bottom:15px;">
      📚 Детальна інструкція для адміністратора. Клікни на секцію, щоб розгорнути.
    </p>
    <div style="display:flex; flex-direction:column; gap:6px;">
      ${sectionsHtml}
    </div>
    <p style="text-align:center; margin-top:16px; padding-top:12px; border-top:1px solid var(--border-cell); font-size:11px; color:var(--text-muted);">
      💡 Ця сторінка бачите тільки ви (адмін). Юзери її не бачать.<br>
      Оновлюється разом з кодом додатка. Останнє оновлення: ${new Date().toISOString().slice(0, 10)}
    </p>
  `;

  showModal({
    title: '👑 Admin FAQ — Інструкція адміна',
    body: body,
    buttons: [{ text: 'Зрозуміло', class: 'primary' }],
  });
}

/* === HANDLER: Admin FAQ button in top-bar === */
bindClick('adminFaqBtn', () => {
  renderAdminFaq();
});
