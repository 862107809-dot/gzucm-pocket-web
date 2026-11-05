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
 assert.ok(cache.includes('/liquid-material.css?v=20261105-optics-auto2'));
 assert.ok(cache.includes('gzucm-pocket-web-v43-20261105-glass-status3'));
 assert.ok(html.includes('/glass-renderer.js?v=20261105-glass-status3'));
 assert.ok(cache.includes('/glass-renderer.js?v=20261105-glass-status3'));
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

test('visual design change does not rewrite timing or gesture handling',()=>{
 assert.doesNotMatch(material,/(^|[\n\r])[ \t]*(?:animation|transition)(?:-[a-z]+)?\s*:/m);
 assert.match(app,/function bottomSwipeDown\(/);
 assert.match(app,/function bottomSwipeFinish\(/);
 assert.match(app,/function liquidPointerDown\(/);
 assert.match(app,/function transitionScheduleMode\(/);
});
