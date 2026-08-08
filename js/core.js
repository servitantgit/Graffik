/* ================================================================
   GRAFIK GILLETTE — Moduł 2: UTILITY + ŚWIĘTA + PERSISTENCJA + ROZKŁAD
   ================================================================ */

/* === Święta (algorytm Gaussa) === */
function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31);
  const day = ((h + L - 7 * m + 114) % 31) + 1;
  return { month, day };
}
function buildHolidays(year) {
  const e = easter(year);
  const eDate = new Date(year, e.month - 1, e.day);
  const monPas = new Date(eDate); monPas.setDate(eDate.getDate() + 1);
  const pentecost = new Date(eDate); pentecost.setDate(eDate.getDate() + 49);
  const corpus = new Date(eDate); corpus.setDate(eDate.getDate() + 60);
  return {
    '1-1': 'Nowy Rok', '1-6': 'Trzech Króli',
    [`${e.month}-${e.day}`]: 'Wielkanoc',
    [`${monPas.getMonth()+1}-${monPas.getDate()}`]: 'Poniedziałek Wielkanocny',
    '5-1': 'Święto Pracy', '5-3': 'Święto Konstytucji',
    [`${pentecost.getMonth()+1}-${pentecost.getDate()}`]: 'Zesłanie Ducha Świętego',
    [`${corpus.getMonth()+1}-${corpus.getDate()}`]: 'Boże Ciało',
    '8-15': 'Wniebowzięcie NMP', '11-1': 'Wszystkich Świętych',
    '11-11': 'Święto Niepodległości', '12-25': 'Boże Narodzenie', '12-26': '2. Dzień Bożego Narodzenia'
  };
}

/* === PERSISTENCJA === */
function loadPrefs() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch(e) { return {}; } }
function savePrefs(p) { localStorage.setItem(LS_KEY, JSON.stringify(p)); }
function loadNotes() { try { return JSON.parse(localStorage.getItem(NOTES_KEY)) || {}; } catch(e) { return {}; } }
function saveNotes(n) { localStorage.setItem(NOTES_KEY, JSON.stringify(n)); }
function loadUrlops() { try { return JSON.parse(localStorage.getItem(URLOPS_KEY)) || {}; } catch(e) { return {}; } }
function saveUrlops(u) { localStorage.setItem(URLOPS_KEY, JSON.stringify(u)); }
function loadCustomSchedule() { try { return JSON.parse(localStorage.getItem(CUSTOM_SCHEDULE_KEY)) || {}; } catch(e) { return {}; } }
function saveCustomSchedule(s) { localStorage.setItem(CUSTOM_SCHEDULE_KEY, JSON.stringify(s)); }
function loadOvertimes() { try { return JSON.parse(localStorage.getItem(OVERTIMES_KEY)) || {}; } catch(e) { return {}; } }
function saveOvertimes(o) { localStorage.setItem(OVERTIMES_KEY, JSON.stringify(o)); }

/* === Stan trwały === */
const prefs = loadPrefs();
const notes = loadNotes();
const urlops = loadUrlops();
let customSchedule = loadCustomSchedule();
let overtimes = loadOvertimes();

if (!prefs.urlopLimits) prefs.urlopLimits = {};
['A','B','C','D'].forEach(brigade => {
  if (prefs.urlopLimits[brigade] === undefined) prefs.urlopLimits[brigade] = URLOP_LIMIT;
});

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
  savePrefs(prefs);
  return limit;
}

/* === Rozkład (schedule) === */
function makeEmptyMonth(year, month) {
  const dim = new Date(year, month, 0).getDate();
  return { A: new Array(dim).fill(''), B: new Array(dim).fill(''), C: new Array(dim).fill(''), D: new Array(dim).fill('') };
}
function makeEmptyYear(year) { const y = {}; for (let m = 1; m <= 12; m++) y[m] = makeEmptyMonth(year, m); return y; }
function getYearSchedule(year) {
  if (customSchedule[year]) return customSchedule[year];
  if (factorySchedule[year]) return factorySchedule[year];
  return makeEmptyYear(year);
}
function hasFactoryData(year) { return !!factorySchedule[year]; }
function hasCustomData(year) { return !!customSchedule[year]; }
function ensureCustomYear(year) {
  if (!customSchedule[year]) {
    if (factorySchedule[year]) customSchedule[year] = JSON.parse(JSON.stringify(factorySchedule[year]));
    else customSchedule[year] = makeEmptyYear(year);
  }
  for (let m = 1; m <= 12; m++) {
    if (!customSchedule[year][m]) customSchedule[year][m] = makeEmptyMonth(year, m);
    const dim = new Date(year, m, 0).getDate();
    ['A','B','C','D'].forEach(b => {
      if (!Array.isArray(customSchedule[year][m][b])) customSchedule[year][m][b] = new Array(dim).fill('');
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
  const A = String.fromCharCode(38), L = String.fromCharCode(60),
        G = String.fromCharCode(62), Q = String.fromCharCode(34),
        P = String.fromCharCode(39);
  return String(value ?? '')
    .split(A).join(A + 'amp;')
    .split(L).join(A + 'lt;')
    .split(G).join(A + 'gt;')
    .split(Q).join(A + 'quot;')
    .split(P).join(A + '#39;');
}
function getElementByIdSafe(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`Missing element: ${id}`);
  return el;
}
function daysInMonthCal(year, month) { return new Date(year, month, 0).getDate(); }
function isWolne(s) { return s === '' || s === null || s === undefined; }
function getShiftAt(year, month, day, brigade) {
  if (month < 1 || month > 12) return null;
  const ySched = getYearSchedule(year);
  const arr = ySched[month] && ySched[month][brigade];
  if (!arr || day < 1 || day > arr.length) return null;
  return arr[day - 1];
}
function findBrigadesOnShiftType(year, month, day, shiftType) {
  const res = [];
  ['A','B','C','D'].forEach(b => {
    const s = getShiftAt(year, month, day, b);
    if (shiftType === '' ? isWolne(s) : s === shiftType) res.push(b);
  });
  return res;
}

/* === Urlopy === */
function urlopKey(year, m, d) { return `${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function isUrlop(year, m, d, brigade) { return urlops[brigade] && urlops[brigade].includes(urlopKey(year, m, d)); }
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
  list.forEach(k => {
    const parts = k.split('-').map(Number);
    if (parts.length !== 3 || parts[0] !== year) return;
    const s = getShiftAt(parts[0], parts[1], parts[2], brigade);
    if (s === 'R' || s === 'P' || s === 'N') cnt++;
  });
  return cnt;
}

/* === Pomocnice dla grafiku === */
function getRelief(year, month, day, brigade, shiftType) {
  let nextBrig=null, nextType=null, nextMonth=month, nextDay=day, nextYear=year;
  let prevBrig=null, prevType=null, prevMonth=month, prevDay=day, prevYear=year;
  if (shiftType === 'R') {
    nextType = 'P';
    nextBrig = findBrigadesOnShiftType(year, month, day, 'P').filter(b => b !== brigade)[0] || null;
    prevType = 'N';
    prevDay = day - 1;
    if (prevDay < 1) {
      prevMonth = month - 1;
      if (prevMonth < 1) { prevMonth = 12; prevYear = year - 1; }
      prevDay = daysInMonthCal(prevYear, prevMonth);
    }
    prevBrig = findBrigadesOnShiftType(prevYear, prevMonth, prevDay, 'N').filter(b => b !== brigade)[0] || null;
  } else if (shiftType === 'P') {
    nextType = 'N';
    nextBrig = findBrigadesOnShiftType(year, month, day, 'N').filter(b => b !== brigade)[0] || null;
    prevType = 'R';
    prevBrig = findBrigadesOnShiftType(year, month, day, 'R').filter(b => b !== brigade)[0] || null;
  } else if (shiftType === 'N') {
    prevType = 'P';
    prevBrig = findBrigadesOnShiftType(year, month, day, 'P').filter(b => b !== brigade)[0] || null;
    nextType = 'R';
    nextDay = day + 1;
    if (nextDay > daysInMonthCal(year, month)) {
      nextDay = 1; nextMonth = month + 1;
      if (nextMonth > 12) { nextMonth = 1; nextYear = year + 1; }
    }
    nextBrig = findBrigadesOnShiftType(nextYear, nextMonth, nextDay, 'R').filter(b => b !== brigade)[0] || null;
  }
  return { nextBrig, nextType, nextMonth, nextDay, nextYear, prevBrig, prevType, prevMonth, prevDay, prevYear };
}
function getCycleRange(year, month, day, brigade) {
  const shift = getShiftAt(year, month, day, brigade);
  if (isWolne(shift)) return null;
  const dim = daysInMonthCal(year, month);
  let start = day, end = day;
  while (start > 1 && getShiftAt(year, month, start-1, brigade) === shift) start--;
  while (end < dim && getShiftAt(year, month, end+1, brigade) === shift) end++;
  return { start, end, length: end - start + 1, type: shift };
}
function daysToNextWolne(year, month, day, brigade) {
  if (isWolne(getShiftAt(year, month, day, brigade)) || isUrlop(year, month, day, brigade)) {
    return { days: 0, year: year, month: month, day: day };
  }
  let y = year, m = month, d = day, count = 0;
  while (count < 60) {
    d++; count++;
    if (d > daysInMonthCal(y, m)) { d = 1; m++; if (m > 12) { m = 1; y++; } }
    if (isWolne(getShiftAt(y, m, d, brigade)) || isUrlop(y, m, d, brigade)) return { days: count, year: y, month: m, day: d };
  }
  return null;
}

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

function calcOvertimeTime(shift, position, hours) {
  const [start, end] = shiftHours[shift];
  let from, to;
  if (position === 'przed') {
    to = start;
    from = start - hours;
    if (from < 0) from += 24;
  } else {
    from = end % 24;
    to = (end + hours) % 24;
  }
  return { from, to };
}

function categorizeOvertime(year, month, day, shift, position, hours) {
  const yHolidays = buildHolidays(year);
  const isHoliday = !!yHolidays[month + '-' + day];
  const dow = new Date(year, month - 1, day).getDay();
  const isSunday = dow === 0;

  if (isHoliday) return { h50: 0, h100: 0, h200: hours };

  const [shStart, shEnd] = shiftHours[shift];
  let curHour;
  if (position === 'przed') curHour = shStart - hours;
  else curHour = shEnd;
  if (curHour < 0) curHour += 24;

  let nightH = 0, dayH = 0;
  for (let i = 0; i < hours; i++) {
    const h = ((curHour + i) % 24 + 24) % 24;
    if (h >= 22 || h < 6) nightH++;
    else dayH++;
  }
  if (isSunday) return { h50: 0, h100: dayH + nightH, h200: 0 };
  return { h50: dayH, h100: nightH, h200: 0 };
}

function formatTimeRange(from, to) {
  const fmt = h => String(Math.floor(h)).padStart(2, '0') + ':00';
  return `${fmt(from)} – ${fmt(to)}`;
}

function getActualWorkTime(year, month, day, brigade, shift) {
  if (isWolne(shift)) return null;
  const ot = getOvertimes(year, month, day, brigade);
  const [start, end] = shiftHours[shift];
  let realStart = start, realEnd = end;
  if (ot.przed) {
    realStart = start - ot.przed.hours;
    if (realStart < 0) realStart += 24;
  }
  if (ot.po) realEnd = end + ot.po.hours;
  const fmt = h => String(Math.floor(((h % 24) + 24) % 24)).padStart(2, '0');
  return `${fmt(realStart)}-${fmt(realEnd)}`;
}

function getMonthOvertimeSummary(year, month, brigade) {
  const dim = daysInMonthCal(year, month);
  const total = { h50: 0, h100: 0, h200: 0, count: 0 };
  for (let d = 1; d <= dim; d++) {
    const shift = getShiftAt(year, month, d, brigade);
    if (isWolne(shift)) continue;
    const ot = getOvertimes(year, month, d, brigade);
    ['przed', 'po'].forEach(pos => {
      if (ot[pos]) {
        const cat = categorizeOvertime(year, month, d, shift, pos, ot[pos].hours);
        total.h50 += cat.h50;
        total.h100 += cat.h100;
        total.h200 += cat.h200;
        total.count++;
      }
    });
  }
  return total;
}

function getMonthHours(year, month) {
  if (!customSchedule[year] && factoryMonthHours[year] && factoryMonthHours[year][month]) return factoryMonthHours[year][month];
  const ySched = getYearSchedule(year);
  const h = { A: 0, B: 0, C: 0, D: 0 };
  ['A','B','C','D'].forEach(b => {
    const arr = ySched[month][b];
    for (let i = 0; i < arr.length; i++) if (!isWolne(arr[i])) h[b] += 8;
  });
  return h;
}