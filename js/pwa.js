/* ================================================================
   GRAFIK GILLETTE — Moduł 10: PWA + POWIADOMIENIA
   ================================================================ */

/* === STAN === */
let deferredInstallPrompt = null;
let lastNotified = null; // 'YYYY-MM-DD:ZMINA'

/* === SERVICE WORKER === */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker zarejestrowany:', reg.scope);
        reg.update();
      })
      .catch((err) => console.warn('[PWA] SW błąd:', err));
  });
}

/* === INSTALL PROMPT (Dodaj do ekranu głównego) === */
function setupInstallPrompt() {
  const installItem = document.getElementById('menuInstallApp');
  if (!installItem) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installItem.style.display = 'flex';
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installItem.style.display = 'none';
    showToast('success', '✅ Aplikacja została zainstalowana!');
  });

  installItem.onclick = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === 'accepted') showToast('success', '✅ Instalacja rozpoczęta');
    else showToast('info', 'Instalacja anulowana');
    deferredInstallPrompt = null;
    installItem.style.display = 'none';
  };
}

/* === POWIADOMIENIA (Notification API) === */
function areNotificationsEnabled() {
  return prefs.notifications === true && 'Notification' in window &&
    Notification.permission === 'granted';
}

function updateNotificationUI() {
  const item = document.getElementById('menuNotifications');
  if (!item) return;
  const check = item.querySelector('.mi-check');
  const label = item.querySelector('span:nth-child(2)');

  if (!('Notification' in window)) {
    item.classList.add('disabled');
    item.style.opacity = '0.4';
    if (label) label.textContent = 'Powiadomienia (brak wsparcia)';
    return;
  }

  const enabled = areNotificationsEnabled();
  if (check) check.style.display = enabled ? 'inline' : 'none';
  if (label) label.textContent = 'Powiadomienia o zmianach';
  item.title = enabled
    ? 'Powiadomienia WŁĄCZONE — kliknij, aby wyłączyć'
    : 'Powiadomienia WYŁĄCZONE — kliknij, aby włączyć';
}

function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('warn', 'Ta przeglądarka nie obsługuje powiadomień');
    return;
  }
  if (Notification.permission === 'denied') {
    showToast('error', 'Powiadomienia zablokowane w ustawieniach przeglądarki');
    return;
  }
  if (Notification.permission === 'granted') {
    prefs.notifications = true;
    savePrefs(prefs);
    showToast('success', '🔔 Powiadomienia WŁĄCZONE');
    updateNotificationUI();
    return;
  }
  // Prosimy o pozwolenie
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      prefs.notifications = true;
      savePrefs(prefs);
      showToast('success', '🔔 Powiadomienia WŁĄCZONE');
      // testowe spowiadomienie
      try {
        new Notification('🔔 Grafik Gillette', {
          body: 'Powiadomienia działają! Będziesz dostawać przypomnienia o rozpoczęciu zmiany.',
          icon: './icons/icon-192.png'
        });
      } catch (e) { /* ignore */ }
    } else {
      prefs.notifications = false;
      savePrefs(prefs);
      showToast('warn', 'Powiadomienia wyłączone');
    }
    updateNotificationUI();
  });
}

function toggleNotifications() {
  if (areNotificationsEnabled()) {
    prefs.notifications = false;
    savePrefs(prefs);
    showToast('info', '🔕 Powiadomienia WYŁĄCZONE');
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

  // Зміна за розкладом вибраної бригади на сьогодні
  const s = getShiftAt(y, m, d, selectedShift);
  if (isWolne(s) || isUrlop(y, m, d, selectedShift)) return;

  const hours = shiftHours[s];
  if (!hours) return;
  const startHour = hours[0];

  // Показуємо сповіщення, коли година = початок зміни (0 хвилин)
  if (now.getHours() === startHour && now.getMinutes() === 0) {
    const key = `${y}-${m}-${d}:${s}`;
    if (lastNotified === key) return; // вже показали сьогодні
    lastNotified = key;
    localStorage.setItem('grafik_last_notified', key);

    const [sh, eh] = hours;
    const timeRange = `${String(sh).padStart(2,'0')}:00 – ${String(eh % 24).padStart(2,'0')}:00`;
    const names = {
      R: '🌅 Rano',
      P: '🌤️ Popołudnie',
      N: '🌙 Noc'
    };

    const title = `⏰ Zmiana ${s} — ${names[s] || s}`;
    const body = `Brygada ${selectedShift} • ${d} ${monthNames[m-1]} ${y}\n${timeRange}`;
    const notification = new Notification(title, {
      body: body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'grafik-shift-start',
      requireInteraction: false
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

  // Przywróć ostatnie spowiadomienie
  lastNotified = localStorage.getItem('grafik_last_notified');

  // Меню: сповіщення
  const notifItem = document.getElementById('menuNotifications');
  if (notifItem) notifItem.onclick = toggleNotifications;

  // Приховуємо пункт встановлення за замовчуванням
  const installItem = document.getElementById('menuInstallApp');
  if (installItem) installItem.style.display = 'none';

  updateNotificationUI();

  // Перевірка щохвилини
  window._notifyTimer = setInterval(notifyCurrentShift, 60000);
  notifyCurrentShift();
}

// Запускаємо після завантаження DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPwa);
} else {
  initPwa();
}