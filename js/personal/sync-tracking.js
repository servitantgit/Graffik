/* ================================================================
   GRAFIK GILLETTE — SYNC TRACKING MODULE
   
   PRIVATE MODULE — tracks user's local sync state
   NEVER commit personal data to git — this module only manages
   timestamps in localStorage.
   
   Purpose:
   - Track when user last modified data (any save operation)
   - Track when user last successfully synced to Google Drive
   - Detect unsynced changes (modified > lastSync)
   - Prevent data loss when logging out with pending changes
   ================================================================ */

const SYNC_META_KEY = 'gillette_sync_meta';

/**
 * Reads sync metadata from localStorage.
 * @returns {object} - { lastModified: number, lastSync: number }
 */
function getSyncMeta() {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (!raw) return { lastModified: 0, lastSync: 0 };
    const parsed = JSON.parse(raw);
    return {
      lastModified: parsed.lastModified || 0,
      lastSync: parsed.lastSync || 0,
    };
  } catch (e) {
    console.warn('[sync-tracking] Failed to parse sync meta:', e);
    return { lastModified: 0, lastSync: 0 };
  }
}

/**
 * Writes sync metadata to localStorage.
 * @param {object} meta - { lastModified?, lastSync? }
 */
function setSyncMeta(meta) {
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  } catch (e) {
    console.warn('[sync-tracking] Failed to save sync meta:', e);
  }
}

/**
 * Updates lastModified timestamp to now.
 * Call this from any save function (saveUrlops, saveNotes, saveOvertimes, saveCustomSchedule).
 */
function updateLastModified() {
  const meta = getSyncMeta();
  meta.lastModified = Date.now();
  setSyncMeta(meta);
}

/**
 * Updates lastSync timestamp to now.
 * Call this after successful uploadToDrive().
 */
function updateLastSync() {
  const meta = getSyncMeta();
  meta.lastSync = Date.now();
  setSyncMeta(meta);
}

/**
 * Checks if there are unsynced changes.
 * @returns {boolean} - true if lastModified > lastSync
 */
function hasUnsyncedChanges() {
  const meta = getSyncMeta();
  return meta.lastModified > meta.lastSync;
}

/**
 * Returns human-readable time since last sync.
 * @returns {string} - e.g. "5 minut temu" or "nigdy"
 */
function timeSinceLastSync() {
  const meta = getSyncMeta();
  if (meta.lastSync === 0) return 'nigdy';
  const diffMs = Date.now() - meta.lastSync;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'przed chwilą';
  if (diffMin < 60) return diffMin + ' minut temu';
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr + ' godz. temu';
  const diffDays = Math.floor(diffHr / 24);
  return diffDays + ' dni temu';
}

/* === EXPOSE TO GLOBAL SCOPE === */
window.updateLastModified = updateLastModified;
window.updateLastSync = updateLastSync;
window.hasUnsyncedChanges = hasUnsyncedChanges;
window.timeSinceLastSync = timeSinceLastSync;
window.getSyncMeta = getSyncMeta;
