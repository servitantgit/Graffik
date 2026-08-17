/* ================================================================
   GRAFIK GILLETTE — SCHEDULES REGISTRY
   
   PUBLIC MODULE — safe to commit to git
   
   Registry pattern for managing multiple schedule types.
   Currently: only 'gillette' schedule.
   Future: 'office-5x1', 'production-5x3', etc.
   
   Also provides:
   - Backward-compatible aliases: factorySchedule, factoryMonthHours
   - shouldShowPersonalData() — controls visibility of personal data
     (replaces old privacyMode feature)
   ================================================================ */

/* === SCHEDULE REGISTRY === */
/**
 * Central registry of all schedules.
 * Each schedule has: id, name, type, entities, data (per year), hours (per year).
 *
 * Example future entry:
 *   scheduleRegistry['office-5x1'] = {
 *     id: 'office-5x1',
 *     name: 'Biuro 5x1',
 *     type: 'formula',
 *     entityLabel: 'Osoba',
 *     entities: [],
 *     computeShift: (year, month, day, person) => 'R',
 *   };
 */
const scheduleRegistry = {};

/**
 * List of years available for the ACTIVE schedule.
 * Populated by year-data files (e.g. gillette/2026.js).
 */
const AVAILABLE_YEARS = [];

/* === BACKWARD-COMPATIBLE GLOBALS === */
/**
 * These globals allow existing code (core.js, calendar.js, etc.) to work
 * without changes. They point to the currently active schedule's data.
 *
 * When a new schedule is registered, these are updated to point to it.
 * Currently: always points to 'gillette' schedule.
 */
const factorySchedule = {};
const factoryMonthHours = {};

/* === REGISTRATION HELPERS === */

/**
 * Registers a new schedule in the registry.
 * Called by metadata.js files (e.g. gillette/metadata.js).
 *
 * @param {object} scheduleDef - { id, name, type, entityLabel, entities }
 */
function registerSchedule(scheduleDef) {
  if (!scheduleDef || !scheduleDef.id) {
    console.error('[schedules/registry] Invalid schedule definition:', scheduleDef);
    return;
  }

  scheduleRegistry[scheduleDef.id] = {
    ...scheduleDef,
    data: {},
    hours: {},
  };

  console.log(
    '[schedules/registry] Registered schedule: ' + scheduleDef.id + ' (' + scheduleDef.name + ')'
  );
}

/**
 * Registers year data for a schedule.
 * Called by year-data files (e.g. gillette/2026.js).
 *
 * @param {string} scheduleId - which schedule (e.g. 'gillette')
 * @param {number} year - year number
 * @param {object} scheduleData - { 1: {A:[...], B:[...], C:[...], D:[...]}, ... 12: {...} }
 * @param {object} hoursData - { 1: {A:168, B:184, ...}, ... 12: {...} }
 */
function registerYearData(scheduleId, year, scheduleData, hoursData) {
  const schedule = scheduleRegistry[scheduleId];
  if (!schedule) {
    console.error(
      '[schedules/registry] Cannot register year ' +
        year +
        ': schedule "' +
        scheduleId +
        '" not found. Register schedule first via registerSchedule().'
    );
    return;
  }

  schedule.data[year] = scheduleData;
  schedule.hours[year] = hoursData;

  // Update AVAILABLE_YEARS
  if (!AVAILABLE_YEARS.includes(year)) {
    AVAILABLE_YEARS.push(year);
    AVAILABLE_YEARS.sort();
  }

  // Update backward-compat aliases (for gillette = active schedule)
  if (scheduleId === 'gillette') {
    factorySchedule[year] = scheduleData;
    factoryMonthHours[year] = hoursData;
  }

  console.log(
    '[schedules/registry] Registered year data: ' +
      scheduleId +
      '/' +
      year +
      ' (' +
      Object.keys(scheduleData).length +
      ' months)'
  );
}

/* === PERSONAL DATA VISIBILITY === */

/**
 * Determines whether personal data should be shown.
 *
 * Rule: Personal data visible ONLY when user is logged in to Google Drive.
 * When logged out — user sees only public factory schedule.
 *
 * This REPLACES the old privacyMode feature — login state IS the privacy control.
 *
 * @returns {boolean}
 */
function shouldShowPersonalData() {
  // Check if Google Drive login is active
  return typeof isDriveTokenValid === 'function' && isDriveTokenValid();
}

/* === EXPOSE TO GLOBAL SCOPE === */
window.scheduleRegistry = scheduleRegistry;
window.AVAILABLE_YEARS = AVAILABLE_YEARS;
window.registerSchedule = registerSchedule;
window.registerYearData = registerYearData;
window.shouldShowPersonalData = shouldShowPersonalData;
