/* ================================================================
   GRAFIK GILLETTE — Testy jednostkowe dla logiki nadgodzin i świąt
   Uruchamianie: node tools/test_core.js
   ================================================================ */

const { easter, categorizeOvertime } = require('../js/overtime-logic.js');

let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    failedTests++;
  }
}

// 1. TESTY easter(year)
runTest('easter(year) for historical years', () => {
  const cases = [
    { year: 2024, month: 3, day: 31 },
    { year: 2025, month: 4, day: 20 },
    { year: 2026, month: 4, day: 5 },
    { year: 2027, month: 3, day: 28 },
    { year: 2028, month: 4, day: 16 }
  ];

  cases.forEach(c => {
    const res = easter(c.year);
    if (res.month !== c.month || res.day !== c.day) {
      throw new Error(`Dla roku ${c.year} oczekiwano ${c.day}.${c.month}, otrzymano ${res.day}.${res.month}`);
    }
  });
});

// 2. TESTY categorizeOvertime()
runTest('categorizeOvertime - zwykły dzień roboczy, R po 2h', () => {
  // Zmiana R (6:00-14:00), overtime "po" 2h (czyli 14:00-16:00).
  // This is a regular day, so daytime hours should go to h50.
  const res = categorizeOvertime(2026, 1, 12, 'R', 'po', 2); // 12 stycznia 2026 (Poniedziałek)
  if (res.h50 !== 2 || res.h100 !== 0 || res.h200 !== 0) {
    throw new Error(`Oczekiwano h50:2, h100:0, h200:0. Otrzymano h50:${res.h50}, h100:${res.h100}, h200:${res.h200}`);
  }
});

runTest('categorizeOvertime - nocne godziny (22:00-06:00)', () => {
  // Shift N (22:00-6:00), overtime "after" 2h (i.e. 6:00-8:00) -> these are daytime hours (6:00-8:00), should go to h50
  // Shift P (14:00-22:00), overtime "after" 2h (i.e. 22:00-24:00) -> these are night hours, should go to h100
  const resP = categorizeOvertime(2026, 1, 12, 'P', 'po', 2);
  if (resP.h50 !== 0 || resP.h100 !== 2 || resP.h200 !== 0) {
    throw new Error(`Oczekiwano h50:0, h100:2, h200:0. Otrzymano h50:${resP.h50}, h100:${resP.h100}, h200:${resP.h200}`);
  }
});

runTest('categorizeOvertime - Niedziela (h100)', () => {
  // January 11, 2026 (Sunday). Any overtime on Sunday goes to h100 (unless it's a holiday, then h200)
  const res = categorizeOvertime(2026, 1, 11, 'R', 'po', 2);
  if (res.h50 !== 0 || res.h100 !== 2 || res.h200 !== 0) {
    throw new Error(`Oczekiwano h50:0, h100:2, h200:0. Otrzymano h50:${res.h50}, h100:${res.h100}, h200:${res.h200}`);
  }
});

runTest('categorizeOvertime - Święto (h200)', () => {
  // New Year (January 1, 2026). All overtime goes to h200.
  const res = categorizeOvertime(2026, 1, 1, 'R', 'po', 2);
  if (res.h50 !== 0 || res.h100 !== 0 || res.h200 !== 2) {
    throw new Error(`Oczekiwano h50:0, h100:0, h200:2. Otrzymano h50:${res.h50}, h100:${res.h100}, h200:${res.h200}`);
  }
});

if (failedTests > 0) {
  console.error(`\nTesty zakończone niepowodzeniem. Liczba błędów: ${failedTests}`);
  process.exit(1);
} else {
  console.log('\nWszystkie testy zakończone pomyślnie!');
  process.exit(0);
}
