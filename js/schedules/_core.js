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

/* === LOCALIZED DISPLAY NAMES === */
function updateLocalizedNames() {
  const translate = (key, fallback) => (typeof t === 'function' ? t(key) : fallback);

  monthNames = Array.from({ length: 12 }, (_, i) => translate(`month${i + 1}`, monthNames[i]));
  monthNamesShort = Array.from({ length: 12 }, (_, i) =>
    translate(`month${i + 1}Short`, monthNamesShort[i])
  );
  monthNamesGenitive = Array.from({ length: 12 }, (_, i) =>
    translate(`month${i + 1}Genitive`, monthNamesGenitive[i])
  );

  dayNames = [
    translate('dayMon', dayNames[0]),
    translate('dayTue', dayNames[1]),
    translate('dayWed', dayNames[2]),
    translate('dayThu', dayNames[3]),
    translate('dayFri', dayNames[4]),
    translate('daySat', dayNames[5]),
    translate('daySun', dayNames[6]),
  ];
  dayNamesFull = [
    translate('daySunday', dayNamesFull[0]),
    translate('dayMonday', dayNamesFull[1]),
    translate('dayTuesday', dayNamesFull[2]),
    translate('dayWednesday', dayNamesFull[3]),
    translate('dayThursday', dayNamesFull[4]),
    translate('dayFriday', dayNamesFull[5]),
    translate('daySaturday', dayNamesFull[6]),
  ];

  shiftFullName = {
    R: translate('shiftR', shiftFullName.R),
    P: translate('shiftP', shiftFullName.P),
    N: translate('shiftN', shiftFullName.N),
    '': translate('shiftW', shiftFullName['']),
  };
  shiftLongNames = {
    R: translate('shiftRShort', shiftLongNames.R),
    P: translate('shiftPShort', shiftLongNames.P),
    N: translate('shiftNShort', shiftLongNames.N),
    '': translate('shiftW', shiftLongNames['']),
  };
}

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
const FACTORY_DRAFTS_KEY = 'gillette_factory_drafts_v1';

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
 * Formats a clock time that may include fractional hours (minutes).
 * @param {number} h - hour value (can be fractional, e.g. 14.5 = 14:30)
 * @returns {string} - "HH:MM"
 */
function formatClockTime(h) {
  const totalMin = Math.round((((h % 24) + 24) % 24) * 60);
  const hh = Math.floor(totalMin / 60) % 24;
  const mm = totalMin % 60;
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

/**
 * Formats time range (for overtime display). Supports fractional hours.
 * @param {number} from - start hour (0-24, may be fractional)
 * @param {number} to - end hour (0-30, where 24+ = next day, may be fractional)
 * @returns {string}
 */
function formatTimeRange(from, to) {
  return `${formatClockTime(from)}–${formatClockTime(to)}`;
}

/**
 * Formats a duration in decimal hours as "Xh Ym" / localized hours+minutes.
 * Storage stays decimal (e.g. 4.5); display is human-readable.
 * Rounds to nearest minute. Omits zero minutes when whole hours.
 * @param {number} hours - duration in decimal hours (e.g. 4.8 → 4h 48m)
 * @param {object} [opts]
 * @param {string} [opts.hoursUnit='h'] - unit for hours part
 * @param {string} [opts.minutesUnit='m'] - unit for minutes part
 * @param {boolean} [opts.compact=false] - if true, no space before unit (legacy "4.8h" style avoided)
 * @returns {string}
 */
function formatDurationHours(hours, opts) {
  if (hours == null || !isFinite(hours) || hours < 0) return '0h';
  const totalMin = Math.round(Number(hours) * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const hoursUnit = (opts && opts.hoursUnit) || 'h';
  const minutesUnit = (opts && opts.minutesUnit) || 'm';
  if (m === 0) return `${h}${hoursUnit}`;
  if (h === 0) return `${m}${minutesUnit}`;
  return `${h}${hoursUnit} ${m}${minutesUnit}`;
}

/**
 * Localized duration formatter — uses i18n keys when available.
 * Keys: durationHoursUnit, durationMinutesUnit (fallback: h / m).
 * @param {number} hours
 * @returns {string}
 */
function formatDurationHoursI18n(hours) {
  const hu = typeof t === 'function' ? t('durationHoursUnit') || 'h' : 'h';
  const mu = typeof t === 'function' ? t('durationMinutesUnit') || 'm' : 'm';
  return formatDurationHours(hours, { hoursUnit: hu, minutesUnit: mu });
}

/**
 * Builds map of Polish public holidays for a year.
 * @param {number} year
 * @returns {object} - { "1-1": "New Year", "1-6": "Epiphany", ... }
 */
function buildHolidays(year) {
  // Fixed-date holidays
  const translate = (key, fallback) => (typeof t === 'function' ? t(key) : fallback);
  const holidays = {
    '1-1': translate('holidayNewYear', 'Nowy Rok'),
    '1-6': translate('holidayEpiphany', 'Trzech Króli'),
    '5-1': translate('holidayLabor', 'Święto Pracy'),
    '5-3': translate('holidayConstitution', 'Święto Konstytucji'),
    '8-15': translate('holidayAssumption', 'Wniebowzięcie NMP'),
    '11-1': translate('holidayAllSaints', 'Wszystkich Świętych'),
    '11-11': translate('holidayIndependence', 'Święto Niepodległości'),
    '12-25': translate('holidayChristmas1', 'Boże Narodzenie'),
    '12-26': translate('holidayChristmas2', '2. Dzień Bożego Narodzenia'),
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

  holidays[`${easterMonth}-${easterDay}`] = translate('holidayEaster', 'Wielkanoc');

  // Easter Monday — Easter + 1 day
  const easterMondayDate = new Date(year, easterMonth - 1, easterDay + 1);
  holidays[`${easterMondayDate.getMonth() + 1}-${easterMondayDate.getDate()}`] =
    translate('holidayEasterMonday', 'Poniedziałek Wielkanocny');

  // Pentecost — Easter + 49 days
  const pentecostDate = new Date(year, easterMonth - 1, easterDay + 49);
  holidays[`${pentecostDate.getMonth() + 1}-${pentecostDate.getDate()}`] =
    translate('holidayPentecost', 'Zesłanie Ducha Świętego');

  // Corpus Christi — Easter + 60 days
  const corpusDate = new Date(year, easterMonth - 1, easterDay + 60);
  holidays[`${corpusDate.getMonth() + 1}-${corpusDate.getDate()}`] =
    translate('holidayCorpus', 'Boże Ciało');

  return holidays;
}


// Node.js exports (for isolated logic tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildHolidays,
    shiftHours,
    isWolne,
    escapeHtml,
    daysInMonthCal,
    formatTimeRange,
    formatClockTime,
    formatDurationHours,
    formatDurationHoursI18n,
  };
}
