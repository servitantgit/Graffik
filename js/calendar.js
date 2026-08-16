/* ================================================================
   GRAFIK GILLETTE — Moduł 6: KALENDARZ MIESIĄCA + INFO + NADGODZINY
   ================================================================ */
/* === STAN: Kiedy selectedDay został ustawiony (dla mobile UX) === */

/* === RENDER MONTH VIEW === */
function renderCalendar(direction) {
  const cal = document.getElementById('calendar');
  cal.innerHTML = '';
  cal.className =
    'calendar' +
    (direction === 'right' ? ' slide-right' : direction === 'left' ? ' slide-left' : '');

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
  const cycleRange = selectedDay
    ? getCycleRange(currentYear, currentMonth, selectedDay, selectedShift)
    : null;

  const hidePrivate = isPrivacyModeEnabled();

  for (let d = 1; d <= dim; d++) {
    const cell = document.createElement('div');
    let shiftCode = getShiftAtWithPending(currentYear, currentMonth, d, selectedShift);
    let onUrlop = isUrlop(currentYear, currentMonth, d, selectedShift);
    const dirtyCell = isDirty(currentYear, currentMonth, d, selectedShift);
    if (hidePrivate) {
      shiftCode =
        factorySchedule[currentYear] &&
        factorySchedule[currentYear][currentMonth] &&
        factorySchedule[currentYear][currentMonth][selectedShift]
          ? factorySchedule[currentYear][currentMonth][selectedShift][d - 1]
          : '';
      onUrlop = false;
    }
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
    if (yHolidays[currentMonth + '-' + d]) cell.classList.add('holiday');
    if (
      today.getFullYear() === currentYear &&
      today.getMonth() + 1 === currentMonth &&
      today.getDate() === d
    )
      cell.classList.add('today');
    if (selectedDay === d) cell.classList.add('selected');
    if (!hidePrivate && dirtyCell) cell.classList.add('dirty-edit');

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
    if (yHolidays[currentMonth + '-' + d]) {
      const em = document.createElement('span');
      em.className = 'day-emoji';
      em.textContent = '🎉';
      em.title = yHolidays[currentMonth + '-' + d];
      numEl.appendChild(em);
    }
    cell.appendChild(numEl);

    const shiftEl = document.createElement('div');
    shiftEl.className = 'day-shift';
    if (onUrlop) {
      shiftEl.textContent = '';
      shiftEl.title = t('vacation');
    } else if (isWolne(shiftCode)) shiftEl.textContent = '—';
    else
      shiftEl.innerHTML = `<span class="shift-emoji">${shiftEmoji[shiftCode]}</span>${shiftCode}`;
    cell.appendChild(shiftEl);

    // Wysoka stawka: święto (+200%) lub niedziela (+100%) na dniu roboczym
    // Wysoka stawka: TYLKO gdy zmiana dodana na dzień, który fabrycznie był wolny
    if (!hidePrivate && !isWolne(shiftCode) && !onUrlop) {
      // Sprawdzamy: co było w fabrycznym grafiku dla tego dnia?
      const factoryShift =
        factorySchedule[currentYear] &&
        factorySchedule[currentYear][currentMonth] &&
        factorySchedule[currentYear][currentMonth][selectedShift]
          ? factorySchedule[currentYear][currentMonth][selectedShift][d - 1]
          : '';
      const wasFactoryFree = isWolne(factoryShift);

      // Badge pokazujemy TYLKO gdy zmiana dodana (fabrycznie było wolno)
      if (wasFactoryFree) {
        const isHoliday = !!yHolidays[currentMonth + '-' + d];
        const dowLocal = new Date(currentYear, currentMonth - 1, d).getDay();
        let rate = null;
        if (isHoliday) rate = '200';
        else if (dowLocal === 0) rate = '100';

        if (rate) {
          const rateBadge = document.createElement('div');
          rateBadge.className = `shift-rate-badge rate-${rate}`;
          rateBadge.textContent = `+${rate}%`;
          rateBadge.title = rate === '200' ? 'Święto — stawka +200%' : 'Niedziela — stawka +100%';
          cell.appendChild(rateBadge);
        }
      }
    }

    // NADGODZINY: wizualny podział + etykiety
    if (!hidePrivate && !isWolne(shiftCode) && !onUrlop) {
      const ot = getOvertimes(currentYear, currentMonth, d, selectedShift);
      if (ot.przed || ot.po) {
        cell.classList.add('has-ot');
        if (ot.przed) {
          const cat = categorizeOvertime(
            currentYear,
            currentMonth,
            d,
            shiftCode,
            'przed',
            ot.przed.hours
          );
          const dominant = cat.h200 > 0 ? '200' : cat.h100 > 0 ? '100' : '50';
          const stripL = document.createElement('div');
          stripL.className = `ot-strip ot-left ot-${dominant}`;
          stripL.textContent = `+${dominant}%`;
          cell.appendChild(stripL);
        }
        if (ot.po) {
          const cat = categorizeOvertime(
            currentYear,
            currentMonth,
            d,
            shiftCode,
            'po',
            ot.po.hours
          );
          const dominant = cat.h200 > 0 ? '200' : cat.h100 > 0 ? '100' : '50';
          const stripR = document.createElement('div');
          stripR.className = `ot-strip ot-right ot-${dominant}`;
          stripR.textContent = `+${dominant}%`;
          cell.appendChild(stripR);
        }
        const actualTime = getActualWorkTime(
          currentYear,
          currentMonth,
          d,
          selectedShift,
          shiftCode
        );
        if (actualTime) {
          const timeEl = document.createElement('div');
          timeEl.className = 'day-actual-time';
          timeEl.textContent = actualTime;
          cell.appendChild(timeEl);
        }
      }
    }

    const noteKey = `${currentYear}-${currentMonth}-${d}-${selectedShift}`;
    if (!hidePrivate && notes[noteKey]) {
      const nEl = document.createElement('div');
      nEl.className = 'day-note';
      nEl.textContent = '📝';
      nEl.title = notes[noteKey];
      cell.appendChild(nEl);
    }

    if (!editMode && !isWolne(shiftCode)) {
      addReliefPopups(cell, d, shiftCode, onUrlop);
    }

    cell.addEventListener('click', () => {
      if (editMode) {
        // CYCLIC SHIFT TOGGLE: R (Rano) -> P (Popołudnie) -> N (Noc) -> W (Wolne) -> R
        // Free day is stored as '' internally ('W' is only its display/CSS representation).
        const shiftCycle = ['R', 'P', 'N', ''];
        const currentShift =
          getShiftAtWithPending(currentYear, currentMonth, d, selectedShift) || '';
        let nextIndex = shiftCycle.indexOf(currentShift);
        if (nextIndex === -1) {
          nextIndex = 0; // Unknown/empty/W -> 'R'
        } else {
          nextIndex = (nextIndex + 1) % shiftCycle.length;
        }
        const nextShift = shiftCycle[nextIndex];

        // Register in undo/redo history + dirty tracking, then re-render immediately
        applyEdit(currentYear, currentMonth, d, selectedShift, nextShift);
        selectedDay = d;
        refreshViews();
        return;
      }
      selectedDay = selectedDay === d ? null : d;
      renderCalendar();
      renderInfo();
    });

    cal.appendChild(cell);
  }

  const monthTitle = getElementByIdSafe('monthTitle');
  if (monthTitle) monthTitle.textContent = `${monthNames[currentMonth - 1]} ${currentYear}`;

  renderMonthOvertimeSummary();
}

/* === POPUPY ZMIAN (relief) === */
function addReliefPopups(cell, d, shiftCode, onUrlop) {
  if (!isWolne(shiftCode) && !onUrlop) {
    const info = getRelief(currentYear, currentMonth, d, selectedShift, shiftCode);

    const leftPopup = document.createElement('div');
    const prevCls = info.prevBrig ? info.prevType : 'none';
    leftPopup.className = 'relief-popup left pop-' + prevCls;
    const prevWhen =
      info.prevYear !== currentYear || info.prevMonth !== currentMonth
        ? `${info.prevDay} ${monthNamesShort[info.prevMonth - 1]}${info.prevYear !== currentYear ? ' ' + info.prevYear : ''}`
        : info.prevDay === d
          ? t('todayLabel')
          : info.prevDay === d - 1
            ? t('dayBefore')
            : `${info.prevDay}`;
    leftPopup.innerHTML = `<div class="rp-label">⬅ ${t('infoPrevShift')}</div><div class="rp-brig">${info.prevBrig || '—'}</div><div class="rp-info">${info.prevType} · ${prevWhen}</div>`;
    if (info.prevBrig) {
      leftPopup.style.pointerEvents = 'auto';
      leftPopup.style.cursor = 'pointer';
    }
    cell.appendChild(leftPopup);

    const rightPopup = document.createElement('div');
    const nextCls = info.nextBrig ? info.nextType : 'none';
    rightPopup.className = 'relief-popup right pop-' + nextCls;
    const nextWhen =
      info.nextYear !== currentYear || info.nextMonth !== currentMonth
        ? `${info.nextDay} ${monthNamesShort[info.nextMonth - 1]}${info.nextYear !== currentYear ? ' ' + info.nextYear : ''}`
        : info.nextDay === d
          ? t('todayLabel')
          : info.nextDay === d + 1
            ? t('dayAfter')
            : `${info.nextDay}`;
    rightPopup.innerHTML = `<div class="rp-label">${t('infoNextShift')} ➡</div><div class="rp-brig">${info.nextBrig || '—'}</div><div class="rp-info">${info.nextType} · ${nextWhen}</div>`;
    if (info.nextBrig) {
      rightPopup.style.pointerEvents = 'auto';
      rightPopup.style.cursor = 'pointer';
    }
    cell.appendChild(rightPopup);
  }
}

/* === MODAL: DODAJ DODATKOWĄ ZMIANĘ === */
function openAddShiftModal(day) {
  const yHolidays = buildHolidays(currentYear);
  const isHoliday = !!yHolidays[currentMonth + '-' + day];
  const dowLocal = new Date(currentYear, currentMonth - 1, day).getDay();
  const isSunday = dowLocal === 0;
  const rateInfo = isHoliday ? '+200% (święto)' : isSunday ? '+100% (niedziela)' : '';
  const rateHtml = rateInfo
    ? `<div style="margin-top:6px; padding:6px 10px; background:var(--bg-info); border-radius:6px; font-size:13px; text-align:center; font-weight:600;">💰 ${rateInfo}</div>`
    : '';

  // Check if day already has a custom shift (for showing/highlighting Empty button)
  const existingShift = getShiftAtWithPending(currentYear, currentMonth, day, selectedShift);
  const hasExistingShift = !isWolne(existingShift);

  const body = `
    <div style="padding:10px 14px; background:var(--bg-cell); border-radius:10px; margin-bottom:15px; font-size:13px;">
      <b>📅 ${day} ${monthNames[currentMonth - 1]} ${currentYear}</b>
      ${hasExistingShift ? `<div style="margin-top:6px; font-size:12px; opacity:0.85;">${t('addShiftCurrent') || 'Obecnie'}: <b>${existingShift}</b></div>` : ''}
      ${rateHtml}
    </div>
    <div style="font-weight:600; margin-bottom:10px;">${t('addShiftSelectType')}:</div>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <button class="add-shift-modal-btn" data-shift="R" style="flex:1; min-width:90px; padding:14px 8px; border:none; background:var(--color-R); color:#fff; border-radius:10px; cursor:pointer; font-size:15px; font-weight:700;">🌅 R<br><small style="opacity:0.85; font-weight:500;">6:00-14:00</small></button>
      <button class="add-shift-modal-btn" data-shift="P" style="flex:1; min-width:90px; padding:14px 8px; border:none; background:var(--color-P); color:#fff; border-radius:10px; cursor:pointer; font-size:15px; font-weight:700;">🌤️ P<br><small style="opacity:0.85; font-weight:500;">14:00-22:00</small></button>
      <button class="add-shift-modal-btn" data-shift="N" style="flex:1; min-width:90px; padding:14px 8px; border:none; background:var(--color-N); color:#fff; border-radius:10px; cursor:pointer; font-size:15px; font-weight:700;">🌙 N<br><small style="opacity:0.85; font-weight:500;">22:00-6:00</small></button>
      <button class="add-shift-modal-btn" data-shift="" style="flex:1; min-width:90px; padding:14px 8px; border:none; background:linear-gradient(135deg, #7f8c8d, #5d6d6e); color:#fff; border-radius:10px; cursor:pointer; font-size:15px; font-weight:700;" title="${t('addShiftEraseTitle') || 'Wyczyść zmianę'}">🏖️ —<br><small style="opacity:0.85; font-weight:500;">${t('addShiftEraseLabel') || 'Wolne'}</small></button>
    </div>
  `;

  showModal({
    title: t('addShiftTitle'),
    body: body,
    buttons: [{ text: t('otCancelBtn'), class: 'secondary' }],
  });

  // Attach handlers after modal is shown
  setTimeout(() => {
    document.querySelectorAll('.add-shift-modal-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const shiftType = btn.dataset.shift;
        applyEdit(currentYear, currentMonth, day, selectedShift, shiftType);
        showToast('success', t('addShiftAdded', { s: shiftType }));
        hideModal();
        refreshViews();
      });
    });
  }, 50);
}

/* === MODAL NADGODZIN === */
let otModalContext = null;

function openOvertimeModal(day, shift, position, existing) {
  otModalContext = { day, shift, position };
  const overlay = document.getElementById('otOverlay');

  const [sh, eh] = shiftHours[shift];
  const shiftTimeStr = `${String(sh).padStart(2, '0')}:00-${String(eh % 24).padStart(2, '0')}:00`;
  const posLabel = position === 'przed' ? t('otPositionBefore') : t('otPositionAfter');
  const posArrow = position === 'przed' ? '⬅' : '➡';

  document.getElementById('otTitle').textContent =
    `${t('otTitle')} ${posArrow} ${posLabel} ${shift}`;

  document.getElementById('otContext').innerHTML = `
    <b>${t('infoDate')}</b> ${day} ${monthNames[currentMonth - 1]} ${currentYear}<br>
    <b>${t('infoShiftLabel')}</b> ${shift} (${shiftTimeStr})<br>
    <b>${t('infoPosition')}</b> ${posArrow} ${posLabel}
  `;

  document.getElementById('otNote').value = existing ? existing.note || '' : '';
  document.getElementById('otCustomHours').value = '';

  document.querySelectorAll('.ot-qbtn').forEach((b) => b.classList.remove('active'));
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
  cancelBtn.textContent = t('otCancelBtn');
  cancelBtn.onclick = () => overlay.classList.remove('show');
  footer.appendChild(cancelBtn);

  // Delete button — shown only if overtime exists for current position
  // (updated dynamically when user switches PRZED/PO via radio)
  const delBtn = document.createElement('button');
  delBtn.className = 'modal-btn danger';
  delBtn.id = 'otDeleteBtn';
  delBtn.textContent = '🗑 ' + t('otDeleteBtn');
  delBtn.onclick = () => {
    const currentPos = otModalContext.position;
    removeOvertime(currentYear, currentMonth, day, selectedShift, currentPos);
    overlay.classList.remove('show');
    showToast('success', t('otDeleted'));
    refreshViews();
  };
  // Show only if overtime exists for INITIAL position
  delBtn.style.display = existing ? 'inline-block' : 'none';
  footer.appendChild(delBtn);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'modal-btn success';
  saveBtn.textContent = t('otSaveBtn');
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
    <div style="font-weight:700; color:var(--text-header); margin-bottom:6px;">${t('otPreview')}</div>
    <div>${t('infoTime')} <b>${formatTimeRange(from, to)}</b> (${hours}h)</div>
    ${crossesMidnight ? `<div style="color:#c0392b; font-weight:700; margin-top:4px;">${t('otCrossesMidnight')}</div>` : ''}
    ${cat.h50 > 0 ? `<div>🟡 <b>+50%</b>: ${cat.h50}h → ${cat.h50 * 1.5}h ${t('infoPaid')}</div>` : ''}
    ${cat.h100 > 0 ? `<div>🟣 <b>+100%</b>: ${cat.h100}h → ${cat.h100 * 2}h ${t('infoPaid')}</div>` : ''}
    ${cat.h200 > 0 ? `<div>🔴 <b>+200%</b>: ${cat.h200}h → ${cat.h200 * 3}h ${t('infoPaid')}</div>` : ''}
    <div style="margin-top:6px; padding-top:6px; border-top:1px solid var(--border-cell); font-weight:700;">
      ${t('otPayment')}: ${paid}h
    </div>
  `;
}

function saveOvertimeFromModal() {
  if (!otModalContext) return;
  const hours = getSelectedHours();
  if (!hours || hours <= 0) {
    showToast('error', t('otSelectHours'));
    return;
  }
  const note = document.getElementById('otNote').value.trim();
  const { day, position } = otModalContext;
  setOvertime(currentYear, currentMonth, day, selectedShift, position, { hours, note });
  document.getElementById('otOverlay').classList.remove('show');
  showToast('success', t('otSaved', { h: hours }));
  refreshViews();
}

document.getElementById('otClose').onclick = () =>
  document.getElementById('otOverlay').classList.remove('show');
document.getElementById('otOverlay').onclick = (e) => {
  if (e.target.id === 'otOverlay') document.getElementById('otOverlay').classList.remove('show');
};

document.querySelectorAll('.ot-qbtn').forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll('.ot-qbtn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('otCustomHours').value = '';
    updateOvertimePreview(parseFloat(btn.dataset.h));
  };
});

document.getElementById('otCustomHours').addEventListener('input', (e) => {
  const v = parseFloat(e.target.value);
  if (!isNaN(v) && v > 0) {
    document.querySelectorAll('.ot-qbtn').forEach((b) => b.classList.remove('active'));
    updateOvertimePreview(v);
  }
});

/* === PODSUMOWANIE NADGODZIN MIESIĄCA === */
function renderMonthOvertimeSummary() {
  const old = document.getElementById('otMonthSummary');
  if (old) old.remove();
  if (isPrivacyModeEnabled()) return;

  const sum = getMonthOvertimeSummary(currentYear, currentMonth, selectedShift);
  if (sum.count === 0) return;

  const paid = sum.h50 * 1.5 + sum.h100 * 2 + sum.h200 * 3;
  const totalH = sum.h50 + sum.h100 + sum.h200;

  const el = document.createElement('div');
  el.id = 'otMonthSummary';
  el.className = 'ot-summary';
  el.innerHTML = `
    <div class="ot-summary-title">${t('otMonthSummary')} (${sum.count} ${sum.count === 1 ? t('otMonthEntry') : t('otMonthEntries')})</div>
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
      ${t('otMonthTotal')}: <b>${totalH}h</b> ${t('otMonthWorked')} · 💰 <b>${paid}h</b> ${t('otMonthPaid')}
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
  if (today.getFullYear() !== currentYear || today.getMonth() + 1 !== currentMonth) {
    progressFill.style.width = '0%';
    progressLabel.textContent = '';
    return;
  }
  const ySched = getYearSchedule(currentYear);
  const arr = ySched[currentMonth][selectedShift];
  const totalHours = getMonthHours(currentYear, currentMonth)[selectedShift] || 1;
  let workedHours = 0;
  for (let i = 0; i < today.getDate() && i < arr.length; i++) {
    if (!isWolne(arr[i]) && !isUrlop(currentYear, currentMonth, i + 1, selectedShift))
      workedHours += 8;
  }
  const pct = Math.round((workedHours / totalHours) * 100);
  progressFill.style.width = Math.min(pct, 100) + '%';
  progressLabel.textContent = t('infoBrigadeHours', {
    brig: selectedShift,
    worked: workedHours,
    total: totalHours,
    pct: pct,
  });
}

/* === INFO PANEL === */
function renderInfo() {
  const panel = document.getElementById('infoPanel');
  if (!selectedDay) {
    panel.innerHTML = `<h3>${t('infoPanelTitle')}</h3><p>${t('infoPanelHint')}</p>`;
    return;
  }
  const hidePrivate = isPrivacyModeEnabled();
  let shiftCode = getShiftAtWithPending(currentYear, currentMonth, selectedDay, selectedShift);
  if (hidePrivate) {
    shiftCode =
      factorySchedule[currentYear] &&
      factorySchedule[currentYear][currentMonth] &&
      factorySchedule[currentYear][currentMonth][selectedShift]
        ? factorySchedule[currentYear][currentMonth][selectedShift][selectedDay - 1]
        : '';
  }
  const dateStr = `${selectedDay} ${monthNames[currentMonth - 1]} ${currentYear}`;
  const dowIdx = new Date(currentYear, currentMonth - 1, selectedDay).getDay();
  const dow = dayNamesFull[dowIdx];
  const yHolidays = buildHolidays(currentYear);
  const holidayName = yHolidays[currentMonth + '-' + selectedDay];
  const holidayInfo = holidayName ? ` <span style="color:#c0392b;">🎉 ${holidayName}</span>` : '';
  const noteKey = `${currentYear}-${currentMonth}-${selectedDay}-${selectedShift}`;
  const onUrlop = hidePrivate
    ? false
    : isUrlop(currentYear, currentMonth, selectedDay, selectedShift);

  const totalUrlop = (urlops[selectedShift] || []).filter((k) =>
    k.startsWith(currentYear + '-')
  ).length;
  const usedUrlop = countWorkingUrlops(currentYear, selectedShift);
  const limit = getVacationLimit(selectedShift);
  const overLimit = usedUrlop > limit;
  const urlopStats = hidePrivate
    ? ''
    : `<div class="urlop-stats info-section-vacation">
    <span>${t('infoUrlopStats', { brig: selectedShift, year: currentYear })}<br><small style="opacity:.9;font-weight:normal;">${t('infoUrlopMarked')}: ${totalUrlop} • ${t('infoUrlopWorking')}: ${usedUrlop}</small></span>
    <div style="display:flex; align-items:center; gap:6px;">
      <span><span class="us-count ${overLimit ? 'us-over' : ''}">${usedUrlop}</span> / ${limit} ${overLimit ? '⚠️' : ''}</span>
      <button class="urlop-limit-edit" data-brigade="${selectedShift}" title="${t('infoUrlopLimitEdit', { brig: selectedShift })}" style="border:none; background:rgba(255,255,255,0.18); color:inherit; border-radius:6px; width:24px; height:24px; cursor:pointer;">✏️</button>
    </div>
  </div>`;

  let liveInfo = '';
  if (!hidePrivate) {
    const lv = getLiveShiftInfo();
    if (lv) liveInfo = lv;
  }

  let cycleInfo = ''; // Prybrane: nie potrzebne w codziennym użytkowaniu

  let toWolneInfo = '';
  if (!hidePrivate && !isWolne(shiftCode) && !onUrlop) {
    const w = daysToNextWolne(currentYear, currentMonth, selectedDay, selectedShift);
    if (w && w.days > 0) {
      const wd = `${w.day} ${monthNames[w.month - 1]}${w.year !== currentYear ? ' ' + w.year : ''}`;
      const label = w.days === 1 ? t('tomorrow') : t('inDays', { n: w.days });
      toWolneInfo = `<div class="info-card"><div class="label">${t('infoNextDayOff')}</div><div class="value">${label} (${wd})</div></div>`;
    }
  }

  // Nadgodziny dla dnia — pokazujemy WSZYSTKIE godziny ze stawką (włącznie z dodaną zmianą w święto/niedzielę)
  let overtimeInfo = '';
  if (!hidePrivate && !isWolne(shiftCode) && !onUrlop) {
    const otData = getOvertimes(currentYear, currentMonth, selectedDay, selectedShift);

    // Sprawdź czy to dodana zmiana w święto/niedzielę (fabrycznie było wolno)
    const factoryShift =
      factorySchedule[currentYear] &&
      factorySchedule[currentYear][currentMonth] &&
      factorySchedule[currentYear][currentMonth][selectedShift]
        ? factorySchedule[currentYear][currentMonth][selectedShift][selectedDay - 1]
        : '';
    const wasFactoryFree = isWolne(factoryShift);
    const isHoliday = !!yHolidays[currentMonth + '-' + selectedDay];
    const dowLocal = new Date(currentYear, currentMonth - 1, selectedDay).getDay();
    const isSunday = dowLocal === 0;
    const isAddedPremiumShift = wasFactoryFree && (isHoliday || isSunday);
    const shiftRate = isHoliday ? '200' : isSunday ? '100' : null;

    // Zbieramy wszystkie pozycje
    let items = '';
    let totalHours = 0;
    let totalPaid = 0;

    // 1. Dodana zmiana w święto/niedzielę — jako pierwsza pozycja
    if (isAddedPremiumShift && shiftRate) {
      const [sh, eh] = shiftHours[shiftCode];
      const shiftTimeStr = `${String(sh).padStart(2, '0')}:00 – ${String(eh % 24).padStart(2, '0')}:00`;
      const shiftLabel = isHoliday ? 'Święto' : 'Niedziela';
      const multiplier = shiftRate === '200' ? 3 : 2;
      items += `
        <div class="ot-list-item" style="border-left: 3px solid ${shiftRate === '200' ? '#c0392b' : '#8e44ad'};">
          <span class="oti-badge b-${shiftRate}">+${shiftRate}%</span>
          <div class="oti-details">
            <div class="oti-time"><b>Zmiana ${shiftCode}</b>: 8h · ${shiftTimeStr} <small>(${shiftLabel})</small></div>
          </div>
        </div>
      `;
      totalHours += 8;
      totalPaid += 8 * multiplier;
    }

    // 2. Standardowe nadgodziny PRZED/PO
    ['przed', 'po'].forEach((pos) => {
      if (!otData[pos]) return;
      const { from, to } = calcOvertimeTime(shiftCode, pos, otData[pos].hours);
      const cat = categorizeOvertime(
        currentYear,
        currentMonth,
        selectedDay,
        shiftCode,
        pos,
        otData[pos].hours
      );
      const dom = cat.h200 > 0 ? '200' : cat.h100 > 0 ? '100' : '50';
      const label = pos === 'przed' ? t('otWeekBefore') : t('otWeekAfter');
      const multiplier = dom === '200' ? 3 : dom === '100' ? 2 : 1.5;
      items += `
        <div class="ot-list-item">
          <span class="oti-badge b-${dom}">+${dom}%</span>
          <div class="oti-details">
            <div class="oti-time">${label}: ${otData[pos].hours}h · ${formatTimeRange(from, to)}</div>
            ${otData[pos].note ? `<div class="oti-note">📝 ${escapeHtml(otData[pos].note)}</div>` : ''}
          </div>
        </div>
      `;
      totalHours += otData[pos].hours;
      totalPaid += otData[pos].hours * multiplier;
    });

    // Pokaż blok TYLKO jeśli są jakieś pozycje ze stawką
    if (items) {
      const summary =
        totalHours > 0
          ? `<div style="margin-top:8px; padding-top:8px; border-top:1px solid var(--border-cell); font-weight:700; text-align:center;">
             📊 Razem dziś: <b>${totalHours}h</b> pracy · 💰 <b>${totalPaid}h</b> płatne
           </div>`
          : '';
      overtimeInfo = `<div class="info-card info-section-ot" style="grid-column:1/-1;"><div class="label">${t('infoOvertime')}</div><div class="value">${items}${summary}</div></div>`;
    }
  }

  if (onUrlop) {
    panel.innerHTML = `<h3>📅 ${dateStr} (${dow})${holidayInfo} — <span class="badge ${selectedShift}">${selectedShift}</span></h3>
      ${urlopStats}
      <div class="info-grid">
        <div class="info-card"><div class="label">${t('infoStatus')}</div><div class="value" style="color:#e67e22;">${t('infoUrlop')}</div></div>
        <div class="info-card"><div class="label">${t('infoPlannedShift')}</div><div class="value">${isWolne(shiftCode) ? t('infoFree') : `<span class="shift-chip ${shiftCode}">${shiftEmoji[shiftCode]} ${shiftCode}</span>`}</div></div>
        ${hidePrivate ? '' : `<div class="info-card info-section-note" style="grid-column:1/-1;"><div class="label">${t('infoNote')}</div><div class="value"><input class="note-input" id="noteInput" value="${escapeHtml(notes[noteKey] || '')}" placeholder="${t('infoNotePlaceholder')}"></div></div>`}
      </div>`;
  } else if (isWolne(shiftCode)) {
    panel.innerHTML = `<h3>📅 ${dateStr} (${dow})${holidayInfo} — <span class="badge ${selectedShift}">${selectedShift}</span></h3>
      ${urlopStats}
      <div class="info-grid">
        <div class="info-card"><div class="label">${t('infoStatus')}</div><div class="value">${t('infoFree')}</div></div>
        ${cycleInfo}
        ${overtimeInfo}
        ${hidePrivate ? '' : `<div class="info-card" style="grid-column:1/-1;"><div class="label">${t('infoNote')}</div><div class="value"><input class="note-input" id="noteInput" value="${escapeHtml(notes[noteKey] || '')}" placeholder="${t('infoNotePlaceholder')}"></div></div>`}
      </div>`;
  } else {
    const info = getRelief(currentYear, currentMonth, selectedDay, selectedShift, shiftCode);
    function formatWhen(y, m, d) {
      if (y === currentYear && m === currentMonth && d === selectedDay) return '';
      if (y === currentYear && m === currentMonth && d === selectedDay - 1)
        return ', ' + t('dayBefore');
      if (y === currentYear && m === currentMonth && d === selectedDay + 1)
        return ', ' + t('dayAfter');
      return `, ${d} ${monthNames[m - 1]}${y !== currentYear ? ' ' + y : ''}`;
    }
    // Kombinowana karta: kto przekazał + kto przyjmie
    const prevPart = info.prevBrig
      ? `<span class="badge ${info.prevBrig}">${info.prevBrig}</span> <small style="opacity:0.85;">${info.prevType}${formatWhen(info.prevYear, info.prevMonth, info.prevDay)}</small>`
      : '<em>—</em>';
    const nextPart = info.nextBrig
      ? `<span class="badge ${info.nextBrig}">${info.nextBrig}</span> <small style="opacity:0.85;">${info.nextType}${formatWhen(info.nextYear, info.nextMonth, info.nextDay)}</small>`
      : '<em>—</em>';
    const reliefCard = `
      <div class="info-card" style="grid-column:1/-1;">
        <div class="label">🔄 ${t('infoPrevShift').replace('⬅️ ', '').replace('⬅ ', '')} / ${t('infoNextShift').replace('➡️ ', '').replace('➡ ', '')}</div>
        <div class="value" style="display:flex; gap:12px; flex-wrap:wrap; align-items:center; justify-content:space-around;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:16px; opacity:0.7;">⬅️</span>
            <div>${prevPart}</div>
          </div>
          <div style="width:1px; background:var(--border-cell); height:28px;"></div>
          <div style="display:flex; align-items:center; gap:8px;">
            <div>${nextPart}</div>
            <span style="font-size:16px; opacity:0.7;">➡️</span>
          </div>
        </div>
      </div>
    `;

    panel.innerHTML = `<h3>📅 ${dateStr} (${dow})${holidayInfo} — <span class="badge ${selectedShift}">${selectedShift}</span></h3>
      ${urlopStats}
      <div class="info-grid">
        <div class="info-card"><div class="label">${t('infoShift')}</div><div class="value"><span class="shift-chip ${shiftCode}">${shiftEmoji[shiftCode]} ${shiftCode}</span> ${shiftFullName[shiftCode]}</div></div>
        ${reliefCard}
        ${liveInfo}
        ${cycleInfo}
        ${toWolneInfo}
        ${overtimeInfo}
        ${hidePrivate ? '' : `<div class="info-card" style="grid-column:1/-1;"><div class="label">${t('infoNote')}</div><div class="value"><input class="note-input" id="noteInput" value="${escapeHtml(notes[noteKey] || '')}" placeholder="${t('infoNotePlaceholder')}"></div></div>`}
      </div>`;
  }

  const editLimitBtn = panel.querySelector('.urlop-limit-edit');
  if (editLimitBtn) {
    editLimitBtn.addEventListener('click', () => {
      const brigade = editLimitBtn.dataset.brigade;
      const currentLimit = getVacationLimit(brigade);
      const body = `
        <p>${t('vacationLimitBody', { brig: brigade })}</p>
        <input id="vacationLimitInput" type="number" min="0" step="1" value="${currentLimit}" style="width:100%; padding:10px; border:1px solid var(--border-cell); border-radius:8px; font-size:16px;">
      `;
      showModal({
        title: t('vacationLimitTitle'),
        body,
        buttons: [
          { text: t('vacationLimitCancel'), class: 'secondary' },
          {
            text: t('vacationLimitSave'),
            class: 'primary',
            onClick: () => {
              const input = document.getElementById('vacationLimitInput');
              const parsed = Number(input.value);
              if (!Number.isFinite(parsed) || parsed < 0) {
                showToast('error', t('vacationLimitInvalid'));
                return;
              }
              setVacationLimit(brigade, parsed);
              showToast('success', t('vacationLimitSet', { brig: brigade, n: parsed }));
              renderInfo();
            },
          },
        ],
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
      showToast('success', t('infoNoteSaved'));
    });
  }
}

function getLiveShiftInfo() {
  const now = new Date();
  if (now.getFullYear() !== currentYear) return '';
  const timer = getLiveTimer(
    getShiftAt(currentYear, now.getMonth() + 1, now.getDate(), selectedShift),
    currentYear,
    now.getMonth() + 1,
    now.getDate()
  );
  if (timer)
    return `<div class="info-card" style="border:2px solid #27ae60;"><div class="label">${t('infoLiveShift')}</div><div class="value" style="color:#27ae60;">${timer}</div></div>`;
  return '';
}
