/* ================================================================
   GRAFIK GILLETTE — Moduł ADMIN
   Identyfikacja administratora + widoczność menu admin
   ================================================================ */

/* === LISTA EMAILÓW ADMINÓW ===
   Publiczne w kodzie — bezpieczne.
   Znajomość emaila nie daje dostępu — potrzebne jest zalogowanie do Google. */
const ADMIN_EMAILS = ['servitant@gmail.com'];

/* === SPRAWDZENIE STANU ADMINA === */

/**
 * Sprawdza, czy zalogowany użytkownik Google Drive jest adminem.
 * @returns {boolean}
 */
function isCurrentUserAdmin() {
  const email =
    typeof driveUserEmail === 'string' && driveUserEmail ? driveUserEmail.toLowerCase() : null;

  if (!email) return false;

  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email);
}

/**
 * Aktualizuje klasę body.admin-mode zgodnie ze stanem admina.
 * Pokazuje/ukrywa elementy z klasą .admin-only (via CSS).
 */
function updateAdminUI() {
  const isAdmin = isCurrentUserAdmin();

  if (isAdmin) {
    document.body.classList.add('admin-mode');
    console.log('[admin.js] Admin mode ACTIVATED for:', driveUserEmail);
  } else {
    document.body.classList.remove('admin-mode');
    console.log('[admin.js] Admin mode inactive');
  }
}

/* === INICJALIZACJA === */

function initAdminMode() {
  updateAdminUI();
  window.addEventListener('driveAuthChanged', updateAdminUI);

  // Polling fallback: check admin state every 3 seconds
  // (needed because fetchDriveUserEmail from sync.js resolves async after login,
  // and we can't guarantee event 'driveAuthChanged' is dispatched)
  // Overhead is negligible — just checks a global variable.
  setInterval(updateAdminUI, 3000);
}

/* === EXPOSE TO GLOBAL SCOPE === */
window.isCurrentUserAdmin = isCurrentUserAdmin;
window.updateAdminUI = updateAdminUI;

/* === AUTO-INIT === */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminMode);
} else {
  initAdminMode();
}
