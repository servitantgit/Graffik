/* ================================================================
   GRAFIK GILLETTE — Moduł 10: PWA + POWIADOMIENIA
   ================================================================ */

/* === STAN === */
let deferredInstallPrompt = null;
let lastNotified = null; // 'YYYY-MM-DD:ZMIANA'

/* === SERVICE WORKER + AUTO-UPDATE === */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {

        // Перевіряємо оновлення одразу
        reg.update();

        // Періодична перевірка (кожні 60 хв)
        setInterval(() => reg.update(), 60 * 60 * 1000);

        // 1) Нова версія вже чекає в waiting (наприклад, після F5)
        if (reg.waiting) {
          promptUserToUpdate(reg.waiting);
        }

        // 2) Знайдено оновлення — стежимо за станом
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          if (!newSW) return;

          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              // Нова версія встановлена, стара ще активна → пропонуємо оновити
              promptUserToUpdate(newSW);
            }
          });
        });
      })
      .catch((err) => console.warn('[PWA] SW błąd:', err));

    // Коли новий SW активувався → перезавантажуємо сторінку
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}

/* === Toast з кнопкою "Оновити" === */
function promptUserToUpdate(waitingSW) {
  // Не показувати, якщо вже показали в цій сесії
  if (window._updatePromptShown) return;
  window._updatePromptShown = true;

  showUpdateToast(() => {
    // Кажемо новому SW взяти управління → controllerchange → reload
    waitingSW.postMessage({ type: 'SKIP_WAITING' });
  });
}

function showUpdateToast(onUpdate) {
  const container = document.getElementById('toastContainer');
  if (!container) {
    // Fallback — якщо toast-контейнер не готовий
    if (confirm('🔄 Dostępna jest nowa wersja aplikacji. Odświeżyć teraz?')) {
      onUpdate();
    }
    return;
  }

  const toast = document.createElement('div');
  toast.className = 'toast info';
  toast.style.cssText = 'min-width: 280px; align-items: center; gap: 12px;';
  toast.innerHTML = `
    <span class="toast-icon">🔄</span>
    <div style="flex:1;">
      <div style="font-weight:700; margin-bottom:2px;">${t('updateAvailable') || 'Nowa wersja dostępna'}</div>
      <div style="font-size:12px; opacity:0.85;">${t('updateHint') || 'Kliknij, aby odświeżyć'}</div>
    </div>
    <button id="updateNowBtn" style="
      background: var(--text-header);
      color: #fff;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
      font-size: 13px;
      white-space: nowrap;
    ">${t('updateNow') || '🔄 Odśwież'}</button>
  `;
  container.appendChild(toast);

  document.getElementById('updateNowBtn').onclick = () => {
    toast.remove();
    onUpdate();
  };

  // НЕ автоматично закриваємо — користувач має сам вирішити
}

/* === WYKRYWANIE PLATFORMY === */
function isIOS() {
  const ua = navigator.userAgent || '';
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}
function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

/* === INSTALL PROMPT (Dodaj do ekranu głównego) === */
function setupInstallPrompt() {
  const installItem = document.getElementById('menuInstallApp');
  if (!installItem) return;

  // iOS nie obsługuje beforeinstallprompt — pokazujemy instrukcję manualną
  if (isIOS()) {
    if (!isStandalone()) {
      installItem.style.display = 'flex';
      installItem.onclick = () => {
        closeSideMenu();
        showModal({
          title: `📲 ${t('installApp')}`,
          body: `
            <p>${t('installAppIosIntro')}</p>
            <ol style="margin:8px 0; padding-left:22px; font-size:13px;">
              <li>${t('installAppIosStep1')}</li>
              <li>${t('installAppIosStep2')}</li>
              <li>${t('installAppIosStep3')}</li>
            </ol>
            <p style="font-size:12px; color:var(--text-muted);">${t('installAppIosNote')}</p>
          `,
          buttons: [{ text: t('gotIt'), class: 'primary' }],
        });
      };
    } else {
      installItem.style.display = 'none';
    }
    return;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installItem.style.display = 'flex';
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installItem.style.display = 'none';
    showToast('success', `✅ ${t('appInstalled')}`);
  });

  installItem.onclick = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === 'accepted') showToast('success', `✅ ${t('installStarted')}`);
    else showToast('info', t('installCancelled'));
    deferredInstallPrompt = null;
    installItem.style.display = 'none';
  };
}

/* === POWIADOMIENIA (Notification API) === */
function areNotificationsEnabled() {
  return (
    prefs.notifications === true &&
    'Notification' in window &&
    Notification.permission === 'granted'
  );
}

function updateNotificationUI() {
  const item = document.getElementById('menuNotifications');
  if (!item) return;
  const check = item.querySelector('.mi-check');
  const label = item.querySelector('span:nth-child(2)');

  if (!('Notification' in window)) {
    item.classList.add('disabled');
    item.style.opacity = '0.4';
    if (label) label.textContent = t('notificationsNotSupported');
    return;
  }

  const enabled = areNotificationsEnabled();
  if (check) check.style.display = enabled ? 'inline' : 'none';
  if (label) label.textContent = t('notificationsAboutShifts');
  item.title = enabled ? t('notificationsEnabledHint') : t('notificationsDisabledHint');

  // Upewnij się, że prefs.notificationsLead istnieje
  if (typeof prefs.notificationsLead === 'undefined') prefs.notificationsLead = 1;

  // Kontener z przyciskami — pokazujemy tylko gdy notifications ON
  let leadContainer = document.getElementById('notifLeadContainer');

  if (enabled) {
    if (!leadContainer) {
      leadContainer = document.createElement('div');
      leadContainer.id = 'notifLeadContainer';
      leadContainer.className = 'notif-lead-buttons';
      leadContainer.innerHTML = `
        <div class="notif-lead-label">⏰ ${t('remindMeIn')}:</div>
        <div class="notif-lead-btns">
          <button type="button" class="notif-lead-btn" data-lead="1">1h</button>
          <button type="button" class="notif-lead-btn" data-lead="2">2h</button>
          <button type="button" class="notif-lead-btn" data-lead="3">3h</button>
        </div>
      `;
      // Wstawiamy PO menu-item (na dole, jako osobny blok)
      item.parentNode.insertBefore(leadContainer, item.nextSibling);

      // Podpinamy click
      leadContainer.querySelectorAll('.notif-lead-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = parseInt(btn.dataset.lead, 10) || 1;
          prefs.notificationsLead = val;
          savePrefs(prefs);
          updateLeadButtonsActive();
          const timeText = val === 1 ? t('hourSingular') : `${val} ${t('hoursPlural')}`;
          showToast('info', `⏰ ${t('notificationLeadToast')} ${timeText} ${t('beforeShift')}`);
        });
      });
    }
    updateLeadButtonsActive();
  } else {
    // Chowamy kontener gdy notifications OFF
    if (leadContainer) leadContainer.remove();
  }
}

// Pomocnik — aktualizuje aktywny przycisk
function updateLeadButtonsActive() {
  const lead = prefs.notificationsLead || 1;
  document.querySelectorAll('.notif-lead-btn').forEach((btn) => {
    btn.classList.toggle('active', parseInt(btn.dataset.lead, 10) === lead);
  });
}

function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('warn', t('browserNoNotificationSupport'));
    return;
  }
  if (Notification.permission === 'denied') {
    showToast('error', t('notificationsBlockedInBrowser'));
    return;
  }
  if (Notification.permission === 'granted') {
    prefs.notifications = true;
    savePrefs(prefs);
    showToast('success', `🔔 ${t('notificationsEnabled')}`);
    updateNotificationUI();
    return;
  }
  // Prosimy o pozwolenie
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      prefs.notifications = true;
      savePrefs(prefs);
      showToast('success', `🔔 ${t('notificationsEnabled')}`);
      // testowe powiadomienie
      try {
        new Notification(`🔔 ${t('appName')}`, {
          body: t('notificationsTestBody'),
          icon: './icons/icon-192.png',
        });
      } catch (e) {
        /* ignoruj */
      }
    } else {
      prefs.notifications = false;
      savePrefs(prefs);
      showToast('warn', t('notificationsDisabled'));
    }
    updateNotificationUI();
  });
}

function toggleNotifications() {
  if (areNotificationsEnabled()) {
    prefs.notifications = false;
    savePrefs(prefs);
    showToast('info', `🔕 ${t('notificationsEnabled')}`);
    updateNotificationUI();
  } else {
    requestNotificationPermission();
  }
}

/* === SPRAWDZANIE POCZĄTKU ZMIANY (co minutę) === */
function notifyCurrentShift() {
  if (!areNotificationsEnabled()) return;

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();

  // Zmiana zgodnie z grafikiem wybranej brygady na dziś
  const s = getShiftAt(y, m, d, selectedShift);
  if (isWolne(s) || isUrlop(y, m, d, selectedShift)) return;

  const hours = shiftHours[s];
  if (!hours) return;
  const startHour = hours[0];

  // Pokazujemy powiadomienie, gdy godzina = początek zmiany (0 minut)
  if (now.getHours() === startHour && now.getMinutes() === 0) {
    const key = `${y}-${m}-${d}:${s}`;
    if (lastNotified === key) return; // już pokazaliśmy dzisiaj
    lastNotified = key;
    localStorage.setItem('grafik_last_notified', key);

    const [sh, eh] = hours;
    const timeRange = `${String(sh).padStart(2, '0')}:00 – ${String(eh % 24).padStart(2, '0')}:00`;
    // Używamy istniejących nazw zmian (shiftLongNames / shiftEmoji z data.js) zamiast duplikować tłumaczenia
    const shiftLabel = `${shiftEmoji[s] || ''} ${shiftLongNames[s] || s}`;

    const title = `⏰ ${t('shift')} ${s} — ${shiftLabel}`;
    const body = `${t('brigade')} ${selectedShift} • ${d} ${monthNames[m - 1]} ${y}\n${timeRange}`;
    const notification = new Notification(title, {
      body: body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'grafik-shift-start',
      requireInteraction: false,
    });
    notification.onclick = () => {
      window.focus();
      if (currentView !== 'dashboard') switchView('dashboard');
      notification.close();
    };
  }
}

/* === INIT === */
function initPwa() {
  registerServiceWorker();
  setupInstallPrompt();

  // Przywróć ostatnie powiadomienie
  lastNotified = localStorage.getItem('grafik_last_notified');

  // Menu: powiadomienia
  const notifItem = document.getElementById('menuNotifications');
  if (notifItem) notifItem.onclick = toggleNotifications;

  // Ukrywamy pozycję instalacji domyślnie (nie na iOS — tam pokazujemy instrukcję)
  const installItem = document.getElementById('menuInstallApp');
  if (installItem && !isIOS()) installItem.style.display = 'none';

  updateNotificationUI();

  // Sprawdzanie co minutę
  window._notifyTimer = setInterval(notifyCurrentShift, 60000);
  notifyCurrentShift();
}

// Uruchamiamy po załadowaniu DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPwa);
} else {
  initPwa();
}
