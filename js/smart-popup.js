/* ================================================================
   GRAFIK GILLETTE - SMART-POPUP.JS
   Timeline widget renderer for relief handoff visualization
   Matches mockup U4: D → 15 R → [OT] → A
   Part of v3.9.0+ refactor
   ================================================================ */

/**
 * Shift emoji icons mapping
 */
const TL_SHIFT_ICONS = {
  R: '🌅',
  P: '🌤',
  N: '🌙',
  W: '💤',
  U: '🏖️',
};

/**
 * Short "when" label for timeline node (wcz. / dziś / jutro)
 */
function tlFormatWhen(year, month, day, currentYear, currentMonth, currentDay) {
  if (year === currentYear && month === currentMonth) {
    if (day === currentDay) {
      return typeof t === 'function' ? t('tlToday') : 'dziś';
    }
    if (day === currentDay - 1) {
      return typeof t === 'function' ? t('tlYesterday') : 'wcz.';
    }
    if (day === currentDay + 1) {
      return typeof t === 'function' ? t('tlTomorrow') : 'jutro';
    }
  }
  // Cross-month / far day: short numeric
  return day + '.' + month;
}

/**
 * Render a single timeline node
 * @param {Object} config
 * @returns {string} HTML
 */
function tlRenderNode(config) {
  const {
    type = 'shift', // 'shift' | 'ot' | 'empty' | 'self'
    brig = null,
    shift = null, // 'R' | 'P' | 'N'
    label = '',
    value = null, // OT hours
    otPercent = null, // 50 | 100 | 200
    isSelf = false,
  } = config;

  const classes = ['tl-node'];
  let content = '';

  if (type === 'empty') {
    classes.push('tl-empty');
    content = `<div class="tl-brig">—</div>`;
    if (label) content += `<div class="tl-label">${label}</div>`;
  } else if (type === 'ot') {
    if (otPercent === 50) classes.push('tl-ot-50');
    else if (otPercent === 100) classes.push('tl-ot-100');
    else classes.push('tl-ot');
    content = `<div class="tl-value">${value}h</div>`;
    if (otPercent != null) content += `<div class="tl-label">+${otPercent}%</div>`;
  } else if (type === 'self' || isSelf) {
    // Self = current day: day number as main, shift icon + shift code as label
    if (shift) classes.push('tl-shift-' + shift);
    classes.push('tl-self');
    content = `<div class="tl-brig">${brig != null ? brig : '—'}</div>`;
    if (shift && TL_SHIFT_ICONS[shift]) {
      content += `<div class="tl-icon">${TL_SHIFT_ICONS[shift]}</div>`;
    }
    if (label) content += `<div class="tl-label">${label}</div>`;
  } else {
    // Prev / next brigade node
    if (shift) classes.push('tl-shift-' + shift);
    content = `<div class="tl-brig">${brig || '—'}</div>`;
    if (shift && TL_SHIFT_ICONS[shift]) {
      content += `<div class="tl-icon">${TL_SHIFT_ICONS[shift]}</div>`;
    }
    if (label) content += `<div class="tl-label">${label}</div>`;
  }

  return `<div class="${classes.join(' ')}">${content}</div>`;
}

/**
 * Flow arrow between nodes
 */
function tlRenderArrow() {
  return `<div class="tl-arrow">→</div>`;
}

/**
 * Main renderer: Timeline Widget matching mockup U4
 * Flow: [prevBrig] → [dayNumber + shift] → [OT?] → [nextBrig]
 *
 * @param {Object} info - from getRelief()
 * @param {number} currentYear
 * @param {number} currentMonth
 * @param {number} currentDay
 * @param {string} currentShift - 'R' | 'P' | 'N'
 * @param {string} currentBrigade - 'A' | 'B' | 'C' | 'D' (unused for self display; kept for API)
 * @param {Object|null} otData - { hours: number, percent: 50|100|200 } or null
 * @returns {string} HTML
 */
function renderReliefTimeline(
  info,
  currentYear,
  currentMonth,
  currentDay,
  currentShift,
  currentBrigade,
  otData
) {
  const parts = [];

  // === PREV NODE (brigade that handed over) ===
  if (info && info.prevBrig) {
    parts.push(
      tlRenderNode({
        type: 'shift',
        brig: info.prevBrig,
        shift: info.prevType,
        label: tlFormatWhen(
          info.prevYear,
          info.prevMonth,
          info.prevDay,
          currentYear,
          currentMonth,
          currentDay
        ),
      })
    );
  } else {
    parts.push(
      tlRenderNode({
        type: 'empty',
        label: '—',
      })
    );
  }

  parts.push(tlRenderArrow());

  // === SELF NODE (day being viewed) — day number + shift type ===
  parts.push(
    tlRenderNode({
      type: 'self',
      brig: String(currentDay),
      shift: currentShift,
      label: currentShift || '',
      isSelf: true,
    })
  );

  // === OT NODE (optional, between self and next) ===
  if (otData && otData.hours > 0) {
    parts.push(tlRenderArrow());
    parts.push(
      tlRenderNode({
        type: 'ot',
        value: otData.hours,
        otPercent: otData.percent || 200,
      })
    );
  }

  parts.push(tlRenderArrow());

  // === NEXT NODE (brigade that takes over) ===
  if (info && info.nextBrig) {
    parts.push(
      tlRenderNode({
        type: 'shift',
        brig: info.nextBrig,
        shift: info.nextType,
        label: tlFormatWhen(
          info.nextYear,
          info.nextMonth,
          info.nextDay,
          currentYear,
          currentMonth,
          currentDay
        ),
      })
    );
  } else {
    parts.push(
      tlRenderNode({
        type: 'empty',
        label: '—',
      })
    );
  }

  return `<div class="timeline-widget">${parts.join('')}</div>`;
}

// Export to global scope (no ES modules in this project)
window.renderReliefTimeline = renderReliefTimeline;
window.tlFormatWhen = tlFormatWhen;
window.tlRenderNode = tlRenderNode;
