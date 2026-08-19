/* ================================================================
   GRAFIK GILLETTE — Module 5: DASHBOARD
   ================================================================ */

function renderDashboard() {
  const dv = document.getElementById('dashboardView');
  const today = new Date();
  const y = today.getFullYear(),
    m = today.getMonth() + 1,
    d = today.getDate();
  const limit = getVacationLimit(selectedShift);
  const yHolidays = buildHolidays(y);
  const hidePrivate = !shouldShowPersonalData();

  // When not logged in — use pure factory schedule, no personal overrides
  let shiftCode, onUrlop;
  if (hidePrivate) {
    shiftCode =
      factorySchedule[y] && factorySchedule[y][m] && factorySchedule[y][m][selectedShift]
        ? factorySchedule[y][m][selectedShift][d - 1]
        : '';
    onUrlop = false;
  } else {
    shiftCode = getShiftAtWithPending(y, m, d, selectedShift);
    onUrlop = isUrlop(y, m, d, selectedShift);
  }

  const dayName = dayNamesFull[today.getDay()];
  const holidayName = yHolidays[m + '-' + d];

  // === Shift handoff flow (first item when working day) ===
  let reliefFlowCard = '';
  if (!isWolne(shiftCode) && !onUrlop && typeof renderReliefTimeline === 'function') {
    const info = getRelief(y, m, d, selectedShift, shiftCode);
    let timelineOt = null;
    if (!hidePrivate) {
      const otRaw = getOvertimes(y, m, d, selectedShift);
      const mk = (pos) => {
        if (!otRaw[pos]) return null;
        const cat = categorizeOvertime(y, m, d, shiftCode, pos, otRaw[pos].hours);
        const percent = cat.h200 > 0 ? 200 : cat.h100 > 0 ? 100 : 50;
        return { hours: otRaw[pos].hours, percent };
      };
      const before = mk('przed');
      const after = mk('po');
      if (before || after) timelineOt = { before, after };
    }
    const timelineHtml = renderReliefTimeline(
      info,
      y,
      m,
      d,
      shiftCode,
      selectedShift,
      timelineOt
    );
    reliefFlowCard = `
      <div class="dash-stat-card" style="grid-column:1/-1;">
        <div class="dsc-info" style="width:100%;">
          <div class="dsc-label">🔄 ${t('reliefFlowTitle')}</div>
          <div class="dsc-value" style="font-weight:normal;">${timelineHtml}</div>
        </div>
      </div>`;
  }

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
  `;
  } else {
    cardCls = 'card-' + shiftCode;
    const [sh, eh] = shiftHours[shiftCode];
    let startTxt = `${String(sh).padStart(2, '0')}:00`;
    let endTxt = `${String(eh % 24).padStart(2, '0')}:00`;
    const timer = hidePrivate ? null : getLiveTimer(shiftCode, y, m, d);

    // Nadgodziny - tylko gdy zalogowany
    let otInfo = '';
    if (!hidePrivate) {
      const otToday = getOvertimes(y, m, d, selectedShift);
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
    }

    todayCard = `
      <div class="dtc-label">${t('todayLabel')} ${holidayName ? '· 🎉 ' + holidayName : ''}</div>
      <div class="dtc-shift">${shiftEmoji[shiftCode]} ${shiftFullName[shiftCode].split(' ')[0]}</div>
      <div class="dtc-time">${startTxt} – ${endTxt}</div>
      ${otInfo}
      ${timer ? `<div class="dtc-timer">${timer}</div>` : ''}
    `;
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tY = tomorrow.getFullYear(),
    tM = tomorrow.getMonth() + 1,
    tD = tomorrow.getDate();

  let tShift, tOnU;
  if (hidePrivate) {
    tShift =
      factorySchedule[tY] && factorySchedule[tY][tM] && factorySchedule[tY][tM][selectedShift]
        ? factorySchedule[tY][tM][selectedShift][tD - 1]
        : '';
    tOnU = false;
  } else {
    tShift = getShiftAtWithPending(tY, tM, tD, selectedShift);
    tOnU = isUrlop(tY, tM, tD, selectedShift);
  }

  let tomorrowShift;
  if (tOnU) {
    tomorrowShift = `🌴 ${t('vacation')}`;
  } else if (isWolne(tShift)) {
    tomorrowShift = `🏖️ ${t('free')}`;
  } else {
    const [sh, eh] = shiftHours[tShift];
    const timeRange = `${String(sh).padStart(2, '0')}-${String(eh % 24).padStart(2, '0')}`;
    let otIcon = '';
    if (!hidePrivate) {
      const otTomorrow = getOvertimes(tY, tM, tD, selectedShift);
      if (otTomorrow.przed || otTomorrow.po) {
        const actualTime = getActualWorkTime(tY, tM, tD, selectedShift, tShift);
        otIcon = ` <span style="color:#f1c40f;" title="${t('infoOvertime')}">⏱</span> <small style="color:var(--text-muted);">${actualTime}</small>`;
      } else {
        otIcon = ` <small>(${timeRange})</small>`;
      }
    } else {
      otIcon = ` <small>(${timeRange})</small>`;
    }
    tomorrowShift = `${shiftEmoji[tShift]} ${shiftLongNames[tShift]}${otIcon}`;
  }

  // Next day off — for privacy mode use factory schedule only
  let nextWolneTxt;
  if (hidePrivate) {
    let found = null;
    for (let i = 0; i < 60; i++) {
      const dt = new Date(today);
      dt.setDate(d + i);
      const yy = dt.getFullYear(),
        mm = dt.getMonth() + 1,
        dd = dt.getDate();
      const s =
        factorySchedule[yy] && factorySchedule[yy][mm] && factorySchedule[yy][mm][selectedShift]
          ? factorySchedule[yy][mm][selectedShift][dd - 1]
          : '';
      if (isWolne(s)) {
        found = { days: i, day: dd, month: mm };
        break;
      }
    }
    if (!found) nextWolneTxt = t('unknown');
    else if (found.days === 0) nextWolneTxt = `🏖️ ${t('todayLabel')}!`;
    else if (found.days === 1)
      nextWolneTxt = `${t('tomorrow')} (${found.day} ${monthNamesGenitive[found.month - 1]})`;
    else
      nextWolneTxt = `${t('inDays', { n: found.days })} (${found.day} ${monthNamesGenitive[found.month - 1]})`;
  } else {
    const wolneInfo = daysToNextWolne(y, m, d, selectedShift);
    if (!wolneInfo) nextWolneTxt = t('unknown');
    else if (wolneInfo.days === 0) nextWolneTxt = `🏖️ ${t('todayLabel')}!`;
    else if (wolneInfo.days === 1)
      nextWolneTxt = `${t('tomorrow')} (${wolneInfo.day} ${monthNamesGenitive[wolneInfo.month - 1]})`;
    else
      nextWolneTxt = `${t('inDays', { n: wolneInfo.days })} (${wolneInfo.day} ${monthNamesGenitive[wolneInfo.month - 1]})`;
  }

  const usedUrlop = hidePrivate ? 0 : countWorkingUrlops(y, selectedShift);

  const otMonthSum = hidePrivate
    ? { h50: 0, h100: 0, h200: 0 }
    : getMonthOvertimeSummary(y, m, selectedShift);
  const totalOT = otMonthSum.h50 + otMonthSum.h100 + otMonthSum.h200;

  let upcomingHtml = '';
  for (let i = 1; i <= 7; i++) {
    const dt = new Date(today);
    dt.setDate(today.getDate() + i);
    const yy = dt.getFullYear(),
      mm = dt.getMonth() + 1,
      dd = dt.getDate();

    let s, onU;
    if (hidePrivate) {
      s =
        factorySchedule[yy] && factorySchedule[yy][mm] && factorySchedule[yy][mm][selectedShift]
          ? factorySchedule[yy][mm][selectedShift][dd - 1]
          : '';
      onU = false;
    } else {
      s = getShiftAtWithPending(yy, mm, dd, selectedShift);
      onU = isUrlop(yy, mm, dd, selectedShift);
    }

    const cls = onU ? 'U' : isWolne(s) ? 'W' : s;
    const label = onU ? '🌴' : isWolne(s) ? '—' : shiftEmoji[s] + ' ' + s;
    let otBadge = '';
    if (!hidePrivate) {
      const otChip = getOvertimes(yy, mm, dd, selectedShift);
      const hasOT = (otChip.przed || otChip.po) && !isWolne(s) && !onU;
      otBadge = hasOT ? '<span class="ddc-ot">⏱</span>' : '';
    }
    upcomingHtml += `
      <div class="dash-day-chip chip-${cls}" onclick="jumpToDate(${yy},${mm},${dd})">
        <div class="ddc-day">${dayNames[(dt.getDay() + 6) % 7]}</div>
        <div class="ddc-date">${dd}</div>
        <div class="ddc-shift">${label}</div>
        ${otBadge}
      </div>
    `;
  }

  // Note for today — tylko kiedy zalogowany
  let greetingContent;
  if (hidePrivate) {
    greetingContent = `<div class="dash-greeting">${t('greeting')}</div>`;
  } else {
    const todayNoteKey = `${y}-${m}-${d}-${selectedShift}`;
    const todayNote = notes[todayNoteKey];
    greetingContent = todayNote
      ? `<div class="dash-greeting" style="font-style: italic; opacity: 1;">📝 ${escapeHtml(todayNote)}</div>`
      : `<div class="dash-greeting">${t('greeting')}</div>`;
  }

  const vacationCard = hidePrivate
    ? ''
    : `
      <div class="dash-stat-card dash-vacation-stats">
        <div class="dsc-icon">🌴</div>
        <div class="dsc-info">
          <div class="dsc-label">${t('vacation')} ${y}</div>
          <div class="dsc-value">${usedUrlop} / ${limit} ${t('dayOff')}</div>
        </div>
      </div>`;

  const overtimeCard =
    !hidePrivate && totalOT > 0
      ? `
      <div class="dash-stat-card dash-overtime-summary" style="border:2px solid #f1c40f;">
        <div class="dsc-icon">⏱</div>
        <div class="dsc-info">
          <div class="dsc-label">${t('infoOvertime')} (${monthNamesShort[m - 1]})</div>
          <div class="dsc-value">${totalOT}h <small>(${otMonthSum.h50}+${otMonthSum.h100}+${otMonthSum.h200})</small></div>
        </div>
      </div>`
      : '';

  dv.innerHTML = `
    <div class="dash-hero">
      ${greetingContent}
      <div class="dash-date">${dayName}, ${d} ${monthNamesGenitive[m - 1]} ${y}</div>
      <div class="dash-brigade">${t('brigade')} ${selectedShift}</div>
    </div>

    ${reliefFlowCard ? `<div class="dash-stats" style="margin-bottom:12px;">${reliefFlowCard}</div>` : ''}

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
      ${vacationCard}
      ${overtimeCard}
    </div>

    <div class="dash-upcoming">
      <h4>${t('upcomingDays')}</h4>
      <div class="dash-upcoming-list">${upcomingHtml}</div>
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
  // Live timer shows personal overtime adjustments — only when logged in
  if (!shouldShowPersonalData()) return null;

  const now = new Date();
  if (now.getFullYear() !== y || now.getMonth() + 1 !== m || now.getDate() !== d) return null;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // === SPECIAL CASE: night shift past midnight ===
  if (nowMinutes < 6 * 60) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yY = yesterday.getFullYear();
    const yM = yesterday.getMonth() + 1;
    const yD = yesterday.getDate();
    const yShift = getShiftAt(yY, yM, yD, selectedShift);

    if (yShift === 'N' && !isUrlop(yY, yM, yD, selectedShift)) {
      const yOT = getOvertimes(yY, yM, yD, selectedShift);
      let yEndMin = 6 * 60; // 06:00
      if (yOT.po) yEndMin += yOT.po.hours * 60;

      if (nowMinutes < yEndMin) {
        const rem = yEndMin - nowMinutes;
        return t('timerNightEndsIn', { h: Math.floor(rem / 60), m: rem % 60 });
      }
    }
  }

  // === NORMAL LOGIC: shift starts/is ongoing today ===
  if (!shift || isWolne(shift)) return null;

  let startMin, endMin;
  const ot = getOvertimes(y, m, d, selectedShift);

  if (shift === 'R') {
    startMin = 6 * 60;
    endMin = 14 * 60;
  } else if (shift === 'P') {
    startMin = 14 * 60;
    endMin = 22 * 60;
  } else if (shift === 'N') {
    startMin = 22 * 60;
    endMin = 30 * 60;
  } else return null;

  if (ot.przed) startMin -= ot.przed.hours * 60;
  if (ot.po) endMin += ot.po.hours * 60;

  if (nowMinutes >= startMin && nowMinutes < endMin) {
    const rem = endMin - nowMinutes;
    return t('timerEndsIn', { h: Math.floor(rem / 60), m: rem % 60 });
  }

  if (nowMinutes < startMin && startMin - nowMinutes <= 60) {
    return t('timerStartsIn', { m: startMin - nowMinutes });
  }

  return null;
}
