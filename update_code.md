### OP 1: Remove legacy week view reference

FILE: js/main.js
ACTION: REPLACE

LOCATE:

```javascript
let currentView = prefs.view === 'week' ? 'month' : (prefs.view || 'dashboard');
```

REPLACE_WITH:

```javascript
let currentView = prefs.view || 'dashboard';
```
