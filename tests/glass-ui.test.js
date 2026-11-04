'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('language switch is one button on left of topbar, not in settings',()=>{
 const app=read('app.js');
 const top=app.slice(app.indexOf('function topbar(){'),app.indexOf('function bottomNav(){'));
 assert.equal((top.match(/data-action="toggleLanguage"/g)||[]).length,1);
 assert.ok(top.indexOf('data-action="toggleLanguage"')>top.indexOf('class="top-left"'));
 assert.ok(top.indexOf('data-action="toggleLanguage"')<top.indexOf('class="top-actions"'));
 assert.doesNotMatch(app,/id="language-select"|id="language-settings"/);
 assert.match(app,/case'toggleLanguage':toggleLanguage\(\);break;/);
});
test('open source optics are self-hosted, loaded before the app and licensed',()=>{
 const html=read('index.html'),server=read('server/server.js'),sw=read('sw.js');
 const vendor=read('vendor/liquid-glass.js'),logic=read('glass-effects.js');
 assert.ok(html.indexOf('/vendor/liquid-glass.js?')<html.indexOf('/glass-effects.js?'));
 assert.ok(html.indexOf('/glass-effects.js?')<html.indexOf('/app.js?'));
 assert.match(server,/\/vendor\/liquid-glass\.js/);
 assert.match(server,/\/glass-effects\.js/);
 assert.match(sw,/\/vendor\/liquid-glass\.js/);
 assert.match(sw,/\/glass-effects\.js/);
 assert.match(vendor,/Deepika Rao/);
 assert.match(logic,/liquidGlass\(/);
 assert.match(read('THIRD_PARTY_NOTICES.md'),/Deepika Rao/);
});
test('native browser glass material has a clear reduced transparency fallback',()=>{
 const css=read('styles.css');
 assert.match(css,/-webkit-backdrop-filter:blur\(24px\)/);
 assert.match(css,/backdrop-filter:blur\(24px\)/);
 assert.match(css,/prefers-reduced-transparency:\s*reduce/);
 assert.match(css,/prefers-contrast:\s*more/);
 assert.match(css,/native CSS/);
});
test('glass enhancements are limited and cannot interfere with QR or academics',()=>{
 const code=read('glass-effects.js');
 assert.match(code,/maxArea=10000/);
 assert.match(code,/maxCount=2/);
 assert.match(code,/\.language-switch,\.theme-trigger/);
 assert.doesNotMatch(code,/const limited='\.topbar/);
 assert.match(code,/pointer: coarse/);
 assert.doesNotMatch(code,/fetch\(|XMLHttpRequest|https?:\/\//);
 const app=read('app.js');
 assert.match(app,/case'startQr':state\.authMode='qr';startQr\(\)/);
 assert.match(app,/case'connect':connectModal\('qr'\)/);
});

test('glass contrast and appearance picker are readable in both themes',()=>{
 const css=read('styles.css'),app=read('app.js');
 assert.match(css,/Readability-first glass/);
 assert.match(css,/--readable-glass:rgba\(17,34,28,\.96\)/);
 assert.match(css,/\.agenda-row\{color:var\(--ink\)!important/);
 assert.match(css,/\.card,\.agenda-row,\.calendar-visual,\.power-mini/);
 assert.match(css,/\.theme-picker\{display:flex/);
 assert.match(app,/data-action="themeMenu"/);
 assert.match(app,/case'themeMenu':themeModal\(\);break/);
 assert.match(app,/case'selectTheme':selectTheme\(target\.dataset\.themeValue\);break/);
 assert.match(app,/state\.prefs\.theme=value;\s*storePrefs\(\);\s*applyTheme\(\);/);
 assert.match(app,/\{key:'light'/);
 assert.match(app,/\{key:'dark'/);
 assert.match(app,/\{key:'system'/);
 assert.doesNotMatch(app,/class="avatar"/);
});
