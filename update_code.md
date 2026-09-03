OP 1: Fix Service Worker versioning and precache timeline module
FILE: sw.js
ACTION: REPLACE

LOCATE:

const CACHE_NAME = 'grafik-gillette-v20260821cleanup';
const ASSETS = [
'./',
'./index.html',
'./manifest.json',
'./css/calendar.css',
'./css/components.css',
'./css/dashboard.css',
'./css/layout.css',
'./css/overtime.css',
'./css/print.css',
'./css/responsive.css',
'./css/smart-popup.css',
'./css/variables.css',
'./css/views.css',
'./js/schedules/\_core.js',
'./js/schedules/\_registry.js',
'./js/schedules/gillette/metadata.js',
'./js/schedules/gillette/2026.js',
'./js/personal/sync-tracking.js',
'./js/overtime-logic.js',
'./js/core.js',
'./js/ui.js',
'./js/edit.js',
'./js/dashboard.js',
'./js/calendar.js',
REPLACE_WITH:

const CACHE_NAME = 'grafik-gillette-' + '**BUILD_ID**';
const ASSETS = [
'./',
'./index.html',
'./manifest.json',
'./css/calendar.css',
'./css/components.css',
'./css/dashboard.css',
'./css/layout.css',
'./css/overtime.css',
'./css/print.css',
'./css/responsive.css',
'./css/smart-popup.css',
'./css/variables.css',
'./css/views.css',
'./js/schedules/\_core.js',
'./js/schedules/\_registry.js',
'./js/schedules/gillette/metadata.js',
'./js/schedules/gillette/2026.js',
'./js/personal/sync-tracking.js',
'./js/overtime-logic.js',
'./js/core.js',
'./js/ui.js',
'./js/edit.js',
'./js/dashboard.js',
'./js/smart-popup.js',
'./js/calendar.js',
OP 2: Document Service Worker precache fix
FILE: CHANGELOG.md
ACTION: REPLACE

LOCATE:

# Unreleased — 2026-08-22

- **Sync modal** — short change log (vacations, overtime, notes, custom shifts, vacation limits) comparing local counts vs Google Drive; shows last-sync time when there are unsynced changes.
  REPLACE_WITH:

# Unreleased — 2026-08-22

- **Service Worker cache** — restored dynamic `__BUILD_ID__` cache versioning and added the missing `js/smart-popup.js` timeline module to the precache list.
- **Sync modal** — short change log (vacations, overtime, notes, custom shifts, vacation limits) comparing local counts vs Google Drive; shows last-sync time when there are unsynced changes.
