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

  // === Compact flow: prev → today → next → tomorrow (no full cycle) ===
  let reliefFlowCard = '';
  if (!isWolne(shiftCode) && !onUrlop && typeof tlRenderNode === 'function') {
    const info = getRelief(y, m, d, selectedShift, shiftCode);
    const nodes = [];
    // 1) Who we take over from
    if (info && info.prevBrig) {
      const prevLabel =
        typeof tlFormatWhen === 'function'
          ? tlFormatWhen(info.prevYear, info.prevMonth, info.prevDay, y, m, d)
          : '';
      nodes.push(
        tlRenderNode({
          brig: info.prevBrig,
          shift: info.prevType || null,
          label: prevLabel,
        })
      );
    } else {
      nodes.push(tlRenderNode({ type: 'empty', label: '' }));
    }
    nodes.push(typeof tlRenderArrow === 'function' ? tlRenderArrow() : '<span class="tl-arrow">→</span>');
    // 2) Today (self)
    nodes.push(
      tlRenderNode({
        type: 'self',
        brig: String(d),
        shift: shiftCode,
        label: typeof t === 'function' ? t('tlToday') : 'сьогодні',
        isSelf: true,
      })
    );
    nodes.push(typeof tlRenderArrow === 'function' ? tlRenderArrow() : '<span class="tl-arrow">→</span>');
    // 3) Who takes over from us
    if (info && info.nextBrig) {
      const nextLabel =
        typeof tlFormatWhen === 'function'
          ? tlFormatWhen(info.nextYear, info.nextMonth, info.nextDay, y, m, d)
          : '';
      nodes.push(
        tlRenderNode({
          brig: info.nextBrig,
          shift: info.nextType || null,
          label: nextLabel,
        })
      );
    } else {
      nodes.push(tlRenderNode({ type: 'empty', label: '' }));
    }
    nodes.push(typeof tlRenderArrow === 'function' ? tlRenderArrow() : '<span class="tl-arrow">→</span>');
    // 4) Own shift tomorrow
    const tom = new Date(today);
    tom.setDate(today.getDate() + 1);
    const ty = tom.getFullYear(),
      tm = tom.getMonth() + 1,
      td = tom.getDate();
    let tShift, tUrlop;
    if (hidePrivate) {
      tShift =
        factorySchedule[ty] && factorySchedule[ty][tm] && factorySchedule[ty][tm][selectedShift]
          ? factorySchedule[ty][tm][selectedShift][td - 1]
          : '';
      tUrlop = false;
    } else {
      tShift = getShiftAtWithPending(ty, tm, td, selectedShift);
      tUrlop = isUrlop(ty, tm, td, selectedShift);
    }
    const tomLabel = typeof t === 'function' ? t('tlTomorrow') : 'завтра';
    if (tUrlop) {
      nodes.push(tlRenderNode({ type: 'free', label: tomLabel, brig: '🌴' }));
    } else if (isWolne(tShift)) {
      nodes.push(tlRenderNode({ type: 'free', label: tomLabel }));
    } else {
      nodes.push(
        tlRenderNode({
          brig: String(td),
          shift: tShift,
          label: tomLabel,
        })
      );
    }
    reliefFlowCard = `
      <div class="info-card flow-segment-card" style="grid-column:1/-1;">
        <div class="label">🔄 ${t('reliefFlowTitle')}</div>
        <div class="value"><div class="timeline-widget">${nodes.join('')}</div></div>
      </div>`;
  }

  let todayCard = '';
  let cardCls = '';
  if (onUrlop) {
    cardCls = 'card-U';
    todayCard = `
      <div class="dtc-meta">${dayName}, ${d} ${monthNamesGenitive[m - 1]} ${y} · ${t('brigade')} ${selectedShift}</div>
      <div class="dtc-label">${t('todayLabel')}</div>
      <div class="dtc-shift">🌴 ${t('infoUrlop')}</div>
    `;
  } else if (isWolne(shiftCode)) {
    cardCls = 'card-W';
    todayCard = `
    <div class="dtc-meta">${dayName}, ${d} ${monthNamesGenitive[m - 1]} ${y} · ${t('brigade')} ${selectedShift}</div>
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
      <div class="dtc-meta">${dayName}, ${d} ${monthNamesGenitive[m - 1]} ${y} · ${t('brigade')} ${selectedShift}</div>
      <div class="dtc-label">${t('todayLabel')} ${holidayName ? '· 🎉 ' + holidayName : ''}</div>
      <div class="dtc-shift">${shiftEmoji[shiftCode]} ${shiftFullName[shiftCode].split(' ')[0]}</div>
      <div class="dtc-time">${startTxt} – ${endTxt}</div>
      ${otInfo}
      ${timer ? `<div class="dtc-timer">${timer}</div>` : ''}
    `;
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
    const label = onU ? '🌴' : isWolne(s) ? '🏖' : s;
    let otBadge = '';
    if (!hidePrivate) {
      const otChip = getOvertimes(yy, mm, dd, selectedShift);
      const hasOT = (otChip.przed || otChip.po) && !isWolne(s) && !onU;
      otBadge = hasOT ? '<span class="ddc-ot">⏱</span>' : '';
    }
    upcomingHtml += `
      <div class="dash-day-chip chip-${cls}" onclick="jumpToDate(${yy},${mm},${dd})">
        <div class="ddc-day">${String(dayNames[(dt.getDay() + 6) % 7] || '').slice(0, 2)}</div>
        <div class="ddc-date">${dd}</div>
        <div class="ddc-shift">${label}</div>
        ${otBadge}
      </div>
    `;
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
    <div class="dash-today-card ${cardCls}">
      ${todayCard}
    </div>

    ${reliefFlowCard ? `<div class="dash-flow-wrap">${reliefFlowCard}</div>` : ''}

    <div class="dash-upcoming">
      <h4>${t('upcomingDays')}</h4>
      <div class="dash-upcoming-list">${upcomingHtml}</div>
    </div>

    <div class="dash-stats">
      ${overtimeCard}
      ${vacationCard}
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
