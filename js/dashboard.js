/* ================================================================
   GRAFIK GILLETTE — Moduł 5: DASHBOARD
   ================================================================ */

function renderDashboard() {
  const dv = document.getElementById('dashboardView');
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth() + 1, d = today.getDate();
  const limit = getVacationLimit(selectedShift);
  const yHolidays = buildHolidays(y);
  const shiftCode = getShiftAtWithPending(y, m, d, selectedShift);
  const onUrlop = isUrlop(y, m, d, selectedShift);
  const dayName = dayNamesFull[today.getDay()];
  const holidayName = yHolidays[m+'-'+d];

  let todayCard = '';
  let cardCls = '';
  if (onUrlop) {
    cardCls = 'card-U';
    todayCard = `
      <div class="dtc-label">${t('todayLabel')}</div>
      <div class="dtc-shift">🌴 ${t('infoUrlop')}</div>
      <div class="dtc-time">${t('vacation')}</div>
    `;
  } else if (isWolne(shiftCode)) {
    cardCls = 'card-W';
    todayCard = `
      <div class="dtc-label">${t('todayLabel')}</div>
      <div class="dtc-shift">${t('infoFree')}</div>
      <div class="dtc-time">${t('dayOff')}</div>
    `;
  } else {
    cardCls = 'card-' + shiftCode;
    const [sh, eh] = shiftHours[shiftCode];
    let startTxt = `${String(sh).padStart(2,'0')}:00`;
    let endTxt = `${String(eh % 24).padStart(2,'0')}:00`;
    const timer = getLiveTimer(shiftCode, y, m, d);

    // Nadgodziny - faktyczny czas
    const otToday = getOvertimes(y, m, d, selectedShift);
    let otInfo = '';
    if (otToday.przed || otToday.po) {
      const actualTime = getActualWorkTime(y, m, d, selectedShift, shiftCode);
      const parts = [];
      if (otToday.przed) {
        const cat = categorizeOvertime(y, m, d, shiftCode, 'przed', otToday.przed.hours);
        const dom = cat.h200 > 0 ? '+200%' : cat.h100 > 0 ? '+100%' : '+50%';
        parts.push(`⬅ ${otToday.przed.hours}h ${dom}`);
      }
      if (otToday.po) {
        const cat = categorizeOvertime(y, m, d, shiftCode, 'po', otToday.po.hours);
        const dom = cat.h200 > 0 ? '+200%' : cat.h100 > 0 ? '+100%' : '+50%';
        parts.push(`${otToday.po.hours}h ${dom} ➡`);
      }
      otInfo = `<div style="margin-top:8px; padding:8px 12px; background:rgba(0,0,0,0.35); border-radius:8px; font-size:13px; font-weight:600; color:#fff;">⏱ ${t('infoOvertime')}: ${parts.join(' · ')}<br><span style="font-size:12px; font-weight:700; color:#fff;">${t('infoTime')} ${actualTime}</span></div>`;
    }

    todayCard = `
      <div class="dtc-label">${t('todayLabel')} ${holidayName ? '· 🎉 ' + holidayName : ''}</div>
      <div class="dtc-shift">${shiftEmoji[shiftCode]} ${shiftFullName[shiftCode].split(' ')[0]}</div>
      <div class="dtc-time">${startTxt} – ${endTxt}</div>
      ${otInfo}
      ${timer ? `<div class="dtc-timer">${timer}</div>` : ''}
    `;
  }

  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const tY = tomorrow.getFullYear(), tM = tomorrow.getMonth()+1, tD = tomorrow.getDate();
  const tShift = getShiftAtWithPending(tY, tM, tD, selectedShift);
  const tOnU = isUrlop(tY, tM, tD, selectedShift);
  let tomorrowShift;
  if (tOnU) {
    tomorrowShift = `🌴 ${t('vacation')}`;
  } else if (isWolne(tShift)) {
    tomorrowShift = `🏖️ ${t('free')}`;
  } else {
    const [sh, eh] = shiftHours[tShift];
    const timeRange = `${String(sh).padStart(2,'0')}-${String(eh % 24).padStart(2,'0')}`;
    // Nadgodziny na jutro
    const otTomorrow = getOvertimes(tY, tM, tD, selectedShift);
    let otIcon = '';
    if (otTomorrow.przed || otTomorrow.po) {
      const actualTime = getActualWorkTime(tY, tM, tD, selectedShift, tShift);
      otIcon = ` <span style="color:#f1c40f;" title="${t('infoOvertime')}">⏱</span> <small style="color:var(--text-muted);">${actualTime}</small>`;
    } else {
      otIcon = ` <small>(${timeRange})</small>`;
    }
    tomorrowShift = `${shiftEmoji[tShift]} ${shiftLongNames[tShift]}${otIcon}`;
  }

  const wolneInfo = daysToNextWolne(y, m, d, selectedShift);
  let nextWolneTxt;
  if (!wolneInfo) nextWolneTxt = t('unknown');
  else if (wolneInfo.days === 0) nextWolneTxt = `🏖️ ${t('todayLabel')}!`;
  else if (wolneInfo.days === 1) nextWolneTxt = `${t('tomorrow')} (${wolneInfo.day} ${monthNamesShort[wolneInfo.month-1]})`;
  else nextWolneTxt = `${t('inDays', { n: wolneInfo.days })} (${wolneInfo.day} ${monthNamesShort[wolneInfo.month-1]})`;

  const weekCounts = { R: 0, P: 0, N: 0, W: 0, U: 0 };
  const weekOT = { h50: 0, h100: 0, h200: 0 };
  const dow = today.getDay();
  const daysToMon = (dow === 0 ? 6 : dow - 1);
  const monday = new Date(today); monday.setDate(d - daysToMon);
  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday); dt.setDate(monday.getDate() + i);
    const yy = dt.getFullYear(), mm = dt.getMonth()+1, dd = dt.getDate();
    if (isUrlop(yy, mm, dd, selectedShift)) { weekCounts.U++; continue; }
    const s = getShiftAtWithPending(yy, mm, dd, selectedShift);
    weekCounts[isWolne(s) ? 'W' : s]++;

    // Nadgodziny tygodnia
    if (!isWolne(s)) {
      const otW = getOvertimes(yy, mm, dd, selectedShift);
      ['przed', 'po'].forEach(pos => {
        if (otW[pos]) {
          const cat = categorizeOvertime(yy, mm, dd, s, pos, otW[pos].hours);
          weekOT.h50 += cat.h50;
          weekOT.h100 += cat.h100;
          weekOT.h200 += cat.h200;
        }
      });
    }
  }
  const weekScheduledHours = (weekCounts.R + weekCounts.P + weekCounts.N) * 8;
  const weekOTTotal = weekOT.h50 + weekOT.h100 + weekOT.h200;
  const weekHours = weekScheduledHours + weekOTTotal;

  const usedUrlop = countWorkingUrlops(y, selectedShift);

  const otMonthSum = getMonthOvertimeSummary(y, m, selectedShift);
  const totalOT = otMonthSum.h50 + otMonthSum.h100 + otMonthSum.h200;

  let upcomingHtml = '';
  for (let i = 1; i <= 7; i++) {
    const dt = new Date(today);
    dt.setDate(today.getDate() + i);
    const yy = dt.getFullYear(), mm = dt.getMonth()+1, dd = dt.getDate();
    const s = getShiftAtWithPending(yy, mm, dd, selectedShift);
    const onU = isUrlop(yy, mm, dd, selectedShift);
    const cls = onU ? 'U' : (isWolne(s) ? 'W' : s);
    const label = onU ? '🌴' : (isWolne(s) ? '—' : shiftEmoji[s] + ' ' + s);
    // Znacznik nadgodzin
    const otChip = getOvertimes(yy, mm, dd, selectedShift);
    const hasOT = (otChip.przed || otChip.po) && !isWolne(s) && !onU;
    const otBadge = hasOT ? '<span class="ddc-ot">⏱</span>' : '';
    upcomingHtml += `
      <div class="dash-day-chip chip-${cls}" onclick="jumpToDate(${yy},${mm},${dd})">
        <div class="ddc-day">${dayNames[(dt.getDay()+6)%7]}</div>
        <div class="ddc-date">${dd}</div>
        <div class="ddc-shift">${label}</div>
        ${otBadge}
      </div>
    `;
  }

  dv.innerHTML = `
    <div class="dash-hero">
      <div class="dash-greeting">${t('greeting')}</div>
      <div class="dash-date">${dayName}, ${d} ${monthNames[m-1]} ${y}</div>
      <div class="dash-brigade">${t('brigade')} ${selectedShift}</div>
    </div>

    <div class="dash-today-card ${cardCls}">
      ${todayCard}
    </div>

    <div class="dash-stats">
      <div class="dash-stat-card">
        <div class="dsc-icon">📅</div>
        <div class="dsc-info">
          <div class="dsc-label">${t('tomorrow')}</div>
          <div class="dsc-value">${tomorrowShift}</div>
        </div>
      </div>
      <div class="dash-stat-card">
        <div class="dsc-icon">🏖️</div>
        <div class="dsc-info">
          <div class="dsc-label">${t('nextDayOff')}</div>
          <div class="dsc-value">${nextWolneTxt}</div>
        </div>
      </div>
      <div class="dash-stat-card">
        <div class="dsc-icon">📊</div>
        <div class="dsc-info">
          <div class="dsc-label">${t('thisWeek')}</div>
          <div class="dsc-value">${weekHours}h${weekOTTotal > 0 ? ` <small style="color:#f1c40f;">(+${weekOTTotal}h ⏱)</small>` : ''} · ${weekCounts.R}🌅 ${weekCounts.P}🌤️ ${weekCounts.N}🌙</div>
        </div>
      </div>
      <div class="dash-stat-card">
        <div class="dsc-icon">🌴</div>
        <div class="dsc-info">
          <div class="dsc-label">${t('vacation')} ${y}</div>
          <div class="dsc-value">${usedUrlop} / ${limit} ${t('dayOff')}</div>
        </div>
      </div>
      ${totalOT > 0 ? `
      <div class="dash-stat-card" style="border:2px solid #f1c40f;">
        <div class="dsc-icon">⏱</div>
        <div class="dsc-info">
          <div class="dsc-label">${t('infoOvertime')} (${monthNamesShort[m-1]})</div>
          <div class="dsc-value">${totalOT}h <small>(${otMonthSum.h50}+${otMonthSum.h100}+${otMonthSum.h200})</small></div>
        </div>
      </div>` : ''}
    </div>

    <div class="dash-upcoming">
      <h4>📆 ${t('upcomingDays')}</h4>
      <div class="dash-upcoming-list">${upcomingHtml}</div>
    </div>

    <div class="dash-cta">
      <button class="btn-primary" onclick="switchView('month')">📅 ${t('seeMonth')}</button>
      <button class="btn-secondary" onclick="switchView('week')">📆 ${t('seeWeek')}</button>
    </div>
  `;
}

function jumpToDate(y, m, d) {
  currentYear = y;
  currentMonth = m;
  selectedDay = d;
  switchView('month');
}
window.jumpToDate = jumpToDate;

function getLiveTimer(shift, y, m, d) {
  const now = new Date();
  if (now.getFullYear() !== y || now.getMonth()+1 !== m || now.getDate() !== d) return null;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let startMin, endMin;

  const ot = getOvertimes(y, m, d, selectedShift);

  if (shift === 'R') { startMin = 6*60; endMin = 14*60; }
  else if (shift === 'P') { startMin = 14*60; endMin = 22*60; }
  else if (shift === 'N') {
    startMin = 22*60; endMin = 30*60;
    if (nowMinutes < 6*60) {
      // Jeśli jesteśmy po północy, sprawdzamy nadgodziny z "wczorajszej" zmiany N
      // Ale renderDashboard/getLiveTimer są wywoływane dla konkretnej daty y,m,d (dzisiaj).
      // System przechowuje nadgodziny zmiany N na dniu, w którym się zaczęła.
      // Więc jeśli nowMinutes < 6*60, to jesteśmy w fazie końcowej zmiany N z dnia y,m,d-1?
      // Nie, bo wywołanie jest dla daty y,m,d.
      // W obecnej architekturze, jeśli dzisiaj (d) jest N, to o 2:00 rano (d)
      // pokazywany jest koniec zmiany N, która zaczęła się dnia d-1.
      // Ale getOvertimes(y,m,d) pobierze OT dla zmiany, która zacznie się o 22:00 DZISIAJ.
      // To jest szerszy problem z nocną zmianą, ale skupmy się najpierw na P/R i ogólnym poprawieniu endMin.
    }
  } else return null;

  if (ot.przed) startMin -= ot.przed.hours * 60;
  if (ot.po) endMin += ot.po.hours * 60;

  if (shift === 'N' && nowMinutes < 6*60) {
    // Specyficzna obsługa dla N po północy - używamy wczorajszych nadgodzin
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    const yOT = getOvertimes(yesterday.getFullYear(), yesterday.getMonth()+1, yesterday.getDate(), selectedShift);
    let yEndMin = 6*60;
    if (yOT.po) yEndMin += yOT.po.hours * 60;
    if (nowMinutes < yEndMin) {
      const rem = yEndMin - nowMinutes;
      return t('timerEndsIn', { h: Math.floor(rem/60), m: rem%60 });
    }
    return null;
  }

  if (nowMinutes >= startMin && nowMinutes < endMin) {
    const rem = endMin - nowMinutes;
    return t('timerEndsIn', { h: Math.floor(rem/60), m: rem%60 });
  }
  if (nowMinutes < startMin && (startMin - nowMinutes) <= 60) {
    return t('timerStartsIn', { m: startMin - nowMinutes });
  }
  return null;
}
