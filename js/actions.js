/* ================================================================
   GRAFIK GILLETTE — Moduł 8: AKCJE (ICS, JSON, SHARE, SEARCH, MENU)
   ================================================================ */

function bindClick(id, handler) {
  const el = document.getElementById(id);
  if (el) {
    el.onclick = handler;
  } else {
    console.warn(`[actions.js] Element #${id} not found in DOM`);
  }
}

/* === ICS EXPORT === */
function exportICS() {
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Gillette Grafik//PL\r\n';
  const ySched = getYearSchedule(currentYear);
  function pad(n) { return String(n).padStart(2,'0'); }
  for (let m = 1; m <= 12; m++) {
    const arr = ySched[m][selectedShift];
    for (let i = 0; i < arr.length; i++) {
      const s = arr[i];
      if (isWolne(s)) continue;
      if (isUrlop(currentYear, m, i+1, selectedShift)) continue;
      const [sh, eh] = shiftHours[s];
      const dt = new Date(currentYear, m-1, i+1);
      const startDt = new Date(dt); startDt.setHours(sh, 0, 0);
      const endDt = new Date(dt); endDt.setHours(eh, 0, 0);
      const fmt = d => d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
      ics += `BEGIN:VEVENT\r\nUID:${currentYear}-${m}-${i+1}-${selectedShift}@gillette\r\nDTSTART:${fmt(startDt)}\r\nDTEND:${fmt(endDt)}\r\nSUMMARY:${s} - Brygada ${selectedShift}\r\nEND:VEVENT\r\n`;
    }
  }
  (urlops[selectedShift] || []).forEach(k => {
    const parts = k.split('-').map(Number);
    if (parts.length !== 3 || parts[0] !== currentYear) return;
    const yy = parts[0], mm = parts[1], dd = parts[2];
    const fmtD = dt => dt.getFullYear() + String(dt.getMonth()+1).padStart(2,'0') + String(dt.getDate()).padStart(2,'0');
    const dt = new Date(yy, mm-1, dd);
    const dtEnd = new Date(dt); dtEnd.setDate(dd+1);
    ics += `BEGIN:VEVENT\r\nUID:urlop-${k}-${selectedShift}@gillette\r\nDTSTART;VALUE=DATE:${fmtD(dt)}\r\nDTEND;VALUE=DATE:${fmtD(dtEnd)}\r\nSUMMARY:🌴 URLOP - Brygada ${selectedShift}\r\nEND:VEVENT\r\n`;
  });
  ics += 'END:VCALENDAR\r\n';
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grafik_${selectedShift}_${currentYear}.ics`;
  a.click();
  showToast('success', 'Kalendarz wyeksportowany');
}
bindClick('icsBtn', exportICS);
bindClick('printBtn', () => window.print());

/* === PRINT HEADER/FOOTER === */
function addPrintHeader() {
  const existing = document.querySelector('.print-header');
  if (existing) existing.remove();
  const header = document.createElement('div');
  header.className = 'print-header';
  const today = new Date();
  const dateStr = `${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;
  const viewName = { dashboard: 'Dashboard', week: 'Tydzień', month: 'Miesiąc', table: 'Tabela' }[currentView] || '';
  const yearSuffix = yearMode ? ' — cały rok' : '';
  header.textContent = `🏭 Grafik Gillette — ${viewName}${yearSuffix} • Brygada ${selectedShift} • ${dateStr}`;
  document.body.prepend(header);
}
function addPrintFooter() {
  const existing = document.querySelector('.print-footer');
  if (existing) existing.remove();
  const footer = document.createElement('div');
  footer.className = 'print-footer';
  footer.textContent = `Wygenerowano: ${new Date().toLocaleString('pl-PL')} • Grafik Gillette`;
  document.body.appendChild(footer);
}
window.addEventListener('beforeprint', () => {
  addPrintHeader();
  addPrintFooter();
});
window.addEventListener('afterprint', () => {
  document.querySelectorAll('.print-header, .print-footer').forEach(el => el.remove());
});

/* === SHARE === */
function shareDay() {
  const d = selectedDay || new Date().getDate();
  const dateStr = `${d} ${monthNames[currentMonth-1]} ${currentYear}`;
  const params = `?brig=${selectedShift}&date=${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const isLocal = location.protocol === 'file:' || !location.origin || location.origin === 'null';
  const shiftCode = getShiftAt(currentYear, currentMonth, d, selectedShift);
  const shiftText = isWolne(shiftCode) ? 'Wolne' : `${shiftCode}`;

  if (isLocal) {
    const text = `📅 ${dateStr}\n🏭 Brygada ${selectedShift}\n⏰ ${shiftText}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => showToast('success', 'Skopiowano do schowka'))
        .catch(() => showToast('error', 'Kopiowanie niemożliwe'));
    } else showToast('error', 'Kopiowanie niemożliwe');
    return;
  }
  const url = `${location.origin}${location.pathname}${params}`;
  if (navigator.share) {
    navigator.share({ title: 'Grafik Gillette', text: `Brygada ${selectedShift}, ${dateStr}`, url })
      .then(() => showToast('success', 'Udostępniono'))
      .catch(() => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url)
            .then(() => showToast('success', 'Link skopiowany'))
            .catch(() => showToast('error', 'Nie udało się skopiować linku'));
        } else {
          showToast('error', 'Nie udało się udostępnić ani skopiować linku');
        }
      });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url)
      .then(() => showToast('success', 'Link skopiowany'))
      .catch(() => showToast('error', 'Nie udało się skopiować linku'));
  }
}
bindClick('shareBtn', shareDay);

/* === EXPORT/IMPORT JSON === */
document.getElementById('exportDataBtn').onclick = () => {
  const data = { _meta: { app: 'Grafik Gillette', v: 3.1, date: new Date().toISOString() }, customSchedule, urlops, notes, overtimes, prefs };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grafik_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  showToast('success', 'Backup pobrany');
};

bindClick('menuIcs', () => { closeSideMenu(); exportICS(); });
bindClick('menuPrint', () => { closeSideMenu(); window.print(); });
bindClick('menuShare', () => { closeSideMenu(); shareDay(); });

/* === IMPORT === */
bindClick('importDataBtn', () => document.getElementById('importFile').click());
document.getElementById('importFile').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.customSchedule && !data.urlops && !data.notes && !data.overtimes) { showToast('error', 'Nieprawidłowy plik'); return; }
      showConfirm(
        '⚠️ Zastąpić aktualne dane?',
        'Import nadpisze Twoje grafiki, urlopy, nadgodziny i notatki.',
        () => {
          if (data.customSchedule) { customSchedule = data.customSchedule; saveCustomSchedule(customSchedule); }
          if (data.urlops) { Object.keys(urlops).forEach(k => delete urlops[k]); Object.assign(urlops, data.urlops); saveUrlops(urlops); }
          if (data.notes) { Object.keys(notes).forEach(k => delete notes[k]); Object.assign(notes, data.notes); saveNotes(notes); }
          if (data.overtimes) { overtimes = data.overtimes; saveOvertimes(overtimes); }
          showToast('success', 'Dane wczytane');
          refreshViews();
        },
        { primaryText: 'Importuj', primaryClass: 'primary' }
      );
    } catch(err) { showToast('error', 'Błąd: ' + err.message); }
  };
  reader.readAsText(file);
  e.target.value = '';
};

/* === MENU: OPCJE === */
bindClick('menuWeekSummary', () => {
  prefs.weekSummaryEnabled = !prefs.weekSummaryEnabled;
  savePrefs(prefs);
  document.getElementById('menuWeekSummary').querySelector('.mi-check').style.display = prefs.weekSummaryEnabled ? 'inline' : 'none';
  showToast('info', prefs.weekSummaryEnabled ? 'Podsumowanie tygodnia WŁ' : 'Podsumowanie tygodnia WYŁ');
  closeSideMenu();
  refreshViews();
});
if (prefs.weekSummaryEnabled) document.getElementById('menuWeekSummary').querySelector('.mi-check').style.display = 'inline';

bindClick('menuVacationLimit', () => {
  closeSideMenu();
  const currentLimit = getVacationLimit(selectedShift);
  const body = `
    <p>Podaj nową liczbę dni urlopu dla brygady <strong>${selectedShift}</strong>:</p>
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
          setVacationLimit(selectedShift, parsed);
          showToast('success', `Limit urlopów dla brygady ${selectedShift}: ${parsed} dni`);
          refreshViews();
        }
      }
    ]
  });
});

/* === CZYSZCZENIE ROKU / RESET === */
bindClick('clearYearBtn', () => {
  showConfirm(
    `🗑 Wyczyścić rok ${currentYear}?`,
    'Usunięte zostaną: zapisane zmiany + bufor dla tego roku. Urlopy i nadgodziny pozostaną. Dane fabryczne wrócą (jeśli istnieją).',
    () => {
      delete customSchedule[currentYear];
      saveCustomSchedule(customSchedule);
      Object.keys(pendingChanges).forEach(k => {
        if (parseInt(k.split('-')[0], 10) === currentYear) { delete pendingChanges[k]; delete pendingOriginals[k]; }
      });
      updateDirtyIndicator();
      refreshViews();
      showToast('warn', `Rok ${currentYear} wyczyszczony`);
    },
    { primaryText: '🗑 Wyczyść', primaryClass: 'danger' }
  );
});

bindClick('resetCustomBtn', () => {
  showConfirm(
    '↺ Reset wszystkich edycji?',
    'Usunięte zostaną WSZYSTKIE Twoje edycje (wszystkie lata + bufor). Fabryczne dane wrócą. Urlopy, nadgodziny i notatki pozostaną.',
    () => {
      customSchedule = {};
      saveCustomSchedule(customSchedule);
      pendingChanges = {}; pendingOriginals = {}; undoStack = [];
      updateDirtyIndicator();
      refreshViews();
      showToast('warn', 'Wszystkie zmiany zresetowane');
    },
    { primaryText: '↺ Reset', primaryClass: 'danger' }
  );
});

/* === SEARCH === */
const searchMonthSel = document.getElementById('searchMonth');
monthNames.forEach((n,i)=>{ const o=document.createElement('option'); o.value=i+1; o.textContent=n; searchMonthSel.appendChild(o); });

bindClick('searchToggleBtn', () => {
  const sb = document.getElementById('searchBox');
  sb.style.display = sb.style.display === 'none' ? 'block' : 'none';
});
bindClick('searchBtn', () => {
  const type = document.getElementById('searchType').value;
  const month = +document.getElementById('searchMonth').value;
  const results = [];
  const monthsToCheck = month === 0 ? Array.from({length:12},(_,i)=>i+1) : [month];
  const ySched = getYearSchedule(currentYear);
  monthsToCheck.forEach(m => {
    const arr = ySched[m][selectedShift];
    if (type === 'W3') {
      let start = -1;
      for (let i = 0; i < arr.length; i++) {
        if (isWolne(arr[i])) { if (start === -1) start = i; }
        else { if (start !== -1 && (i - start) >= 3) results.push({month: m, day: start+1, note: `${i-start} dni wolnego`}); start = -1; }
      }
      if (start !== -1 && (arr.length - start) >= 3) results.push({month: m, day: start+1, note: `${arr.length-start} dni wolnego`});
    } else if (type === 'U') {
      for (let i = 0; i < arr.length; i++) if (isUrlop(currentYear, m, i+1, selectedShift)) results.push({month: m, day: i+1, note: '🌴 Urlop'});
    } else {
      for (let i = 0; i < arr.length; i++) {
        const v = arr[i];
        if (type === '' || (type === 'W' && isWolne(v)) || v === type) results.push({month: m, day: i+1, note: shiftFullName[v] || 'Wolne'});
      }
    }
  });
  const rc = document.getElementById('searchResults');
  rc.innerHTML = results.length === 0 ? '<p style="color:var(--text-muted);">Brak wyników</p>'
    : `<p style="font-size:12px;color:var(--text-muted);">Znaleziono: ${results.length}</p>` +
      results.slice(0, 50).map(r => `<div class="search-result-item" data-m="${r.month}" data-d="${r.day}">${r.day} ${monthNames[r.month-1]}: ${escapeHtml(r.note)}</div>`).join('');
  rc.querySelectorAll('.search-result-item').forEach(el => {
    el.onclick = () => { jumpToDate(currentYear, +el.dataset.m, +el.dataset.d); };
  });
});
