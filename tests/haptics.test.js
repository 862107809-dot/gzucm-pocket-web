'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const base = path.resolve(__dirname, '..');
const source = readFileSync(path.join(base, 'haptics.js'), 'utf8');

function setup({ vibrate = true, pref = null, visibility = 'visible' } = {}) {
  const calls = [], handlers = {};
  let clock = 1000;
  const fakeDate = { now: () => clock };
  const win = {
    navigator: vibrate ? { vibrate: pattern => (calls.push(pattern), true) } : {},
    localStorage: { getItem: () => pref === null ? null : JSON.stringify(pref) },
    document: { visibilityState: visibility, addEventListener(name, fn) { handlers[name] = fn; } }
  };
  vm.runInNewContext(source, { window: win, Date: fakeDate, JSON });
  return { api: win.GZUCM_HAPTICS, calls, handlers, advance: ms => { clock += ms; } };
}

test('unsupported tablets and Safari fail silently', () => {
  const { api } = setup({ vibrate: false });
  assert.equal(api.supported(), false);
  assert.equal(api.pulse('selection'), false);
});

test('disabling touch feedback prevents all normal pulses', () => {
  const { api, calls } = setup({ pref: { hapticEffects: false } });
  assert.equal(api.enabled(), false);
  assert.equal(api.pulse('selection'), false);
  assert.equal(calls.length, 0);
});

test('turning the preference on or off can be acknowledged once', () => {
  const { api, calls } = setup({ pref: { hapticEffects: false } });
  assert.equal(api.pulse('toggle', true), true);
  assert.equal(calls.length, 1);
});

test('selection crossing is throttled and background tabs remain quiet', () => {
  const { api, calls, advance } = setup();
  assert.equal(api.pulse('selection'), true);
  advance(40);
  assert.equal(api.pulse('selection'), false);
  advance(50);
  assert.equal(api.pulse('selection'), true);
  assert.equal(calls.length, 2);
  assert.equal(setup({ visibility: 'hidden' }).api.pulse(), false);
});

test('trusted taps trigger once; programmatic clicks do not', () => {
  const { calls, handlers } = setup();
  const control = {
    disabled: false, dataset: { action: 'appearance' }, getAttribute: () => null,
    closest: () => null
  };
  const event = trusted => ({ isTrusted: trusted, target: { closest: () => control } });
  handlers.click(event(false));
  assert.equal(calls.length, 0);
  handlers.click(event(true));
  assert.equal(calls[0], 13);
});

test('haptic toggle is not double-fired by generic click delegation', () => {
  const { handlers, calls } = setup();
  const control = {
    disabled: false, dataset: { action: 'toggleHaptics' }, getAttribute: () => null,
    closest: () => null
  };
  handlers.click({ isTrusted: true, target: { closest: () => control } });
  assert.equal(calls.length, 0);
});

test('app uses the same engine for swipe choices, nav, settings, and cached assets', () => {
  const app = readFileSync(path.join(base, 'app.js'), 'utf8');
  const html = readFileSync(path.join(base, 'index.html'), 'utf8');
  const sw = readFileSync(path.join(base, 'sw.js'), 'utf8');
  assert.match(app, /data-action="toggleHaptics"/);
  assert.match(app, /case'toggleHaptics':/);
  assert.match(app, /playLiquidTick\(nearest.index\);\s*window.GZUCM_HAPTICS\?\.pulse\('selection'\);/);
  assert.match(app, /playLiquidTick\(index\);\s*window.GZUCM_HAPTICS\?\.pulse\('selection'\);/);
  assert.ok(html.indexOf('/haptics.js?') < html.indexOf('/app.js?'));
  assert.match(sw, /haptics\.js\?/);
});
