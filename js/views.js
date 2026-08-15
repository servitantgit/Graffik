/* ================================================================
   GRAFIK GILLETTE — Moduł 7: WIDOKI (TYDZIEŃ, ROK, TABELA)
   ================================================================ */

let weekStartDate = null;

/* === WEEK VIEW === */
function ensureWeekStart() {
  if (!weekStartDate) {
    const t2 = new Date();
    const dow = t2.getDay();
    const daysToMon = dow === 0 ? 6 : dow - 1;
    weekStartDate = new Date(t2);
    weekStartDate.setDate(t2.getDate() - daysToMon);
    weekStartDate.setHours(0, 0, 0, 0);
  }
}
function renderWeekView() {
  ensureWeekStart();
  const grid = document.getElementById('weekViewGrid');
  grid.innerHTML = '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(weekStartDate);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const rangeTxt = `${monday.getDate()} ${monthNamesShort[monday.getMonth()]} – ${sunday.getDate()} ${monthNamesShort[sunday.getMonth()]} ${monday.getFullYear() !== sunday.getFullYear() ? monday.getFullYear() + '/' + sunday.getFullYear() : monday.getFullYear()}`;
  document.getElementById('weekTitle').textContent =
    `📆 ${rangeTxt} · ${t('brigade')} ${selectedShift}`;

  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    const y = dt.getFullYear(),
      m = dt.getMonth() + 1,
      d = dt.getDate();
    const s = getShiftAtWithPending(y, m, d, selectedShift);
    const onU = isUrlop(y, m, d, selectedShift);
    const cell = document.createElement('div');
    cell.className = 'week-day-cell';
    if (i >= 5) cell.classList.add('weekend');
    if (dt.getTime() === today.getTime()) cell.classList.add('today');

    let shiftHtml;
    if (onU) {
      shiftHtml = `<div class="wdc-shift U"><span class="wdc-emoji">🌴</span><span class="wdc-label">${t('vacation')}</span></div>`;
    } else if (isWolne(s)) {
      shiftHtml = `<div class="wdc-shift W"><span class="wdc-emoji">🏖️</span><span class="wdc-label">${t('dayOff')}</span></div>`;
    } else {
      const [sh, eh] = shiftHours[s];
      const scheduledTime = `${String(sh).padStart(2, '0')}:00 – ${String(eh % 24).padStart(2, '0')}:00`;

      // Nadgodziny
      const otWeek = getOvertimes(y, m, d, selectedShift);
      let otBadgesHtml = '';
      let actualTimeHtml = '';
      if (otWeek.przed || otWeek.po) {
        const actualTime = getActualWorkTime(y, m, d, selectedShift, s);
        const parts = [];
        if (otWeek.przed) {
          const cat = categorizeOvertime(y, m, d, s, 'przed', otWeek.przed.hours);
          const dom = cat.h200 > 0 ? '200' : cat.h100 > 0 ? '100' : '50';
          parts.push(`<span class="wdc-ot-badge b-${dom}">+${otWeek.przed.hours}h</span>`);
        }
        if (otWeek.po) {
          const cat = categorizeOvertime(y, m, d, s, 'po', otWeek.po.hours);
          const dom = cat.h200 > 0 ? '200' : cat.h100 > 0 ? '100' : '50';
          parts.push(`<span class="wdc-ot-badge b-${dom}">+${otWeek.po.hours}h</span>`);
        }
        otBadgesHtml = `<div class="wdc-ot-row">${parts.join('')}</div>`;
        actualTimeHtml = `<div class="wdc-actual-time">⏱ ${actualTime}</div>`;
      }

      shiftHtml = `<div class="wdc-shift ${s}">
        <span class="wdc-emoji">${shiftEmoji[s]}</span>
        <span class="wdc-label">${shiftLongNames[s]}</span>
        <div class="wdc-time">${scheduledTime}</div>
        ${actualTimeHtml}
        ${otBadgesHtml}
      </div>`;
    }

    cell.innerHTML = `
      <div class="wdc-header">
        <div class="wdc-day">${dayNames[i]}</div>
        <div class="wdc-date">${d}</div>
      </div>
      <div class="wdc-content">${shiftHtml}</div>
    `;
    cell.onclick = () => jumpToDate(y, m, d);
    grid.appendChild(cell);
  }
}
document.getElementById('prevWeekBtn').onclick = () => {
  ensureWeekStart();
  weekStartDate.setDate(weekStartDate.getDate() - 7);
  renderWeekView();
};
document.getElementById('nextWeekBtn').onclick = () => {
  ensureWeekStart();
  weekStartDate.setDate(weekStartDate.getDate() + 7);
  renderWeekView();
};

/* === YEAR VIEW === */
function renderYearView() {
  const yv = document.getElementById('yearView');
  yv.innerHTML = '';
  const today = new Date();
  const yHolidays = buildHolidays(currentYear);
  for (let m = 1; m <= 12; m++) {
    const wrap = document.createElement('div');
    wrap.className = 'year-month';
    wrap.innerHTML = `<h4>${monthNames[m - 1]}</h4>`;
    const mini = document.createElement('div');
    mini.className = 'mini-calendar';
    dayNames.forEach((d) => {
      const h = document.createElement('div');
      h.className = 'mini-weekday';
      h.textContent = d[0];
      mini.appendChild(h);
    });
    const first = new Date(currentYear, m - 1, 1);
    let sd = first.getDay();
    sd = sd === 0 ? 6 : sd - 1;
    const dim = daysInMonthCal(currentYear, m);
    for (let i = 0; i < sd; i++) {
      const e = document.createElement('div');
      e.className = 'mini-day mE';
      mini.appendChild(e);
    }
    for (let d = 1; d <= dim; d++) {
      const s = getShiftAtWithPending(currentYear, m, d, selectedShift);
      const onU = isUrlop(currentYear, m, d, selectedShift);
      const dirty = isDirty(currentYear, m, d, selectedShift);
      const cls = onU ? 'U' : isWolne(s) ? 'W' : s;
      const el = document.createElement('div');
      el.className = 'mini-day m' + cls + (dirty ? ' mDirty' : '');
      el.textContent = d;
      if (
        today.getFullYear() === currentYear &&
        today.getMonth() + 1 === m &&
        today.getDate() === d
      )
        el.classList.add('mToday');
      if (yHolidays[m + '-' + d]) el.classList.add('mHoliday');
      el.title = `${d} ${monthNames[m - 1]}: ${onU ? '🌴 ' + t('vacation') : shiftFullName[s] || t('dayOff')}`;
      el.onclick = (ev) => {
        ev.stopPropagation();
        if (editMode) {
          if (editPaletteMode === 'OT') {
            showToast('warn', t('otAddInMonthView'));
            return;
          }
          const val = editPaletteMode === 'CYCLE' ? undefined : editPaletteMode;
          applyEdit(currentYear, m, d, selectedShift, val);
          refreshViews();
          return;
        }
        currentMonth = m;
        selectedDay = d;
        yearMode = false;
        prefs.yearMode = false;
        savePrefs(prefs);
        const yt = document.getElementById('yearToggle');
        if (yt) yt.checked = false;
        const ytl = document.getElementById('yearToggleLabel');
        if (ytl) ytl.classList.remove('active');
        switchView('month');
      };
      mini.appendChild(el);
    }
    wrap.appendChild(mini);
    wrap.onclick = () => {
      if (editMode) return;
      currentMonth = m;
      yearMode = false;
      prefs.yearMode = false;
      savePrefs(prefs);
      const yt = document.getElementById('yearToggle');
      if (yt) yt.checked = false;
      const ytl = document.getElementById('yearToggleLabel');
      if (ytl) ytl.classList.remove('active');
      switchView('month');
    };
    yv.appendChild(wrap);
  }
}

/* === TABLE VIEW === */
function renderTableView(showAllYear) {
  const tv = document.getElementById('tableView');
  tv.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'table-view-title';
  title.textContent = showAllYear
    ? `📋 ${t('wholeYear')} ${currentYear} — ${t('allBrigades')}`
    : `📋 ${monthNames[currentMonth - 1]} ${currentYear} — ${t('allBrigades')}`;
  tv.appendChild(title);

  if (showAllYear) {
    const wrap = document.createElement('div');
    wrap.className = 'table-year-wrap';
    for (let m = 1; m <= 12; m++) {
      const block = document.createElement('div');
      block.className = 'table-month-block';
      const h = document.createElement('h3');
      h.textContent = `${monthNames[m - 1]} ${currentYear}`;
      block.appendChild(h);
      block.appendChild(buildMonthTable(m));
      wrap.appendChild(block);
    }
    tv.appendChild(wrap);
  } else {
    const monthNav = document.createElement('div');
    monthNav.className = 'month-nav';
    monthNav.innerHTML = `<button onclick="goToMonth(-1)">‹</button><div class="month-title">${monthNames[currentMonth - 1]} ${currentYear}</div><button onclick="goToMonth(1)">›</button>`;
    tv.appendChild(monthNav);
    tv.appendChild(buildMonthTable(currentMonth));
  }

  const leg = document.createElement('div');
  leg.className = 'table-legend';
  leg.innerHTML = `<span class="tl-R">🌅 R</span><span class="tl-P">🌤️ P</span><span class="tl-N">🌙 N</span><span class="tl-W">— W</span><span class="tl-U">🌴 U</span>`;
  tv.appendChild(leg);
}

function buildMonthTable(month) {
  const table = document.createElement('table');
  table.className = 'brigade-table';
  const dim = daysInMonthCal(currentYear, month);
  const today = new Date();
  const yHolidays = buildHolidays(currentYear);

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  const cornerTh = document.createElement('th');
  cornerTh.className = 'brig-label';
  cornerTh.textContent = t('brigadeDayHeader');
  cornerTh.style.fontSize = '11px';
  trHead.appendChild(cornerTh);
  for (let d = 1; d <= dim; d++) {
    const th = document.createElement('th');
    th.className = 'date-header';
    const dow = new Date(currentYear, month - 1, d).getDay();
    if (dow === 0 || dow === 6) th.classList.add('weekend');
    if (yHolidays[month + '-' + d]) th.classList.add('holiday');
    if (
      today.getFullYear() === currentYear &&
      today.getMonth() + 1 === month &&
      today.getDate() === d
    )
      th.classList.add('today');
    const dayLabel = dayNames[(dow + 6) % 7];
    th.innerHTML = `<span class="dh-num">${d}</span><span class="dh-day">${dayLabel[0]}</span>`;
    if (yHolidays[month + '-' + d]) th.title = yHolidays[month + '-' + d];
    trHead.appendChild(th);
  }
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  ['A', 'B', 'C', 'D'].forEach((brig) => {
    const tr = document.createElement('tr');
    const brigTh = document.createElement('th');
    brigTh.className = 'brig-label ' + brig;
    brigTh.textContent = brig;
    tr.appendChild(brigTh);
    for (let d = 1; d <= dim; d++) {
      const td = document.createElement('td');
      const s = getShiftAtWithPending(currentYear, month, d, brig);
      const onU = isUrlop(currentYear, month, d, brig);
      const dirty = isDirty(currentYear, month, d, brig);
      if (dirty) td.classList.add('dirty-edit');
      const cls = onU ? 'U' : isWolne(s) ? 'W' : s;
      td.className = 'tc tc-' + cls;
      td.textContent = onU ? '🌴' : isWolne(s) ? '—' : s;
      const dow = new Date(currentYear, month - 1, d).getDay();
      if (dow === 0 || dow === 6) td.classList.add('weekend-col');
      if (
        today.getFullYear() === currentYear &&
        today.getMonth() + 1 === month &&
        today.getDate() === d
      )
        td.classList.add('today-col');
      if (brig === selectedShift) td.classList.add('my-brigade');
      td.title = `${brig} • ${d} ${monthNames[month - 1]}: ${onU ? '🌴' : shiftFullName[s] || t('dayOff')}`;
      td.onclick = () => {
        if (editMode) {
          if (editPaletteMode === 'OT') {
            showToast('warn', t('otAddInMonthView'));
            return;
          }
          const val = editPaletteMode === 'CYCLE' ? undefined : editPaletteMode;
          applyEdit(currentYear, month, d, brig, val);
          refreshViews();
          return;
        }
        selectedShift = brig;
        currentMonth = month;
        selectedDay = d;
        compareShift = null;
        yearMode = false;
        prefs.shift = selectedShift;
        prefs.yearMode = false;
        savePrefs(prefs);
        updateShiftButtons();
        const yt = document.getElementById('yearToggle');
        if (yt) yt.checked = false;
        const ytl = document.getElementById('yearToggleLabel');
        if (ytl) ytl.classList.remove('active');
        switchView('month');
      };
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* === EMPTY STATE === */
function renderEmptyState(container) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="es-emoji">📅</div>
      <h3>${t('yearIsEmptyTitle')} ${currentYear}</h3>
      <p>${t('yearIsEmptyDescription')}</p>
      <div class="es-actions">
        <button class="btn-primary" onclick="document.getElementById('editModeToggle').click()">✏️ ${t('enableEdit')}</button>
        <button class="btn-secondary" onclick="document.getElementById('importDataBtn').click()">📂 ${t('importJson')}</button>
      </div>
    </div>
  `;
}
