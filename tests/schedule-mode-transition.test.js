'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');

const start=app.indexOf('function transitionScheduleMode(afterRender){');
const end=app.indexOf('function navItem(',start);
assert.ok(start>=0&&end>start,'schedule mode transition helper exists');
const body=app.slice(start,end);
function harness(doc,reduced=false){
 const order=[];
 const f=new Function('document','window','render',
  'let scheduleModeFallbackEntrance=false;'+body+
  'return {run:transitionScheduleMode,fallback:()=>scheduleModeFallbackEntrance};')(
  doc,{matchMedia:()=>({matches:reduced})},
  ()=>order.push('render'));
 return {...f,order};
}

test('week/month switch uses native before/after view snapshots when supported',()=>{
 const order=[];
 const h=harness({startViewTransition(fn){
  order.push('capture');
  fn();
  return {finished:Promise.resolve()};
 }});
 h.run(()=>h.order.push('sync'));
 assert.deepEqual(order,['capture']);
 assert.deepEqual(h.order,['render','sync']);
 assert.equal(h.fallback(),false);
 assert.match(css,/view-transition-name:schedule-mode-tabs/);
 assert.match(css,/view-transition-name:schedule-mode-panel/);
 assert.match(css,/::view-transition-old\(schedule-mode-panel\)/);
 assert.match(css,/::view-transition-new\(schedule-mode-panel\)/);
});

test('older Safari still animates incoming timetable and mode selector',()=>{
 const h=harness({});
 h.run(()=>h.order.push('sync'));
 assert.deepEqual(h.order,['render','sync']);
 assert.equal(h.fallback(),true);
 assert.match(css,/\.schedule-mode-enter \.schedule-transition-content/);
 assert.match(css,/\.schedule-mode-enter \.schedule-view-switch/);
 assert.match(css,/@keyframes schedulePanelIn/);
 assert.match(css,/@keyframes scheduleTabsIn/);
});

test('reduced motion skips the timetable animation but retains the update',()=>{
 const h=harness({startViewTransition(){throw Error('must not run');}},true);
 h.run(()=>h.order.push('sync'));
 assert.deepEqual(h.order,['render','sync']);
 assert.equal(h.fallback(),false);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('week and month each wrap course content without hiding compact calendar',()=>{
 assert.match(app,/data-schedule-content="week"/);
 assert.match(app,/data-schedule-content="month"/);
 assert.match(app,/case'scheduleView':\{[\s\S]*?storePrefs\(\);transitionScheduleMode\(/);
 assert.match(css,/\.compact-month-view\{width:100%;max-width:100%;min-width:0;/);
 assert.match(css,/\.month-compact \.month-grid\{[^}]*grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/s);
});
