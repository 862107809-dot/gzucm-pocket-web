'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');
const start=app.indexOf('function renderScheduleContent(confirm=false){');
const end=app.indexOf('function navItem(',start);
assert.ok(start>=0&&end>start,'fast schedule DOM-only transition helper exists');
const body=app.slice(start,end);

function harness(mode='month',hasHost=true){
 const calls=[];
 const buttons=['week','month'].map(which=>{
  const classes=new Set(which==='week'?['active']:[]);
  return {
   dataset:{mode:which},
   classList:{
    toggle:(key,on)=>on?classes.add(key):classes.delete(key),
    contains:key=>classes.has(key)
   },
   setAttribute:(key,value)=>calls.push(['aria',which,key,value]),
   offsetLeft:which==='week'?0:80,offsetTop:0,offsetWidth:80,offsetHeight:40
  };
 });
 const lensClasses=new Set();
 const lens={isConnected:true,classList:{
  add:x=>lensClasses.add(x),remove:x=>lensClasses.delete(x)
 }};
 const oldSelector={
  querySelectorAll:()=>buttons,
  querySelector:s=>s==='.liquid-choice-highlight'?lens:
   s==='button.active'?buttons.find(x=>x.classList.contains('active')):null
 };
 let reused=false;
 const newSelector={replaceWith:node=>{assert.equal(node,oldSelector);reused=true;}};
 const page={
  updates:0,
  set innerHTML(value){this.markup=value;this.updates++;},
  get innerHTML(){return this.markup;},
  querySelector:()=>this.updates?newSelector:oldSelector
 };
 // page.querySelector cannot use lexical this when called without an owner.
 page.querySelector=()=>page.updates?newSelector:oldSelector;
 const state={view:'schedule',scheduleMode:mode,prefs:{language:'zh'}};
 const doc={startViewTransition:()=>{throw Error('native snapshots must never run');}};
 const f=new Function('$','state','schedulePage','render','enhanceLiquidSelectors','window',
  'setSelectorGlass','confirmGlassSelection','requestAnimationFrame',
  body+'return {transitionScheduleMode,renderScheduleContent};')(
  ()=>hasHost?page:null,state,()=>'<section class="new-calendar">calendar</section>',
  ()=>calls.push(['full-render']),
  node=>calls.push(['enhance',node]),
  {GZUCM_I18N:{apply:(node,language)=>calls.push(['translate',node,language])}},
  (node,rect)=>{calls.push(['glass',rect]);},
  node=>{calls.push(['confirm',node]);},
  callback=>{callback();return 1}
 );
 return {f,calls,page,lens,buttons,reused:()=>reused,state,doc};
}

test('week/month switch updates only timetable and does not snapshot browser View Transitions',()=>{
 const h=harness();
 h.f.transitionScheduleMode(()=>h.calls.push(['sync']));
 assert.equal(h.page.updates,1);
 assert.equal(h.page.innerHTML,'<section class="new-calendar">calendar</section>');
 assert.equal(h.reused(),true);
 assert.deepEqual(h.calls.map(x=>x[0]),['aria','aria','glass','confirm','enhance','translate','sync']);
 assert.ok(h.buttons[1].classList.contains('active'));
 assert.ok(!h.buttons[0].classList.contains('active'));
 assert.match(css,/FAST TIMETABLE SWITCH v1/);
 assert.match(css,/view-transition-name:none!important/);
});

test('returning to week preserves the same glass control and correct aria selection',()=>{
 const h=harness('week');
 h.f.transitionScheduleMode();
 assert.equal(h.reused(),true);
 assert.ok(h.buttons[0].classList.contains('active'));
 assert.ok(!h.buttons[1].classList.contains('active'));
 assert.ok(h.calls.some(x=>x[0]==='glass'&&x[1].x===0));
 assert.equal(h.calls.some(x=>x[0]==='full-render'),false);
});

test('network data refreshes only timetable without showing a second confirmation',()=>{
 const h=harness('month');
 h.f.renderScheduleContent();
 assert.equal(h.page.updates,1);
 assert.ok(!h.calls.some(x=>x[0]==='confirm'));
 assert.ok(h.calls.some(x=>x[0]==='enhance'));
});

test('a missing timetable host still safely falls back to normal rendering',()=>{
 const h=harness('week',false);
 h.f.transitionScheduleMode(()=>h.calls.push(['sync']));
 assert.deepEqual(h.calls.map(x=>x[0]),['full-render','sync']);
});

test('timetable optimization leaves all three glass options, weeks and month grid intact',()=>{
 assert.match(app,/data-schedule-content="week"/);
 assert.match(app,/data-schedule-content="month"/);
 assert.match(app,/case'scheduleView':\{[\s\S]*?storePrefs\(\);transitionScheduleMode\(/);
 assert.match(app,/replacement\.replaceWith\(selector\)/);
 assert.match(app,/if\(group\.querySelector\(':scope > \.liquid-choice-highlight'\)\)continue;/);
 assert.match(app,/if\(state\.view==='schedule'\)renderScheduleContent\(\)/);
 assert.match(app,/if\(state\.view==='schedule'&&state\.scheduleMode==='month'\)renderScheduleContent\(\)/);
 assert.match(app,/const fmt=\(date,opts\)=>/);
 assert.match(app,/const dateFormatters=new Map\(\)/);
 assert.match(css,/\.month-compact \.month-grid\{[^}]*grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/s);
 assert.match(css,/\.page-schedule \.month-compact \.month-cell\{/);
 assert.match(css,/backdrop-filter:none!important/);
});
