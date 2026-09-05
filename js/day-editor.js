// ================================================================
// GRAFIK GILLETTE — Day Editor Module
// ================================================================

/**
 * Renders the day editor in the info panel for the selected day.
 * This function is called when a day is selected in the calendar.
 * @param {Object} options - Optional configuration (not used currently)
 */
window.renderDayEditor = function(options) {
    // The actual rendering is done via renderInfo in calendar.js
    // This function is kept for API compatibility and can be used to trigger a refresh
    renderInfo();
};

/**
 * Binds event listeners for day editor interactions.
 * This function sets up listeners for note input changes, etc.
 */
window.bindDayEditor = function() {
    // Note input binding is handled in renderInfo (calendar.js) for simplicity
    // But we can also bind global note events if needed
    // For now, we rely on the binding in renderInfo
};