/* ================================================================
   GRAFIK GILLETTE — Module 7: VIEWS (WEEK, YEAR, TABLE)
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

  const hidePrivate = !shouldShowPersonalData();

  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    const y = dt.getFullYear(),
      m = dt.getMonth() + 1,
      d = dt.getDate();
    let s = getShiftAtWithPending(y, m, d, selectedShift);
    let onU = isUrlop(y, m, d, selectedShift);
    if (hidePrivate) {
      s =
        factorySchedule[y] && factorySchedule[y][m] && factorySchedule[y][m][selectedShift]
          ? factorySchedule[y][m][selectedShift][d - 1]
          : '';
      onU = false;
    }
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
      if (!hidePrivate && (otWeek.przed || otWeek.po)) {
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
    cell.dataset.y = y;
    cell.dataset.m = m;
    cell.dataset.d = d;
    cell.onclick = () => selectWeekDay(y, m, d, cell);
    grid.appendChild(cell);
  }

  // Keep selection if still in this week
  if (selectedDay && currentYear && currentMonth) {
    const sel = grid.querySelector(
      `.week-day-cell[data-y="${currentYear}"][data-m="${currentMonth}"][data-d="${selectedDay}"]`
    );
    if (sel) {
      sel.classList.add('selected-week-day');
      renderWeekDayPanel(currentYear, currentMonth, selectedDay);
    } else {
      const panel = document.getElementById('weekInfoPanel');
      if (panel) {
        panel.innerHTML = `<h3>${t('infoPanelTitle')}</h3><p>${t('infoPanelHint')}</p>`;
      }
    }
  }
}

function selectWeekDay(y, m, d, cellEl) {
  currentYear = y;
  currentMonth = m;
  selectedDay = d;
  document.querySelectorAll('.week-day-cell.selected-week-day').forEach((c) => {
    c.classList.remove('selected-week-day');
  });
  if (cellEl) cellEl.classList.add('selected-week-day');
  renderWeekDayPanel(y, m, d);
}

/**
 * Day detail under week grid — same content idea as month info-panel / dashboard flow
 */
function renderWeekDayPanel(y, m, d) {
  const panel = document.getElementById('weekInfoPanel');
  if (!panel) return;

  const hidePrivate = !shouldShowPersonalData();
  let shiftCode = getShiftAtWithPending(y, m, d, selectedShift);
  if (hidePrivate) {
    shiftCode =
      factorySchedule[y] && factorySchedule[y][m] && factorySchedule[y][m][selectedShift]
        ? factorySchedule[y][m][selectedShift][d - 1]
        : '';
  }
  const onUrlop = hidePrivate ? false : isUrlop(y, m, d, selectedShift);
  const dateStr = `${d} ${monthNamesGenitive[m - 1]} ${y}`;
  const dowIdx = new Date(y, m - 1, d).getDay();
  const dow = dayNamesFull[dowIdx];
  const yHolidays = buildHolidays(y);
  const holidayName = yHolidays[m + '-' + d];
  const holidayInfo = holidayName ? ` <span style="color:#c0392b;">🎉 ${holidayName}</span>` : '';
  const noteKey = `${y}-${m}-${d}-${selectedShift}`;

  if (onUrlop) {
    panel.innerHTML = `<h3>📅 ${dateStr} (${dow})${holidayInfo}</h3>
      <div class="info-grid">
        <div class="info-card"><div class="label">${t('infoStatus')}</div><div class="value" style="color:#e67e22;">${t('infoUrlop')}</div></div>
        ${
          hidePrivate
            ? ''
            : `<div class="info-card" style="grid-column:1/-1;"><div class="label">${t('infoNote')}</div><div class="value"><input class="note-input" id="weekNoteInput" value="${escapeHtml(notes[noteKey] || '')}" placeholder="${t('infoNotePlaceholder')}"></div></div>`
        }
      </div>`;
  } else if (isWolne(shiftCode)) {
    panel.innerHTML = `<h3>📅 ${dateStr} (${dow})${holidayInfo}</h3>
      <div class="info-grid">
        <div class="info-card"><div class="label">${t('infoStatus')}</div><div class="value">${t('infoFree')}</div></div>
        ${
          hidePrivate
            ? ''
            : `<div class="info-card" style="grid-column:1/-1;"><div class="label">${t('infoNote')}</div><div class="value"><input class="note-input" id="weekNoteInput" value="${escapeHtml(notes[noteKey] || '')}" placeholder="${t('infoNotePlaceholder')}"></div></div>`
        }
      </div>`;
  } else {
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

    let reliefCard = '';
    if (typeof renderReliefTimeline === 'function' && typeof renderFlowSegmentWidget === 'function') {
      const handoffHtml = renderReliefTimeline(info, y, m, d, shiftCode, selectedShift, timelineOt);
      let cycleHtml = handoffHtml;
      if (typeof getCyclePath === 'function' && typeof renderCycleTimeline === 'function') {
        cycleHtml = renderCycleTimeline(getCyclePath(y, m, d, selectedShift, 8), y, m, d);
      }
      reliefCard = renderFlowSegmentWidget({
        handoffHtml,
        cycleHtml,
        defaultMode: 'handoff',
      });
    } else if (typeof renderReliefTimeline === 'function') {
      reliefCard = `<div class="info-card" style="grid-column:1/-1;"><div class="label">🔄 ${t('reliefFlowTitle')}</div><div class="value">${renderReliefTimeline(info, y, m, d, shiftCode, selectedShift, timelineOt)}</div></div>`;
    }

    let liveInfo = '';
    if (!hidePrivate && typeof getLiveTimer === 'function') {
      const timer = getLiveTimer(shiftCode, y, m, d);
      if (timer) {
        liveInfo = `<div class="info-card" style="border:2px solid #27ae60;"><div class="label">${t('infoLiveShift')}</div><div class="value" style="color:#27ae60;">${timer}</div></div>`;
      }
    }

    panel.innerHTML = `<h3>📅 ${dateStr} (${dow})${holidayInfo} — <span class="badge ${selectedShift}">${selectedShift}</span></h3>
      <div class="info-grid">
        ${reliefCard}
        ${liveInfo}
        ${
          hidePrivate
            ? ''
            : `<div class="info-card" style="grid-column:1/-1;"><div class="label">${t('infoNote')}</div><div class="value"><input class="note-input" id="weekNoteInput" value="${escapeHtml(notes[noteKey] || '')}" placeholder="${t('infoNotePlaceholder')}"></div></div>`
        }
      </div>`;
  }

  if (typeof bindFlowSegmentToggle === 'function') bindFlowSegmentToggle(panel);

  const ni = document.getElementById('weekNoteInput');
  if (ni) {
    ni.addEventListener('change', () => {
      const key = `${y}-${m}-${d}-${selectedShift}`;
      const val = ni.value.trim();
      if (val) notes[key] = val;
      else delete notes[key];
      saveNotes(notes);
      showToast('success', t('infoNoteSaved'));
    });
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
  const hidePrivate = !shouldShowPersonalData();
  for (let m = 1; m <= 12; m++) {
    const wrap = document.createElement('div');
    wrap.className = 'year-month';
    wrap.innerHTML = `<h4>${monthNames[m - 1]}</h4>`;
    const mini = document.createElement('div');
    mini.className = 'mini-calendar';
    dayNames.forEach((d, wi) => {
      const h = document.createElement('div');
      h.className = 'mini-weekday' + (wi >= 5 ? ' mini-weekend' : '');
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
      let s = getShiftAtWithPending(currentYear, m, d, selectedShift);
      let onU = isUrlop(currentYear, m, d, selectedShift);
      let dirty = isDirty(currentYear, m, d, selectedShift);
      if (hidePrivate) {
        s =
          factorySchedule[currentYear] &&
          factorySchedule[currentYear][m] &&
          factorySchedule[currentYear][m][selectedShift]
            ? factorySchedule[currentYear][m][selectedShift][d - 1]
            : '';
        onU = false;
        dirty = false;
      }
      const cls = onU ? 'U' : isWolne(s) ? 'W' : s;
      const el = document.createElement('div');
      el.className = 'mini-day m' + cls + (dirty ? ' mDirty' : '');
      el.textContent = d;
      const dowY = new Date(currentYear, m - 1, d).getDay();
      if (dowY === 0 || dowY === 6) el.classList.add('mWeekend');
      if (
        today.getFullYear() === currentYear &&
        today.getMonth() + 1 === m &&
        today.getDate() === d
      )
        el.classList.add('mToday');
      if (yHolidays[m + '-' + d]) el.classList.add('mHoliday');
      el.title = `${d} ${monthNamesGenitive[m - 1]}: ${onU ? '🌴 ' + t('vacation') : shiftFullName[s] || t('dayOff')}`;
      el.onclick = (ev) => {
        ev.stopPropagation();
        if (editMode) {
          // Palette URLOP: toggle vacation
          if (editPaletteMode === 'URLOP') {
            toggleUrlop(currentYear, m, d, selectedShift);
            showToast(
              'success',
              isUrlop(currentYear, m, d, selectedShift) ? t('urlopAdded') : t('urlopRemoved')
            );
            refreshViews();
            return;
          }
          // Palette ADDSHIFT / OTBEFORE / OTAFTER: only available in month view
          if (
            editPaletteMode === 'ADDSHIFT' ||
            editPaletteMode === 'OTBEFORE' ||
            editPaletteMode === 'OTAFTER'
          ) {
            showToast('warn', t('otAddInMonthView'));
            return;
          }
          // Palette: 'R','P','N','W' — map free day 'W' to '' for storage
          const val = editPaletteMode === 'W' ? '' : editPaletteMode;
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
  const hidePrivate = !shouldShowPersonalData();

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
      let s = getShiftAtWithPending(currentYear, month, d, brig);
      let onU = isUrlop(currentYear, month, d, brig);
      let dirty = isDirty(currentYear, month, d, brig);
      if (hidePrivate) {
        s =
          factorySchedule[currentYear] &&
          factorySchedule[currentYear][month] &&
          factorySchedule[currentYear][month][brig]
            ? factorySchedule[currentYear][month][brig][d - 1]
            : '';
        onU = false;
        dirty = false;
      }
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
      td.title = `${brig} • ${d} ${monthNamesGenitive[month - 1]}: ${onU ? '🌴' : shiftFullName[s] || t('dayOff')}`;
      td.onclick = () => {
        if (editMode) {
          // Palette URLOP: toggle vacation
          if (editPaletteMode === 'URLOP') {
            toggleUrlop(currentYear, month, d, brig);
            showToast(
              'success',
              isUrlop(currentYear, month, d, brig) ? t('urlopAdded') : t('urlopRemoved')
            );
            refreshViews();
            return;
          }
          // Palette ADDSHIFT / OTBEFORE / OTAFTER: only available in month view
          if (
            editPaletteMode === 'ADDSHIFT' ||
            editPaletteMode === 'OTBEFORE' ||
            editPaletteMode === 'OTAFTER'
          ) {
            showToast('warn', t('otAddInMonthView'));
            return;
          }
          // Palette: 'R','P','N','W' — map free day 'W' to '' for storage
          const val = editPaletteMode === 'W' ? '' : editPaletteMode;
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
      <h3>${t('yearIsEmptyTitle', { year: currentYear })}</h3>
      <p>${t('yearIsEmptyDescription')}</p>
      <div class="es-actions">
        <button class="btn-primary" onclick="document.getElementById('editModeToggle').click()">✏️ ${t('enableEdit')}</button>
      </div>
    </div>
  `;
}
