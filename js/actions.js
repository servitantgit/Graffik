/* ================================================================
   GRAFIK GILLETTE — Module 8: ACTIONS (ICS, JSON, SHARE, MENU)
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
/* === EXPORT CENTER === */
function openExportCenter() {
  const html = `
    <div style="padding: 24px;">
      <div style="margin-bottom: 20px;">
        <strong>${t('exportCenterTitle')}</strong>
      </div>
      
      <!-- Export ICS -->
      <div style="background: var(--bg-cell); border: 1px solid var(--border-cell); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <div style="flex-shrink: 0;">
            <span style="font-size: 24px;">📤</span>
          </div>
          <div>
            <div style="font-weight: 600; margin-bottom: 4px;">${t('exportICS')}</div>
            <div style="font-size: 14px; color: var(--text-muted);">${t('exportDesc')}</div>
          </div>
        </div>
        <button id="exportIcsBtn" class="modal-btn primary" style="width: 100%; margin-top: 12px; padding: 12px;">
          ${t('exportICS')}
        </button>
      </div>
      
      <!-- Print -->
      <div style="background: var(--bg-cell); border: 1px solid var(--border-cell); border-radius: 12px; padding: 16px;">
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <div style="flex-shrink: 0;">
            <span style="font-size: 24px;">🖨️</span>
          </div>
          <div>
            <div style="font-weight: 600; margin-bottom: 4px;">${t('print')}</div>
            <div style="font-size: 14px; color: var(--text-muted);">${t('printDesc')}</div>
          </div>
        </div>
        <button id="printBtn" class="modal-btn primary" style="width: 100%; margin-top: 12px; padding: 12px;">
          ${t('print')}
        </button>
      </div>
    </div>
  `;
  
  openActionSheet({
    id: 'export-center',
    title: t('exportCenterTitle'),
    html: html,
    onMount: (bodyElement) => {
      // Export ICS handler
      const exportIcsBtn = bodyElement.querySelector('#exportIcsBtn');
      if (exportIcsBtn) {
        exportIcsBtn.onclick = () => {
          closeActionSheet();
          exportICS();
        };
      }
      
      // Print handler
      const printBtn = bodyElement.querySelector('#printBtn');
      if (printBtn) {
        printBtn.onclick = () => {
          closeActionSheet();
          window.print();
        };
      }
    }
  });
}

// Expose globally
window.openExportCenter = openExportCenter;

/* === SHARE === */
function buildShareUrl() {
  const params = new URLSearchParams();
  params.set('view', currentView);
  params.set('y', currentYear);

  // Rok mode
  if (yearMode && (currentView === 'month' || currentView === 'table')) {
    params.set('rok', '1');
  }

  // Month/table without yearMode
  if (currentView === 'month' || (currentView === 'table' && !yearMode)) {
    params.set('m', currentMonth);
  }

  // Day (only for month with a selected day)
  if (currentView === 'month' && selectedDay && !yearMode) {
    params.set('d', selectedDay);
  }

  // Brigade (for all views except table)
  if (currentView !== 'table') {
    params.set('brig', selectedShift);
  }

  return `${location.origin}${location.pathname}?${params.toString()}`;
}

function buildShareText() {
  // Description of what is being shared (for the message text)
  const viewNames = {
    dashboard: t('viewDashboard'),
    month: yearMode
      ? t('yearViewTitle', { year: currentYear })
      : `${monthNames[currentMonth - 1]} ${currentYear}`,
    table: yearMode
      ? t('yearViewTitle', { year: currentYear })
      : t('monthViewTitle', { month: monthNames[currentMonth - 1], year: currentYear }),
  };

  let text = `📅 ${viewNames[currentView]}`;

  if (currentView === 'month' && selectedDay && !yearMode) {
    text = `📅 ${selectedDay} ${monthNamesGenitive[currentMonth - 1]} ${currentYear}`;
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

  // Local file: copy text without URL
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

/* === MENU: OPCJE === */

function openVacationLimitModal() {
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
}

bindClick('editVacationLimitBtn', () => {
  openVacationLimitModal();
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

/* === SHARE CENTER === */
function openShareCenter() {
  const isLocal = location.protocol === 'file:' || !location.origin || location.origin === 'null';
  const appUrl = getAppUrl();
  
  // Create tabbed interface
  let activeTab = 'current'; // current or application
  
  function renderCurrentViewTab() {
    const url = buildShareUrl();
    const text = buildShareText();
    
    return `
      <div style="padding: 16px;">
        <!-- Current View Tab Content -->
        <div>
          <div style="margin-bottom: 12px;">
            <strong>${t('shareCurrentView')}</strong>
          </div>
          
          <!-- Preview -->
          <div style="background: var(--bg-cell); border: 1px solid var(--border-cell); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
            <div style="font-size: 14px; margin-bottom: 8px;"><strong>${t('sharePreview')}</strong></div>
            <div style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">${text}</div>
            <div style="font-size: 13px; color: var(--text-muted);">${url}</div>
          </div>
          
          <!-- URL -->
          <div style="margin-bottom: 12px;">
            <strong>${t('shareGeneratedUrl')}</strong>
          </div>
          <div style="background: var(--bg-cell); border: 1px solid var(--border-cell); border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; word-break: break-all; font-family: monospace; font-size: 13px; color: var(--text-header);">
            ${url}
          </div>
          
          <!-- Actions -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="shareCurrentCopyBtn" class="modal-btn secondary" style="flex: 1; min-width: 140px;">
              📋 ${t('shareCopyLink')}
            </button>
            <button id="shareCurrentNativeBtn" class="modal-btn primary" style="flex: 1; min-width: 140px;">
              🔗 ${t('shareNativeShare')}
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  function renderApplicationTab() {
    const qrUrl = buildQRCodeUrl(appUrl, 280);
    
    return `
      <div style="padding: 16px;">
        <!-- Application Tab Content -->
        <div>
          <div style="margin-bottom: 12px;">
            <strong>${t('shareApplication')}</strong>
          </div>
          
          <!-- QR Code Container -->
          <div id="qrcodeContainer" style="text-align: center; margin-bottom: 20px;">
            <!-- QR Code will be loaded here -->
          </div>
          
          <!-- URL -->
          <div style="margin-bottom: 12px;">
            <strong>${t('shareAppUrl')}</strong>
          </div>
          <div style="background: var(--bg-cell); border: 1px solid var(--border-cell); border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; word-break: break-all; font-family: monospace; font-size: 13px; color: var(--text-header);">
            ${appUrl}
          </div>
          
          <!-- Actions -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="shareAppCopyBtn" class="modal-btn secondary" style="flex: 1; min-width: 140px;">
              📋 ${t('shareCopyLink')}
            </button>
            <button id="shareAppNativeBtn" class="modal-btn primary" style="flex: 1; min-width: 140px;">
              🔗 ${t('shareNativeShare')}
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  function attachHandlers(bodyElement) {
    // Current view tab handlers
    const currentCopyBtn = bodyElement.querySelector('#shareCurrentCopyBtn');
    const currentNativeBtn = bodyElement.querySelector('#shareCurrentNativeBtn');
    
    if (currentCopyBtn) {
      currentCopyBtn.onclick = () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(buildShareUrl())
            .then(() => showToast('success', t('shareLinkCopied')))
            .catch(() => showToast('error', t('shareLinkFailed')));
        } else {
          // Fallback for older browsers
          const textarea = document.createElement('textarea');
          textarea.value = buildShareUrl();
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand('copy');
            showToast('success', t('shareLinkCopied'));
          } catch (e) {
            showToast('error', t('shareLinkFailed'));
          }
          document.body.removeChild(textarea);
        }
      };
    }
    
    if (currentNativeBtn) {
      currentNativeBtn.onclick = () => {
        if (navigator.share && !isLocal) {
          navigator
            .share({
              title: t('appName'),
              text: buildShareText(),
              url: buildShareUrl(),
            })
            .then(() => showToast('success', t('shareSuccess')))
            .catch((err) => {
              // User cancelled — don't show an error
              if (err.name !== 'AbortError') {
                if (!isLocal) {
                  copyToClipboard(buildShareUrl());
                }
              }
            });
        } else {
          // Fallback to copy
          copyToClipboard(buildShareUrl());
        }
      };
    }
    
    // Application tab handlers
    const appCopyBtn = bodyElement.querySelector('#shareAppCopyBtn');
    const appNativeBtn = bodyElement.querySelector('#shareAppNativeBtn');
    
    if (appCopyBtn) {
      appCopyBtn.onclick = () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(getAppUrl())
            .then(() => showToast('success', t('shareAppCopied')))
            .catch(() => showToast('error', t('shareCopyFailed')));
        } else {
          // Fallback for older browsers
          const textarea = document.createElement('textarea');
          textarea.value = getAppUrl();
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
    
    if (appNativeBtn) {
      appNativeBtn.onclick = () => {
        if (navigator.share && !isLocal) {
          navigator
            .share({
              title: t('appName'),
              text: t('shareAppText'),
              url: getAppUrl(),
            })
            .then(() => showToast('success', t('shareSuccess')))
            .catch((err) => {
              // User cancelled — don't show an error
              if (err.name !== 'AbortError') {
                copyToClipboard(getAppUrl());
              }
            });
        } else {
          // Fallback to copy
          copyToClipboard(getAppUrl());
        }
      };
    }
    
    // Load QR code when application tab is selected
    const qrContainer = bodyElement.querySelector('#qrcodeContainer');
    if (qrContainer) {
      // Check if we're in the application tab
      const tabButtons = bodyElement.querySelectorAll('.share-tab-btn');
      tabButtons.forEach(btn => {
        btn.onclick = (e) => {
          // Update active tab
          tabButtons.forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          
          activeTab = e.target.dataset.tab;
          
          // Load QR code only when application tab is selected
          if (activeTab === 'application' && qrContainer) {
            qrContainer.innerHTML = `<img src="${buildQRCodeUrl(getAppUrl(), 280)}" alt="QR Code" style="width: 200px; height: 200px;">`;
          } else if (activeTab === 'current') {
            qrContainer.innerHTML = ''; // Clear QR code when not needed
          }
        };
      });
      
      // Initialize QR code for application tab if it's active
      if (activeTab === 'application') {
        qrContainer.innerHTML = `<img src="${buildQRCodeUrl(getAppUrl(), 280)}" alt="QR Code" style="width: 200px; height: 200px;">`;
      }
    }
  }
  
  const html = `
    <div style="display: flex; flex-direction: column; height: 100%;">
      <!-- Tabs -->
      <div style="display: flex; border-bottom: 1px solid var(--border-cell);">
        <button class="share-tab-btn${activeTab === 'current' ? ' active' : ''}" data-tab="current" style="flex: 1; padding: 12px; border: none; background: var(--bg-controls); color: var(--text-main); cursor: pointer;">
          ${t('shareCurrentView')}
        </button>
        <button class="share-tab-btn${activeTab === 'application' ? ' active' : ''}" data-tab="application" style="flex: 1; padding: 12px; border: none; background: var(--bg-controls); color: var(--text-main); cursor: pointer;">
          ${t('shareApplication')}
        </button>
      </div>
      
      <!-- Tab Content -->
      <div style="flex: 1; overflow-y: auto;">
        <!-- Content will be injected by onMount -->
        <div id="shareCenterContent"></div>
      </div>
    </div>
  `;
  
  openActionSheet({
    id: 'share-center',
    title: t('shareCenterTitle'),
    html: html,
    onMount: (bodyElement) => {
      // Inject initial content based on active tab
      const contentDiv = bodyElement.querySelector('#shareCenterContent');
      if (contentDiv) {
        if (activeTab === 'current') {
          contentDiv.innerHTML = renderCurrentViewTab();
        } else {
          contentDiv.innerHTML = renderApplicationTab();
        }
      }
      
      // Attach event handlers
      attachHandlers(bodyElement);
    }
  });
}

// Expose globally
window.openShareCenter = openShareCenter;

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
 * Generates schedules/gillette/YYYY.js file content and triggers download.
 * New format uses registerYearData() from schedules architecture.
 * @param {number} year
 */
function generateAndDownloadDataJs(year) {
  try {
    const merged = mergeFactoryWithCustom(year);
    const hours = calculateMonthHours(merged);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);

    // formatYearAsJs / formatHoursAsJs return "    YYYY: { ... }" (legacy nested shape).
    // registerYearData expects two plain objects — wrap stripped inner lines in обʼєкти.
    const scheduleFormatted = formatYearAsJs(year, merged);
    const scheduleLines = scheduleFormatted.split('\n');
    const scheduleInner = scheduleLines.slice(1, -1).join('\n');

    const hoursFormatted = formatHoursAsJs(year, hours);
    const hoursLines = hoursFormatted.split('\n');
    const hoursInner = hoursLines.slice(1, -1).join('\n');

    const content = `/* ================================================================
   GRAFIK GILLETTE — Data for year ${year} (Gillette schedule)
   
   PUBLIC MODULE — safe to commit to git
   
   Auto-generated: ${dateStr} by Admin Panel Export
   Data extracted from admin's local factorySchedule + customSchedule.
   
   Requires:
   - schedules/_registry.js (for registerYearData function)
   - schedules/gillette/metadata.js (registers 'gillette' schedule first)
   ================================================================ */

registerYearData(
  'gillette',
  ${year},
  {
${scheduleInner}
  },
  {
${hoursInner}
  }
);
`;

    // Trigger download
    const blob = new Blob([content], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${year}.js`;
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
 * Shows post-download modal with deployment instructions for new schedules format.
 * @param {number} year
 */
function showInstructionsModal(year) {
  const body = `
    <div style="padding:12px; background:var(--bg-info); border-radius:10px; margin-bottom:15px;">
      <p style="margin:0; font-weight:600; color:var(--text-header);">
        ✅ Файл скачано: <code>${year}.js</code>
      </p>
    </div>
    <p style="font-weight:600; margin-bottom:10px;">📦 Деплой (автопідключення script + SW):</p>
    <ol style="line-height:1.7; font-size:14px; padding-left:22px;">
      <li>Помісти <code>${year}.js</code> у <code>js/schedules/gillette/</code></li>
      <li>У корені проєкту запусти:<br>
        <code>python3 tools/sync_schedule_assets.py</code><br>
        <span style="font-size:12px;color:var(--text-muted);">Скрипт сам оновить <code>index.html</code> і <code>sw.js</code></span>
      </li>
      <li><code>git add js/schedules/gillette/${year}.js index.html sw.js</code></li>
      <li><code>git commit -m "chore(data): add ${year} factory schedule"</code></li>
      <li><code>git push</code> → GitHub Actions задеплоїть (2–5 хв)</li>
      <li>Юзери побачать toast про нову версію</li>
    </ol>
    <p style="font-size:12px; color:var(--text-muted); margin-top:12px; padding-top:12px; border-top:1px solid var(--border-cell);">
      💡 Для <b>оновлення існуючого</b> року достатньо замінити файл і push
      (sync-скрипт можна не запускати, якщо index/sw уже містять цей рік).
    </p>
  `;

  showModal({
    title: '📦 Інструкція деплою',
    body: body,
    buttons: [{ text: 'Зрозуміло', class: 'primary' }],
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
        <p><b>У додатку є 2 шари графіка:</b></p>
        <ul>
          <li><b>Фабричний (<code>factorySchedule</code>)</b> — з файлів <code>js/schedules/gillette/YYYY.js</code>. Бачать усі. Потрапляє на прод через git.</li>
          <li><b>Персональний (<code>customSchedule</code>)</b> — localStorage користувача (відпустки, OT, нотатки, локальні правки змін). Інші не бачать, поки не sync на <b>свій</b> Drive.</li>
        </ul>
        <p><b>Адмін + палітра R/P/N/W:</b></p>
        <ul>
          <li>Правки одразу пишуться в <b>твій</b> customSchedule (auto-save, кнопки «Зберегти» немає)</li>
          <li>Щоб зміни стали фабричними для всіх: <b>Export → файл у repo → sync-скрипт → commit → push</b></li>
        </ul>
        <p style="padding:10px; background:var(--bg-info); border-radius:8px; margin-top:12px;">
          💡 <b>Правило:</b> браузер = твоя чернетка. Git push = для всіх.
        </p>
      `,
    },
    {
      icon: '✨',
      title: 'Як додати новий рік (2027, 2028...)',
      content: `
        <ol style="line-height:1.7;">
          <li>Увійди в Google Drive як admin</li>
          <li>Дочекайся «👑 Admin Panel» у меню</li>
          <li>Year picker → новий рік (напр. 2027)</li>
          <li>✏️ Режим редагування</li>
          <li>Палітра <b>R / P / N / W</b> — намалюй графік по бригадах і місяцях</li>
          <li>Усі кліки <b>зберігаються одразу</b> (немає Ctrl+S)</li>
          <li>☰ → Admin → <b>Export</b> → вибери рік → скачається <code>YYYY.js</code></li>
          <li>Поклади файл у <code>js/schedules/gillette/</code></li>
          <li><code>python3 tools/sync_schedule_assets.py</code> — підключить рік у <code>index.html</code> і <code>sw.js</code></li>
          <li><code>git add … && git commit && git push</code></li>
        </ol>
        <p style="padding:10px; background:#e8f5e9; border-left:3px solid #4caf50; border-radius:6px; margin-top:8px;">
          ✅ Кожен рік — окремий файл. 2026 не чіпається при додаванні 2027.
        </p>
      `,
    },
    {
      icon: '✏️',
      title: 'Як виправити помилку в існуючому році',
      content: `
        <ol style="line-height:1.7;">
          <li>Admin login → потрібний рік/місяць → ✏️ edit</li>
          <li>Палітра R/P/N/W → клік по клітинці (зміна одразу збережена локально)</li>
          <li>Export цього року → замінити <code>js/schedules/gillette/YYYY.js</code></li>
          <li><code>git commit && git push</code> (sync-скрипт не обов’язковий, якщо рік уже в index/sw)</li>
        </ol>
        <p><b>Стерти зміну:</b> клавіша/палітра <code>W</code> + клік (порожній день).</p>
        <p style="font-size:12px;color:var(--text-muted);">Undo/Redo і «Зберегти» прибрані — модель як у відпусток/OT: тап = запис.</p>
      `,
    },
    {
      icon: '📤',
      title: 'Експорт і деплой (git flow)',
      content: `
        <p><b>1. У додатку</b></p>
        <ol style="line-height:1.7;">
          <li>☰ → 👑 Admin → <b>Export</b></li>
          <li>Обери рік (✏️ = є локальні правки, 🆕 = лише custom)</li>
          <li>Скачається валідний <code>YYYY.js</code> з <code>registerYearData(...)</code></li>
        </ol>
        <p><b>2. У репо</b></p>
        <pre style="background:#2c3e50;color:#fff;padding:10px;border-radius:6px;font-size:12px;overflow:auto;"># покласти файл
cp ~/Downloads/2027.js js/schedules/gillette/

# авто: script tags + SW ASSETS
python3 tools/sync_schedule_assets.py

git add js/schedules/gillette/2027.js index.html sw.js
git commit -m "chore(data): add 2027 factory schedule"
git push</pre>
        <p style="padding:10px; background:var(--bg-info); border-radius:8px; margin-top:12px;">
          🔧 <code>tools/sync_schedule_assets.py</code> сканує всі <code>YYYY.js</code> у папці gillette і синхронізує підключення. Без нього новий рік на проді не завантажиться.
        </p>
      `,
    },
    {
      icon: '💾',
      title: 'Що зберігається одразу, що йде на Drive',
      content: `
        <ul>
          <li><b>Одразу в localStorage:</b> зміни графіка (edit), відпустки, надгодини, нотатки, ліміти urlop</li>
          <li><b>Google Drive (твій акаунт):</b> один JSON — customSchedule, urlops, overtimes, notes, prefs</li>
          <li><b>Фабричний графік для всіх:</b> лише через Export + git (не через Drive)</li>
        </ul>
        <p>Login потрібен для personal data UI та admin. Logout ховає personal, але localStorage не чистить.</p>
      `,
    },
    {
      icon: '⌨️',
      title: 'Клавіші в edit mode',
      content: `
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <tr><td style="padding:6px;"><code>U</code></td><td style="padding:6px;">🌴 Відпустка</td></tr>
          <tr><td style="padding:6px;"><code>S</code></td><td style="padding:6px;">➕ Дод. зміна</td></tr>
          <tr><td style="padding:6px;"><code>1</code> / <code>2</code></td><td style="padding:6px;">⏱ OT перед / після</td></tr>
          <tr style="background:#fff3cd;"><td style="padding:6px;"><code>R</code> <code>P</code> <code>N</code> <code>W</code></td><td style="padding:6px;"><b>Лише admin — factory shift</b></td></tr>
          <tr><td style="padding:6px;"><code>E</code> / <code>Esc</code></td><td style="padding:6px;">Увімк./вимк. edit</td></tr>
          <tr><td style="padding:6px;"><code>←</code> <code>→</code></td><td style="padding:6px;">Місяць</td></tr>
        </table>
        <p style="font-size:12px;color:var(--text-muted);margin-top:8px;">Ctrl+S / Ctrl+Z більше не використовуються (auto-save).</p>
      `,
    },
    {
      icon: '🚨',
      title: 'Що робити коли щось пішло не так',
      content: `
        <p><b>Помилковий деплой графіка</b></p>
        <pre style="background:#2c3e50;color:#fff;padding:10px;border-radius:6px;font-size:12px;">git revert HEAD
git push</pre>
        <p><b>Юзери не бачать нову версію</b></p>
        <ul>
          <li>Hard reload (Ctrl+Shift+R) або Unregister SW</li>
          <li>Переконайся, що в коміті є year-файл <b>і</b> оновлені index.html / sw.js (або прогнаний sync-скрипт)</li>
        </ul>
        <p><b>Admin не з’являється</b></p>
        <ul>
          <li>Логін саме з email з <code>ADMIN_EMAILS</code> у <code>js/admin.js</code></li>
          <li>Console: <code>driveUserEmail</code></li>
        </ul>
        <p><b>Export «не відкривається» / SyntaxError</b></p>
        <ul>
          <li>Має бути формат <code>registerYearData('gillette', YEAR, scheduleObj, hoursObj)</code></li>
          <li>Перевір свіжий білд додатка (фікс обгортки обʼєктів schedule/hours у експорті)</li>
        </ul>
      `,
    },
    {
      icon: '📞',
      title: 'Контакти / передача проєкту',
      content: `
        <ul>
          <li>📧 <a href="mailto:servitant@gmail.com">servitant@gmail.com</a> · <a href="mailto:tantsiura.s@pg.com">tantsiura.s@pg.com</a></li>
          <li>🔧 <a href="https://github.com/servitantgit/Graffik" target="_blank">GitHub repo</a></li>
          <li>🚀 <a href="https://servitantgit.github.io/Graffik/" target="_blank">Live app</a></li>
          <li>📚 <code>PROJECT_DOCS.md</code>, <code>CHANGELOG.md</code></li>
        </ul>
        <p><b>Передача адмінки:</b> Collaborator на GitHub + email у <code>ADMIN_EMAILS</code> + цей FAQ.</p>
      `,
    },
  ];

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
      📚 Інструкція для адміністратора. Клікни секцію, щоб розгорнути.
    </p>
    <div style="display:flex; flex-direction:column; gap:6px;">
      ${sectionsHtml}
    </div>
    <p style="text-align:center; margin-top:16px; padding-top:12px; border-top:1px solid var(--border-cell); font-size:11px; color:var(--text-muted);">
      Лише для admin. Оновлення разом із кодом додатка.
    </p>
  `;

  showModal({
    title: '👑 Admin FAQ',
    body: body,
    buttons: [{ text: 'Зрозуміло', class: 'primary' }],
  });
}

/* === HANDLER: Admin FAQ button in top-bar === */
bindClick('adminFaqBtn', () => {
  renderAdminFaq();
});
