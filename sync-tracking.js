/**
 * === SYNC TRACKING MODULE ===
 * Tracks local modifications and Google Drive sync state to prevent data loss.
 *
 * Module: sync-tracking.js
 * Dependencies: localStorage
 *
 * Responsibilities:
 * - Record when user modifies data (lastModified)
 * - Record when user successfully syncs to Google Drive (lastSync)
 * - Help UI show "unsynced changes" warning
 * - Block navigation/logout with pending changes if needed
 */

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
    const current = getSyncMeta();
    const next = {
      lastModified: meta.lastModified !== undefined ? meta.lastModified : current.lastModified,
      lastSync: meta.lastSync !== undefined ? meta.lastSync : current.lastSync,
    };
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(next));
    return next;
  } catch (e) {
    console.warn('[sync-tracking] Failed to save sync meta:', e);
  }
}

/**
 * Marks data as modified (unsynced).
 * Call this after any successful local save.
 */
function markDataModified() {
  setSyncMeta({ lastModified: Date.now() });
}

/**
 * Marks a successful Google Drive sync.
 * @param {number} [timestamp] - Optional custom timestamp.
 */
function markSyncComplete(timestamp) {
  const t = timestamp || Date.now();
  setSyncMeta({ lastSync: t });
}

/**
 * @returns {number} - timestamp of last data modification
 */
function getLastModified() {
  return getSyncMeta().lastModified;
}

/**
 * @returns {number} - timestamp of last successful sync
 */
function getLastSyncTime() {
  return getSyncMeta().lastSync;
}

/**
 * @returns {boolean} - true if there are unsynced changes
 */
function hasUnsyncedChanges() {
  const { lastModified, lastSync } = getSyncMeta();
  return lastModified > lastSync;
}

/**
 * Warns user if they have unsynced changes. Returns true if user proceeds.
 */
function confirmProceedWithUnsyncedChanges() {
  if (hasUnsyncedChanges()) {
    return window.confirm(
      'Šobrīd ir neapstiprinātas izmaiņas, kas vēl nav sinhronizētas ar Google Drive.\n\nTurpināt bez sinhronizācijas?'
    );
  }
  return true;
}

/**
 * Records a modification event (called after any save operation).
 */
function recordModification() {
  const meta = getSyncMeta();
  meta.lastModified = Date.now();
  setSyncMeta(meta);
}

/**
 * Records a successful Google Drive sync.
 */
function recordSync() {
  const meta = getSyncMeta();
  meta.lastSync = Date.now();
  setSyncMeta(meta);
}

/**
 * @returns {boolean} - true if there are unsynced changes.
 */
function hasUnsyncedChanges() {
  const meta = getSyncMeta();
  return meta.lastModified > meta.lastSync;
}

/**
 * Resets metadata (e.g., for testing or manual override).
 */
function resetSyncMeta() {
  localStorage.removeItem(SYNC_META_KEY);
}

// Expose for cross-module use
window.SyncTracker = {
  getSyncMeta,
  setSyncMeta,
  hasUnsyncedChanges,
  resetSyncMeta,
  recordModification: () => setSyncMeta({ lastModified: Date.now() }),
  recordSync: () => setSyncMeta({ lastSync: Date.now() }),
};

export { getSyncMeta, setSyncMeta, hasUnsyncedChanges, resetSyncMeta };
