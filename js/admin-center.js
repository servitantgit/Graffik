/* ================================================================
   GRAFIK GILLETTE — Module 10: ADMIN CENTER
   Factory schedule editing, export, guide and danger zone
   ================================================================ */

/* === FACTORY PAINTING MODE STATE === */

let factoryPaintMode = null; // null when not active, 'R', 'P', 'N', or 'W' when active
let factoryPaintYear = null;
let factoryPaintMonth = null;
let factoryPaintActive = false;

/* === FACTORY PAINTING MODE CONTROLS === */

/**
 * Activates factory painting mode for a specific year
 * @param {number} year - The year to edit
 */
function activateFactoryPaintMode(year) {
  if (!window.requireAdmin()) {
    showToast('error', t('adminRequired') || 'Admin access required');
    return;
  }
  
  factoryPaintYear = year;
  factoryPaintMonth = new Date().getMonth() + 1; // Start with current month
  factoryPaintMode = null;
  factoryPaintActive = true;
  
  // Show factory editor bar
  const factoryEditorBar = document.getElementById('factoryEditorBar');
  if (factoryEditorBar) {
    factoryEditorBar.style.display = 'flex';
    updateFactoryEditorContext();
    activateFactoryPaintTool('R'); // Default to R shift
  }
  
  // Refresh views to show factory painting mode
  if (typeof refreshViews === 'function') {
    refreshViews();
  }
  
  showToast('info', t('factoryEditorActive') || 'Factory editor active - use R/P/N/W keys to paint');
}

/**
 * Deactivates factory painting mode
 */
function deactivateFactoryPaintMode() {
  factoryPaintActive = false;
  factoryPaintMode = null;
  factoryPaintYear = null;
  factoryPaintMonth = null;
  
  // Hide factory editor bar
  const factoryEditorBar = document.getElementById('factoryEditorBar');
  if (factoryEditorBar) {
    factoryEditorBar.style.display = 'none';
  }
  
  // Refresh views to exit factory painting mode
  if (typeof refreshViews === 'function') {
    refreshViews();
  }
  
  showToast('info', t('factoryEditorExit') || 'Factory editor exited');
}

/**
 * Updates the context display in the factory editor bar
 */
function updateFactoryEditorContext() {
  const contextEl = document.getElementById('factoryEditorContext');
  if (!contextEl) return;
  
  if (!factoryPaintActive || !factoryPaintYear) {
    contextEl.innerHTML = '';
    return;
  }
  
  const monthName = t('monthNames')[factoryPaintMonth - 1] || '';
  const shiftLabel = factoryPaintMode ? 
    t(`label${factoryPaintMode}`) || factoryPaintMode : 
    t('factoryEditorSelectTool') || 'Select tool';
  
  contextEl.innerHTML = `
    <span>${t('factoryEditorYear') || 'Year'}: <strong>${factoryPaintYear}</strong></span>
    <span>${t('factoryEditorMonth') || 'Month'}: <strong>${monthName}</strong></span>
    <span>${t('factoryEditorShift') || 'Shift'}: <strong>${shiftLabel}</strong></span>
  `;
}

/**
 * Activates a specific factory paint tool (R/P/N/W)
 * @param {string} tool - The tool to activate ('R', 'P', 'N', or 'W')
 */
function activateFactoryPaintTool(tool) {
  if (!['R', 'P', 'N', 'W'].includes(tool)) return;
  
  factoryPaintMode = tool;
  
  // Update UI
  document.querySelectorAll('.factory-tool-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.factoryShift === tool);
  });
  
  updateFactoryEditorContext();
}

/**
 * Handles day click in factory painting mode
 * @param {number} year - The year
 * @param {number} month - The month (1-12)
 * @param {number} day - The day of month
 * @param {string} shift - The brigade/shift ('A', 'B', 'C', 'D')
 */
function handleFactoryPaintDayClick(year, month, day, shift) {
  if (!factoryPaintActive || year !== factoryPaintYear || month !== factoryPaintMonth) {
    return;
  }
  
  // Map W (free) to '' for storage, otherwise use the shift letter
  const val = factoryPaintMode === 'W' ? '' : factoryPaintMode;
  
  // Apply the change to factory drafts
  window.setFactoryDraftShift(year, month, day, shift, val);
  
  // Show feedback
  showToast('success', t('factoryEditorLocalDraftToast') || 'Draft saved locally');
  
  // Update the display
  if (typeof refreshViews === 'function') {
    refreshViews();
  }
  
  // Auto-save is handled by setFactoryDraftShift
}

/* === FACTORY SCHEDULE APIS === */

/**
 * Gets factory schedule data for a year (merged with custom schedule for admin view)
 * @param {number} year - The year to get
 * @returns {Object} - Schedule data for the year
 */
function getFactoryScheduleForYear(year) {
  if (!window.requireAdmin()) return null;
  
  // Get merged schedule (factory + custom) - same as what actions.js uses for export
  const factory = window.factorySchedule && window.factorySchedule[year] || {};
  const custom = window.customSchedule && window.customSchedule[year] || {};
  
  // For admin view, we want to show factory schedule as base, with custom overlay
  // But in factory painting mode, we work directly with factoryDrafts
  return { factory, custom };
}

/**
 * Gets factory draft data for a year
 * @param {number} year - The year to get
 * @returns {Object} - Factory draft data for the year
 */
function getFactoryDraftForYear(year) {
  if (!window.requireAdmin()) return null;
  
  // Ensure the year exists in factoryDrafts
  window.ensureFactoryDraftYear(year);
  return window.factoryDrafts[year] || null;
}

/* === EXPORT FUNCTIONS (moved from actions.js) === */

/**
 * Merges factorySchedule + customSchedule for a given year.
 * @param {number} year
 * @returns {object} - { 1: { A: [...], B, C, D }, 2: {...}, ... 12: {...} }
 */
function mergeFactoryWithCustom(year) {
  const merged = {};
  const factory = window.factorySchedule && window.factorySchedule[year] || {};
  const custom = window.customSchedule && window.customSchedule[year] || {};
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
  if (!window.requireAdmin()) {
    showToast('error', t('adminRequired') || 'Admin access required');
    return;
  }
  
  // Get list of available years (from factorySchedule and customSchedule combined)
  const factoryYears = window.factorySchedule && Object.keys(window.factorySchedule || {}).map(Number) || [];
  const customYears = window.customSchedule && Object.keys(window.customSchedule || {}).map(Number) || [];
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
    console.error('[admin-center.js] Export data.js error:', err);
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

/* === GUIDE SECTION CONTENT === */

/**
 * Renders the guide section content
 * @returns {string} - HTML content for the guide tab
 */
function renderGuideContent() {
  return `
    <div style="line-height:1.6;">
      <h3>${t('adminGuide') || 'Guide'}</h3>
      <p>${t('adminGuideIntro') || 'This guide explains how to use the Admin Center to manage factory schedules.'}</p>
      
      <h4>${t('factoryEditorTitle') || 'Factory Schedule Editor'}</h4>
      <p>${t('adminGuideFactoryEditor') || 'Use the factory editor to create and modify factory schedules that apply to all users.'}</p>
      
      <div style="background:var(--bg-info); padding:12px; border-radius:8px; margin:12px 0;">
        <p><strong>${t('factoryEditorWorkflow') || 'Typical workflow:'}</strong></p>
        <ol>
          <li>${t('adminGuideStep1') || 'Activate factory painting mode for a year from the factory editor tab'}</li>
          <li>${t('adminGuideStep2') || 'Use R/P/N/W keys or toolbar buttons to paint shifts'}</li>
          <li>${t('adminGuideStep3') || 'Changes are saved locally as drafts'}</li>
          <li>${t('adminGuideStep4') || 'Export the year when ready to publish'}</li>
          <li>${t('adminGuideStep5') || 'Deploy the exported .js file to make it live for all users'}</li>
        </ol>
      </div>
      
      <h4>${t('keyboardShortcuts') || 'Keyboard Shortcuts'}</h4>
      <table style="width:100%; border-collapse:collapse; margin:12px 0;">
        <tr><td style="padding:8px; font-weight:bold;">R</td><td style="padding:8px;">${t('labelR') || 'Day shift'}</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">P</td><td style="padding:8px;">${t('labelP') || 'Evening shift'}</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">N</td><td style="padding:8px;">${t('labelN') || 'Night shift'}</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">W</td><td style="padding:8px;">${t('labelW') || 'Day off'}</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">← / →</td><td style="padding:8px;">${t('adminGuideNavigateMonth') || 'Navigate months'}</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">E / Esc</td><td style="padding:8px;">${t('adminGuideExitEditor') || 'Exit editor'}</td></tr>
      </table>
      
      <h4>${t('adminExportTitle') || 'Export'}</h4>
      <p>${t('adminGuideExport') || 'Export factory schedules to create deployable .js files for all users.'}</p>
      
      <h4>${t('adminDangerZone') || 'Danger zone'}</h4>
      <p>${t('adminGuideDangerZone') || 'Use with caution - these actions cannot be easily undone.'}</p>
    </div>
  `;
}

/* === DANGER ZONE SECTION CONTENT === */

/**
 * Renders the danger zone section content
 * @returns {string} - HTML content for the danger zone tab
 */
function renderDangerZoneContent() {
  return `
    <div style="line-height:1.6;">
      <h3>${t('adminDangerZone') || 'Danger zone'}</h3>
      <p>${t('adminDangerZoneWarning') || 'These actions affect all users and cannot be easily undone.'}</p>
      
      <div style="background:var(--bg-warning); color:var(--text-warning); padding:12px; border-radius:8px; margin:12px 0; border-left:4px solid var(--text-warning);">
        <h4>${t('adminDangerZoneTitle') || '⚠️ Danger zone'}</h4>
        <p>${t('adminDangerZoneDesc') || 'Actions in this section can permanently affect data for all users.'}</p>
      </div>
      
      <h4>${t('factoryDraftResetAll') || 'Reset all drafts'}</h4>
      <p>${t('adminDangerZoneResetAllDesc') || 'Delete all factory schedule drafts for all years.'}</p>
      <button class="admin-danger-btn" onclick="handleResetAllDrafts()">
        ${t('factoryDraftResetAll') || 'Reset all drafts'}
      </button>
      
      <div style="margin-top:12px;">
        <h4>${t('factoryDraftClearYear') || 'Clear year draft'}</h4>
        <p>${t('adminDangerZoneClearYearDesc') || 'Delete factory schedule draft for a specific year.'}</p>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <input type="number" id="clearYearInput" min="2020" max="2030" value="${new Date().getFullYear()}" style="padding:8px; border:1px solid var(--border-cell); border-radius:4px; width:100px;">
          <button class="admin-danger-btn" onclick="handleClearYearDraft()">
            ${t('factoryDraftClearYear') || 'Clear year'}
          </button>
        </div>
      </div>
      
      <div style="margin-top:12px;">
        <h4>${t('adminResetAllData') || 'Reset all personal data'}</h4>
        <p>${t('adminDangerZoneResetPersonalDesc') || 'Clear all personal data (schedule, notes, urlops, etc.) for the current user.'}</p>
        <button class="admin-danger-btn" onclick="handleResetPersonalData()">
          ${t('adminResetAllData') || 'Reset all personal data'}
        </button>
      </div>
    </div>
  `;
}

/**
 * Handles resetting all factory drafts
 */
function handleResetAllDrafts() {
  if (!window.requireAdmin()) {
    showToast('error', t('adminRequired') || 'Admin access required');
    return;
  }
  
  showConfirm(
    t('factoryDraftResetAllTitle') || 'Reset all drafts?',
    t('factoryDraftResetAllBody') || 'This will delete ALL factory schedule drafts for ALL years. This action cannot be undone.',
    () => {
      window.resetFactoryDrafts();
      showToast('success', t('factoryDraftsReset') || 'All drafts reset');
      // Close any open factory editor
      if (factoryPaintActive) {
        deactivateFactoryPaintMode();
      }
      // Refresh views if needed
      if (typeof refreshViews === 'function') {
        refreshViews();
      }
    },
    { primaryText: t('factoryDraftResetAll') || 'Reset all', primaryClass: 'danger' }
  );
}

/**
 * Handles clearing a specific year's factory draft
 */
function handleClearYearDraft() {
  if (!window.requireAdmin()) {
    showToast('error', t('adminRequired') || 'Admin access required');
    return;
  }
  
  const yearInput = document.getElementById('clearYearInput');
  const year = parseInt(yearInput.value, 10);
  
  if (isNaN(year) || year < 2020 || year > 2030) {
    showToast('error', t('adminInvalidYear') || 'Please enter a valid year');
    return;
  }
  
  showConfirm(
    t('factoryDraftClearYearTitle', { year: year }) || `Clear the draft for ${year}?`,
    t('factoryDraftClearYearBody', { year: year }) || `This will delete the factory schedule draft for ${year}. This action cannot be undone.`,
    () => {
      window.clearFactoryDraftYear(year);
      showToast('success', t('factoryDraftClearYearSuccess', { year: year }) || `Draft for ${year} cleared`);
      // Close factory editor if it's for this year
      if (factoryPaintActive && factoryPaintYear === year) {
        deactivateFactoryPaintMode();
      }
      // Refresh views if needed
      if (typeof refreshViews === 'function') {
        refreshViews();
      }
    },
    { primaryText: t('factoryDraftClearYear') || 'Clear', primaryClass: 'danger' }
  );
}

/**
 * Handles resetting all personal data (calls clearLocalPersonalData)
 */
function handleResetPersonalData() {
  if (!window.requireAdmin()) {
    showToast('error', t('adminRequired') || 'Admin access required');
    return;
  }
  
  showConfirm(
    t('adminResetAllDataTitle') || 'Reset all personal data?',
    t('adminResetAllDataBody') || 'This will clear ALL your personal data (schedule, notes, urlops, overtimes, etc.). This action cannot be undone.',
    () => {
      // Call the clearLocalPersonalData function from core.js
      if (typeof window.clearLocalPersonalData === 'function') {
        window.clearLocalPersonalData();
        showToast('success', t('adminResetPersonalDataSuccess') || 'Personal data reset');
      } else {
        showToast('error', t('adminResetPersonalDataError') || 'Unable to reset personal data');
      }
      // Refresh views
      if (typeof refreshViews === 'function') {
        refreshViews();
      }
    },
    { primaryText: t('adminResetAllData') || 'Reset all', primaryClass: 'danger' }
  );
}

/* === EXPOSE TO GLOBAL SCOPE === */

/**
 * Open the admin center panel
 * @returns {Object|null} - The panel screen object or null if failed
 */
function openAdminCenter() {
  if (!window.requireAdmin()) {
    showToast('error', t('adminRequired') || 'Admin access required');
    return null;
  }
  
  // Close factory editor if open when opening admin center
  if (factoryPaintActive) {
    deactivateFactoryPaintMode();
  }
  
  const panelHTML = `
    <div style="display:flex; flex-direction:column; height:100%;">
      <!-- Tabs -->
      <div style="display:flex; border-bottom:1px solid var(--border-cell);">
        <button class="admin-tab-btn${window.adminCenterActiveTab === 'factory' ? ' active' : ''}" 
                data-tab="factory" 
                style="flex:1; padding:12px; border:none; background:var(--bg-controls); color:var(--text-main); cursor:pointer;">
          ${t('factoryEditorTitle') || 'Factory editor'}
        </button>
        <button class="admin-tab-btn${window.adminCenterActiveTab === 'export' ? ' active' : ''}" 
                data-tab="export" 
                style="flex:1; padding:12px; border:none; background:var(--bg-controls); color:var(--text-main); cursor:pointer;">
          ${t('adminExportTitle') || 'Export'}
        </button>
        <button class="admin-tab-btn${window.adminCenterActiveTab === 'guide' ? ' active' : ''}" 
                data-tab="guide" 
                style="flex:1; padding:12px; border:none; background:var(--bg-controls); color:var(--text-main); cursor:pointer;">
          ${t('adminGuide') || 'Guide'}
        </button>
        <button class="admin-tab-btn${window.adminCenterActiveTab === 'danger' ? ' active' : ''}" 
                data-tab="danger" 
                style="flex:1; padding:12px; border:none; background:var(--bg-controls); color:var(--text-main); cursor:pointer;">
          ${t('adminDangerZone') || 'Danger zone'}
        </button>
      </div>
      
      <!-- Tab Content -->
      <div style="flex:1; overflow-y:auto; padding:16px;">
        <div id="adminCenterContent"></div>
      </div>
    </div>
  `;
  
  return window.openAppPanel({
    id: 'admin-center',
    title: t('adminCenterTitle') || 'Admin center',
    html: panelHTML,
    onMount: (bodyElement) => {
      // Initialize tab state
      window.adminCenterActiveTab = window.adminCenterActiveTab || 'factory';
      
      // Render initial content
      renderAdminCenterTab(window.adminCenterActiveTab, bodyElement);
      
      // Attach tab handlers
      const tabButtons = bodyElement.querySelectorAll('.admin-tab-btn');
      tabButtons.forEach(btn => {
        btn.onclick = (e) => {
          // Update active tab
          tabButtons.forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          window.adminCenterActiveTab = e.target.dataset.tab;
          
          // Render tab content
          renderAdminCenterTab(window.adminCenterActiveTab, bodyElement);
        };
      });
    }
  });
}

/**
 * Renders the content for a specific admin center tab
 * @param {string} tabId - The tab ID to render ('factory', 'export', 'guide', 'danger')
 * @param {Object} bodyElement - The panel body element
 */
function renderAdminCenterTab(tabId, bodyElement) {
  const contentEl = bodyElement.querySelector('#adminCenterContent');
  if (!contentEl) return;
  
  switch (tabId) {
    case 'factory':
      contentEl.innerHTML = renderFactoryEditorTab();
      break;
    case 'export':
      contentEl.innerHTML = renderExportTab();
      break;
    case 'guide':
      contentEl.innerHTML = renderGuideContent();
      break;
    case 'danger':
      contentEl.innerHTML = renderDangerZoneContent();
      break;
    default:
      contentEl.innerHTML = `<p>${t('adminCenterTabNotFound') || 'Tab not found'}</p>`;
  }
}

/**
 * Renders the factory editor tab content
 * @returns {string} - HTML content for the factory editor tab
 */
function renderFactoryEditorTab() {
  return `
    <div style="line-height:1.6;">
      <h3>${t('factoryEditorTitle') || 'Factory schedule editor'}</h3>
      <p>${t('factoryEditorDraftHint') || 'Changes are saved as a draft — the public factory schedule stays unchanged until you publish.'}</p>
      
      <div style="background:var(--bg-info); padding:12px; border-radius:8px; margin:12px 0;">
        <p><strong>${t('factoryEditorHowToUse') || 'How to use:'}</strong></p>
        <ol>
          <li>${t('factoryEditorStep1') || 'Select a year using the year picker below'}</li>
          <li>${t('factoryEditorStep2') || 'Click \\"Start editing\\" to activate factory painting mode'}</li>
          <li>${t('factoryEditorStep3') || 'Use R/P/N/W keys or toolbar buttons to paint shifts'}</li>
          <li>${t('factoryEditorStep4') || 'Changes are saved automatically as drafts'}</li>
          <li>${t('factoryEditorStep5') || 'When ready, click \\"Export\\" to publish for all users'}</li>
        </ol>
      </div>
      
      <div style="margin:16px 0;">
        <label for="factoryYearPicker" style="display:block; margin-bottom:8px; font-weight:600;">
          ${t('factoryEditorSelectYear') || 'Select year to edit:'}
        </label>
        <select id="factoryYearPicker" style="width:100%; padding:10px; border:1px solid var(--border-cell); border-radius:6px; font-size:16px;">
          <!-- Years will be populated by onMount -->
        </select>
      </div>
      
      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <button id="factoryStartEditBtn" class="modal-btn primary" style="padding:12px 24px;">
          ${t('factoryEditorStart') || 'Start editing'}
        </button>
        <button id="factoryExportBtn" class="modal-btn primary" style="padding:12px 24px;">
          ${t('menuAdminExport') || 'Export'}
        </button>
      </div>
      
      <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border-cell); font-size:14px; color:var(--text-muted);">
        ${t('factoryEditorStatus') || 'Status: '}<span id="factoryEditorStatusText">-${t('factoryEditorInactive') || 'Inactive'}</span>
      </div>
    </div>
  `;
}

/**
 * Renders the export tab content
 * @returns {string} - HTML content for the export tab
 */
function renderExportTab() {
  return `
    <div style="line-height:1.6;">
      <h3>${t('adminExportTitle') || 'Export'}</h3>
      <p>${t('adminExportDescription') || 'Export factory schedules to create deployable .js files for all users.'}</p>
      
      <div style="background:var(--bg-info); padding:12px; border-radius:8px; margin:12px 0;">
        <p><strong>${t('adminExportHowItWorks') || 'How it works:'}</strong></p>
        <ol>
          <li>${t('adminExportStep1') || 'Select a year from the list below'}</li>
          <li>${t('adminExportStep2') || 'Click \\"Export\\" to generate the .js file'}</li>
          <li>${t('adminExportStep3') || 'Follow the deployment instructions in the popup'}</li>
        </ol>
      </div>
      
      <div style="margin:16px 0;">
        <label for="exportYearList" style="display:block; margin-bottom:8px; font-weight:600;">
          ${t('adminExportSelectYear') || 'Select year to export:'}
        </label>
        <div id="exportYearList" style="max-height:300px; overflow-y:auto; border:1px solid var(--border-cell); border-radius:6px; padding:12px;">
          <!-- Years will be populated by onMount -->
        </div>
      </div>
      
      <div style="margin-top:16px;">
        <button id="exportActionBtn" class="modal-btn primary" style="padding:12px 24px;">
          ${t('menuAdminExport') || 'Export'}
        </button>
      </div>
    </div>
  `;
}

/* === INITIALIZATION AND EVENT LISTENERS === */

// Initialize admin center state
window.adminCenterActiveTab = 'factory';

// Keyboard handling for factory painting mode
document.addEventListener('keydown', (e) => {
  // Skip if typing in input/textarea/select
  if (e.target.tagName === 'INPUT' || 
      e.target.tagName === 'TEXTAREA' || 
      e.target.tagName === 'SELECT') {
    return;
  }
  
  // Handle factory painting mode keys
  if (factoryPaintActive) {
    switch (e.key.toUpperCase()) {
      case 'R':
      case 'P':
      case 'N':
      case 'W':
        e.preventDefault();
        activateFactoryPaintTool(e.key.toUpperCase());
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (factoryPaintActive) {
          factoryPaintMonth = factoryPaintMonth === 1 ? 12 : factoryPaintMonth - 1;
          updateFactoryEditorContext();
          if (typeof refreshViews === 'function') {
            refreshViews();
          }
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (factoryPaintActive) {
          factoryPaintMonth = factoryPaintMonth === 12 ? 1 : factoryPaintMonth + 1;
          updateFactoryEditorContext();
          if (typeof refreshViews === 'function') {
            refreshViews();
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        if (factoryPaintActive) {
          deactivateFactoryPaintMode();
        }
        break;
    }
  }
});

// Expose functions to global scope
window.activateFactoryPaintMode = activateFactoryPaintMode;
window.deactivateFactoryPaintMode = deactivateFactoryPaintMode;
window.handleFactoryPaintDayClick = handleFactoryPaintDayClick;
window.getFactoryScheduleForYear = getFactoryScheduleForYear;
window.getFactoryDraftForYear = getFactoryDraftForYear;
window.exportFactorySchedule = exportFactorySchedule;
window.openAdminCenter = openAdminCenter;

// Initialize factory paint mode state on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Populate year pickers when DOM is ready
    setTimeout(() => {
      populateFactoryYearPicker();
      populateExportYearList();
    }, 100);
  });
} else {
  // DOM already ready
  setTimeout(() => {
    populateFactoryYearPicker();
    populateExportYearList();
  }, 100);
}

/**
 * Populates the factory year picker dropdown
 */
function populateFactoryYearPicker() {
  const picker = document.getElementById('factoryYearPicker');
  if (!picker) return;
  
  // Get available years from factory schedule and custom schedule
  const factoryYears = window.factorySchedule && Object.keys(window.factorySchedule || {}).map(Number) || [];
  const customYears = window.customSchedule && Object.keys(window.customSchedule || {}).map(Number) || [];
  const allYears = [...new Set([...factoryYears, ...customYears])].sort();
  
  // Add some future years for planning
  const currentYear = new Date().getFullYear();
  const futureYears = [];
  for (let y = currentYear + 1; y <= currentYear + 5; y++) {
    futureYears.push(y);
  }
  
  const yearsToShow = [...new Set([...allYears, ...futureYears])].sort((a, b) => a - b);
  
  picker.innerHTML = '';
  yearsToShow.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    picker.appendChild(option);
  });
  
  // Set to current year by default
  picker.value = currentYear;
}

/**
 * Populates the export year list
 */
function populateExportYearList() {
  const listEl = document.getElementById('exportYearList');
  if (!listEl) return;
  
  // Get available years from factory schedule and custom schedule
  const factoryYears = window.factorySchedule && Object.keys(window.factorySchedule || {}).map(Number) || [];
  const customYears = window.customSchedule && Object.keys(window.customSchedule || {}).map(Number) || [];
  const allYears = [...new Set([...factoryYears, ...customYears])].sort();
  
  if (allYears.length === 0) {
    listEl.innerHTML = `<p style="color:var(--text-muted);">${t('adminExportNoData') || 'No data to export'}</p>`;
    return;
  }
  
  listEl.innerHTML = '';
  allYears.forEach(year => {
    const hasCustom = customYears.includes(year);
    const hasFactory = factoryYears.includes(year);
    const label = hasCustom && hasFactory ? `${year} ✏️` : hasCustom ? `${year} 🆕` : `${year}`;
    const title = hasCustom
      ? t('adminExportYearWithEdits') || 'Contains your edits'
      : t('adminExportYearFactory') || 'Factory data only';
    
    const yearEl = document.createElement('div');
    yearEl.className = 'export-year-item';
    yearEl.innerHTML = `
      <button class="export-year-btn" data-year="${year}" title="${title}" style="width:100%; text-align:left; padding:10px; margin:4px 0; border:1px solid var(--border-cell); background:var(--bg-cell); color:var(--text-main); border-radius:4px; cursor:pointer;">
        <span>${label}</span>
      </button>
    `;
    
    yearEl.querySelector('.export-year-btn').onclick = () => {
      // Select this year
      document.querySelectorAll('.export-year-btn').forEach(btn => {
        btn.classList.toggle('active', btn === yearEl.querySelector('.export-year-btn'));
      });
      
      // Store selected year for export
      window.selectedExportYear = year;
    };
    
    listEl.appendChild(yearEl);
  });
  
  // Select first year by default
  if (allYears.length > 0) {
    const firstBtn = listEl.querySelector('.export-year-btn');
    if (firstBtn) {
      firstBtn.classList.add('active');
      window.selectedExportYear = allYears[0];
    }
  }
}

// Override the export action button click to use selected year
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'exportActionBtn' && window.selectedExportYear !== undefined) {
    hideModal(); // Close admin center if open
    exportFactorySchedule(); // This will show its own year selection modal
  }
});

// Export functions for admin center tab rendering
window.renderAdminCenterTab = renderAdminCenterTab;
window.openAdminCenter = openAdminCenter;