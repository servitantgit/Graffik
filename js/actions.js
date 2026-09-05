/* ================================================================
   GRAFIK GILLETTE вЂ” Module 8: ACTIONS (ICS, JSON, SHARE, MENU)
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
    ics += `BEGIN:VEVENT\r\nUID:urlop-${k}-${selectedShift}@gillette\r\nDTSTART;VALUE=DATE:${fmtD(dt)}\r\nDTEND;VALUE=DATE:${fmtD(dtEnd)}\r\nSUMMARY:рџЊґ URLOP - Brygada ${selectedShift}\r\nEND:VEVENT\r\n`;
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
            <span style="font-size: 24px;">рџ“¤</span>
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
            <span style="font-size: 24px;">рџ–ЁпёЏ</span>
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

  let text = `рџ“… ${viewNames[currentView]}`;

  if (currentView === 'month' && selectedDay && !yearMode) {
    text = `рџ“… ${selectedDay} ${monthNamesGenitive[currentMonth - 1]} ${currentYear}`;
  }

  if (currentView !== 'table') {
    text += ` вЂў Brygada ${selectedShift}`;
  }

  return text;
}

function shareCurrent() {
  const url = buildShareUrl();
  const text = buildShareText();
  const isLocal = location.protocol === 'file:' || !location.origin || location.origin === 'null';

  // Local file: copy text without URL
  if (isLocal) {
    const content = `${text}\nрџЏ­ ${t('appName')}`;
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
              рџ“‹ ${t('shareCopyLink')}
            </button>
            <button id="shareCurrentNativeBtn" class="modal-btn primary" style="flex: 1; min-width: 140px;">
              рџ”— ${t('shareNativeShare')}
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
              рџ“‹ ${t('shareCopyLink')}
            </button>
            <button id="shareAppNativeBtn" class="modal-btn primary" style="flex: 1; min-width: 140px;">
              рџ”— ${t('shareNativeShare')}
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
              // User cancelled вЂ” don't show an error
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
              // User cancelled вЂ” don't show an error
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
