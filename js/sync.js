/* ================================================================
   GRAFIK GILLETTE — Moduł 11: SYNCHRONIZACJA PRZEZ GOOGLE DRIVE
   (bez serwera / bez bazy danych — czysto klienckie)
   ================================================================ */

const DRIVE_CLIENT_ID_KEY = 'grafik_drive_client_id';
const DRIVE_FILE_NAME = 'grafik-gillette-data.json';
const DRIVE_MIME = 'application/json';
const DRIVE_SCOPE =
  'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata openid email';

let gDriveTokenClient = null;
let gDriveToken = localStorage.getItem('grafik_drive_token') || null;
let gDriveTokenExpiry = parseInt(localStorage.getItem('grafik_drive_token_expiry') || '0', 10);
let gDriveFileId = localStorage.getItem('grafik_drive_file_id') || null;
let driveUserEmail = localStorage.getItem('grafik_drive_user_email') || null;
const DEFAULT_CLIENT_ID =
  '384517397558-agfoqvv4pv5nbkejhc9i7hbg86qs6her.apps.googleusercontent.com';
let gDriveClientId = localStorage.getItem(DRIVE_CLIENT_ID_KEY) || DEFAULT_CLIENT_ID;

/* === POMOCNICZE === */
function isDriveTokenValid() {
  return gDriveToken && Date.now() < gDriveTokenExpiry - 60000;
}

/**
 * Pobiera email zalogowanego użytkownika z Google API.
 * Wymagany scope: 'openid email' w DRIVE_SCOPE.
 * Wynik zapisywany do driveUserEmail + localStorage.
 * Wywoływane po pomyślnym login.
 */
async function fetchDriveUserEmail() {
  if (!gDriveToken) {
    console.warn('[SYNC] fetchDriveUserEmail: no token');
    return null;
  }
  try {
    const resp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + gDriveToken },
    });
    if (!resp.ok) {
      console.warn('[SYNC] fetchDriveUserEmail failed:', resp.status);
      return null;
    }
    const data = await resp.json();
    if (data && data.email) {
      driveUserEmail = data.email.toLowerCase();
      localStorage.setItem('grafik_drive_user_email', driveUserEmail);
      if (typeof updateAdminUI === 'function') {
        updateAdminUI();
      }
      return driveUserEmail;
    }
  } catch (e) {
    console.error('[SYNC] fetchDriveUserEmail error:', e);
  }
  return null;
}

function loadGis() {
  return new Promise((resolve) => {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2)
      return resolve();
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
          showToast('success', `☁️ ${t('driveLoggedIn')}`);
          updateDriveUI();
          fetchDriveUserEmail();
        } else {
          showToast('error', `☁️ ${t('driveLoginFailed')}`);
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
      if (!gDriveTokenClient) {
        resolve(false);
        return;
      }
      gDriveTokenClient.requestAccessToken();
      // GIS wywoła callback, który ustawi nowy token
      const checkTimer = setInterval(() => {
        if (isDriveTokenValid()) {
          clearInterval(checkTimer);
          resolve(true);
        }
      }, 200);
      setTimeout(() => {
        clearInterval(checkTimer);
        resolve(isDriveTokenValid());
      }, 5000);
    });
    if (ok) return driveFetch(url, options, false);
  }
  return resp;
}

/* === SZUKANIE PLIKU W DRIVE === */
async function findDriveFile() {
  // Szukamy WSZYSTKICH plików o naszej nazwie w App Data
  const query = `name='${DRIVE_FILE_NAME}' and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`;

  const resp = await driveFetch(url);
  if (!resp.ok) {
    console.error('[SYNC] findDriveFile error:', resp.status);
    return null;
  }

  const data = await resp.json();
  const files = data.files || [];

  if (files.length === 0) return null;

  // Najnowszy plik — pierwszy na liście (orderBy=modifiedTime desc)
  const newest = files[0];

  // Usuwamy duplikaty (wszystkie oprócz pierwszego)
  if (files.length > 1) {
    for (let i = 1; i < files.length; i++) {
      try {
        await driveFetch(`https://www.googleapis.com/drive/v3/files/${files[i].id}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.warn('[SYNC] Nie udało się usunąć:', files[i].id);
      }
    }
  }

  return newest;
}

/* === ZAPIS (create lub update) === */
async function uploadToDrive(force = false) {
  if (!isDriveTokenValid()) {
    showToast('warn', `☁️ ${t('driveLoginRequired')}`);
    return false;
  }

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
    vacationLimits: prefs.urlopLimits || {},
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
        parents: ['appDataFolder'],
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
        const errText =
          (err && err.error && err.error.message) ||
          err.message ||
          JSON.stringify(err) ||
          t('unknownError');
        showToast('error', `☁️ ${t('driveCreateFileError')}: ` + errText);
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
        showToast('error', `☁️ ${t('driveUpdateFileError')}`);
        return false;
      }
    }
    showToast('success', `☁️ ${t('driveSaved')}`);
    updateDriveUI();
    return true;
  } catch (e) {
    console.error('[SYNC] upload:', e);
    showToast('error', `☁️ ${t('driveSyncError')}`);
    return false;
  }
}

/* === ODCZYT === */
async function downloadFromDrive(confirmOverwrite = false) {
  if (!isDriveTokenValid()) {
    showToast('warn', `☁️ ${t('driveLoginRequired')}`);
    return false;
  }
  try {
    if (!gDriveFileId) {
      const found = await findDriveFile();
      if (!found) {
        showToast('info', `☁️ ${t('driveNoFileToDownload')}`);
        return false;
      }
      gDriveFileId = found.id;
      localStorage.setItem('grafik_drive_file_id', gDriveFileId);
    }
    const resp = await driveFetch(
      `https://www.googleapis.com/drive/v3/files/${gDriveFileId}?alt=media`
    );
    if (!resp.ok) {
      showToast('error', `☁️ ${t('driveDownloadFileError')}`);
      return false;
    }
    const data = await resp.json();
    if (!data || typeof data !== 'object') {
      showToast('error', `☁️ ${t('driveInvalidDataFormat')}`);
      return false;
    }

    const doApply = () => {
      let applyErrors = [];

      // customSchedule — MUTUJEMY obiekt (nie nadpisujemy)
      if (data.customSchedule && typeof customSchedule !== 'undefined') {
        try {
          Object.keys(customSchedule).forEach((k) => delete customSchedule[k]);
          Object.assign(customSchedule, data.customSchedule);
          saveCustomSchedule(customSchedule);
        } catch (e) {
          console.error('[SYNC] customSchedule error', e);
          applyErrors.push('customSchedule');
        }
      }

      // urlops — MUTUJEMY obiekt (KRYTYCZNE — tu był problem!)
      if (data.urlops && typeof urlops !== 'undefined') {
        try {
          Object.keys(urlops).forEach((k) => delete urlops[k]);
          Object.assign(urlops, data.urlops);
          saveUrlops(urlops);
        } catch (e) {
          console.error('[SYNC] urlops error', e);
          applyErrors.push('urlops');
        }
      }

      // overtimes — MUTUJEMY obiekt
      if (data.overtimes && typeof overtimes !== 'undefined') {
        try {
          Object.keys(overtimes).forEach((k) => delete overtimes[k]);
          Object.assign(overtimes, data.overtimes);
          saveOvertimes(overtimes);
        } catch (e) {
          console.error('[SYNC] overtimes error', e);
          applyErrors.push('overtimes');
        }
      }

      // notes — MUTUJEMY obiekt
      if (data.notes && typeof notes !== 'undefined') {
        try {
          Object.keys(notes).forEach((k) => delete notes[k]);
          Object.assign(notes, data.notes);
          saveNotes(notes);
        } catch (e) {
          console.error('[SYNC] notes error', e);
          applyErrors.push('notes');
        }
      }

      // prefs — scalamy (nie usuwamy kluczy!)
      if (data.prefs && typeof prefs !== 'undefined') {
        try {
          Object.assign(prefs, data.prefs);
          savePrefs(prefs);
        } catch (e) {
          console.error('[SYNC] prefs error', e);
          applyErrors.push('prefs');
        }
      }

      const applyVacationLimits = (limits, source) => {
        if (!limits || typeof limits !== 'object') return false;
        if (typeof setVacationLimit !== 'function') {
          console.warn('[SYNC] setVacationLimit not available, skipping vacationLimits');
          return false;
        }
        Object.keys(limits).forEach((brig) => {
          try {
            setVacationLimit(brig, limits[brig]);
          } catch (e) {
            console.error('[SYNC] vacationLimit error', brig, e);
            applyErrors.push('vacationLimits.' + brig);
          }
        });
        return true;
      };

      if (!applyVacationLimits(data.vacationLimits, 'data.vacationLimits')) {
        applyVacationLimits(data.prefs && data.prefs.urlopLimits, 'data.prefs.urlopLimits');
      }

      // Odświeżamy widok
      currentView = 'dashboard';
      if (typeof switchView === 'function') {
        try {
          switchView('dashboard');
        } catch (e) {
          console.error('[SYNC] switchView error', e);
          applyErrors.push('switchView');
        }
      } else if (typeof refreshViews === 'function') {
        try {
          refreshViews();
        } catch (e) {
          console.error('[SYNC] refreshViews error', e);
          applyErrors.push('refreshViews');
        }
      } else {
        console.warn('[SYNC] neither switchView nor refreshViews available');
      }

      if (applyErrors.length) {
        showToast('warn', `☁️ ${t('driveDownloadedWithErrors')}: ` + applyErrors.join(', '));
      } else {
        showToast('success', `☁️ ${t('driveDownloaded')}`);
      }
      updateDriveUI();
    };

    if (confirmOverwrite) {
      showConfirm(`☁️ ${t('driveDownloadConfirmTitle')}`, t('driveDownloadConfirmBody'), doApply, {
        primaryText: t('download'),
        primaryClass: 'primary',
      });
    } else {
      doApply();
    }
    return true;
  } catch (e) {
    console.error('[SYNC] download:', e);
    showToast('error', `☁️ ${t('driveDownloadError')}`);
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
    item.title = t('driveLoggedInHint');
    if (check) check.style.display = 'inline';
    if (label) label.textContent = `Google Drive ☁️ (${t('loggedIn')})`;
    item.classList.remove('drive-error');
    if (logoutBtn) logoutBtn.style.display = 'flex';
    if (syncItem) syncItem.style.display = 'flex';
    if (authBtn) {
      authBtn.textContent = '🚪';
      authBtn.title = t('logoutFromDrive');
      authBtn.classList.add('auth-logged-in');
    }
  } else {
    if (check) check.style.display = 'none';
    if (label) label.textContent = `Google Drive ☁️ (${t('login')})`;
    item.title = t('driveLoggedOutHint');
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (syncItem) syncItem.style.display = 'none';
    if (authBtn) {
      authBtn.textContent = '👤';
      authBtn.title = t('login');
      authBtn.classList.remove('auth-logged-in');
    }
  }
}

/* === USTAWIANIE CLIENT ID === */
function askForClientId() {
  showModal({
    title: `☁️ ${t('driveConfigTitle')}`,
    body: `
      <p>${t('driveConfigIntro')}</p>
      <p><b>${t('driveConfigHowTo')}</b></p>
      <ol style="margin:8px 0; padding-left:22px; font-size:13px;">
        <li>${t('driveConfigStep1')} <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color:var(--text-header);">Google Cloud Console → Credentials</a></li>
        <li>${t('driveConfigStep2')}</li>
        <li>${t('driveConfigStep3')}</li>
        <li>${t('driveConfigStep4')} <code>http://localhost:8000</code></li>
        <li>${t('driveConfigStep5')}</li>
      </ol>
      <div style="margin-top:12px;">
        <label style="font-weight:600; font-size:13px; display:block; margin-bottom:4px;">OAuth Client ID:</label>
        <input type="text" id="driveClientIdInput" placeholder="np. 1234567890-abc.apps.googleusercontent.com"
               style="width:100%; padding:8px 12px; border:1px solid var(--border-cell); border-radius:8px; background:var(--bg-container); color:var(--text-main); font-size:14px;"
               value="${gDriveClientId}">
      </div>
      <p style="font-size:12px; color:var(--text-muted); margin-top:10px;">⚠️ ${t('driveConfigNote')}</p>
    `,
    buttons: [
      {
        text: t('save'),
        class: 'primary',
        onClick: () => {
          const input = document.getElementById('driveClientIdInput');
          const val = input ? input.value.trim() : '';
          if (!val) {
            showToast('warn', t('enterClientId'));
            return;
          }
          gDriveClientId = val;
          localStorage.setItem(DRIVE_CLIENT_ID_KEY, val);
          initGDriveTokenClient();
          showToast('success', `☁️ ${t('driveClientIdSaved')}`);
        },
      },
    ],
  });
}

/* === LOGOWANIE === */
function loginDrive() {
  if (!gDriveClientId) {
    showToast('warn', `☁️ ${t('driveConfigureClientIdFirst')}`);
    askForClientId();
    return;
  }
  if (!gDriveTokenClient) initGDriveTokenClient();
  if (!gDriveTokenClient) {
    showToast('error', `☁️ ${t('driveCannotInitLogin')}`);
    return;
  }
  gDriveTokenClient.requestAccessToken();
}

/* === GŁÓWNE MENU: synchronizuj === */
async function syncWithDrive() {
  if (!isDriveTokenValid()) {
    showToast('warn', `☁️ ${t('driveLoginRequired')}`);
    loginDrive();
    return;
  }
  // Zalogowano: pokazujemy modal z 3 przyciskami
  showModal({
    title: `☁️ ${t('driveSyncTitle')}`,
    body: `<p>${t('driveSyncBody')}</p>`,
    buttons: [
      { text: t('cancel'), class: 'secondary' },
      {
        text: t('download'),
        class: 'secondary',
        onClick: () => downloadFromDrive(true),
        closeOnClick: true,
      },
      {
        text: t('sendToDrive'),
        class: 'primary',
        onClick: () => uploadToDrive(true),
        closeOnClick: true,
      },
    ],
  });
}

/* === LOGOUT === */
function logoutDrive() {
  gDriveToken = null;
  gDriveTokenExpiry = 0;
  gDriveFileId = null;
  driveUserEmail = null;
  localStorage.removeItem('grafik_drive_token');
  localStorage.removeItem('grafik_drive_token_expiry');
  localStorage.removeItem('grafik_drive_file_id');
  localStorage.removeItem('grafik_drive_user_email');
  showToast('info', `☁️ ${t('driveLoggedOut')}`);
  updateDriveUI();
  if (typeof updateAdminUI === 'function') {
    updateAdminUI();
  }
}

/* === EXPOSE driveUserEmail TO GLOBAL SCOPE (for js/admin.js) === */
Object.defineProperty(window, 'driveUserEmail', {
  get: () => driveUserEmail,
  configurable: true,
});

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

  // Przycisk wylogowania
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
        showToast('warn', `☁️ ${t('driveLoginRequired')}`);
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
