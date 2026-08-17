/* ================================================================
   GRAFIK GILLETTE — SCHEDULES CORE (constants + helpers)
   
   🌍 PUBLIC MODULE — safe to commit to git
   
   Contains constants and helper functions independent of specific schedule.
   Per-schedule data is in js/schedules/<schedule-id>/ folders.
   
   Loading order in index.html:
   1. schedules/_core.js          (this file — constants + helpers)
   2. schedules/_registry.js      (global registries: scheduleRegistry, factorySchedule)
   3. schedules/gillette/metadata.js  (schedule metadata)
   4. schedules/gillette/2026.js  (year data)
   5. ... other year files
   6. ... other schedules (future)
   7. ... other app modules
   ================================================================ */

/* === MONTH NAMES (Polish, updated by i18n) === */
let monthNames = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
];

let monthNamesShort = [
  'Sty',
  'Lut',
  'Mar',
  'Kwi',
  'Maj',
  'Cze',
  'Lip',
  'Sie',
  'Wrz',
  'Paź',
  'Lis',
  'Gru',
];

let monthNamesGenitive = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
];

/* === DAY NAMES === */
let dayNames = ['Pon', 'Wt', 'Śr', 'Cz', 'Pt', 'Sob', 'Nd'];
let dayNamesFull = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

/* === SHIFT DEFINITIONS === */
const shiftHours = {
  R: [6, 14],
  P: [14, 22],
  N: [22, 30], // 30 = 6 наступного дня
};

let shiftFullName = {
  R: 'Rano (6:00-14:00)',
  P: 'Popołudnie (14:00-22:00)',
  N: 'Noc (22:00-6:00)',
  '': 'Wolne',
};

let shiftLongNames = {
  R: 'Rano',
  P: 'Popołudnie',
  N: 'Noc',
  '': 'Wolne',
};

const shiftEmoji = {
  R: '🌅',
  P: '🌤️',
  N: '🌙',
  '': '🏖️',
};

/* === APP CONSTANTS === */
const SHIFT_CYCLE = ['R', 'P', 'N', ''];
const MIN_YEAR = 2020;
const MAX_YEAR = 2035;
const URLOP_LIMIT = 26;

/* === LOCALSTORAGE KEYS === */
const LS_KEY = 'gillette_prefs_v1';
const NOTES_KEY = 'gillette_notes_v1';
const URLOPS_KEY = 'gillette_urlops_v1';
const CUSTOM_SCHEDULE_KEY = 'gillette_custom_schedule_v2';
const OVERTIMES_KEY = 'gillette_overtimes_v1';

/* === HELPER FUNCTIONS === */

/**
 * Returns number of days in a given month.
 * @param {number} y - year
 * @param {number} m - month (1-12)
 * @returns {number}
 */
function daysInMonthCal(y, m) {
  return new Date(y, m, 0).getDate();
}

/**
 * Checks if shift code represents "free" day (empty or W).
 * @param {string} s
 * @returns {boolean}
 */
function isWolne(s) {
  return s === '' || s === 'W' || s === undefined || s === null;
}

/**
 * Escapes HTML special characters.
 * @param {string} s
 * @returns {string}
 */
function escapeHtml(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats time range (for overtime display).
 * @param {number} from - start hour (0-24)
 * @param {number} to - end hour (0-30, where 24+ = next day)
 * @returns {string}
 */
function formatTimeRange(from, to) {
  const fmt = (h) => {
    const hh = ((h % 24) + 24) % 24;
    return String(Math.floor(hh)).padStart(2, '0') + ':00';
  };
  return `${fmt(from)}–${fmt(to)}`;
}

/**
 * Builds map of Polish public holidays for a year.
 * @param {number} year
 * @returns {object} - { "1-1": "Nowy Rok", "1-6": "Trzech Króli", ... }
 */
function buildHolidays(year) {
  // Fixed-date holidays
  const holidays = {
    '1-1': 'Nowy Rok',
    '1-6': 'Trzech Króli',
    '5-1': 'Święto Pracy',
    '5-3': 'Święto Konstytucji',
    '8-15': 'Wniebowzięcie NMP',
    '11-1': 'Wszystkich Świętych',
    '11-11': 'Święto Niepodległości',
    '12-25': 'Boże Narodzenie',
    '12-26': '2. Dzień Bożego Narodzenia',
  };

  // Moving holidays — computed via Butcher's algorithm (Easter)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const easterMonth = Math.floor((h + L - 7 * m + 114) / 31);
  const easterDay = ((h + L - 7 * m + 114) % 31) + 1;

  holidays[`${easterMonth}-${easterDay}`] = 'Wielkanoc';

  // Easter Monday — Easter + 1 day
  const easterMondayDate = new Date(year, easterMonth - 1, easterDay + 1);
  holidays[`${easterMondayDate.getMonth() + 1}-${easterMondayDate.getDate()}`] =
    'Poniedziałek Wielkanocny';

  // Pentecost — Easter + 49 days
  const pentecostDate = new Date(year, easterMonth - 1, easterDay + 49);
  holidays[`${pentecostDate.getMonth() + 1}-${pentecostDate.getDate()}`] =
    'Zesłanie Ducha Świętego';

  // Corpus Christi — Easter + 60 days
  const corpusDate = new Date(year, easterMonth - 1, easterDay + 60);
  holidays[`${corpusDate.getMonth() + 1}-${corpusDate.getDate()}`] = 'Boże Ciało';

  return holidays;
}
