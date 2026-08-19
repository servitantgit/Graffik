/* ================================================================
   GRAFIK GILLETTE - SMART-POPUP.JS
   Timeline widget renderer for relief handoff visualization
   Matches mockup U4: D → [OT before] → 15 R → [OT after] → A
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
    shift = null,
    label = '',
    value = null,
    otPercent = null,
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
    if (shift) classes.push('tl-shift-' + shift);
    classes.push('tl-self');
    content = `<div class="tl-brig">${brig != null ? brig : '—'}</div>`;
    if (shift && TL_SHIFT_ICONS[shift]) {
      content += `<div class="tl-icon">${TL_SHIFT_ICONS[shift]}</div>`;
    }
    if (label) content += `<div class="tl-label">${label}</div>`;
  } else {
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
 * Flow: [prevBrig] → [OT przed?] → [dayNumber + shift] → [OT po?] → [nextBrig]
 *
 * @param {Object} info - from getRelief()
 * @param {number} currentYear
 * @param {number} currentMonth
 * @param {number} currentDay
 * @param {string} currentShift - 'R' | 'P' | 'N'
 * @param {string} currentBrigade - kept for API compatibility
 * @param {Object|null} otData - either:
 *   legacy: { hours, percent }  → placed AFTER self
 *   preferred: { before: {hours,percent}|null, after: {hours,percent}|null }
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
  // Normalize OT payload
  let otBefore = null;
  let otAfter = null;
  if (otData) {
    if (otData.before || otData.after) {
      otBefore = otData.before || null;
      otAfter = otData.after || null;
    } else if (otData.hours > 0) {
      // Legacy single blob → after (old behaviour)
      otAfter = { hours: otData.hours, percent: otData.percent || 200 };
    }
  }

  const parts = [];

  // === PREV NODE ===
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

  // === OT BEFORE SHIFT (przed) — visually before the day node ===
  if (otBefore && otBefore.hours > 0) {
    parts.push(tlRenderArrow());
    parts.push(
      tlRenderNode({
        type: 'ot',
        value: otBefore.hours,
        otPercent: otBefore.percent || 200,
      })
    );
  }

  parts.push(tlRenderArrow());

  // === SELF NODE (day being viewed) ===
  parts.push(
    tlRenderNode({
      type: 'self',
      brig: String(currentDay),
      shift: currentShift,
      label: currentShift || '',
      isSelf: true,
    })
  );

  // === OT AFTER SHIFT (po) — visually after the day node ===
  if (otAfter && otAfter.hours > 0) {
    parts.push(tlRenderArrow());
    parts.push(
      tlRenderNode({
        type: 'ot',
        value: otAfter.hours,
        otPercent: otAfter.percent || 200,
      })
    );
  }

  parts.push(tlRenderArrow());

  // === NEXT NODE ===
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
