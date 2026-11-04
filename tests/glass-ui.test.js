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
 assert.match(app,/case'themeMenu':toggleSafariMenu\(target,'theme'\);break/);
 assert.match(app,/case'settingsMenu':toggleSafariMenu\(target,'settings'\);break/);
 assert.match(app,/case'selectTheme':selectTheme\(target\.dataset\.value\);break/);
 assert.match(app,/state\.prefs\.theme=value;\s*storePrefs\(\);\s*applyTheme\(\);/);
 assert.match(app,/\{key:'light'/);
 assert.match(app,/\{key:'dark'/);
 assert.match(app,/\{key:'system'/);
 assert.doesNotMatch(app,/class="avatar"/);
});

test('progress notices are centered once relative to the viewport',()=>{
 const css=read('styles.css');
 assert.match(css,/@keyframes toastIn\{from\{opacity:0;transform:translateY\(-8px\)\}to\{opacity:1;transform:translateY\(0\)\}\}/);
 assert.doesNotMatch(css,/@keyframes toastIn[^}]*translate\(-50%/);
 assert.match(css,/\.toast-root\{\s*position:fixed;\s*inset-inline:0;/);
 assert.match(css,/\.toast-root[\s\S]*?display:flex;\s*justify-content:center/);
 assert.match(css,/\.toast-root \.toast\{[\s\S]*?text-align:center/);
});
test('dark timetable keeps scoped glass and readable course rows',()=>{
 const css=read('styles.css'),app=read('app.js');
 assert.match(app,/class="page page-\$\{state\.view\}"/);
 assert.match(css,/Timetable-only glass material/);
 assert.match(css,/:root\[data-theme="dark"\] \.page-schedule \.card/);
 assert.match(css,/\.page-schedule \.calendar-visual/);
 assert.match(css,/rgba\(21,43,33,\.83\)!important/);
 assert.match(css,/\.page-schedule \.agenda-row/);
 assert.match(css,/rgba\(30,54,42,\.88\)!important/);
 assert.match(css,/prefers-reduced-transparency:reduce/);
 assert.doesNotMatch(css,/\.page-schedule \.cal-event\{\s*filter:/);
});

test('timetable tiles keep Apple-inspired glass with distinct course tints',()=>{
 const css=read('styles.css');
 assert.match(css,/Apple-inspired liquid-glass course tiles/);
 assert.match(css,/\.page-schedule \.calendar-visual \.cal-event\{/);
 assert.match(css,/background:\s*radial-gradient\(ellipse 120% 115%/);
 assert.match(css,/-webkit-backdrop-filter:blur\(12px\) saturate\(1\.28\)/);
 assert.match(css,/\.page-schedule \.calendar-visual \.cal-event::before\{/);
 assert.match(css,/\.page-schedule \.calendar-visual \.cal-event::after\{/);
 const tones=['tone-1','tone-2','tone-3','tone-4','tone-5','tone-6','tone-7','tone-8'];
 for(const tone of tones)assert.ok(css.includes('.cal-event.'+tone),'missing tint '+tone);
});
test('dark course tiles use readable text and transparent deep surfaces',()=>{
 const css=read('styles.css');
 assert.match(css,/:root\[data-theme="dark"\] \.page-schedule \.calendar-visual \.cal-event/);
 assert.match(css,/--tile-fill:rgba\(24,45,37,\.85\)/);
 assert.match(css,/--tile-ink:#f5faf6/);
 assert.match(css,/--tile-secondary:rgba\(228,242,233,\.84\)/);
 assert.match(css,/:root:not\(\[data-theme="light"\]\) \.page-schedule \.calendar-visual \.cal-event/);
 assert.match(css,/prefers-reduced-transparency:reduce/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 const app=read('app.js');
 assert.match(app,/class="cal-event tone-\$\{colorIndex\(course\)\}"/);
 assert.match(app,/data-course="\$\{E\(courseKey\(course\)\)\}"/);
});

test('top and settings choice menus open as small anchored Safari glass boxes',()=>{
 const app=read('app.js'),html=read('index.html'),css=read('styles.css');
 assert.match(html,/id="popover-root"/);
 assert.match(app,/function toggleSafariMenu\(anchor,kind\)/);
 assert.match(app,/class="safari-floating-menu"/);
 assert.match(app,/getBoundingClientRect\(\)/);
 assert.match(app,/case'settingChoice':toggleSafariMenu\(target,target\.dataset\.choice\);break/);
 assert.match(app,/data-action="settingsMenu"/);
 assert.match(app,/data-action="settingChoice" data-choice="start"/);
 assert.match(app,/data-action="settingChoice" data-choice="campus"/);
 assert.doesNotMatch(app,/<select id="theme-select"/);
 assert.doesNotMatch(app,/<select id="start-select"/);
 assert.doesNotMatch(app,/<select id="campus-select"/);
 assert.match(css,/\.safari-floating-menu\{/);
 assert.match(css,/\.safari-select\{/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
