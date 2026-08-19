/* ================================================================
   GRAFIK GILLETTE - SMART-POPUP.JS
   Timeline widget renderer for relief handoff visualization
   Part of v3.9.0 refactor
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
 * Format "when" label for timeline node
 * @param {number} year - target year
 * @param {number} month - target month
 * @param {number} day - target day
 * @param {number} currentYear - reference current year
 * @param {number} currentMonth - reference current month
 * @param {number} currentDay - reference current day
 * @returns {string} short label like "wcz.", "dziś", "jutro" or date
 */
function tlFormatWhen(year, month, day, currentYear, currentMonth, currentDay) {
  if (year === currentYear && month === currentMonth) {
    if (day === currentDay) return typeof t === 'function' ? t('todayLabel') : 'dziś';
    if (day === currentDay - 1) return 'wcz.';
    if (day === currentDay + 1) return 'jutro';
  }
  return day + '.' + month;
}
/**
 * Render timeline node (single brigade or OT)
 * @param {Object} config - node configuration
 * @returns {string} HTML string
 */
function tlRenderNode(config) {
  const {
    type = 'shift', // 'shift' | 'ot' | 'empty' | 'self'
    brig = null,
    shift = null, // 'R' | 'P' | 'N'
    label = '',
    value = null, // for OT: hours
    otPercent = null, // 50 | 100 | 200
    isSelf = false,
  } = config;
  let classes = ['tl-node'];
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
    if (label) content += `<div class="tl-label">+${otPercent}%</div>`;
  } else {
    // shift node (prev, next, or self)
    if (shift) classes.push('tl-shift-' + shift);
    if (isSelf) classes.push('tl-self');
    content = `<div class="tl-brig">${brig || '—'}</div>`;
    if (shift && TL_SHIFT_ICONS[shift]) {
      content += `<div class="tl-icon">${TL_SHIFT_ICONS[shift]}</div>`;
    }
    if (label) content += `<div class="tl-label">${label}</div>`;
  }
  return `<div class="${classes.join(' ')}">${content}</div>`;
}
/**
 * Render flow arrow between nodes
 * @returns {string} HTML string
 */
function tlRenderArrow() {
  return `<div class="tl-arrow">→</div>`;
}
/**
 * Main renderer: build complete Timeline Widget HTML
 * @param {Object} info - relief info object from getRelief()
 * { prevBrig, prevType, prevYear, prevMonth, prevDay,
 * nextBrig, nextType, nextYear, nextMonth, nextDay }
 * @param {number} currentYear
 * @param {number} currentMonth
 * @param {number} currentDay
 * @param {string} currentShift - 'R' | 'P' | 'N'
 * @param {string} currentBrigade - 'A' | 'B' | 'C' | 'D'
 * @param {Object|null} otData - optional { hours, percent } or null
 * @returns {string} complete HTML for timeline widget
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
  // === PREV NODE ===
  if (info.prevBrig) {
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
  // === SELF NODE (current day) ===
  parts.push(
    tlRenderNode({
      type: 'shift',
      brig: currentBrigade,
      shift: currentShift,
      label: currentDay + '.' + currentMonth,
      isSelf: true,
    })
  );
  // === OT NODE (if exists) ===
  if (otData && otData.hours && otData.percent) {
    parts.push(tlRenderArrow());
    parts.push(
      tlRenderNode({
        type: 'ot',
        value: otData.hours,
        otPercent: otData.percent,
      })
    );
  }
  parts.push(tlRenderArrow());
  // === NEXT NODE ===
  if (info.nextBrig) {
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
