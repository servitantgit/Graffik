/* ================================================================
   GRAFIK GILLETTE — Moduł Logiki (Prazdniki, Nadgodziny)
   Ten plik zawiera czyste funkcje obliczeniowe, bez zależności od DOM/LS.
   ================================================================ */

const shiftHours = { R: [6, 14], P: [14, 22], N: [22, 30] };

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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { easter, buildHolidays, categorizeOvertime, calcOvertimeTime, shiftHours };
}
