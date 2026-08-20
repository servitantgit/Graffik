/* ================================================================
   GRAFIK GILLETTE — Module 11: GOOGLE DRIVE SYNC
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
const DRIVE_SESSION_KEY = 'grafik_drive_had_session';
let gDriveRefreshTimer = null;
let gDriveTokenInflight = null; // Promise for concurrent refresh requests

function isDriveTokenValid() {
  return !!(gDriveToken && Date.now() < gDriveTokenExpiry - 60000);
}

/** User had a Drive session before (even if access token expired). */
function hadDriveSession() {
  return (
    localStorage.getItem(DRIVE_SESSION_KEY) === '1' ||
    !!driveUserEmail ||
    !!localStorage.getItem('grafik_drive_token')
  );
}

/**
 * Logged-in for UI / personal data until explicit logout.
 * Access token may expire (~1h); background refresh restores it for API calls.
 */
function isDriveLoggedIn() {
  return hadDriveSession() || isDriveTokenValid();
}

function markDriveSession() {
  localStorage.setItem(DRIVE_SESSION_KEY, '1');
}

function clearDriveSessionFlag() {
  localStorage.removeItem(DRIVE_SESSION_KEY);
}

function persistDriveToken(accessToken, expiresInSec) {
  gDriveToken = accessToken;
  const sec = Number(expiresInSec) > 0 ? Number(expiresInSec) : 3600;
  gDriveTokenExpiry = Date.now() + sec * 1000;
  localStorage.setItem('grafik_drive_token', gDriveToken);
  localStorage.setItem('grafik_drive_token_expiry', String(gDriveTokenExpiry));
  markDriveSession();
  scheduleDriveTokenRefresh();
}

/** Refresh a few minutes before expiry (access tokens ~1h). */
function scheduleDriveTokenRefresh() {
  if (gDriveRefreshTimer) {
    clearTimeout(gDriveRefreshTimer);
    gDriveRefreshTimer = null;
  }
  if (!gDriveToken || !gDriveTokenExpiry) return;
  // refresh 5 min before expiry, but at least 30s from now
  const ms = Math.max(30 * 1000, gDriveTokenExpiry - Date.now() - 5 * 60 * 1000);
  gDriveRefreshTimer = setTimeout(() => {
    trySilentDriveRefresh().catch(() => {});
  }, ms);
}

/**
 * Fetches the logged-in user's email from the Google API.
 * Wymagany scope: 'openid email' w DRIVE_SCOPE.
 * Wynik zapisywany do driveUserEmail + localStorage.
 * Called after a successful login.
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
    // prompt is set per requestAccessToken call ('' = silent, consent = interactive)
    gDriveTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: gDriveClientId,
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        if (resp && resp.access_token) {
          persistDriveToken(resp.access_token, resp.expires_in);
          if (gDriveTokenInflight && gDriveTokenInflight._resolve) {
            gDriveTokenInflight._resolve(true);
            gDriveTokenInflight = null;
          }
          // Toast only for interactive login (not silent refresh)
          if (gDriveTokenClient && gDriveTokenClient._lastInteractive) {
            showToast('success', `☁️ ${t('driveLoggedIn')}`);
            gDriveTokenClient._lastInteractive = false;
          }
          updateDriveUI();
          fetchDriveUserEmail();
          try {
            window.dispatchEvent(new CustomEvent('driveAuthChanged', { detail: { loggedIn: true } }));
          } catch (_) {}
        } else {
          if (gDriveTokenInflight && gDriveTokenInflight._resolve) {
            gDriveTokenInflight._resolve(false);
            gDriveTokenInflight = null;
          }
          // Silent failure: do not toast (expired session / no Google cookie)
          if (gDriveTokenClient && gDriveTokenClient._lastInteractive) {
            showToast('error', `☁️ ${t('driveLoginFailed')}`);
            gDriveTokenClient._lastInteractive = false;
          }
        }
      },
      error_callback: (err) => {
        console.warn('[SYNC] token error:', err);
        if (gDriveTokenInflight && gDriveTokenInflight._resolve) {
          gDriveTokenInflight._resolve(false);
          gDriveTokenInflight = null;
        }
        if (gDriveTokenClient && gDriveTokenClient._lastInteractive) {
          showToast('error', `☁️ ${t('driveLoginFailed')}`);
          gDriveTokenClient._lastInteractive = false;
        }
      },
    });
    return true;
  } catch (e) {
    console.warn('[SYNC] initTokenClient błąd:', e);
    return false;
  }
}

/**
 * Request a new access token.
 * @param {{ interactive?: boolean }} opts
 *   interactive true → may show Google UI; false → prompt:'' silent
 * @returns {Promise<boolean>}
 */
function requestDriveAccessToken(opts) {
  const interactive = !!(opts && opts.interactive);
  if (!gDriveTokenClient) initGDriveTokenClient();
  if (!gDriveTokenClient) return Promise.resolve(false);

  // Coalesce parallel requests
  if (gDriveTokenInflight) return gDriveTokenInflight;

  let resolveFn;
  gDriveTokenInflight = new Promise((resolve) => {
    resolveFn = resolve;
  });
  gDriveTokenInflight._resolve = resolveFn;

  gDriveTokenClient._lastInteractive = interactive;
  try {
    gDriveTokenClient.requestAccessToken(
      interactive ? { prompt: 'consent' } : { prompt: '' }
    );
  } catch (e) {
    console.warn('[SYNC] requestAccessToken:', e);
    resolveFn(false);
    gDriveTokenInflight = null;
    return Promise.resolve(false);
  }

  // Safety timeout
  setTimeout(() => {
    if (gDriveTokenInflight && gDriveTokenInflight._resolve === resolveFn) {
      resolveFn(isDriveTokenValid());
      gDriveTokenInflight = null;
    }
  }, interactive ? 120000 : 8000);

  return gDriveTokenInflight;
}

/** Silent refresh when Google session cookie still exists. */
async function trySilentDriveRefresh() {
  if (isDriveTokenValid()) {
    scheduleDriveTokenRefresh();
    return true;
  }
  if (!hadDriveSession()) return false;
  await loadGis();
  if (!gDriveTokenClient) initGDriveTokenClient();
  const ok = await requestDriveAccessToken({ interactive: false });
  if (ok) {
    updateDriveUI();
    return true;
  }
  // Token gone but remember session — UI shows logged out until user taps login
  updateDriveUI();
  return false;
}

/** Ensure valid token before Drive API calls. */
async function ensureDriveToken(interactiveFallback) {
  if (isDriveTokenValid()) return true;
  const silent = await trySilentDriveRefresh();
  if (silent) return true;
  if (interactiveFallback) {
    return requestDriveAccessToken({ interactive: true });
  }
  return false;
}

/* === API WRAPPERS === */
async function driveFetch(url, options = {}, retry = true) {
  if (!isDriveTokenValid()) {
    await ensureDriveToken(false);
  }
  const headers = options.headers || {};
  headers['Authorization'] = 'Bearer ' + gDriveToken;
  const resp = await fetch(url, { ...options, headers });
  if (resp.status === 401 && retry) {
    const ok = await ensureDriveToken(false);
    if (ok) return driveFetch(url, options, false);
  }
  return resp;
}

/* === SZUKANIE PLIKU W DRIVE === */
async function findDriveFile() {
  // Look for ALL files with our name in App Data
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

  // Newest file — first in the list (orderBy=modifiedTime desc)
  const newest = files[0];

  // Remove duplicates (all except the first one)
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
  if (!(await ensureDriveToken(true))) {
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
      // Look for an existing file
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
      // Update the existing file
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
    // Mark data as synced — clears unsynced state (used by R11 logout warning)
    if (typeof updateLastSync === 'function') updateLastSync();
    return true;
  } catch (e) {
    console.error('[SYNC] upload:', e);
    showToast('error', `☁️ ${t('driveSyncError')}`);
    return false;
  }
}

/* === ODCZYT === */
async function downloadFromDrive(confirmOverwrite = false) {
  if (!(await ensureDriveToken(true))) {
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

      // customSchedule — we MUTATE the object (not overwrite)
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

      // urlops — we MUTATE the object (CRITICAL — this used to be a bug!)
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

      // overtimes — we MUTATE the object
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

      // notes — we MUTATE the object
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

      // prefs — we merge (don't remove keys!)
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

      // Refresh the view
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
  const logged = typeof isDriveLoggedIn === 'function' ? isDriveLoggedIn() : isDriveTokenValid();

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
  loadGis().then(() => {
    if (!gDriveTokenClient) initGDriveTokenClient();
    if (!gDriveTokenClient) {
      showToast('error', `☁️ ${t('driveCannotInitLogin')}`);
      return;
    }
    requestDriveAccessToken({ interactive: true });
  });
}

/* === MAIN MENU: sync === */
async function syncWithDrive() {
  if (!(await ensureDriveToken(true))) {
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
/**
 * Public logout function — checks for unsynced changes first.
 * If unsynced data exists, shows warning modal with 3 options:
 * - Cancel (stay logged in)
 * - Upload first then logout (safest)
 * - Logout anyway (data stays in localStorage but no cloud backup)
 */
function logoutDrive() {
  // Check for unsynced changes (from js/personal/sync-tracking.js)
  const hasUnsynced = typeof hasUnsyncedChanges === 'function' && hasUnsyncedChanges();

  if (!hasUnsynced) {
    // No unsynced changes — safe to logout immediately
    performLogoutDrive();
    return;
  }

  // Has unsynced changes — show warning modal
  const lastSyncText = typeof timeSinceLastSync === 'function' ? timeSinceLastSync() : (typeof t === 'function' ? t('syncUnknown') : 'nieznany');

  const title = (typeof t === 'function' && t('logoutUnsyncedTitle')) || '⚠️ Unsaved changes';
  const body =
    (typeof t === 'function' && t('logoutUnsyncedBody', { time: lastSyncText })) ||
    `<p>Masz lokalne zmiany, których jeszcze nie zsynchronizowano z Google Drive.</p>
     <p><b>Ostatnia synchronizacja:</b> ${lastSyncText}</p>
     <p style="margin-top:12px;">Jeśli wylogujesz się teraz:</p>
     <ul style="margin:8px 0; padding-left:22px;">
       <li>✅ Dane pozostaną w tej przeglądarce</li>
       <li>❌ NIE będą w backup Google Drive</li>
       <li>❌ NIE zobaczysz ich na innym urządzeniu</li>
     </ul>
     <p style="padding:10px; background:var(--bg-info); border-radius:8px; margin-top:10px;">
       💡 <b>Zalecane:</b> Zsynchronizuj najpierw, potem się wyloguj.
     </p>`;

  showModal({
    title: title,
    body: body,
    buttons: [
      {
        text: (typeof t === 'function' && t('logoutUnsyncedCancel')) || 'Anuluj',
        class: 'secondary',
      },
      {
        text: (typeof t === 'function' && t('logoutUnsyncedForce')) || 'Wyloguj mimo to',
        class: 'danger',
        onClick: () => {
          performLogoutDrive();
        },
      },
      {
        text:
          (typeof t === 'function' && t('logoutUnsyncedSyncFirst')) || '☁️ Sync and log out',
        class: 'primary',
        onClick: async () => {
          showToast(
            'info',
            '☁️ ' + ((typeof t === 'function' && t('driveSyncing')) || 'Synchronizacja...')
          );
          const success = await uploadToDrive();
          if (success) {
            performLogoutDrive();
          } else {
            showToast(
              'error',
              '☁️ ' +
                ((typeof t === 'function' && t('driveSyncFailedNoLogout')) ||
                  'Sync failed, logout cancelled')
            );
          }
        },
      },
    ],
  });
}

/**
 * Internal logout — actually clears drive state.
 * Called after user confirms (or if no unsynced changes exist).
 */
function performLogoutDrive() {
  if (gDriveRefreshTimer) {
    clearTimeout(gDriveRefreshTimer);
    gDriveRefreshTimer = null;
  }
  gDriveToken = null;
  gDriveTokenExpiry = 0;
  gDriveFileId = null;
  driveUserEmail = null;
  localStorage.removeItem('grafik_drive_token');
  localStorage.removeItem('grafik_drive_token_expiry');
  localStorage.removeItem('grafik_drive_file_id');
  localStorage.removeItem('grafik_drive_user_email');
  clearDriveSessionFlag();
  showToast('info', `☁️ ${t('driveLoggedOut')}`);
  updateDriveUI();
  if (typeof updateAdminUI === 'function') {
    updateAdminUI();
  }
  try {
    window.dispatchEvent(new CustomEvent('driveAuthChanged', { detail: { loggedIn: false } }));
  } catch (_) {}
}

/* === EXPOSE driveUserEmail TO GLOBAL SCOPE (for js/admin.js) === */
Object.defineProperty(window, 'driveUserEmail', {
  get: () => driveUserEmail,
  configurable: true,
});
window.isDriveLoggedIn = isDriveLoggedIn;
window.isDriveTokenValid = isDriveTokenValid;
window.hadDriveSession = hadDriveSession;
window.ensureDriveToken = ensureDriveToken;

/* === INIT === */
function initSync() {
  const menuBtn = document.getElementById('menuDriveSync');
  if (menuBtn) {
    menuBtn.onclick = () => {
      closeSideMenu();
      if (isDriveLoggedIn()) {
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
      if (isDriveLoggedIn()) {
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

  // Button in the action menu — sync only for logged-in users
  const syncItem = document.getElementById('menuSyncNow');
  if (syncItem) {
    syncItem.onclick = () => {
      closeSideMenu();
      if (!isDriveLoggedIn()) {
        showToast('warn', `☁️ ${t('driveLoginRequired')}`);
        loginDrive();
        return;
      }
      syncWithDrive();
    };
  }

  loadGis().then(async () => {
    if (gDriveClientId) initGDriveTokenClient();
    // Migrate: old installs stored token without session flag
    if (localStorage.getItem('grafik_drive_token') || driveUserEmail) {
      markDriveSession();
    }
    updateDriveUI();
    if (typeof renderDashboard === 'function' && document.getElementById('dashboardView')) {
      try {
        /* refresh personal UI if session restored */
      } catch (_) {}
    }
    // Restore access token if Google cookie still valid
    if (!isDriveTokenValid() && hadDriveSession()) {
      await trySilentDriveRefresh();
      updateDriveUI();
      if (typeof renderCurrentView === 'function') {
        try { renderCurrentView(); } catch (_) {}
      } else if (typeof renderDashboard === 'function') {
        try { renderDashboard(); } catch (_) {}
      }
    } else if (isDriveTokenValid()) {
      scheduleDriveTokenRefresh();
      fetchDriveUserEmail();
    }
  });

  // Tab visible again — refresh if token near expiry or gone
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (isDriveTokenValid()) {
      // renew if less than 10 min left
      if (gDriveTokenExpiry - Date.now() < 10 * 60 * 1000) {
        trySilentDriveRefresh().catch(() => {});
      }
    } else if (hadDriveSession()) {
      trySilentDriveRefresh().catch(() => {});
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSync);
} else {
  initSync();
}
