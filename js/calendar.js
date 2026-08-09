/* ================================================================
   GRAFIK GILLETTE — Moduł 6: KALENDARZ MIESIĄCA + INFO + NADGODZINY
   ================================================================ */

/* === RENDER MONTH VIEW === */
function renderCalendar(direction) {
  const cal = document.getElementById('calendar');
  cal.innerHTML = '';
  cal.className = 'calendar' + (direction === 'right' ? ' slide-right' : direction === 'left' ? ' slide-left' : '');

  dayNames.forEach((d, idx) => {
    const h = document.createElement('div');
    h.className = 'day-header' + (idx >= 5 ? ' weekend' : '');
    h.textContent = d;
    cal.appendChild(h);
  });

  const first = new Date(currentYear, currentMonth - 1, 1);
  let startDay = first.getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;
  const dim = daysInMonthCal(currentYear, currentMonth);
  const yHolidays = buildHolidays(currentYear);

  for (let i = 0; i < startDay; i++) {
    const e = document.createElement('div');
    e.className = 'day-cell empty';
    cal.appendChild(e);
  }

  const today = new Date();
  const cycleRange = selectedDay ? getCycleRange(currentYear, currentMonth, selectedDay, selectedShift) : null;

  for (let d = 1; d <= dim; d++) {
    const cell = document.createElement('div');
    const shiftCode = getShiftAtWithPending(currentYear, currentMonth, d, selectedShift);
    const onUrlop = isUrlop(currentYear, currentMonth, d, selectedShift);
    const dirtyCell = isDirty(currentYear, currentMonth, d, selectedShift);
    const cellClass = isWolne(shiftCode) ? 'W' : shiftCode;
    cell.className = 'day-cell cell-' + cellClass;
    if (onUrlop) cell.classList.add('urlop');
    cell.dataset.day = d;

    const dow = new Date(currentYear, currentMonth - 1, d).getDay();
    if (dow === 0 || dow === 6) cell.classList.add('day-weekend');
    // Pozycja w tygodniu (0=Pon, 6=Nd) dla poprawnych pozycji popupów
    const weekdayIdx = dow === 0 ? 6 : dow - 1;
    if (weekdayIdx === 0) cell.classList.add('col-first');
    if (weekdayIdx === 6) cell.classList.add('col-last');
    if (weekdayIdx <= 1) cell.classList.add('col-left-edge');
    if (weekdayIdx >= 5) cell.classList.add('col-right-edge');
    if (yHolidays[currentMonth+'-'+d]) cell.classList.add('holiday');
    if (today.getFullYear() === currentYear && today.getMonth() + 1 === currentMonth && today.getDate() === d) cell.classList.add('today');
    if (selectedDay === d) cell.classList.add('selected');
    if (dirtyCell) cell.classList.add('dirty-edit');

    if (cycleRange && cycleRange.length > 1 && d >= cycleRange.start && d <= cycleRange.end) {
      if (d === cycleRange.start) cell.classList.add('cycle-start');
      else if (d === cycleRange.end) cell.classList.add('cycle-end');
      else cell.classList.add('cycle-middle');
    }

    if (compareShift) {
      const s1 = getShiftAtWithPending(currentYear, currentMonth, d, selectedShift);
      const s2 = getShiftAtWithPending(currentYear, currentMonth, d, compareShift);
      if (s1 === s2 && !isWolne(s1)) cell.classList.add('compare-match');
      if (isWolne(s1) && isWolne(s2)) cell.classList.add('compare-match');
    }

    if (onUrlop) {
      const icon = document.createElement('div');
      icon.className = 'urlop-icon';
      icon.textContent = '🌴';
      cell.appendChild(icon);
    }

    const numEl = document.createElement('div');
    numEl.className = 'day-num';
    numEl.innerHTML = d;
    if (yHolidays[currentMonth+'-'+d]) {
      const em = document.createElement('span');
      em.className = 'day-emoji';
      em.textContent = '🎉';
      em.title = yHolidays[currentMonth+'-'+d];
      numEl.appendChild(em);
    }
    cell.appendChild(numEl);

    const shiftEl = document.createElement('div');
    shiftEl.className = 'day-shift';
    if (onUrlop) shiftEl.innerHTML = `<span style="font-size:14px;">URLOP</span>`;
    else if (isWolne(shiftCode)) shiftEl.textContent = '—';
    else shiftEl.innerHTML = `<span class="shift-emoji">${shiftEmoji[shiftCode]}</span>${shiftCode}`;
    cell.appendChild(shiftEl);

    // NADGODZINY: wizualny podział + etykiety
    if (!isWolne(shiftCode) && !onUrlop) {
      const ot = getOvertimes(currentYear, currentMonth, d, selectedShift);
      if (ot.przed || ot.po) {
        cell.classList.add('has-ot');
        if (ot.przed) {
          const cat = categorizeOvertime(currentYear, currentMonth, d, shiftCode, 'przed', ot.przed.hours);
          const dominant = cat.h200 > 0 ? '200' : cat.h100 > 0 ? '100' : '50';
          const stripL = document.createElement('div');
          stripL.className = `ot-strip ot-left ot-${dominant}`;
          stripL.textContent = `+${dominant}%`;
          cell.appendChild(stripL);
        }
        if (ot.po) {
          const cat = categorizeOvertime(currentYear, currentMonth, d, shiftCode, 'po', ot.po.hours);
          const dominant = cat.h200 > 0 ? '200' : cat.h100 > 0 ? '100' : '50';
          const stripR = document.createElement('div');
          stripR.className = `ot-strip ot-right ot-${dominant}`;
          stripR.textContent = `+${dominant}%`;
          cell.appendChild(stripR);
        }
        const actualTime = getActualWorkTime(currentYear, currentMonth, d, selectedShift, shiftCode);
        if (actualTime) {
          const timeEl = document.createElement('div');
          timeEl.className = 'day-actual-time';
          timeEl.textContent = actualTime;
          cell.appendChild(timeEl);
        }
      }
    }

    const noteKey = `${currentYear}-${currentMonth}-${d}-${selectedShift}`;
    if (notes[noteKey]) {
      const nEl = document.createElement('div');
      nEl.className = 'day-note';
      nEl.textContent = '📝';
      nEl.title = notes[noteKey];
      cell.appendChild(nEl);
    }

    if (!editMode && !isWolne(shiftCode)) {
      addReliefPopups(cell, d, shiftCode, onUrlop);
    }
    // Popupy nadgodzin - w trybie edycji z paletą OT
    if (selectedDay === d && editMode && editPaletteMode === 'OT' && !isWolne(shiftCode) && !onUrlop) {
      addOvertimePopups(cell, d, shiftCode);
    }

    cell.addEventListener('click', () => {
      if (editMode) {
        if (editPaletteMode === 'OT') {
          const shiftHere = getShiftAtWithPending(currentYear, currentMonth, d, selectedShift);
          if (isWolne(shiftHere)) {
            showToast('warn', 'Nadgodziny można dodać tylko do dnia ze zmianą');
            return;
          }
          selectedDay = d;
          renderCalendar();
          renderInfo();
          return;
        }
        const val = editPaletteMode === 'CYCLE' ? undefined : editPaletteMode;
        applyEdit(currentYear, currentMonth, d, selectedShift, val);
        selectedDay = d;
        refreshViews();
        return;
      }
      selectedDay = (selectedDay === d) ? null : d;
      renderCalendar();
      renderInfo();
    });

    cal.appendChild(cell);
  }

  const monthTitle = getElementByIdSafe('monthTitle');
  if (monthTitle) monthTitle.textContent = `${monthNames[currentMonth-1]} ${currentYear}`;
  const h = getMonthHours(currentYear, currentMonth);
  const monthHours = getElementByIdSafe('monthHours');
  if (monthHours) monthHours.textContent = `Godziny: A=${h.A} • B=${h.B} • C=${h.C} • D=${h.D}${compareShift?` (vs ${compareShift})`:''}`;

  renderProgress();
  renderMonthOvertimeSummary();
}

/* === POPUPY ZMIAN (relief) === */
function addReliefPopups(cell, d, shiftCode, onUrlop) {
  const urlopPopup = document.createElement('div');
  urlopPopup.className = 'relief-popup top ' + (onUrlop ? 'pop-urlop-remove' : 'pop-urlop');
  urlopPopup.innerHTML = onUrlop
    ? `<div class="rp-label">❌ Usuń urlop</div><div class="rp-brig">🌴</div><div class="rp-info">Kliknij</div>`
    : `<div class="rp-label">🌴 Urlop</div><div class="rp-brig">+</div><div class="rp-info">Zaznacz</div>`;
  urlopPopup.addEventListener('click', (ev) => {
    ev.stopPropagation();
    toggleUrlop(currentYear, currentMonth, d, selectedShift);
    showToast('success', onUrlop ? 'Urlop usunięty' : 'Urlop dodany');
    refreshViews();
  });
  cell.appendChild(urlopPopup);

  if (!isWolne(shiftCode) && !onUrlop) {
    const info = getRelief(currentYear, currentMonth, d, selectedShift, shiftCode);

    const leftPopup = document.createElement('div');
    const prevCls = info.prevBrig ? info.prevType : 'none';
    leftPopup.className = 'relief-popup left pop-' + prevCls;
    const prevWhen = (info.prevYear !== currentYear || info.prevMonth !== currentMonth)
      ? `${info.prevDay} ${monthNamesShort[info.prevMonth-1]}${info.prevYear !== currentYear ? ' '+info.prevYear : ''}`
      : (info.prevDay === d ? 'dziś' : info.prevDay === d-1 ? 'wczoraj' : `${info.prevDay}`);
    leftPopup.innerHTML = `<div class="rp-label">⬅ Zmienia</div><div class="rp-brig">${info.prevBrig || '—'}</div><div class="rp-info">${info.prevType} · ${prevWhen}</div>`;
    if (info.prevBrig) {
      leftPopup.style.pointerEvents = 'auto';
      leftPopup.style.cursor = 'pointer';
      leftPopup.onclick = (ev) => {
        ev.stopPropagation();
        selectedShift = info.prevBrig; currentYear = info.prevYear; currentMonth = info.prevMonth; selectedDay = info.prevDay;
        compareShift = null;
        prefs.shift = selectedShift; prefs.year = currentYear;
        savePrefs(prefs);
        updateShiftButtons(); updateYearPicker();
        refreshViews();
      };
    }
    cell.appendChild(leftPopup);

    const rightPopup = document.createElement('div');
    const nextCls = info.nextBrig ? info.nextType : 'none';
    rightPopup.className = 'relief-popup right pop-' + nextCls;
    const nextWhen = (info.nextYear !== currentYear || info.nextMonth !== currentMonth)
      ? `${info.nextDay} ${monthNamesShort[info.nextMonth-1]}${info.nextYear !== currentYear ? ' '+info.nextYear : ''}`
      : (info.nextDay === d ? 'dziś' : info.nextDay === d+1 ? 'jutro' : `${info.nextDay}`);
    rightPopup.innerHTML = `<div class="rp-label">Zmieni ➡</div><div class="rp-brig">${info.nextBrig || '—'}</div><div class="rp-info">${info.nextType} · ${nextWhen}</div>`;
    if (info.nextBrig) {
      rightPopup.style.pointerEvents = 'auto';
      rightPopup.style.cursor = 'pointer';
      rightPopup.onclick = (ev) => {
        ev.stopPropagation();
        selectedShift = info.nextBrig; currentYear = info.nextYear; currentMonth = info.nextMonth; selectedDay = info.nextDay;
        compareShift = null;
        prefs.shift = selectedShift; prefs.year = currentYear;
        savePrefs(prefs);
        updateShiftButtons(); updateYearPicker();
        refreshViews();
      };
    }
    cell.appendChild(rightPopup);
  }
}

/* === POPUPY NADGODZIN === */
function addOvertimePopups(cell, d, shift) {
  const ot = getOvertimes(currentYear, currentMonth, d, selectedShift);

  const topPopup = document.createElement('div');
  topPopup.className = 'ot-popup ot-top';
  if (ot.przed) {
    const { from, to } = calcOvertimeTime(shift, 'przed', ot.przed.hours);
    const cat = categorizeOvertime(currentYear, currentMonth, d, shift, 'przed', ot.przed.hours);
    const dom = cat.h200 > 0 ? '+200%' : cat.h100 > 0 ? '+100%' : '+50%';
    topPopup.innerHTML = `
      <div class="otp-label">⏱ PRZED</div>
      <div class="otp-content">${ot.przed.hours}h · ${dom}</div>
      <div class="otp-time">${formatTimeRange(from, to)}</div>
      <div class="otp-actions">
        <button data-act="edit-przed">✏️</button>
        <button data-act="del-przed">🗑</button>
      </div>
    `;
  } else {
    topPopup.innerHTML = `
      <div class="otp-label">⏱ PRZED</div>
      <div class="otp-content">+ Dodaj</div>
    `;
  }
  topPopup.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const t = ev.target;
    if (t.dataset && t.dataset.act === 'del-przed') {
      showConfirm('Usunąć nadgodziny PRZED?', '', () => {
        removeOvertime(currentYear, currentMonth, d, selectedShift, 'przed');
        showToast('success', 'Usunięto');
        refreshViews();
      }, { primaryText: 'Usuń', primaryClass: 'danger' });
      return;
    }
    openOvertimeModal(d, shift, 'przed', ot.przed);
  });
  cell.appendChild(topPopup);

  const botPopup = document.createElement('div');
  botPopup.className = 'ot-popup ot-bottom';
  if (ot.po) {
    const { from, to } = calcOvertimeTime(shift, 'po', ot.po.hours);
    const cat = categorizeOvertime(currentYear, currentMonth, d, shift, 'po', ot.po.hours);
    const dom = cat.h200 > 0 ? '+200%' : cat.h100 > 0 ? '+100%' : '+50%';
    botPopup.innerHTML = `
      <div class="otp-label">⏱ PO</div>
      <div class="otp-content">${ot.po.hours}h · ${dom}</div>
      <div class="otp-time">${formatTimeRange(from, to)}</div>
      <div class="otp-actions">
        <button data-act="edit-po">✏️</button>
        <button data-act="del-po">🗑</button>
      </div>
    `;
  } else {
    botPopup.innerHTML = `
      <div class="otp-label">⏱ PO</div>
      <div class="otp-content">+ Dodaj</div>
    `;
  }
  botPopup.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const t = ev.target;
    if (t.dataset && t.dataset.act === 'del-po') {
      showConfirm('Usunąć nadgodziny PO?', '', () => {
        removeOvertime(currentYear, currentMonth, d, selectedShift, 'po');
        showToast('success', 'Usunięto');
        refreshViews();
      }, { primaryText: 'Usuń', primaryClass: 'danger' });
      return;
    }
    openOvertimeModal(d, shift, 'po', ot.po);
  });
  cell.appendChild(botPopup);
}

/* === MODAL NADGODZIN === */
let otModalContext = null;

function openOvertimeModal(day, shift, position, existing) {
  otModalContext = { day, shift, position };
  const overlay = document.getElementById('otOverlay');
  const posLabel = position === 'przed' ? 'PRZED' : 'PO';
  const [sh, eh] = shiftHours[shift];
  const shiftTimeStr = `${String(sh).padStart(2,'0')}:00-${String(eh%24).padStart(2,'0')}:00`;

  document.getElementById('otTitle').textContent = `Nadgodziny ${posLabel} zmiany ${shift}`;
  document.getElementById('otContext').innerHTML = `
    <b>📅 Data:</b> ${day} ${monthNames[currentMonth-1]} ${currentYear}<br>
    <b>🏭 Zmiana:</b> ${shift} (${shiftTimeStr})<br>
    <b>📍 Pozycja:</b> ${posLabel} zmiany
  `;
  document.getElementById('otNote').value = existing ? existing.note || '' : '';
  document.getElementById('otCustomHours').value = '';

  document.querySelectorAll('.ot-qbtn').forEach(b => b.classList.remove('active'));
  if (existing) {
    const btn = document.querySelector(`.ot-qbtn[data-h="${existing.hours}"]`);
    if (btn) btn.classList.add('active');
    else document.getElementById('otCustomHours').value = existing.hours;
    updateOvertimePreview(existing.hours);
  } else {
    document.getElementById('otPreview').style.display = 'none';
  }

  const footer = document.getElementById('otFooter');
  footer.innerHTML = '';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'modal-btn secondary';
  cancelBtn.textContent = 'Anuluj';
  cancelBtn.onclick = () => overlay.classList.remove('show');
  footer.appendChild(cancelBtn);

  if (existing) {
    const delBtn = document.createElement('button');
    delBtn.className = 'modal-btn danger';
    delBtn.textContent = '🗑 Usuń';
    delBtn.onclick = () => {
      removeOvertime(currentYear, currentMonth, day, selectedShift, position);
      overlay.classList.remove('show');
      showToast('success', 'Nadgodziny usunięte');
      refreshViews();
    };
    footer.appendChild(delBtn);
  }

  const saveBtn = document.createElement('button');
  saveBtn.className = 'modal-btn success';
  saveBtn.textContent = '💾 Zapisz';
  saveBtn.onclick = saveOvertimeFromModal;
  footer.appendChild(saveBtn);

  overlay.classList.add('show');
}

function getSelectedHours() {
  const custom = parseFloat(document.getElementById('otCustomHours').value);
  if (!isNaN(custom) && custom > 0) return custom;
  const active = document.querySelector('.ot-qbtn.active');
  if (active) return parseFloat(active.dataset.h);
  return null;
}

function updateOvertimePreview(hours) {
  const preview = getElementByIdSafe('otPreview');
  if (!otModalContext || !hours || !preview) {
    if (preview) preview.style.display = 'none';
    return;
  }
  const { day, shift, position } = otModalContext;
  const { from, to } = calcOvertimeTime(shift, position, hours);
  const cat = categorizeOvertime(currentYear, currentMonth, day, shift, position, hours);
  const crossesMidnight = to < from;
  preview.style.display = 'block';
  const paid = cat.h50 * 1.5 + cat.h100 * 2 + cat.h200 * 3;
  preview.innerHTML = `
    <div style="font-weight:700; color:var(--text-header); margin-bottom:6px;">📊 Podgląd</div>
    <div>⏰ Czas: <b>${formatTimeRange(from, to)}</b> (${hours}h)</div>
    ${crossesMidnight ? `<div style="color:#c0392b; font-weight:700; margin-top:4px;">⚠️ Przechodzi przez północ</div>` : ''}
    ${cat.h50 > 0 ? `<div>🟡 <b>+50%</b>: ${cat.h50}h → ${cat.h50 * 1.5}h zapłaty</div>` : ''}
    ${cat.h100 > 0 ? `<div>🟣 <b>+100%</b>: ${cat.h100}h → ${cat.h100 * 2}h zapłaty</div>` : ''}
    ${cat.h200 > 0 ? `<div>🔴 <b>+200%</b>: ${cat.h200}h → ${cat.h200 * 3}h zapłaty</div>` : ''}
    <div style="margin-top:6px; padding-top:6px; border-top:1px solid var(--border-cell); font-weight:700;">
      💰 Razem płatne: ${paid}h
    </div>
  `;
}

function saveOvertimeFromModal() {
  if (!otModalContext) return;
  const hours = getSelectedHours();
  if (!hours || hours <= 0) {
    showToast('error', 'Wybierz liczbę godzin');
    return;
  }
  const note = document.getElementById('otNote').value.trim();
  const { day, position } = otModalContext;
  setOvertime(currentYear, currentMonth, day, selectedShift, position, { hours, note });
  document.getElementById('otOverlay').classList.remove('show');
  showToast('success', `Zapisano ${hours}h nadgodzin`);
  refreshViews();
}

document.getElementById('otClose').onclick = () => document.getElementById('otOverlay').classList.remove('show');
document.getElementById('otOverlay').onclick = (e) => {
  if (e.target.id === 'otOverlay') document.getElementById('otOverlay').classList.remove('show');
};

document.querySelectorAll('.ot-qbtn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.ot-qbtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('otCustomHours').value = '';
    updateOvertimePreview(parseFloat(btn.dataset.h));
  };
});

document.getElementById('otCustomHours').addEventListener('input', (e) => {
  const v = parseFloat(e.target.value);
  if (!isNaN(v) && v > 0) {
    document.querySelectorAll('.ot-qbtn').forEach(b => b.classList.remove('active'));
    updateOvertimePreview(v);
  }
});

/* === PODSUMOWANIE NADGODZIN MIESIĄCA === */
function renderMonthOvertimeSummary() {
  const old = document.getElementById('otMonthSummary');
  if (old) old.remove();

  const sum = getMonthOvertimeSummary(currentYear, currentMonth, selectedShift);
  if (sum.count === 0) return;

  const paid = sum.h50 * 1.5 + sum.h100 * 2 + sum.h200 * 3;
  const totalH = sum.h50 + sum.h100 + sum.h200;

  const el = document.createElement('div');
  el.id = 'otMonthSummary';
  el.className = 'ot-summary';
  el.innerHTML = `
    <div class="ot-summary-title">⏱ Nadgodziny w miesiącu (${sum.count} ${sum.count === 1 ? 'wpis' : 'wpisów'})</div>
    <div class="ot-summary-grid">
      <div class="ot-summary-card s-50">
        <div class="ssc-label">+50%</div>
        <div class="ssc-value">${sum.h50}h</div>
      </div>
      <div class="ot-summary-card s-100">
        <div class="ssc-label">+100%</div>
        <div class="ssc-value">${sum.h100}h</div>
      </div>
      <div class="ot-summary-card s-200">
        <div class="ssc-label">+200%</div>
        <div class="ssc-value">${sum.h200}h</div>
      </div>
    </div>
    <div class="ot-summary-total">
      📊 Razem: <b>${totalH}h</b> przepracowane · 💰 <b>${paid}h</b> płatne
    </div>
  `;
  const infoPanel = document.getElementById('infoPanel');
  infoPanel.parentNode.insertBefore(el, infoPanel);
}

/* === PROGRESS === */
function renderProgress() {
  const today = new Date();
  const progressFill = getElementByIdSafe('progressFill');
  const progressLabel = getElementByIdSafe('progressLabel');
  if (!progressFill || !progressLabel) return;
  if (today.getFullYear() !== currentYear || (today.getMonth()+1) !== currentMonth) {
    progressFill.style.width = '0%';
    progressLabel.textContent = '';
    return;
  }
  const ySched = getYearSchedule(currentYear);
  const arr = ySched[currentMonth][selectedShift];
  const totalHours = getMonthHours(currentYear, currentMonth)[selectedShift] || 1;
  let workedHours = 0;
  for (let i = 0; i < today.getDate() && i < arr.length; i++) {
    if (!isWolne(arr[i]) && !isUrlop(currentYear, currentMonth, i+1, selectedShift)) workedHours += 8;
  }
  const pct = Math.round((workedHours/totalHours)*100);
  progressFill.style.width = Math.min(pct, 100) + '%';
  progressLabel.textContent = `Brygada ${selectedShift}: ${workedHours}h / ${totalHours}h (${pct}%)`;
}

/* === INFO PANEL === */
function renderInfo() {
  const panel = document.getElementById('infoPanel');
  if (!selectedDay) {
    panel.innerHTML = '<h3>ℹ️ Wybierz dzień w kalendarzu</h3><p>Kliknij dowolny dzień, aby zobaczyć szczegóły.</p>';
    return;
  }
  const shiftCode = getShiftAtWithPending(currentYear, currentMonth, selectedDay, selectedShift);
  const dateStr = `${selectedDay} ${monthNames[currentMonth-1]} ${currentYear}`;
  const dowIdx = new Date(currentYear, currentMonth-1, selectedDay).getDay();
  const dow = dayNamesFull[dowIdx];
  const yHolidays = buildHolidays(currentYear);
  const holidayName = yHolidays[currentMonth+'-'+selectedDay];
  const holidayInfo = holidayName ? ` <span style="color:#c0392b;">🎉 ${holidayName}</span>` : '';
  const noteKey = `${currentYear}-${currentMonth}-${selectedDay}-${selectedShift}`;
  const onUrlop = isUrlop(currentYear, currentMonth, selectedDay, selectedShift);

  const totalUrlop = (urlops[selectedShift] || []).filter(k => k.startsWith(currentYear+'-')).length;
  const usedUrlop = countWorkingUrlops(currentYear, selectedShift);
  const limit = getVacationLimit(selectedShift);
  const overLimit = usedUrlop > limit;
  const urlopStats = `<div class="urlop-stats">
    <span>🌴 Urlop ${selectedShift} (${currentYear}):<br><small style="opacity:.9;font-weight:normal;">Zaznaczone: ${totalUrlop} • Robocze: ${usedUrlop}</small></span>
    <div style="display:flex; align-items:center; gap:6px;">
      <span><span class="us-count ${overLimit?'us-over':''}">${usedUrlop}</span> / ${limit} ${overLimit ? '⚠️' : ''}</span>
      <button class="urlop-limit-edit" data-brigade="${selectedShift}" title="Zmień limit urlopów dla ${selectedShift}" style="border:none; background:rgba(255,255,255,0.18); color:inherit; border-radius:6px; width:24px; height:24px; cursor:pointer;">✏️</button>
    </div>
  </div>`;

  let liveInfo = '';
  const lv = getLiveShiftInfo();
  if (lv) liveInfo = lv;

  let cycleInfo = '';
  const cyc = getCycleRange(currentYear, currentMonth, selectedDay, selectedShift);
  if (cyc && cyc.length > 1) {
    const which = selectedDay - cyc.start + 1;
    cycleInfo = `<div class="info-card"><div class="label">🔁 Blok</div><div class="value">${which} z ${cyc.length}</div></div>`;
  }

  let toWolneInfo = '';
  if (!isWolne(shiftCode) && !onUrlop) {
    const w = daysToNextWolne(currentYear, currentMonth, selectedDay, selectedShift);
    if (w && w.days > 0) {
      const wd = `${w.day} ${monthNames[w.month-1]}${w.year !== currentYear ? ' '+w.year : ''}`;
      const label = w.days === 1 ? 'Jutro' : `Za ${w.days} dni`;
      toWolneInfo = `<div class="info-card"><div class="label">🏖️ Do wolnego</div><div class="value">${label} (${wd})</div></div>`;
    }
  }

  // Nadgodziny dla dnia
  let overtimeInfo = '';
  if (!isWolne(shiftCode) && !onUrlop) {
    const otData = getOvertimes(currentYear, currentMonth, selectedDay, selectedShift);
    if (otData.przed || otData.po) {
      let items = '';
      ['przed', 'po'].forEach(pos => {
        if (!otData[pos]) return;
        const { from, to } = calcOvertimeTime(shiftCode, pos, otData[pos].hours);
        const cat = categorizeOvertime(currentYear, currentMonth, selectedDay, shiftCode, pos, otData[pos].hours);
        const dom = cat.h200 > 0 ? '200' : cat.h100 > 0 ? '100' : '50';
        const label = pos === 'przed' ? '⬅ PRZED' : 'PO ➡';
        items += `
          <div class="ot-list-item">
            <span class="oti-badge b-${dom}">+${dom}%</span>
            <div class="oti-details">
              <div class="oti-time">${label}: ${otData[pos].hours}h · ${formatTimeRange(from, to)}</div>
              ${otData[pos].note ? `<div class="oti-note">📝 ${escapeHtml(otData[pos].note)}</div>` : ''}
            </div>
          </div>
        `;
      });
      overtimeInfo = `<div class="info-card" style="grid-column:1/-1;"><div class="label">⏱ Nadgodziny</div><div class="value">${items}</div></div>`;
    }
  }

  if (onUrlop) {
    panel.innerHTML = `<h3>📅 ${dateStr} (${dow})${holidayInfo} — <span class="badge ${selectedShift}">${selectedShift}</span></h3>
      ${urlopStats}
      <div class="info-grid">
        <div class="info-card"><div class="label">Status</div><div class="value" style="color:#e67e22;">🌴 URLOP</div></div>
        <div class="info-card"><div class="label">Zaplanowana zmiana</div><div class="value">${isWolne(shiftCode) ? '🏖️ Wolne' : `<span class="shift-chip ${shiftCode}">${shiftEmoji[shiftCode]} ${shiftCode}</span>`}</div></div>
        <div class="info-card"><div class="label">📝 Notatka</div><div class="value"><input class="note-input" id="noteInput" value="${escapeHtml(notes[noteKey] || '')}" placeholder="Dodaj notatkę..."></div></div>
      </div>`;
  } else if (isWolne(shiftCode)) {
    panel.innerHTML = `<h3>📅 ${dateStr} (${dow})${holidayInfo} — <span class="badge ${selectedShift}">${selectedShift}</span></h3>
      ${urlopStats}
      <div class="info-grid">
        <div class="info-card"><div class="label">Status</div><div class="value">🏖️ Wolne</div></div>
        ${cycleInfo}
        <div class="info-card"><div class="label">📝 Notatka</div><div class="value"><input class="note-input" id="noteInput" value="${escapeHtml(notes[noteKey] || '')}" placeholder="Dodaj notatkę..."></div></div>
      </div>`;
  } else {
    const info = getRelief(currentYear, currentMonth, selectedDay, selectedShift, shiftCode);
    function formatWhen(y, m, d) {
      if (y === currentYear && m === currentMonth && d === selectedDay) return '';
      if (y === currentYear && m === currentMonth && d === selectedDay - 1) return ', wczoraj';
      if (y === currentYear && m === currentMonth && d === selectedDay + 1) return ', jutro';
      return `, ${d} ${monthNames[m-1]}${y !== currentYear ? ' '+y : ''}`;
    }
    const prevText = info.prevBrig ? `<span class="badge ${info.prevBrig}">${info.prevBrig}</span> <small>(${info.prevType}${formatWhen(info.prevYear, info.prevMonth, info.prevDay)})</small>` : '<em>—</em>';
    const nextText = info.nextBrig ? `<span class="badge ${info.nextBrig}">${info.nextBrig}</span> <small>(${info.nextType}${formatWhen(info.nextYear, info.nextMonth, info.nextDay)})</small>` : '<em>—</em>';
    panel.innerHTML = `<h3>📅 ${dateStr} (${dow})${holidayInfo} — <span class="badge ${selectedShift}">${selectedShift}</span></h3>
      ${urlopStats}
      <div class="info-grid">
        <div class="info-card"><div class="label">Zmiana</div><div class="value"><span class="shift-chip ${shiftCode}">${shiftEmoji[shiftCode]} ${shiftCode}</span> ${shiftFullName[shiftCode]}</div></div>
        <div class="info-card"><div class="label">⬅️ Kogo zmienia</div><div class="value">${prevText}</div></div>
        <div class="info-card"><div class="label">➡️ Kto zmienia dalej</div><div class="value">${nextText}</div></div>
        ${liveInfo}
        ${cycleInfo}
        ${toWolneInfo}
        ${overtimeInfo}
        <div class="info-card"><div class="label">📝 Notatka</div><div class="value"><input class="note-input" id="noteInput" value="${escapeHtml(notes[noteKey] || '')}" placeholder="Dodaj notatkę..."></div></div>
      </div>`;
  }

  const editLimitBtn = panel.querySelector('.urlop-limit-edit');
  if (editLimitBtn) {
    editLimitBtn.addEventListener('click', () => {
      const brigade = editLimitBtn.dataset.brigade;
      const currentLimit = getVacationLimit(brigade);
      const body = `
        <p>Podaj nową liczbę dni urlopu dla brygady <strong>${brigade}</strong>:</p>
        <input id="vacationLimitInput" type="number" min="0" step="1" value="${currentLimit}" style="width:100%; padding:10px; border:1px solid var(--border-cell); border-radius:8px; font-size:16px;">
      `;
      showModal({
        title: 'Ustaw limit urlopu',
        body,
        buttons: [
          { text: 'Anuluj', class: 'secondary' },
          { text: 'Zapisz', class: 'primary', onClick: () => {
              const input = document.getElementById('vacationLimitInput');
              const parsed = Number(input.value);
              if (!Number.isFinite(parsed) || parsed < 0) {
                showToast('error', 'Wpisz liczbę dni większą lub równą 0');
                return;
              }
              setVacationLimit(brigade, parsed);
              showToast('success', `Limit urlopów dla brygady ${brigade}: ${parsed} dni`);
              renderInfo();
            }
          }
        ]
      });
    });
  }

  const ni = document.getElementById('noteInput');
  if (ni) {
    ni.addEventListener('change', () => {
      const key = `${currentYear}-${currentMonth}-${selectedDay}-${selectedShift}`;
      const noteValue = ni.value.trim();
      if (noteValue) notes[key] = noteValue;
      else delete notes[key];
      saveNotes(notes);
      renderCalendar();
      showToast('success', 'Notatka zapisana');
    });
  }
}

function getLiveShiftInfo() {
  const now = new Date();
  if (now.getFullYear() !== currentYear) return '';
  const timer = getLiveTimer(getShiftAt(currentYear, now.getMonth()+1, now.getDate(), selectedShift), currentYear, now.getMonth()+1, now.getDate());
  if (timer) return `<div class="info-card" style="border:2px solid #27ae60;"><div class="label">⏱️ TRWA ZMIANA</div><div class="value" style="color:#27ae60;">${timer}</div></div>`;
  return '';
}