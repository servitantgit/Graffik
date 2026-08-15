/* Apply Privacy Mode gating to calendar.js, dashboard.js, views.js */
const fs = require('fs');

// =============================================
// calendar.js
// =============================================
let cal = fs.readFileSync('c:/Users/user/Documents/Git/Graffik/js/calendar.js', 'utf-8');
let calLines = cal.split('\n');

const calChanges = { count: 0 };

function calReplace(find, repl, desc) {
  if (cal.indexOf(find) !== -1) {
    cal = cal.replace(find, repl);
    calChanges.count++;
    console.log('calendar.js: ' + desc);
  } else {
    console.error('calendar.js: ' + desc + ' - NOT FOUND');
    process.exit(1);
  }
}

// 1. addReliefPopups: gate the entire popup rendering when privacy mode is on
// The relief popups show which brigade handed over / will take over the shift.
// These reveal shift transition patterns which are schedule info (non-private).
// But the popup itself reveals schedule info, so we keep it visible.
// Actually, we DON'T need to change addReliefPopups - it's called from renderCalendar
// with a condition already: if (!editMode && !isWolne(shiftCode))

// 2. renderCalendar: add hidePrivate variable and gate private sections

// Add hidePrivate after onUrlop line in renderCalendar
calReplace(
  "    const onUrlop = isUrlop(currentYear, currentMonth, d, selectedShift);\n    const dirtyCell = isDirty(currentYear, currentMonth, d, selectedShift);",
  "    const onUrlop = isUrlop(currentYear, currentMonth, d, selectedShift);\n    const hidePrivate = isPrivacyModeEnabled();",
  "Added hidePrivate in renderCalendar"
);

// Gate urlop CSS class
calReplace(
  "    if (onUrlop) cell.classList.add('urlop');",
  "    if (onUrlop && !hidePrivate) cell.classList.add('urlop');",
  "Gated urlop CSS class"
);

// Gate vacation icon
calReplace(
  "    if (onUrlop) {\n      const icon = document.createElement('div');\n      icon.className = 'urlop-icon';\n      icon.textContent = '🌴';\n      cell.appendChild(icon);\n    }",
  "    if (onUrlop && !hidePrivate) {\n      const icon = document.createElement('div');\n      icon.className = 'urlop-icon';\n      icon.textContent = '🌴';\n      cell.appendChild(icon);\n    }",
  "Gated vacation icon"
);

// Gate vacation shift text clearing
calReplace(
  "    if (onUrlop) {\n      shiftEl.textContent = '';\n      shiftEl.title = t('vacation');\n    } else if (isWolne(shiftCode)) shiftEl.textContent = '—';",
  "    if (onUrlop && !hidePrivate) {\n      shiftEl.textContent = '';\n      shiftEl.title = t('vacation');\n    } else if (isWolne(shiftCode)) shiftEl.textContent = '—';",
  "Gated vacation shift text clearing"
);

// Gate rate badges - add !hidePrivate to the existing condition
calReplace(
  "    if (!isWolne(shiftCode) && !onUrlop) {\n      // Sprawdzamy: co było w fabrycznym grafiku dla tego dnia?",
  "    if (!hidePrivate && !isWolne(shiftCode) && !onUrlop) {\n      // Sprawdzamy: co było w fabrycznym grafiku dla tego dnia?",
  "Gated rate badges"
);

// Gate overtime strips - add !hidePrivate to the existing condition
calReplace(
  "    if (!isWolne(shiftCode) && !onUrlop) {\n      const ot = getOvertimes(",
  "    if (!hidePrivate && !isWolne(shiftCode) && !onUrlop) {\n      const ot = getOvertimes(",
  "Gated overtime strips"
);

// Gate note icon - add !hidePrivate
calReplace(
  "    if (notes[noteKey]) {",
  "    if (!hidePrivate && notes[noteKey]) {",
  "Gated note icon"
);

// 3. renderMonthOvertimeSummary: add early return
calReplace(
  "  const old = document.getElementById('otMonthSummary');\n  if (old) old.remove();\n\n  const sum = getMonthOvertimeSummary(",
  "  const old = document.getElementById('otMonthSummary');\n  if (old) old.remove();\n  if (isPrivacyModeEnabled()) return;\n\n  const sum = getMonthOvertimeSummary(",
  "Gated renderMonthOvertimeSummary"
);

// 4. renderInfo: add hidePrivate and gate private info
// Add hidePrivate after onUrlop
calReplace(
  "  const onUrlop = isUrlop(currentYear, currentMonth, selectedDay, selectedShift);\n\n  const totalUrlop =",
  "  const onUrlop = isUrlop(currentYear, currentMonth, selectedDay, selectedShift);\n  const hidePrivate = isPrivacyModeEnabled();\n\n  const totalUrlop =",
  "Added hidePrivate in renderInfo"
);

// Gate urlopStats
calReplace(
  "  const urlopStats = `<div class=\"urlop-stats\">",
  "  const urlopStats = hidePrivate ? '' : `<div class=\"urlop-stats\">",
  "Gated urlopStats"
);

// Need to close the ternary: find the closing of urlopStats template string
// The urlopStats template ends with:
//   </div>`;\n
// We need to add '' : `...` closing
// Actually, looking at the code, it's:
//   const urlopStats = `<div class="urlop-stats">
//     ...
//   </div>`;
// We need: const urlopStats = hidePrivate ? '' : `<div class="urlop-stats">...</div>`;

// Let me find the end of the urlopStats template string
const urlopEndPattern = /const urlopStats = hidePrivate \? '' : `<div class="urlop-stats">([\s\S]*?)<\/div>`;/;
// This is complex, let me use a simpler approach
// Replace the template end
calReplace(
  "    </div>\n  </div>`;\n\n  let liveInfo = '';",
  "    </div>\n  </div>`;\n  if (hidePrivate) urlopStats = '';\n\n  let liveInfo = '';",
  "Added urlopStats gate fallback"
);

// Wait, that won't work because urlopStats is declared with const.
// Let me handle this differently - revert and use let instead
cal = cal.replace("  const urlopStats = hidePrivate ? '' : `<div class=\"urlop-stats\">", "  let urlopStats = hidePrivate ? '' : `<div class=\"urlop-stats\">");

// Gate overtimeInfo in renderInfo
calReplace(
  "  let overtimeInfo = '';\n  if (!isWolne(shiftCode) && !onUrlop) {\n    const otData = getOvertimes(",
  "  let overtimeInfo = '';\n  if (!hidePrivate && !isWolne(shiftCode) && !onUrlop) {\n    const otData = getOvertimes(",
  "Gated overtimeInfo in renderInfo"
);

// Gate liveInfo in renderInfo
calReplace(
  "  let liveInfo = '';\n  const lv = getLiveShiftInfo();",
  "  let liveInfo = '';\n  if (!hidePrivate) {\n    const lv = getLiveShiftInfo();",
  "Gated liveInfo in renderInfo - part 1"
);

// Need to add closing brace for the if block
// After: if (lv) liveInfo = lv;
calReplace(
  "  if (lv) liveInfo = lv;\n  }",
  "  if (lv) liveInfo = lv;\n  }",
  "Gated liveInfo closing brace"
);

// Hmm, the second replacement for liveInfo might not work as expected. Let me handle this differently.
// Actually, let me revert and handle it more carefully.

fs.readFileSync('c:/Users/user/Documents/Git/Graffik/js/calendar.js', 'utf-8'); // revert
cal = calSaveOriginal;

console.log('calendar.js total changes: ' + calChanges.count);
fs.writeFileSync('c:/Users/user/Documents/Git/Graffik/js/calendar.js', cal, 'utf-8');
