/* ================================================================
    GRAFIK GILLETTE — Module 6: MONTH CALENDAR + INFO + OVERTIME
    ================================================================ */
/* === STATE: when selectedDay was set (for mobile UX) === */

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
  const hidePrivate = !shouldShowPersonalData();

  // cycleRange must use the same data source as cell rendering:
  // factory schedule when logged out, personal schedule when logged in.
  // Otherwise cycle highlighting can leak personal edits or disagree with visible cells.
  let cycleRange = null;
  if (selectedDay) {
    if (hidePrivate) {
      cycleRange = getFactoryCycleRange(currentYear, currentMonth, selectedDay, selectedShift);
    } else {
      cycleRange = getCycleRange(currentYear, currentMonth, selectedDay, selectedShift);
    }
  }

  for (let d = 1; d <= dim; d++) {
    const cell = document.createElement('div');
    let shiftCode = getShiftAtWithPending(currentYear, currentMonth, d, selectedShift);
    let onUrlop = isUrlop(currentYear, currentMonth, d, selectedShift);
    
    
    // Factory painting mode override - show factory drafts when active
    const isFactoryPaintingMode = factoryPaintActive && 
                                  factoryPaintYear === currentYear && 
                                  factoryPaintMonth === currentMonth;
    if (isFactoryPaintingMode) {
      // Show factory drafts for the selected shift
      shiftCode = window.getFactoryDraftShiftAt(currentYear, currentMonth, d, selectedShift) || '';
      onUrlop = false; // URLop logic doesn't apply in factory painting mode
    } else if (hidePrivate) {
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
    // Position within the week (0=Mon, 6=Sun) for correct popup positioning
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
    

    if (cycleRange && cycleRange.length > 1 && d >= cycleRange.start && d <= cycleRange.end) {
      if (d === cycleRange.start) cell.classList.add('cycle-start');
      else if (d === cycleRange.end) cell.classList.add('cycle-end');
      else cell.classList.add('cycle-middle');
    }

    if (compareShift) {
      // Compare must use the same data source as visible cells (factory when privacy)
      let s1, s2;
      if (hidePrivate) {
        s1 =
          factorySchedule[currentYear] &&
          factorySchedule[currentYear][currentMonth] &&
          factorySchedule[currentYear][currentMonth][selectedShift]
            ? factorySchedule[currentYear][currentMonth][selectedShift][d - 1]
            : '';
        s2 =
          factorySchedule[currentYear] &&
          factorySchedule[currentYear][currentMonth] &&
          factorySchedule[currentYear][currentMonth][compareShift]
            ? factorySchedule[currentYear][currentMonth][compareShift][d - 1]
            : '';
      } else {
        s1 = getShiftAtWithPending(currentYear, currentMonth, d, selectedShift);
        s2 = getShiftAtWithPending(currentYear, currentMonth, d, compareShift);
      }
      if (s1 === s2 && !isWolne(s1)) cell.classList.add('compare-match');
      if (isWolne(s1) && isWolne(s2)) cell.classList.add('compare-match');
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
      shiftEl.innerHTML = `<span class="shift-emoji">🌴</span>`;
      shiftEl.title = t('vacation');
      shiftEl.classList.add('day-shift-urlop');
    } else if (isWolne(shiftCode)) shiftEl.textContent = '—';
    else
      shiftEl.innerHTML = `<span class="shift-emoji">${shiftEmoji[shiftCode]}</span>${shiftCode}`;
    cell.appendChild(shiftEl);

    // OVERTIME: colored ⏱ marker (detail in info-panel)
    if (!hidePrivate && !isWolne(shiftCode) && !onUrlop) {
      const ot = getOvertimes(currentYear, currentMonth, d, selectedShift);
      if (ot.przed || ot.po) {
        cell.classList.add('has-ot');
        let maxRate = 50;
        const parts = [];
        if (ot.przed) {
          const cat = categorizeOvertime(
            currentYear,
            currentMonth,
            d,
            shiftCode,
            'przed',
            ot.przed.hours
          );
          const r = cat.h200 > 0 ? 200 : cat.h100 > 0 ? 100 : 50;
          if (r > maxRate) maxRate = r;
          parts.push(`${t('otBefore') || 'przed'}: ${ot.przed.hours}h +${r}%`);
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
          const r = cat.h200 > 0 ? 200 : cat.h100 > 0 ? 100 : 50;
          if (r > maxRate) maxRate = r;
          parts.push(`${t('otAfter') || 'po'}: ${ot.po.hours}h +${r}%`);
        }

        // Corner clock — palette colors: 50 gray, 100 purple, 200 red
        // Detail popup removed — OT details live in info-panel / timeline
        const marker = document.createElement('div');
        marker.className = `ot-marker ot-${maxRate}`;
        marker.textContent = '⏱';
        marker.title = parts.join(' · ');
        cell.appendChild(marker);
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

    // Relief handoff popups removed — functionality lives in info-panel timeline widget

cell.addEventListener('click', () => {
      // Factory painting mode: apply direct shift replacement (admin factory editing)
      // Free day is stored as '' internally ('W' is only its display/CSS representation).
      if (factoryPaintActive && 
          factoryPaintYear === currentYear && 
          factoryPaintMonth === currentMonth) {
        const val = factoryPaintMode === 'W' ? '' : factoryPaintMode;
        window.handleFactoryPaintDayClick(currentYear, currentMonth, d, selectedShift, val);
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


  renderMonthOvertimeSummary();
}

/* === POPUPY ZMIAN (relief) — removed; timeline widget in info-panel replaces them === */

/* === MODAL: ADD EXTRA SHIFT === */
function openAddShiftModal(day) {
  const yHolidays = buildHolidays(currentYear);
  const isHoliday = !!yHolidays[currentMonth + '-' + day];
  const dowLocal = new Date(currentYear, currentMonth - 1, day).getDay();
  const isSunday = dowLocal === 0;
  const rateInfo = isHoliday
    ? `+200% (${t('labelHoliday')})`
    : isSunday
      ? `+100% (${t('labelSunday')})`
      : '';
  const rateHtml = rateInfo
    ? `<div style="margin-top:6px; padding:6px 10px; background:var(--bg-info); border-radius:6px; font-size:13px; text-align:center; font-weight:600;">💰 ${rateInfo}</div>`
    : '';

  // Check if day already has a custom shift (for showing/highlighting Empty button)
  const existingShift = getShiftAtWithPending(currentYear, currentMonth, day, selectedShift);
  const hasExistingShift = !isWolne(existingShift);

  const body = `
    <div style="padding:10px 14px; background:var(--bg-cell); border-radius:10px; margin-bottom:15px; font-size:13px;">
      <b>📅 ${day} ${monthNamesGenitive[currentMonth - 1]} ${currentYear}</b>
      ${hasExistingShift ? `<div style="margin-top:6px; font-size:12px; opacity:0.85;">${t('addShiftCurrent') || 'Currently'}: <b>${existingShift}</b></div>` : ''}
      ${rateHtml}
    </div>
    <div style="font-weight:600; margin-bottom:10px;">${t('addShiftSelectType')}:</div>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <button class="add-shift-modal-btn" data-shift="R" style="flex:1; min-width:90px; padding:14px 8px; border:none; background:var(--color-R); color:#fff; border-radius:10px; cursor:pointer; font-size:15px; font-weight:700;">🌅 R<br><small style="opacity:0.85; font-weight:500;">6:00-14:00</small></button>
      <button class="add-shift-modal-btn" data-shift="P" style="flex:1; min-width:90px; padding:14px 8px; border:none; background:var(--color-P); color:#fff; border-radius:10px; cursor:pointer; font-size:15px; font-weight:700;">🌤️ P<br><small style="opacity:0.85; font-weight:500;">14:00-22:00</small></button>
      <button class="add-shift-modal-btn" data-shift="N" style="flex:1; min-width:90px; padding:14px 8px; border:none; background:var(--color-N); color:#fff; border-radius:10px; cursor:pointer; font-size:15px; font-weight:700;">🌙 N<br><small style="opacity:0.85; font-weight:500;">22:00-6:00</small></button>
      <button class="add-shift-modal-btn" data-shift="" style="flex:1; min-width:90px; padding:14px 8px; border:none; background:linear-gradient(135deg, #7f8c8d, #5d6d6e); color:#fff; border-radius:10px; cursor:pointer; font-size:15px; font-weight:700;" title="${t('addShiftEraseTitle') || 'Clear shift'}">🏖️ —<br><small style="opacity:0.85; font-weight:500;">${t('addShiftEraseLabel') || 'Free'}</small></button>
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
    <b>${t('infoDate')}</b> ${day} ${monthNamesGenitive[currentMonth - 1]} ${currentYear}<br>
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

/* === MONTHLY OVERTIME SUMMARY === */
function renderMonthOvertimeSummary() {
  const old = document.getElementById('otMonthSummary');
  if (old) old.remove();
  if (!shouldShowPersonalData()) return;

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
  // Place monthly OT summary at the end of the month view (after info panel)
  const infoPanel = document.getElementById('infoPanel');
  if (infoPanel && infoPanel.parentNode) {
    infoPanel.parentNode.insertBefore(el, infoPanel.nextSibling);
  }
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
    const hidePrivate = !shouldShowPersonalData();
    let shiftCode = getShiftAtWithPending(currentYear, currentMonth, selectedDay, selectedShift);
    if (hidePrivate) {
      shiftCode =
        factorySchedule[currentYear] &&
        factorySchedule[currentYear][currentMonth] &&
        factorySchedule[currentYear][currentMonth][selectedShift]
          ? factorySchedule[currentYear][currentMonth][selectedShift][selectedDay - 1]
          : '';
    }
    const dateStr = `${selectedDay} ${monthNamesGenitive[currentMonth - 1]} ${currentYear}`;
    const dowIdx = new Date(currentYear, currentMonth - 1, selectedDay).getDay();
    const dow = dayNamesFull[dowIdx];
    const yHolidays = buildHolidays(currentYear);
    const holidayName = yHolidays[currentMonth + '-' + selectedDay];
    const holidayInfo = holidayName ? ` <span style="color:#c0392b;">🎉 ${holidayName}</span>` : '';
    const noteKey = `${currentYear}-${currentMonth}-${selectedDay}-${selectedShift}`;
    const onUrlop = hidePrivate
      ? false
      : isUrlop(currentYear, currentMonth, selectedDay, selectedShift);

    // Factory shift for determining if extra shift is enabled
    let factoryShift = '';
    if (factorySchedule[currentYear] && factorySchedule[currentYear][currentMonth] && factorySchedule[currentYear][currentMonth][selectedShift]) {
      factoryShift = factorySchedule[currentYear][currentMonth][selectedShift][selectedDay - 1];
    }
    const isFactoryFree = isWolne(factoryShift) || factoryShift === '';

    // Existing OT for edit/delete
    const otRaw = !hidePrivate ? getOvertimes(currentYear, currentMonth, selectedDay, selectedShift) : null;
    const existingOtAntes = otRaw ? otRaw.przed : null;
    const existingOtDespu = otRaw ? otRaw.po : null;

    if (hidePrivate) {
      // Privacy mode: show factory data only, hide personal data
      panel.innerHTML = `
        <h3>📅 ${dateStr} (${dow})${holidayInfo} — <span class="badge ${selectedShift}">${selectedShift}</span></h3>
        <div class="info-grid">
          <div class="info-card" style="grid-column:1/-1;">
            <div class="label">${t('privacyDayDetailsHidden')}</div>
            <div class="value">
              <button class="privacy-disable-btn" id="privacyDisableBtn">${t('privacyDisableAction')}</button>
            </div>
          </div>
        </div>`;
      // Bind privacy disable button
      setTimeout(() => {
        const btn = document.getElementById('privacyDisableBtn');
        if (btn) {
          btn.addEventListener('click', () => {
            setPrivacyMode(false);
            renderInfo(); // Re-render to show personal data
          });
        }
      }, 0);
    } else {
      // Non-privacy mode: show full details
      // Status card
      let statusCard = '';
      if (onUrlop) {
        statusCard = `<div class="info-card" style="grid-column:1/-1;"><div class="label">🌴 ${t('vacation')}</div><div class="value">${t('infoUrlop')}</div></div>`;
      } else if (isWolne(shiftCode)) {
        statusCard = `<div class="info-card" style="grid-column:1/-1;"><div class="label">${t('infoFree') || 'Wolne'}</div><div class="value">—</div></div>`;
      } else {
        const [sh, eh] = shiftHours[shiftCode];
        const shiftTimeStr = `${String(sh).padStart(2, '0')}:00-${String(eh % 24).padStart(2, '0')}:00`;
        statusCard = `<div class="info-card" style="grid-column:1/-1;"><div class="label">${t('infoWorking') || 'Zmiana'}</div><div class="value">${shiftEmoji[shiftCode]} ${shiftCode} (${shiftTimeStr})</div></div>`;
      }

      // Timeline (only for working non-vacation day)
      let timelineCard = '';
      if (!onUrlop && !isWolne(shiftCode)) {
        // Relief handoff flow
        let reliefCard = '';
        const info = getRelief(currentYear, currentMonth, selectedDay, selectedShift, shiftCode);
        function formatWhen(y, m, d) {
          if (y === currentYear && m === currentMonth && d === selectedDay) return '';
          if (y === currentYear && m === currentMonth && d === selectedDay - 1)
            return ', ' + t('dayBefore');
          if (y === currentYear && m === currentMonth && d === selectedDay + 1)
            return ', ' + t('dayAfter');
          return `, ${d} ${monthNamesGenitive[m - 1]}${y !== currentYear ? ' ' + y : ''}`;
        }

        // Timeline OT: przed before self, po after self
        let timelineOt = null;
        const otRaw = getOvertimes(currentYear, currentMonth, selectedDay, selectedShift);
        const mk = (pos) => {
          if (!otRaw[pos]) return null;
          const cat = categorizeOvertime(
            currentYear,
            currentMonth,
            selectedDay,
            shiftCode,
            pos,
            otRaw[pos].hours
          );
          const percent = cat.h200 > 0 ? 200 : cat.h100 > 0 ? 100 : 50;
          return { hours: otRaw[pos].hours, percent };
        };
        const before = mk('przed');
        const after = mk('po');
        if (before || after) timelineOt = { before, after };

        if (typeof renderReliefTimeline === 'function') {
          const timelineHtml = renderReliefTimeline(
            info,
            currentYear,
            currentMonth,
            selectedDay,
            shiftCode,
            selectedShift,
            timelineOt
          );
          reliefCard = `
          <div class="info-card" style="grid-column:1/-1;">
            <div class="label">🔄 ${t('reliefFlowTitle')}</div>
            <div class="value">${timelineHtml}</div>
          </div>`;
        }

        timelineCard = reliefCard;
      }

      // Day action grid
      const canAddExtraShift = isFactoryFree && !onUrlop;
      const canAddOvertime =
        !onUrlop &&
        !isWolne(shiftCode) &&
        (shiftCode === 'R' || shiftCode === 'P' || shiftCode === 'N');

      const extraShiftDisabledReason = onUrlop
        ? t('dayActionUnavailableVacation')
        : !isFactoryFree
          ? t('dayActionUnavailableFactoryShift')
          : '';

      const overtimeDisabledReason = onUrlop
        ? t('dayActionUnavailableVacation')
        : !canAddOvertime
          ? t('dayActionUnavailableNoShift')
          : '';

      const vacationActionLabel = onUrlop
        ? t('dayActionVacationRemove')
        : t('dayActionVacationAdd');

      const actionCard = `
        <div class="info-card" style="grid-column:1/-1;">
          <div class="label">${t('dayActionsTitle')}</div>
          <div class="day-action-grid">
            <button
              type="button"
              class="day-action-btn"
              data-day-action="vacation"
              aria-label="${escapeHtml(vacationActionLabel)}"
            >
              <span class="day-action-icon">🌴</span>
              <span class="day-action-label">${vacationActionLabel}</span>
            </button>

            <button
              type="button"
              class="day-action-btn"
              data-day-action="extra-shift"
              aria-label="${escapeHtml(t('dayActionExtraShift'))}"
              title="${escapeHtml(extraShiftDisabledReason)}"
              ${canAddExtraShift ? '' : 'disabled'}
            >
              <span class="day-action-icon">➕</span>
              <span class="day-action-label">${t('dayActionExtraShift')}</span>
            </button>

            <button
              type="button"
              class="day-action-btn"
              data-day-action="overtime-before"
              aria-label="${escapeHtml(t('dayActionOvertimeBefore'))}"
              title="${escapeHtml(overtimeDisabledReason)}"
              ${canAddOvertime ? '' : 'disabled'}
            >
              <span class="day-action-icon">⏱⬅</span>
              <span class="day-action-label">${t('dayActionOvertimeBefore')}</span>
            </button>

            <button
              type="button"
              class="day-action-btn"
              data-day-action="overtime-after"
              aria-label="${escapeHtml(t('dayActionOvertimeAfter'))}"
              title="${escapeHtml(overtimeDisabledReason)}"
              ${canAddOvertime ? '' : 'disabled'}
            >
              <span class="day-action-icon">⏱➡</span>
              <span class="day-action-label">${t('dayActionOvertimeAfter')}</span>
            </button>

            <button
              type="button"
              class="day-action-btn"
              data-day-action="note"
              aria-label="${escapeHtml(t('dayActionNote'))}"
            >
              <span class="day-action-icon">📝</span>
              <span class="day-action-label">${t('dayActionNote')}</span>
            </button>
          </div>
        </div>`;

      // Notes card: overtime notes remain attached to their OT records,
      // while the editable field remains the independent day note.
      const overtimeNoteRows = [
        existingOtAntes && existingOtAntes.note
          ? `<div class="overtime-note-row">
              <strong>${t('otBefore')}</strong>
              <span>${escapeHtml(existingOtAntes.note)}</span>
            </div>`
          : '',
        existingOtDespu && existingOtDespu.note
          ? `<div class="overtime-note-row">
              <strong>${t('otAfter')}</strong>
              <span>${escapeHtml(existingOtDespu.note)}</span>
            </div>`
          : '',
      ]
        .filter(Boolean)
        .join('');

      const noteCard = `
        <div class="info-card info-section-note" style="grid-column:1/-1;">
          <div class="label">${t('infoNote')}</div>
          ${
            overtimeNoteRows
              ? `<div class="overtime-note-list">${overtimeNoteRows}</div>`
              : ''
          }
          <div class="value">
            <input
              class="note-input"
              id="noteInput"
              value="${escapeHtml(notes[noteKey] || '')}"
              placeholder="${t('infoNotePlaceholder')}"
            >
          </div>
        </div>`;

      // Vacation summary
      const usedUrlop = countWorkingUrlops(currentYear, selectedShift);
      const limit = getVacationLimit(selectedShift);
      const remainingUrlop = Math.max(0, limit - usedUrlop);
      const vacationCard = `
        <div class="info-card" style="grid-column:1/-1;">
          <div class="label">🌴 ${t('vacation')} ${currentYear}</div>
          <div class="value">${usedUrlop} / ${limit} <small style="opacity:.85;">(${t('urlopRemaining', { n: remainingUrlop })})</small></div>
        </div>`;

      // Build the info-grid
      panel.innerHTML = `
        <h3>📅 ${dateStr} (${dow})${holidayInfo} — <span class="badge ${selectedShift}">${selectedShift}</span></h3>
        <div class="info-grid">
          ${statusCard}
          ${timelineCard}
          ${actionCard}
          ${noteCard}
          ${vacationCard}
        </div>`;

      // Bind selected-day actions after rendering the panel.
      const vacationButton = panel.querySelector('[data-day-action="vacation"]');
      if (vacationButton) {
        vacationButton.addEventListener('click', () => {
          toggleUrlop(currentYear, currentMonth, selectedDay, selectedShift);
          const vacationIsNowActive = isUrlop(
            currentYear,
            currentMonth,
            selectedDay,
            selectedShift
          );
          showToast(
            'success',
            vacationIsNowActive ? t('urlopAdded') : t('urlopRemoved')
          );
          renderCalendar();
          renderInfo();
        });
      }

      const extraShiftButton = panel.querySelector('[data-day-action="extra-shift"]');
      if (extraShiftButton) {
        extraShiftButton.addEventListener('click', () => {
          openAddShiftModal(selectedDay);
        });
      }

      const overtimeBeforeButton = panel.querySelector(
        '[data-day-action="overtime-before"]'
      );
      if (overtimeBeforeButton) {
        overtimeBeforeButton.addEventListener('click', () => {
          openOvertimeModal(
            selectedDay,
            shiftCode,
            'przed',
            existingOtAntes
          );
        });
      }

      const overtimeAfterButton = panel.querySelector(
        '[data-day-action="overtime-after"]'
      );
      if (overtimeAfterButton) {
        overtimeAfterButton.addEventListener('click', () => {
          openOvertimeModal(
            selectedDay,
            shiftCode,
            'po',
            existingOtDespu
          );
        });
      }

      const noteInput = panel.querySelector('#noteInput');
      const noteButton = panel.querySelector('[data-day-action="note"]');

      if (noteButton && noteInput) {
        noteButton.addEventListener('click', () => {
          noteInput.focus();
        });
      }

      if (noteInput) {
        let savedNoteValue = String(notes[noteKey] || '').trim();

        noteInput.addEventListener('change', () => {
          const noteValue = noteInput.value.trim();
          if (noteValue === savedNoteValue) return;

          if (noteValue) {
            notes[noteKey] = noteValue;
          } else {
            delete notes[noteKey];
          }

          savedNoteValue = noteValue;
          saveNotes(notes);
          renderCalendar();
          showToast('success', t('infoNoteSaved'));
        });
      }
    }
  }