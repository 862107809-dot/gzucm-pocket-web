/*
 * GZUCM Pocket: progressive, opt-out touch feedback.
 * Android browsers with Vibration API can vibrate. iOS/iPadOS Safari
 * exposes no general-purpose webpage haptic API, so it falls back silently.
 * This module never affects selection, navigation or animation state.
 */
(function (global) {
  'use strict';
  const prefKey = 'gzucm-pocket-web:prefs';
  const patterns = Object.freeze({
    tap: 9,
    selection: 7,
    toggle: 12,
    open: 13,
    close: 8,
    success: [10, 55, 15],
    error: [19, 55, 19]
  });
  let lastAt = 0;

  function enabled() {
    try {
      const prefs = JSON.parse(global.localStorage?.getItem(prefKey) || 'null');
      return prefs?.hapticEffects !== false;
    } catch {
      return true;
    }
  }
  function supported() {
    return typeof global.navigator?.vibrate === 'function';
  }
  function pulse(kind = 'tap', force = false) {
    if ((!force && !enabled()) || !supported()) return false;
    if (global.document?.visibilityState === 'hidden') return false;
    const now = Date.now();
    const gap = kind === 'selection' ? 85 : 65;
    if (now - lastAt < gap) return false;
    try {
      // The browser may reject vibration on devices without a vibrator,
      // in background tabs or without user activation. No workaround is used.
      const accepted = global.navigator.vibrate(patterns[kind] || patterns.tap);
      if (accepted === true) lastAt = now;
      return accepted === true;
    } catch {
      return false;
    }
  }
  function handleClick(event) {
    if (!event.isTrusted) return;
    const control = event.target?.closest?.(
      'button,[role="button"],[role="switch"],a[href],summary,input[type="checkbox"],input[type="radio"]'
    );
    if (!control || control.disabled || control.getAttribute?.('aria-disabled') === 'true') return;
    // The toggle must be felt both when enabling and when disabling it.
    // app.js invokes pulse('toggle', true) for that specific setting.
    if (control.dataset?.action === 'toggleHaptics') return;
    const isChoice = !!control.closest?.('.liquid-selector,.bottom-nav,.safari-floating-menu');
    const action = control.dataset?.action || '';
    const kind = action === 'close' ? 'close' :
      ['appearance', 'connect', 'editPower', 'reset', 'themeMenu', 'settingsMenu', 'settingChoice'].includes(action) ? 'open' :
      isChoice ? 'selection' : 'tap';
    pulse(kind);
  }
  function handleChange(event) {
    if (!event.isTrusted) return;
    const target = event.target;
    if (target?.matches?.('select,input[type="range"],input[type="checkbox"],input[type="radio"]')) {
      pulse('selection');
    }
  }

  global.GZUCM_HAPTICS = Object.freeze({ enabled, supported, pulse });
  if (global.document?.addEventListener) {
    global.document.addEventListener('click', handleClick, true);
    global.document.addEventListener('change', handleChange, true);
  }
})(typeof window !== 'undefined' ? window : {});
