/* ================================================================
   GRAFIK GILLETTE — Moduł 11: SYNCHRONIZACJA PRZEZ GOOGLE DRIVE
   (bez serwera / bez bazy danych — czysto klienckie)
   ================================================================ */

const DRIVE_CLIENT_ID_KEY = 'grafik_drive_client_id';
const DRIVE_FILE_NAME = 'grafik-gillette-data.json';
const DRIVE_MIME = 'application/json';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

let gDriveTokenClient = null;
let gDriveToken = localStorage.getItem('grafik_drive_token') || null;
let gDriveTokenExpiry = parseInt(localStorage.getItem('grafik_drive_token_expiry') || '0', 10);
let gDriveFileId = localStorage.getItem('grafik_drive_file_id') || null;
const DEFAULT_CLIENT_ID = '384517397558-agfoqvv4pv5nbkejhc9i7hbg86qs6her.apps.googleusercontent.com';
let gDriveClientId = localStorage.getItem(DRIVE_CLIENT_ID_KEY) || DEFAULT_CLIENT_ID;

/* === POMOCNICZE === */
function isDriveTokenValid() {
  return gDriveToken && Date.now() < gDriveTokenExpiry - 60000;
}

function loadGis() {
  return new Promise((resolve) => {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

function initGDriveTokenClient() {
  if (!gDriveClientId || typeof google === 'undefined' || !google.accounts) return false;
  try {
    gDriveTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: gDriveClientId,
      scope: DRIVE_SCOPE,
      prompt: 'consent',
      callback: (resp) => {
        if (resp.access_token) {
          gDriveToken = resp.access_token;
          gDriveTokenExpiry = Date.now() + (resp.expires_in || 3600) * 1000;
          localStorage.setItem('grafik_drive_token', gDriveToken);
          localStorage.setItem('grafik_drive_token_expiry', String(gDriveTokenExpiry));
          showToast('success', '☁️ Zaliczono do Google');
          updateDriveUI();
        } else {
          showToast('error', '☁️ Logowanie nieudane');
        }
      },
    });
    return true;
  } catch (e) {
    console.warn('[SYNC] initTokenClient błąd:', e);
    return false;
  }
}

/* === API WRAPPERS === */
async function driveFetch(url, options = {}, retry = true) {
  const headers = options.headers || {};
  headers['Authorization'] = 'Bearer ' + gDriveToken;
  const resp = await fetch(url, { ...options, headers });
  if (resp.status === 401 && retry) {
    // token wygasł — zaloguj ponownie
    const ok = await new Promise((resolve) => {
      if (!gDriveTokenClient) { resolve(false); return; }
      gDriveTokenClient.requestAccessToken();
      // GIS wywoła callback, który ustawi nowy token
      const checkTimer = setInterval(() => {
        if (isDriveTokenValid()) {
          clearInterval(checkTimer);
          resolve(true);
        }
      }, 200);
      setTimeout(() => { clearInterval(checkTimer); resolve(isDriveTokenValid()); }, 5000);
    });
    if (ok) return driveFetch(url, options, false);
  }
  return resp;
}

/* === SZUKANIE PLIKU W DRIVE === */
async function findDriveFile() {
  const query = `name='${DRIVE_FILE_NAME}' and trashed=false and 'appDataFolder' in parents`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime)`;
  const resp = await driveFetch(url);
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.files && data.files.length > 0 ? data.files[0] : null;
}

/* === ZAPIS (create lub update) === */
async function uploadToDrive(force = false) {
  if (!isDriveTokenValid()) { showToast('warn', '☁️ Najpierw zaloguj się do Google Drive'); return false; }

  // Budujemy dane do zapisu
  const payload = {
    version: 3,
    savedAt: new Date().toISOString(),
    prefs: prefs,
    factorySchedule: factorySchedule,
    customSchedule: customSchedule,
    urlops: urlops,
    overtimes: overtimes,
    notes: notes,
    vacationLimits: (prefs.urlopLimits) || {}
  };
  const json = JSON.stringify(payload);

  try {
    if (!gDriveFileId) {
      // Szukamy istniejącego pliku
      const found = await findDriveFile();
      if (found) gDriveFileId = found.id;
    }

    if (!gDriveFileId) {
      // Tworzymy nowy plik
      const metadata = {
        name: DRIVE_FILE_NAME,
        mimeType: DRIVE_MIME,
        parents: ['appDataFolder']
      };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([json], { type: DRIVE_MIME }));
      const resp = await driveFetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
        { method: 'POST', body: form }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        console.error('[SYNC] Create error:', err);
        showToast('error', '☁️ Błąd tworzenia pliku w Drive');
        return false;
      }
      const data = await resp.json();
      gDriveFileId = data.id;
      localStorage.setItem('grafik_drive_file_id', gDriveFileId);
    } else {
      // Aktualizujemy istniejący plik
      const resp = await driveFetch(
        `https://www.googleapis.com/upload/drive/v3/files/${gDriveFileId}?uploadType=media`,
        { method: 'PATCH', body: json, headers: { 'Content-Type': DRIVE_MIME } }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        console.error('[SYNC] Update error:', err);
        showToast('error', '☁️ Błąd aktualizacji pliku w Drive');
        return false;
      }
    }
    showToast('success', '☁️ Zapisano w Google Drive');
    updateDriveUI();
    return true;
  } catch (e) {
    console.error('[SYNC] upload:', e);
    showToast('error', '☁️ Błąd synchronizacji');
    return false;
  }
}

/* === ODCZYT === */
async function downloadFromDrive(confirmOverwrite = false) {
  if (!isDriveTokenValid()) { showToast('warn', '☁️ Najpierw zaloguj się do Google Drive'); return false; }
  try {
    if (!gDriveFileId) {
      const found = await findDriveFile();
      if (!found) { showToast('info', '☁️ Brak pliku w Google Drive — nic do pobrania'); return false; }
      gDriveFileId = found.id;
      localStorage.setItem('grafik_drive_file_id', gDriveFileId);
    }
    const resp = await driveFetch(
      `https://www.googleapis.com/drive/v3/files/${gDriveFileId}?alt=media`
    );
    if (!resp.ok) {
      showToast('error', '☁️ Błąd pobierania pliku z Drive');
      return false;
    }
    const data = await resp.json();
    if (!data || typeof data !== 'object') {
      showToast('error', '☁️ Nieprawidłowy format danych w Drive');
      return false;
    }

    const doApply = () => {
      if (data.factorySchedule) factorySchedule = data.factorySchedule;
      if (data.customSchedule) customSchedule = data.customSchedule;
      if (data.urlops) urlops = data.urlops;
      if (data.overtimes) overtimes = data.overtimes;
      if (data.notes) notes = data.notes;
      if (data.prefs) { prefs = { ...prefs, ...data.prefs }; savePrefs(prefs); }
      saveCustomSchedule(customSchedule);
      saveUrlops(urlops);
      saveOvertimes(overtimes);
      saveNotes(notes);
      // Limity urlopu zapis
      if (data.vacationLimits) {
        Object.keys(data.vacationLimits).forEach(brig => {
          setVacationLimit(brig, data.vacationLimits[brig]);
        });
      }
      currentView = 'dashboard';
      if (typeof switchView === 'function') switchView('dashboard');
      else refreshViews();
      showToast('success', '☁️ Dane pobrane z Google Drive');
      updateDriveUI();
    };

    if (confirmOverwrite) {
      showConfirm('☁️ Pobrać dane z Google Drive?', 'Dane lokalne zostaną nadpisane. Kontynuować?', doApply, { primaryText: 'Pobierz', primaryClass: 'primary' });
    } else {
      doApply();
    }
    return true;
  } catch (e) {
    console.error('[SYNC] download:', e);
    showToast('error', '☁️ Błąd pobierania z Drive');
    return false;
  }
}

/* === UI === */
function updateDriveUI() {
  const item = document.getElementById('menuDriveSync');
  if (!item) return;
  const check = item.querySelector('.mi-check');
  const label = item.querySelector('span:nth-child(2)');
  const logged = isDriveTokenValid();

  const logoutBtn = document.getElementById('menuDriveLogout');
  const syncItem = document.getElementById('menuSyncNow');
  const authBtn = document.getElementById('userAuthBtn');

  if (logged) {
    item.title = 'Zalogowano — kliknij aby synchronizować';
    if (check) check.style.display = 'inline';
    if (label) label.textContent = 'Google Drive ☁️ (zalogowano)';
    item.classList.remove('drive-error');
    if (logoutBtn) logoutBtn.style.display = 'flex';
    if (syncItem) syncItem.style.display = 'flex';
    if (authBtn) {
      authBtn.textContent = '🚪';
      authBtn.title = 'Wyloguj z Google Drive';
      authBtn.classList.add('auth-logged-in');
    }
  } else {
    if (check) check.style.display = 'none';
    if (label) label.textContent = 'Google Drive ☁️ (zaloguj)';
    item.title = 'Kliknij aby zalogować się do Google Drive';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (syncItem) syncItem.style.display = 'none';
    if (authBtn) {
      authBtn.textContent = '👤';
      authBtn.title = 'Zaloguj do Google Drive';
      authBtn.classList.remove('auth-logged-in');
    }
  }
}

/* === USTAWIANIE CLIENT ID === */
function askForClientId() {
  showModal({
    title: '☁️ Google Drive — konfiguracja',
    body: `
      <p>Aby synchronizować dane przez Google Drive, potrzebny jest <b>Client ID</b> z Google Cloud Console.</p>
      <p><b>Jak zdobyć Client ID:</b></p>
      <ol style="margin:8px 0; padding-left:22px; font-size:13px;">
        <li>Wejdź na <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color:var(--text-header);">Google Cloud Console → Credentials</a></li>
        <li>Stwórz projekt i włącz <b>Google Drive API</b></li>
        <li>Utwórz <b>OAuth 2.0 Client ID</b> (typ: Web application)</li>
        <li>W "Authorized JavaScript origins" wpisz adres swojej aplikacji (np. <code>http://localhost:8000</code>)</li>
        <li>Skopiuj Client ID poniżej</li>
      </ol>
      <div style="margin-top:12px;">
        <label style="font-weight:600; font-size:13px; display:block; margin-bottom:4px;">OAuth Client ID:</label>
        <input type="text" id="driveClientIdInput" placeholder="np. 1234567890-abc.apps.googleusercontent.com"
               style="width:100%; padding:8px 12px; border:1px solid var(--border-cell); border-radius:8px; background:var(--bg-container); color:var(--text-main); font-size:14px;"
               value="${gDriveClientId}">
      </div>
      <p style="font-size:12px; color:var(--text-muted); margin-top:10px;">⚠️ Client ID z sekcji "Authorized JavaScript origins" — nie "Client secret".</p>
    `,
    buttons: [
      {
        text: 'Zapisz',
        class: 'primary',
        onClick: () => {
          const input = document.getElementById('driveClientIdInput');
          const val = input ? input.value.trim() : '';
          if (!val) { showToast('warn', 'Wpisz Client ID'); return; }
          gDriveClientId = val;
          localStorage.setItem(DRIVE_CLIENT_ID_KEY, val);
          initGDriveTokenClient();
          showToast('success', '☁️ Client ID zapisany');
        }
      }
    ]
  });
}

/* === LOGOWANIE === */
function loginDrive() {
  if (!gDriveClientId) {
    showToast('warn', '☁️ Najpierw skonfiguruj Client ID w ustawieniach');
    askForClientId();
    return;
  }
  if (!gDriveTokenClient) initGDriveTokenClient();
  if (!gDriveTokenClient) { showToast('error', '☁️ Nie można zainicjować logowania — sprawdź Client ID'); return; }
  gDriveTokenClient.requestAccessToken();
}

/* === GŁÓWNE MENU: synchronizuj === */
async function syncWithDrive() {
  if (!isDriveTokenValid()) {
    showToast('warn', '☁️ Najpierw zaloguj się do Google Drive');
    loginDrive();
    return;
  }
  // Zalogowano: zapytaj użytkownika
  showConfirm(
    '☁️ Synchronizacja z Google Drive',
    'Co chcesz zrobić?',
    () => uploadToDrive(true),
    { primaryText: '📤 Wyślij do Drive', primaryClass: 'primary' }
  );
  // Dwa przyciski
  setTimeout(() => {
    const footer = document.getElementById('modalFooter');
    if (!footer) return;
    footer.innerHTML = `
      <button class="modal-btn secondary" onclick="downloadFromDrive(true)">📥 Pobierz z Drive</button>
      <button class="modal-btn primary" onclick="uploadToDrive(true)">📤 Wyślij do Drive</button>
      <button class="modal-btn secondary" onclick="hideModal()">Anuluj</button>
    `;
  }, 50);
}

/* === LOGOUT === */
function logoutDrive() {
  gDriveToken = null;
  gDriveTokenExpiry = 0;
  gDriveFileId = null;
  localStorage.removeItem('grafik_drive_token');
  localStorage.removeItem('grafik_drive_token_expiry');
  localStorage.removeItem('grafik_drive_file_id');
  showToast('info', '☁️ Wylogowano z Google Drive');
  updateDriveUI();
}

/* === INIT === */
function initSync() {
  const menuBtn = document.getElementById('menuDriveSync');
  if (menuBtn) {
    menuBtn.onclick = () => {
      closeSideMenu();
      if (isDriveTokenValid()) {
        syncWithDrive();
      } else {
        loginDrive();
      }
    };
  }

  const authBtn = document.getElementById('userAuthBtn');
  if (authBtn) {
    authBtn.onclick = () => {
      closeSideMenu();
      if (isDriveTokenValid()) {
        logoutDrive();
      } else {
        loginDrive();
      }
    };
  }

  // Przycisk wylogування
  const logoutBtn = document.getElementById('menuDriveLogout');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      closeSideMenu();
      logoutDrive();
    };
  }

  // Przycisk w menu akcji — sync tylko dla zalogowanych
  const syncItem = document.getElementById('menuSyncNow');
  if (syncItem) {
    syncItem.onclick = () => {
      closeSideMenu();
      if (!isDriveTokenValid()) {
        showToast('warn', '☁️ Najpierw zaloguj się do Google Drive');
        loginDrive();
        return;
      }
      syncWithDrive();
    };
  }

  loadGis().then(() => {
    if (gDriveClientId) initGDriveTokenClient();
    updateDriveUI();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSync);
} else {
  initSync();
}
