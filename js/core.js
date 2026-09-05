/* ================================================================
   GRAFIK GILLETTE — Module 2: UTILITY + HOLIDAYS + PERSISTENCE + SCHEDULE
   ================================================================ */

/* === PERSISTENCJA === */
function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || {};
  } catch (e) {
    return {};
  }
}
/**
 * Persist UI/prefs to localStorage.
 * @param {object} p - prefs object
 * @param {boolean} [markSync=false] - if true, mark data as unsynced (for personal fields like urlopLimits)
 */
function savePrefs(p, markSync) {
  localStorage.setItem(LS_KEY, JSON.stringify(p));
  if (markSync && typeof updateLastModified === 'function') updateLastModified();
}
function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveNotes(n) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(n));
  if (typeof updateLastModified === 'function') updateLastModified();
}
function loadUrlops() {
  try {
    return JSON.parse(localStorage.getItem(URLOPS_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveUrlops(u) {
  localStorage.setItem(URLOPS_KEY, JSON.stringify(u));
  if (typeof updateLastModified === 'function') updateLastModified();
}
function loadCustomSchedule() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_SCHEDULE_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveCustomSchedule(s) {
  localStorage.setItem(CUSTOM_SCHEDULE_KEY, JSON.stringify(s));
  if (typeof updateLastModified === 'function') updateLastModified();
}
function loadOvertimes() {
  try {
    return JSON.parse(localStorage.getItem(OVERTIMES_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveOvertimes(o) {
   localStorage.setItem(OVERTIMES_KEY, JSON.stringify(o));
   if (typeof updateLastModified === 'function') updateLastModified();
 }
 
 function loadFactoryDrafts() {
   try {
     return JSON.parse(localStorage.getItem(FACTORY_DRAFTS_KEY)) || {};
   } catch (e) {
     return {};
   }
 }
 
 function saveFactoryDrafts(drafts) {
   localStorage.setItem(FACTORY_DRAFTS_KEY, JSON.stringify(drafts));
   if (typeof updateLastModified === 'function') updateLastModified();
 }
 
 /* === Persistent state === */
 const prefs = loadPrefs();
 const notes = loadNotes();
 const urlops = loadUrlops();
 let customSchedule = loadCustomSchedule();
 let overtimes = loadOvertimes();
 let factoryDrafts = loadFactoryDrafts();

if (!prefs.urlopLimits) prefs.urlopLimits = {};
 ['A', 'B', 'C', 'D'].forEach((brigade) => {
   if (prefs.urlopLimits[brigade] === undefined) prefs.urlopLimits[brigade] = URLOP_LIMIT;
 });

 /* === Factory drafts === */
  function getFactoryShift(year, month, day, brigade) {
    if (factoryDrafts[year] && factoryDrafts[year][month] && factoryDrafts[year][month][brigade]) {
      const arr = factoryDrafts[year][month][brigade];
      if (day >= 1 && day <= arr.length) {
        return arr[day - 1];
      }
    }
    return null;
  }
  
  function getFactoryDraftShiftAt(year, month, day, brigade) {
    const draft = getFactoryShift(year, month, day, brigade);
    if (draft !== null) {
      return draft;
    }
   if (factorySchedule[year] && factorySchedule[year][month] && factorySchedule[year][month][brigade]) {
     const arr = factorySchedule[year][month][brigade];
     if (day >= 1 && day <= arr.length) {
       return arr[day - 1];
     }
   }
   return null;
 }
 
  function ensureFactoryDraftYear(year) {
    if (!factoryDrafts[year]) {
      factoryDrafts[year] = {};
      for (let m = 1; m <= 12; m++) {
        factoryDrafts[year][m] = { A: [], B: [], C: [], D: [] };
      }
    }
    for (let m = 1; m <= 12; m++) {
      if (!factoryDrafts[year][m]) {
        factoryDrafts[year][m] = { A: [], B: [], C: [], D: [] };
      }
      const dim = new Date(year, m, 0).getDate();
      ['A', 'B', 'C', 'D'].forEach((b) => {
        if (!Array.isArray(factoryDrafts[year][m][b])) {
          factoryDrafts[year][m][b] = new Array(dim).fill(null);
        }
        while (factoryDrafts[year][m][b].length < dim) {
          factoryDrafts[year][m][b].push(null);
        }
        if (factoryDrafts[year][m][b].length > dim) {
          factoryDrafts[year][m][b].length = dim;
        }
      });
    }
  }
 
 function setFactoryDraftShift(year, month, day, brigade, value) {
   ensureFactoryDraftYear(year);
   factoryDrafts[year][month][brigade][day - 1] = value;
   saveFactoryDrafts(factoryDrafts);
 }
 
 function hasFactoryDraftData(year) {
   return !!factoryDrafts[year];
 }
 
 function clearFactoryDraftYear(year) {
   if (factoryDrafts[year]) {
     delete factoryDrafts[year];
     saveFactoryDrafts(factoryDrafts);
   }
 }
 
 function resetFactoryDrafts() {
   factoryDrafts = {};
   saveFactoryDrafts(factoryDrafts);
 }
 
 function copyPersonalYearToFactoryDraft(year) {
   if (customSchedule[year]) {
     factoryDrafts[year] = JSON.parse(JSON.stringify(customSchedule[year]));
     saveFactoryDrafts(factoryDrafts);
   }
 }
 
  function countFactoryDraftChanges() {
    let count = 0;
    const walk = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        obj.forEach((v) => {
          if (v !== null && v !== undefined && v !== '') count++;
        });
        return;
      }
      Object.keys(obj).forEach((k) => walk(obj[k]));
    };
    walk(factoryDrafts);
    return count;
  }
 
 /* === Limity urlopu === */

/* === Accessibility preferences === */
if (typeof prefs.reduceMotion === 'undefined') prefs.reduceMotion = false;
if (typeof prefs.largeText === 'undefined') prefs.largeText = false;
if (typeof prefs.compactCells === 'undefined') prefs.compactCells = false;

function applyAccessibilityPreferences() {
  const systemReduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reduceMotion = prefs.reduceMotion === true || systemReduceMotion;
  const largeText = prefs.largeText === true;
  const compactCells = prefs.compactCells === true;

  document.body.classList.toggle('reduce-motion', reduceMotion);
  document.body.classList.toggle('large-text', largeText);
  document.body.classList.toggle('compact-cells', compactCells);
}
window.applyAccessibilityPreferences = applyAccessibilityPreferences;

/* === Limity urlopu === */
function getVacationLimit(brigade) {
  const raw = prefs.urlopLimits && prefs.urlopLimits[brigade];
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return URLOP_LIMIT;
  return Math.floor(value);
}

function setVacationLimit(brigade, value) {
  const limit = Math.max(0, Math.floor(Number(value) || 0));
  if (!prefs.urlopLimits) prefs.urlopLimits = {};
  prefs.urlopLimits[brigade] = limit;
  // urlopLimits are personal data synced to Drive — mark as unsynced
  savePrefs(prefs, true);
  return limit;
}

/* === Schedule === */
function makeEmptyMonth(year, month) {
  const dim = new Date(year, month, 0).getDate();
  return {
    A: new Array(dim).fill(''),
    B: new Array(dim).fill(''),
    C: new Array(dim).fill(''),
    D: new Array(dim).fill(''),
  };
}
function makeEmptyYear(year) {
  const y = {};
  for (let m = 1; m <= 12; m++) y[m] = makeEmptyMonth(year, m);
  return y;
}
function getYearSchedule(year) {
  if (customSchedule[year]) return customSchedule[year];
  if (factorySchedule[year]) return factorySchedule[year];
  return makeEmptyYear(year);
}
function hasFactoryData(year) {
  return !!factorySchedule[year];
}
function hasCustomData(year) {
  return !!customSchedule[year];
}
function ensureCustomYear(year) {
  if (!customSchedule[year]) {
    if (factorySchedule[year])
      customSchedule[year] = JSON.parse(JSON.stringify(factorySchedule[year]));
    else customSchedule[year] = makeEmptyYear(year);
  }
  for (let m = 1; m <= 12; m++) {
    if (!customSchedule[year][m]) customSchedule[year][m] = makeEmptyMonth(year, m);
    const dim = new Date(year, m, 0).getDate();
    ['A', 'B', 'C', 'D'].forEach((b) => {
      if (!Array.isArray(customSchedule[year][m][b]))
        customSchedule[year][m][b] = new Array(dim).fill('');
      while (customSchedule[year][m][b].length < dim) customSchedule[year][m][b].push('');
      if (customSchedule[year][m][b].length > dim) customSchedule[year][m][b].length = dim;
    });
  }
}
function setShift(year, month, day, brigade, value) {
  ensureCustomYear(year);
  customSchedule[year][month][brigade][day - 1] = value;
  saveCustomSchedule(customSchedule);
}

/* === Utility === */
function escapeHtml(value) {
  const A = String.fromCharCode(38),
    L = String.fromCharCode(60),
    G = String.fromCharCode(62),
    Q = String.fromCharCode(34),
    P = String.fromCharCode(39);
  return String(value != null ? value : '')
    .split(A)
    .join(A + 'amp;')
    .split(L)
    .join(A + 'lt;')
    .split(G)
    .join(A + 'gt;')
    .split(Q)
    .join(A + 'quot;')
    .split(P)
    .join(A + '#39;');
}
function getElementByIdSafe(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`Missing element: ${id}`);
  return el;
}
function daysInMonthCal(year, month) {
  return new Date(year, month, 0).getDate();
}
function isWolne(s) {
  return s === '' || s === null || s === undefined;
}
function getShiftAt(year, month, day, brigade) {
  if (month < 1 || month > 12) return null;
  const ySched = getYearSchedule(year);
  const arr = ySched[month] && ySched[month][brigade];
  if (!arr || day < 1 || day > arr.length) return null;
  return arr[day - 1];
}
function findBrigadesOnShiftType(year, month, day, shiftType) {
  const res = [];
  ['A', 'B', 'C', 'D'].forEach((b) => {
    const s = getShiftAt(year, month, day, b);
    if (shiftType === '' ? isWolne(s) : s === shiftType) res.push(b);
  });
  return res;
}

/* === Urlopy === */
function urlopKey(year, m, d) {
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function isUrlop(year, m, d, brigade) {
  return urlops[brigade] && urlops[brigade].includes(urlopKey(year, m, d));
}
function toggleUrlop(year, m, d, brigade) {
  const k = urlopKey(year, m, d);
  if (!urlops[brigade]) urlops[brigade] = [];
  const idx = urlops[brigade].indexOf(k);
  if (idx >= 0) urlops[brigade].splice(idx, 1);
  else urlops[brigade].push(k);
  saveUrlops(urlops);
}
function countWorkingUrlops(year, brigade) {
  const list = urlops[brigade] || [];
  let cnt = 0;
  list.forEach((k) => {
    const parts = k.split('-').map(Number);
    if (parts.length !== 3 || parts[0] !== year) return;
    const s = getShiftAt(parts[0], parts[1], parts[2], brigade);
    if (s === 'R' || s === 'P' || s === 'N') cnt++;
  });
  return cnt;
}

/* === Pomocnice dla grafiku === */
function getRelief(year, month, day, brigade, shiftType) {
  let nextBrig = null,
    nextType = null,
    nextMonth = month,
    nextDay = day,
    nextYear = year;
  let prevBrig = null,
    prevType = null,
    prevMonth = month,
    prevDay = day,
    prevYear = year;
  if (shiftType === 'R') {
    nextType = 'P';
    nextBrig =
      findBrigadesOnShiftType(year, month, day, 'P').filter((b) => b !== brigade)[0] || null;
    prevType = 'N';
    prevDay = day - 1;
    if (prevDay < 1) {
      prevMonth = month - 1;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear = year - 1;
      }
      prevDay = daysInMonthCal(prevYear, prevMonth);
    }
    prevBrig =
      findBrigadesOnShiftType(prevYear, prevMonth, prevDay, 'N').filter((b) => b !== brigade)[0] ||
      null;
  } else if (shiftType === 'P') {
    nextType = 'N';
    nextBrig =
      findBrigadesOnShiftType(year, month, day, 'N').filter((b) => b !== brigade)[0] || null;
    prevType = 'R';
    prevBrig =
      findBrigadesOnShiftType(year, month, day, 'R').filter((b) => b !== brigade)[0] || null;
  } else if (shiftType === 'N') {
    prevType = 'P';
    prevBrig =
      findBrigadesOnShiftType(year, month, day, 'P').filter((b) => b !== brigade)[0] || null;
    nextType = 'R';
    nextDay = day + 1;
    if (nextDay > daysInMonthCal(year, month)) {
      nextDay = 1;
      nextMonth = month + 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear = year + 1;
      }
    }
    nextBrig =
      findBrigadesOnShiftType(nextYear, nextMonth, nextDay, 'R').filter((b) => b !== brigade)[0] ||
      null;
  }
  return {
    nextBrig,
    nextType,
    nextMonth,
    nextDay,
    nextYear,
    prevBrig,
    prevType,
    prevMonth,
    prevDay,
    prevYear,
  };
}
function getCycleRange(year, month, day, brigade) {
  const shift = getShiftAt(year, month, day, brigade);
  if (isWolne(shift)) return null;
  const dim = daysInMonthCal(year, month);
  let start = day,
    end = day;
  while (start > 1 && getShiftAt(year, month, start - 1, brigade) === shift) start--;
  while (end < dim && getShiftAt(year, month, end + 1, brigade) === shift) end++;
  return { start, end, length: end - start + 1, type: shift };
}

/** Cycle range based purely on factory schedule (used in privacy / logged-out mode). */
function getFactoryCycleRange(year, month, day, brigade) {
  const arr =
    factorySchedule[year] && factorySchedule[year][month] && factorySchedule[year][month][brigade]
      ? factorySchedule[year][month][brigade]
      : null;
  if (!arr || day < 1 || day > arr.length) return null;
  const shift = arr[day - 1];
  if (isWolne(shift)) return null;
  const dim = arr.length;
  let start = day,
    end = day;
  while (start > 1 && arr[start - 2] === shift) start--;
  while (end < dim && arr[end] === shift) end++;
  return { start, end, length: end - start + 1, type: shift };
}
function daysToNextWolne(year, month, day, brigade) {
  let y = year,
    m = month,
    d = day,
    count = 0;
  while (count < 60) {
    d++;
    count++;
    if (d > daysInMonthCal(y, m)) {
      d = 1;
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    if (isWolne(getShiftAt(y, m, d, brigade)) || isUrlop(y, m, d, brigade)) {
      return { days: count, year: y, month: m, day: d };
    }
  }
  return null;
}

/**
 * Work remaining until next free/vacation day.
 * Counts shifts of each type between current day (exclusive) and day off.
 * @returns {{ days, dayShifts, nightShifts, year, month, day } | null}
 *   dayShifts = R+P count, nightShifts = N count
 */
/**
 * Shift for cycle/until-free — same source as calendar cells:
 * personal data on → getShiftAt (factory + custom);
 * personal data off → pure factorySchedule.
 */
function readShiftForCycle(year, month, day, brigade) {
  const hidePrivate =
    typeof shouldShowPersonalData === 'function' ? !shouldShowPersonalData() : false;
  if (hidePrivate) {
    const arr =
      factorySchedule[year] &&
      factorySchedule[year][month] &&
      factorySchedule[year][month][brigade];
    if (!arr || day < 1 || day > arr.length) return '';
    return arr[day - 1] || '';
  }
  if (typeof getShiftAtWithPending === 'function') {
    return getShiftAtWithPending(year, month, day, brigade) || '';
  }
  return getShiftAt(year, month, day, brigade) || '';
}

function getCyclePath(year, month, day, brigade, maxSteps) {
  maxSteps = maxSteps || 8;
  const steps = [];
  let y = +year,
    m = +month,
    d = +day;
  const urlopOn = (yy, mm, dd) => {
    if (typeof shouldShowPersonalData === 'function' && !shouldShowPersonalData()) return false;
    return isUrlop(yy, mm, dd, brigade);
  };
  // include current day if working
  const selfShift = readShiftForCycle(y, m, d, brigade);
  if (!isWolne(selfShift) && !urlopOn(y, m, d)) {
    steps.push({ year: y, month: m, day: d, shift: selfShift, isSelf: true });
  }
  let guard = 0;
  while (guard < 60 && steps.length < maxSteps) {
    guard++;
    d++;
    if (d > daysInMonthCal(y, m)) {
      d = 1;
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    if (urlopOn(y, m, d)) {
      return { steps, free: { year: y, month: m, day: d } };
    }
    const s = readShiftForCycle(y, m, d, brigade);
    if (isWolne(s)) {
      return { steps, free: { year: y, month: m, day: d } };
    }
    if (s === 'R' || s === 'P' || s === 'N') {
      steps.push({ year: y, month: m, day: d, shift: s, isSelf: false });
    }
  }
  return { steps, free: null };
}


function getUntilDayOff(year, month, day, brigade) {
  let y = +year,
    m = +month,
    d = +day,
    count = 0;
  let dayShifts = 0;
  let nightShifts = 0;
  const urlopOn = (yy, mm, dd) => {
    if (typeof shouldShowPersonalData === 'function' && !shouldShowPersonalData()) return false;
    return isUrlop(yy, mm, dd, brigade);
  };
  while (count < 60) {
    d++;
    count++;
    if (d > daysInMonthCal(y, m)) {
      d = 1;
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    if (urlopOn(y, m, d) || isWolne(readShiftForCycle(y, m, d, brigade))) {
      return { days: count, dayShifts, nightShifts, year: y, month: m, day: d };
    }
    const s = readShiftForCycle(y, m, d, brigade);
    if (s === 'N') nightShifts++;
    else if (s === 'R' || s === 'P') dayShifts++;
  }
  return null;
}

/**
 * Path of own shifts from selected day (inclusive) until next free/vacation.
 * @returns {{ steps: Array<{year,month,day,shift,isSelf}>, free: {year,month,day}|null }}
 */
/* === Nadgodziny: pomocnicze === */
function otKey(year, month, day, brigade) {
  return `${year}-${month}-${day}-${brigade}`;
}
function getOvertimes(year, month, day, brigade) {
  return overtimes[otKey(year, month, day, brigade)] || { przed: null, po: null };
}
function setOvertime(year, month, day, brigade, position, data) {
  const k = otKey(year, month, day, brigade);
  if (!overtimes[k]) overtimes[k] = { przed: null, po: null };
  overtimes[k][position] = data;
  if (!overtimes[k].przed && !overtimes[k].po) delete overtimes[k];
  saveOvertimes(overtimes);
}
function removeOvertime(year, month, day, brigade, position) {
  setOvertime(year, month, day, brigade, position, null);
}

function formatTimeRange(from, to) {
  const fmt = (h) => String(Math.floor(h)).padStart(2, '0') + ':00';
  return `${fmt(from)} – ${fmt(to)}`;
}

function getActualWorkTime(year, month, day, brigade, shift) {
  if (isWolne(shift)) return null;
  const ot = getOvertimes(year, month, day, brigade);
  const [start, end] = shiftHours[shift];
  let realStart = start,
    realEnd = end;
  if (ot.przed) {
    realStart = start - ot.przed.hours;
    if (realStart < 0) realStart += 24;
  }
  if (ot.po) realEnd = end + ot.po.hours;
  const fmt = (h) => String(Math.floor(((h % 24) + 24) % 24)).padStart(2, '0');
  return `${fmt(realStart)}-${fmt(realEnd)}`;
}

function getMonthOvertimeSummary(year, month, brigade) {
  const dim = daysInMonthCal(year, month);
  const total = { h50: 0, h100: 0, h200: 0, count: 0 };
  const yHolidays = buildHolidays(year);

  for (let d = 1; d <= dim; d++) {
    const shift = getShiftAt(year, month, d, brigade);
    const ot = getOvertimes(year, month, d, brigade);

    // 1. Standard PRZED/PO overtime
    ['przed', 'po'].forEach((pos) => {
      if (ot[pos]) {
        const cat = categorizeOvertime(year, month, d, shift, pos, ot[pos].hours);
        total.h50 += cat.h50;
        total.h100 += cat.h100;
        total.h200 += cat.h200;
        total.count++;
      }
    });

    // 2. Added shift on holiday/Sunday (Variant A: only if not in factory schedule)
    // Skip if not a working shift or if it's a vacation day
    if (shift === 'R' || shift === 'P' || shift === 'N') {
      if (!isUrlop(year, month, d, brigade)) {
        // Check what was in factory schedule for this day
        const factoryShift =
          factorySchedule[year] &&
          factorySchedule[year][month] &&
          factorySchedule[year][month][brigade]
            ? factorySchedule[year][month][brigade][d - 1]
            : '';

        // If current shift differs from factory (i.e., user ADDED a shift on a free day)
        // AND factory was free (empty/W) → count as additional overtime shift
        const wasFactoryFree = isWolne(factoryShift);
        const isAddedShift = wasFactoryFree && (shift === 'R' || shift === 'P' || shift === 'N');

        if (isAddedShift) {
          const isHoliday = !!yHolidays[month + '-' + d];
          const dow = new Date(year, month - 1, d).getDay();
          const isSunday = dow === 0;

          if (isHoliday) {
            // Holiday work = +200%
            total.h200 += 8;
            total.count++;
          } else if (isSunday) {
            // Sunday work = +100%
            total.h100 += 8;
            total.count++;
          }
          // Regular Saturday added shift: no extra rate (still counts as regular work)
        }
      }
    }
  }
  return total;
}

function getMonthHours(year, month) {
  if (!customSchedule[year] && factoryMonthHours[year] && factoryMonthHours[year][month])
return factoryMonthHours[year][month];
   const ySched = getYearSchedule(year);
   const h = { A: 0, B: 0, C: 0, D: 0 };
   ['A', 'B', 'C', 'D'].forEach((b) => {
     const arr = ySched[month][b];
     for (let i = 0; i < arr.length; i++) if (!isWolne(arr[i])) h[b] += 8;
   });
   return h;
 }

function countPersonalCustomShifts() {
     if (!customSchedule || typeof customSchedule !== 'object') return 0;
     let count = 0;
     const walk = (obj) => {
       if (!obj || typeof obj !== 'object') return;
       if (Array.isArray(obj)) {
         obj.forEach((v) => {
           if (v != null && v !== '' && v !== 0) count++;
         });
         return;
       }
       Object.keys(obj).forEach((k) => walk(obj[k]));
     };
     walk(customSchedule);
     return count;
   }

   function countVacations() {
     if (!urlops || typeof urlops !== 'object') return 0;
     let total = 0;
     Object.keys(urlops).forEach((brigade) => {
       const list = urlops[brigade];
       if (Array.isArray(list)) {
         total += list.length;
       }
     });
     return total;
   }

   function countOvertimeRecords() {
     if (!overtimes || typeof overtimes !== 'object') return 0;
     return Object.keys(overtimes).length;
   }

   function countNonEmptyNotes() {
     if (!notes || typeof notes !== 'object') return 0;
     return Object.keys(notes).filter((k) => {
       const v = notes[k];
       return v != null && String(v).trim() !== '';
     }).length;
   }

   function clearLocalPersonalData() {
     // Clear customSchedule
     if (typeof customSchedule !== 'undefined' && customSchedule !== null) {
       Object.keys(customSchedule).forEach((key) => {
         delete customSchedule[key];
       });
       if (typeof saveCustomSchedule === 'function') {
         saveCustomSchedule(customSchedule);
       }
     }

     // Clear urlops
     if (typeof urlops !== 'undefined' && urlops !== null) {
       Object.keys(urlops).forEach((key) => {
         delete urlops[key];
       });
       if (typeof saveUrlops === 'function') {
         saveUrlops(urlops);
       }
     }

     // Clear overtimes
     if (typeof overtimes !== 'undefined' && overtimes !== null) {
       Object.keys(overtimes).forEach((key) => {
         delete overtimes[key];
       });
       if (typeof saveOvertimes === 'function') {
         saveOvertimes(overtimes);
       }
     }

     // Clear notes
     if (typeof notes !== 'undefined' && notes !== null) {
       Object.keys(notes).forEach((key) => {
         delete notes[key];
       });
       if (typeof saveNotes === 'function') {
         saveNotes(notes);
       }
     }

     // Persist empty data (already done in the save calls above)
     // Refresh views
     if (typeof refreshViews === 'function') {
       try {
         refreshViews();
       } catch (e) {
         /* ignore */
       }
     }

// Update sync tracking (the save functions above should have called updateLastModified)
      // Show localized success toast
      if (typeof showToast === 'function' && typeof t === 'function') {
        showToast('success', t('settingsPrivacyClearSuccess'));
      }
    }

    /* === Expose factory draft functions to window === */
    window.loadFactoryDrafts = loadFactoryDrafts;
    window.saveFactoryDrafts = saveFactoryDrafts;
    window.getFactoryShift = getFactoryShift;
    window.getFactoryDraftShiftAt = getFactoryDraftShiftAt;
    window.ensureFactoryDraftYear = ensureFactoryDraftYear;
    window.setFactoryDraftShift = setFactoryDraftShift;
    window.hasFactoryDraftData = hasFactoryDraftData;
    window.clearFactoryDraftYear = clearFactoryDraftYear;
    window.resetFactoryDrafts = resetFactoryDrafts;
    window.copyPersonalYearToFactoryDraft = copyPersonalYearToFactoryDraft;
    window.countFactoryDraftChanges = countFactoryDraftChanges;
   }
