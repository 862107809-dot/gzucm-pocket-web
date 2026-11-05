'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const material=fs.readFileSync(path.join(root,'liquid-material.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const cache=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');

test('optical material sheet is layered after app layout styles and cached for PWA',()=>{
 const base=html.indexOf('/styles.css?v=');
 const glass=html.indexOf('/liquid-material.css?v=');
 assert.ok(base>0&&glass>base,'visual material overrides must follow the original styles');
 assert.ok(cache.includes('/liquid-material.css?v=20261105-gesture-confirm1'));
 assert.ok(cache.includes('gzucm-pocket-web-v52-20261105-gesture-confirm1'));
 assert.ok(html.includes('/glass-renderer.js?v=20261105-glass-material2'));
 assert.ok(cache.includes('/glass-renderer.js?v=20261105-glass-material2'));
});

test('HTTP static whitelist serves both automatic glass resources',()=>{
 const server=fs.readFileSync(path.join(root,'server','server.js'),'utf8');
 assert.ok(server.includes("'/glass-renderer.js':'glass-renderer.js'"));
 assert.ok(server.includes("'/liquid-material.css':'liquid-material.css'"));
 for(const asset of ['/glass-renderer.js','/liquid-material.css']){
  assert.ok(html.includes(asset),'HTML must load '+asset);
  assert.ok(cache.includes(asset),'PWA precache must include '+asset);
 }
});

test('UI/UX Pro Max Liquid Glass uses theme tokens and separate optical chrome',()=>{
 for(const token of ['--lg-chrome','--lg-sheet','--lg-content','--lg-control',
    '--lg-optic','--lg-rim','--lg-rim-low','--lg-specular','--lg-shadow']){
  assert.ok(material.includes(token+':'),'missing semantic design token '+token);
 }
 assert.match(material,/\.topbar,\.bottom-nav,\.sidebar\{[^}]*radial-gradient\(/s);
 assert.match(material,/\.bottom-nav \.bottom-liquid-surface\{[^}]*radial-gradient\(/s);
 assert.match(material,/\.liquid-selector > \.liquid-choice-highlight,[\s\S]*?var\(--lg-optic\)/);
 assert.match(material,/backdrop-filter:blur\(22px\) saturate\(1\.48\)/);
});

test('data surfaces remain readable rather than uniformly transparent',()=>{
 assert.match(material,/\.card,\.page-schedule \.card,\.calendar-visual,\.power-mini/);
 assert.match(material,/--lg-content:rgba\(252,254,251,\.88\)/);
 assert.match(material,/--lg-sheet:rgba\(249,253,249,\.87\)/);
 assert.match(material,/\.agenda-row,\.page-schedule \.agenda-row\{/);
 assert.match(material,/\.day-strip \.day-tab\.active\{/);
 assert.doesNotMatch(material,/\.month-compact \.month-grid\s*\{/,'do not alter full-month geometry');
});

test('dark appearance and accessibility have separate optical fallbacks',()=>{
 assert.match(material,/:root\[data-theme="dark"\]\{/);
 assert.match(material,/:root:not\(\[data-theme="light"\]\)/);
 assert.match(material,/@media\(prefers-reduced-transparency:reduce\),\(prefers-contrast:more\)/);
 assert.match(material,/@supports not \(\(-webkit-backdrop-filter:blur\(1px\)\)/);
 assert.match(material,/\.bottom-liquid-surface::before,\.bottom-liquid-surface::after,[\s\S]*?display:none!important/);
 assert.match(material,/:focus-visible\{\s*outline:2px solid var\(--accent\)/);
});

test('glass selector uses the requested names, saved prefs, and real runtime status',()=>{
 for(const label of ['增强液态','液态玻璃','毛玻璃'])assert.ok(app.includes(label),label);
 for(const token of ["glassMode:'enhanced'","data-choice=\"glass\"","case'selectGlass':selectGlass","storePrefs();","setMode?.(value)"])assert.ok(app.includes(token),token);
 assert.ok(material.includes('data-glass-preference="smooth"'));
});

test('frosted mode reaches shell, reading cards, menus, controls and selected lenses',()=>{
 const section=material.slice(material.indexOf('/* MODE MATERIAL TUNING v2'));
 assert.ok(section.length>9000,'mode material rules should be present');
 for(const surface of [
  '.glass','.topbar','.bottom-nav','.sidebar','.toast',
  '.modal-card','.safari-floating-menu','.card','.page-schedule .card',
  '.calendar-visual','.power-mini','.month-calendar','.agenda-row',
  '.page-schedule .agenda-row','.month-compact .month-cell','.safari-select',
  '.language-switch','.status-pill','.day-strip .day-tab',
  '.liquid-selector > .liquid-choice-highlight','.bottom-nav .bottom-liquid-surface'
 ]){
  assert.ok(section.includes(surface),'frosted material needs '+surface);
 }
 assert.match(section,/data-glass-engine="frosted"\] :is\(\.modal-card,\.safari-floating-menu,\.card/);
 assert.match(section,/data-glass-engine="frosted"\] :is\(\.bottom-nav \.bottom-liquid-surface/);
 assert.match(section,/\.bottom-liquid-surface::before,[\s\S]*?display:none!important/);
 assert.match(section,/@media\(prefers-reduced-transparency:reduce\),\(prefers-contrast:more\)/);
});

test('enhanced and standard mode transmit background without heavy lower shadows',()=>{
 const section=material.slice(material.indexOf('/* MODE MATERIAL TUNING v2'));
 assert.match(section,/data-glass-engine="webgl"\]\{[\s\S]*?--lg-chrome:rgba\(244,253,247,\.34\)/);
 assert.match(section,/data-glass-engine="svg"\]\{[\s\S]*?--lg-chrome:rgba\(244,254,248,\.23\)/);
 assert.match(section,/linear-gradient\(163deg,var\(--lg-specular\) -85%,transparent 38%\)/);
 assert.match(section,/lg-optic-canvas\{opacity:\.58;\}/);
 assert.match(section,/data-theme="dark"\]\[data-glass-engine="svg"\]/);
 assert.match(section,/:root:not\(\[data-theme="light"\]\)\[data-glass-engine="svg"\]/);
});

test('dark appearance never leaves pale search boxes or bright glass overlays',()=>{
 const dark=material.slice(material.indexOf('/* DARK NO-WHITEWASH + MINT SWITCH v3'));
 assert.ok(dark.length>4000);
 assert.match(app,/dataset\.activeTheme=dark\?'dark':'light'/);
 assert.match(dark,/:root\[data-active-theme="dark"\] :is\(\.search-input,\.text-input,select/);
 assert.match(dark,/--night-control:rgba\(39,72,53,\.75\)/);
 assert.match(dark,/:root\[data-active-theme="dark"\] :is\(input,textarea\)::placeholder/);
 assert.match(dark,/:root\[data-active-theme="dark"\] :is\(\.toast,\.toast-root \.toast/);
 assert.match(dark,/:root\[data-active-theme="dark"\] :is\(\.lg-optic-svg,\.lg-optic-canvas\)\{opacity:\.16;\}/);
 assert.match(dark,/data-glass-engine="webgl"/);
 assert.match(dark,/data-glass-engine="frosted"/);
 assert.match(dark,/prefers-reduced-transparency:reduce/);
});
test('switch uses mint track in light mode and muted sage thumb in dark mode',()=>{
 const part=material.slice(material.indexOf('/* DARK NO-WHITEWASH + MINT SWITCH v3'));
 const base=fs.readFileSync(path.join(root,'styles.css'),'utf8');
 assert.match(part,/--switch-track-on:rgba\(179,222,191,\.96\)/);
 assert.match(part,/--switch-track-on:rgba\(45,105,69,\.96\)/);
 assert.match(part,/\.switch\[role="switch"\]\.on,/);
 assert.match(part,/\.switch\[role="switch"\]::after\{[^}]*linear-gradient\(145deg,#fff/s);
 assert.match(part,/:root\[data-active-theme="dark"\] \.switch\[role="switch"\]::after\{[\s\S]*?#8da794/);
 assert.match(part,/:root\[data-active-theme="dark"\] \.switch\[role="switch"\]\.on,/);
 assert.doesNotMatch(part.slice(part.indexOf('/* Deep-dark switch tuning:')),/#c9d8ce|#fff 8%|rgba\(227,255,236,\.17\)/,'no white bloom in dark-specific material');
 assert.match(part,/:root\[data-active-theme="dark"\] \.switch\[role="switch"\]\.is-pressed::after/);
 assert.match(base,/@keyframes pocketSwitchThumbBounce/);
 assert.match(base,/\.switch\[role="switch"\]\.is-settling::after/);
 assert.match(base,/@media\(prefers-reduced-motion:reduce\)\{\s*\.switch\[role="switch"\]\.is-settling::after/s);
 assert.match(app,/const on=p\.dragging\?p\.position>=7:!p\.startOn;/);
 assert.match(app,/button\.classList\?\.add\?\.\('is-settling'\)/);
});

test('video style dark/light weekday lens and PWA gesture assets are consistent',()=>{
 assert.ok(html.includes('/styles.css?v=20261105-gesture-confirm1'));
 assert.ok(html.includes('/app.js?v=20261105-gesture-confirm1'));
 assert.ok(cache.includes('/styles.css?v=20261105-gesture-confirm1'));
 assert.ok(cache.includes('/app.js?v=20261105-gesture-confirm1'));
 assert.match(material,/VIDEO-MATCHED WEEKDAY LENS/);
 assert.match(material,/:root \.day-strip\.liquid-selector > \.day-tab\.active/);
 assert.match(material,/:root\[data-active-theme="dark"\] \.day-strip\.liquid-selector > \.liquid-choice-highlight/);
 assert.match(material,/prefers-reduced-transparency:reduce/);
});

test('confirmed choices gain a material shadow without a white glow in dark mode',()=>{
 const section=material.slice(material.indexOf('/* NATURAL SELECTION SHADOW v1'));
 assert.ok(section.length>1200,'confirmation shadow material must exist');
 assert.match(section,/--pocket-selected-shadow:/);
 assert.match(section,/--pocket-confirm-shadow:/);
 assert.match(section,/:root\[data-active-theme="dark"\]\{/);
 assert.match(section,/:root\[data-glass-engine\] \.bottom-nav \.bottom-liquid-surface/);
 assert.match(section,/\.liquid-selector > \.liquid-choice-highlight/);
 assert.match(section,/\.safari-floating-menu \.safari-menu-glider/);
 assert.match(section,/\.bottom-liquid-indicator\.is-confirmed::after/);
 assert.match(section,/@keyframes pocketNaturalConfirmation/);
 assert.match(section,/\.pocket-full-release/);
 assert.match(section,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(section,/#fff|rgba\(255,255,255/,'confirmation material must not add white rims');
});

test('visual design change does not rewrite timing or gesture handling',()=>{
 assert.doesNotMatch(material,/(^|[\n\r])[ \t]*(?:animation|transition)(?:-[a-z]+)?\s*:/m);
 assert.match(app,/function bottomSwipeDown\(/);
 assert.match(app,/function bottomSwipeFinish\(/);
 assert.match(app,/function liquidPointerDown\(/);
 assert.match(app,/function transitionScheduleMode\(/);
});
