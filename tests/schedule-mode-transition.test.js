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

function harness(mode='month',hasHost=true,width=0,animate=false,reduced=false){
 const calls=[];
 const animations=[];
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
 const originalPanel={isConnected:true};
 const refreshedPanel={isConnected:true};
 const page={
  updates:0,
  set innerHTML(value){this.markup=value;this.updates++;},
  get innerHTML(){return this.markup;},
  querySelector:()=>this.updates?newSelector:oldSelector
 };
 // The fixed selector persists; only the week/month content is swapped.
 page.querySelector=selector=>selector==='.schedule-transition-content'?
  (page.updates?refreshedPanel:originalPanel):(page.updates?newSelector:oldSelector);
 if(animate){
  page.isConnected=true;
  page.getBoundingClientRect=()=>({width});
  const makeAnimation=(frames,options)=>{
   let resolve;
   const finished=new Promise(res=>{resolve=res;});
   const animation={frames,options,finished,resolve,cancel(){this.cancelled=true;}};
   animations.push(animation);
   return animation;
  };
  page.animate=makeAnimation;
  originalPanel.animate=makeAnimation;
  refreshedPanel.animate=makeAnimation;
 }
 const state={view:'schedule',scheduleMode:mode,prefs:{language:'zh'}};
 const doc={startViewTransition:()=>{throw Error('native snapshots must never run');}};
 const parameters=['$','state','schedulePage','render',
  'snapshotLiquidSelectors','enhanceLiquidSelectors','window',
  'setSelectorGlass','confirmGlassSelection','requestAnimationFrame'];
 const f=Function(...parameters,
  body+'return {transitionScheduleMode,renderScheduleContent};')(
  ()=>hasHost?page:null,state,()=>'<section class="new-calendar">calendar</section>',
  ()=>calls.push(['full-render']),
  ()=>{calls.push(['snapshot']);return new Map([['weekday-choice',{value:'1',x:0}]])},
  (node,previous)=>{assert.equal(previous.has('weekday-choice'),true);calls.push(['enhance',node]);},
  {matchMedia:()=>({matches:reduced}),GZUCM_I18N:{apply:(node,language)=>calls.push(['translate',node,language])}},
  (node,rect)=>{calls.push(['glass',rect]);},
  node=>{calls.push(['confirm',node]);},
  callback=>{callback();return 1}
 );
 return {f,calls,page,lens,buttons,reused:()=>reused,state,doc,animations};
}

test('week/month switch updates only timetable and does not snapshot browser View Transitions',()=>{
 const h=harness();
 h.f.transitionScheduleMode(()=>h.calls.push(['sync']));
 assert.equal(h.page.updates,1);
 assert.equal(h.page.innerHTML,'<section class="new-calendar">calendar</section>');
 assert.equal(h.reused(),true);
 assert.deepEqual(h.calls.map(x=>x[0]),['snapshot','aria','aria','glass','confirm','enhance','translate','sync']);
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


test('desktop Mac and wide iPad use a short shrink-then-expand visual handoff',async()=>{
 const h=harness('month',true,1180,true);
 h.f.transitionScheduleMode(()=>h.calls.push(['sync']));
 assert.equal(h.page.updates,0,'old page stays visible while it shrinks');
 assert.equal(h.animations.length,1);
 assert.equal(h.animations[0].frames[1].transform,'scale(0.974)');
 assert.equal(h.animations[0].options.duration,180);
 assert.equal(h.animations[0].frames[1].opacity,.18);
 h.animations[0].resolve();
 await Promise.resolve();
 assert.equal(h.page.updates,1);
 assert.equal(h.reused(),true);
 assert.equal(h.animations.length,2);
 assert.equal(h.animations[1].frames[0].transform,'scale(0.974)');
 assert.equal(h.animations[1].frames.at(-1).transform,'scale(1)');
 assert.equal(h.animations[1].options.duration,300);
 assert.equal(h.calls.some(x=>x[0]==='full-render'),false);
 h.animations[1].resolve();
 await Promise.resolve();
 assert.equal(h.animations[1].cancelled,true);
 assert.equal(h.calls.some(x=>x[0]==='sync'),true);
});

test('tablet and phone get responsive zoom amplitudes without overshooting 100%',async()=>{
 for(const [width,expected,duration] of [[780,'scale(0.966)',325],[390,'scale(0.958)',345]]){
  const h=harness('month',true,width,true);
  h.f.transitionScheduleMode();
  assert.equal(h.animations[0].frames[1].transform,expected);
  h.animations[0].resolve();
  await Promise.resolve();
  assert.equal(h.animations[1].frames[0].transform,expected);
  assert.equal(h.animations[1].options.duration,duration);
  assert.equal(h.animations[1].frames.at(-1).transform,'scale(1)');
  assert.match(h.animations[1].options.easing,/cubic-bezier/);
  h.animations[1].resolve();
  await Promise.resolve();
 }
 const responsive=css.slice(css.indexOf('/* CROSS-DEVICE SCHEDULE MORPH v2'));
 assert.match(responsive,/@media\(min-width:601px\) and \(max-width:900px\)/);
 assert.match(responsive,/@media\(min-width:901px\)/);
 assert.match(responsive,/@keyframes scheduleSoftArrival/);
 assert.match(responsive,/prefers-reduced-motion:reduce/);
});

test('rapid consecutive selections cancel obsolete animations without stale DOM swaps',async()=>{
 const h=harness('month',true,1080,true);
 h.f.transitionScheduleMode(()=>h.calls.push(['first-sync']));
 h.state.scheduleMode='week';
 h.f.transitionScheduleMode(()=>h.calls.push(['second-sync']));
 assert.equal(h.animations[0].cancelled,true);
 h.animations[0].resolve();
 await Promise.resolve();
 assert.equal(h.page.updates,0);
 h.animations[1].resolve();
 await Promise.resolve();
 assert.equal(h.page.updates,1);
 assert.ok(h.buttons[0].classList.contains('active'));
 assert.equal(h.calls.some(x=>x[0]==='first-sync'),false);
 assert.equal(h.calls.some(x=>x[0]==='second-sync'),true);
 h.animations[2].resolve();
 await Promise.resolve();
});

test('reduce-motion setting skips both shrink and expansion on every device',()=>{
 const h=harness('month',true,1280,true,true);
 h.f.transitionScheduleMode();
 assert.equal(h.animations.length,0);
 assert.equal(h.page.updates,1);
 assert.equal(h.calls.some(x=>x[0]==='full-render'),false);
});

test('older iPad browsers use a CSS zoom-in fallback instead of direct content jump',()=>{
 const h=harness('month',true,820);
 h.f.transitionScheduleMode();
 assert.equal(h.page.updates,1);
 assert.match(app,/schedule-soft-arrival/);
 assert.match(css,/\.page\.page-schedule\.schedule-soft-arrival/);
 assert.match(css,/\.page\.page-schedule\.schedule-soft-arrival\{animation-duration:\.18s!important;\}/);
});

test('fixed header uses one shared layout in week/month and keeps the switch static',()=>{
 assert.match(app,/function fixedScheduleHeader\(\)\{return \x60<div class="compact-month-header schedule-fixed-header"/);
 assert.match(app,/state\.prefs\.scheduleLayout==='original'\?heading\('YOUR TIMETABLE'/);
 assert.match(app,/state\.prefs\.scheduleLayout==='original'\?'<div class="compact-month-header"/);
 assert.match(app,/const fixedLayout=state\.prefs\.scheduleLayout!=='original'/);
 assert.match(app,/const outgoingTarget=fixedLayout\?pageRoot\?\.querySelector\?\.\('\.schedule-transition-content'\):pageRoot/);
 assert.match(app,/const incomingTarget=fixedLayout\?pageRoot\.querySelector\?\.\('\.schedule-transition-content'\):pageRoot/);
 const responsive=css.slice(css.indexOf('/* STABLE SIDE-BY-SIDE TIMETABLE COMPARISON v3'));
 assert.match(responsive,/\.page-schedule \.schedule-fixed-header\{/);
 assert.match(responsive,/min-height:66px/);
 assert.match(responsive,/\.schedule-fixed-header \.schedule-view-switch\{/);
 assert.match(responsive,/@media\(min-width:901px\)/);
 assert.match(responsive,/@media\(max-width:600px\)/);
});

test('three timetable layout variants can be compared in Settings and remembered at restart',()=>{
 assert.match(app,/scheduleLayout:'fixed',\.\.\.saved\(PREF,\{\}\)/);
 assert.match(app,/data-choice="scheduleLayout"/);
 assert.match(app,/if\(kind==='scheduleLayout'\)return \[/);
 assert.match(app,/value:'original',label:en\?'Original layout':'原版布局'/);
 assert.match(app,/value:'fixed',label:en\?'Fixed switch':'固定按钮版'/);
 assert.match(app,/value:'wide',label:en\?'Wide centered switch':'横向居中版'/);
 assert.match(app,/\['original','fixed','wide'\]\.includes\(value\)/);
 assert.match(app,/state\.prefs\.scheduleLayout==='wide'\?'横向居中版'/);
 assert.match(app,/function selectScheduleLayout\(value\)\{/);
 assert.match(app,/state\.prefs\.scheduleLayout=value;\s*storePrefs\(\)/);
 assert.match(app,/case'selectScheduleLayout':selectScheduleLayout\(target\.dataset\.value\)/);
});

test('third mode renders identical centered wide header in both week and month',()=>{
 const from=app.indexOf('function wideScheduleHeader(){');
 const to=app.indexOf('function scheduleViewSwitch(){',from);
 assert.ok(from>=0&&to>from,'third wide header helper exists');
 const helper=app.slice(from,to);
 const wide=new Function('heading','E','term','scheduleViewSwitch',
  helper+'return wideScheduleHeader();')(
  (eyebrow,title,description)=>'<header>'+eyebrow+':'+title+':'+description+'</header>',
  s=>s,()=>({name:'2026–2027 第一学期'}),
  ()=>'<div class="schedule-view-switch"><button>周视图</button><button>月视图</button></div>'
 );
 assert.match(wide,/YOUR TIMETABLE/);
 assert.match(wide,/把每一周，过得从容有序。/);
 assert.match(wide,/<div class="schedule-wide-header"><div class="schedule-view-switch">/);
 assert.equal((wide.match(/schedule-view-switch/g)||[]).length,1);
 // Both calendar modes get exactly the same wide header, outside their
 // independently replaced schedule content.
 assert.match(app,/state\.prefs\.scheduleLayout==='wide'\?wideScheduleHeader\(\):fixedScheduleHeader\(\)/);
 assert.match(app,/return \x60\$\{state\.prefs\.scheduleLayout==='wide'\?wideScheduleHeader\(\):''\}<section class="compact-month-view"/);
 assert.match(app,/state\.prefs\.scheduleLayout==='wide'\?'':fixedScheduleHeader\(\)/);
 assert.match(app,/const fixedLayout=state\.prefs\.scheduleLayout!=='original'/);
 assert.match(app,/replacement\.replaceWith\(selector\)/);
});

test('wide centered selector has equal full-width buttons across responsive breakpoints',()=>{
 const wide=css.slice(css.indexOf('/* THIRD TIMETABLE LAYOUT — WIDE CENTERED RAIL v1'));
 assert.ok(wide.length>900,'third layout CSS must exist');
 assert.match(wide,/\.page-schedule \.schedule-wide-header\{/);
 assert.match(wide,/max-width:900px/);
 assert.match(wide,/margin:0 auto 18px/);
 assert.match(wide,/\.page-schedule \.schedule-wide-header \.schedule-view-switch\{/);
 assert.match(wide,/width:100%/);
 assert.match(wide,/\.schedule-view-switch > button\{\s*flex:1 1 0;\s*width:50%/);
 assert.match(wide,/@media\(max-width:660px\)/);
 assert.match(wide,/@media\(min-width:661px\) and \(max-width:900px\)/);
 assert.match(app,/scheduleLayout:'fixed',\.\.\.saved\(PREF,\{\}\)/,
  'existing users keep their saved layout, new users keep the current default');
});

test('the original variant retains the previous shorter timing and page-level animation',()=>{
 assert.match(app,/const scale=fixedLayout\?/);
 assert.match(app,/width>=900\?\.987:width>=600\?\.980:\.973/);
 assert.match(app,/width>=900\?80:95/);
 assert.match(app,/width>=900\?165:width>=600\?180:195/);
 assert.match(app,/const incoming=fixedLayout\?\[/);
 assert.match(app,/easing:fixedLayout\?'cubic-bezier\(\.24,\.68,\.30,1\)'/);
});

test('weekday, week arrows and month arrows use the same locally updated timetable',()=>{
 assert.match(app,/if\(target\.dataset\.day!==undefined\)\{state\.weekday=Number\(target\.dataset\.day\);renderScheduleContent\(\);/);
 assert.match(app,/state\.week=clamp\(state\.week\+\(act==='nextWeek'\?1:-1\),1,\(term\(\)\.totalWeeks\|\|19\)\+1\);renderScheduleContent\(\)/);
 assert.match(app,/state\.monthLoading=false;state\.monthLoadError=0;renderScheduleContent\(\);loadMonth\(\);break;/);
 assert.match(app,/const previousSelectors=snapshotLiquidSelectors\(pageRoot\);/);
 assert.match(app,/enhanceLiquidSelectors\(pageRoot,previousSelectors\)/);
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
,'state','schedulePage','render','snapshotLiquidSelectors','enhanceLiquidSelectors','window',
  'setSelectorGlass','confirmGlassSelection','requestAnimationFrame',
  body+'return {transitionScheduleMode,renderScheduleContent};')(
  ()=>hasHost?page:null,state,()=>'<section class="new-calendar">calendar</section>',
  ()=>calls.push(['full-render']),
  node=>calls.push(['enhance',node]),
  {matchMedia:()=>({matches:reduced}),GZUCM_I18N:{apply:(node,language)=>calls.push(['translate',node,language])}},
  (node,rect)=>{calls.push(['glass',rect]);},
  node=>{calls.push(['confirm',node]);},
  callback=>{callback();return 1}
 );
 return {f,calls,page,lens,buttons,reused:()=>reused,state,doc,animations};
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


test('desktop Mac and wide iPad use a short shrink-then-expand visual handoff',async()=>{
 const h=harness('month',true,1180,true);
 h.f.transitionScheduleMode(()=>h.calls.push(['sync']));
 assert.equal(h.page.updates,0,'old page stays visible while it shrinks');
 assert.equal(h.animations.length,1);
 assert.equal(h.animations[0].frames[1].transform,'scale(0.974)');
 assert.equal(h.animations[0].options.duration,180);
 assert.equal(h.animations[0].frames[1].opacity,.18);
 h.animations[0].resolve();
 await Promise.resolve();
 assert.equal(h.page.updates,1);
 assert.equal(h.reused(),true);
 assert.equal(h.animations.length,2);
 assert.equal(h.animations[1].frames[0].transform,'scale(0.974)');
 assert.equal(h.animations[1].frames.at(-1).transform,'scale(1)');
 assert.equal(h.animations[1].options.duration,300);
 assert.equal(h.calls.some(x=>x[0]==='full-render'),false);
 h.animations[1].resolve();
 await Promise.resolve();
 assert.equal(h.animations[1].cancelled,true);
 assert.equal(h.calls.some(x=>x[0]==='sync'),true);
});

test('tablet and phone get responsive zoom amplitudes without overshooting 100%',async()=>{
 for(const [width,expected,duration] of [[780,'scale(0.966)',325],[390,'scale(0.958)',345]]){
  const h=harness('month',true,width,true);
  h.f.transitionScheduleMode();
  assert.equal(h.animations[0].frames[1].transform,expected);
  h.animations[0].resolve();
  await Promise.resolve();
  assert.equal(h.animations[1].frames[0].transform,expected);
  assert.equal(h.animations[1].options.duration,duration);
  assert.equal(h.animations[1].frames.at(-1).transform,'scale(1)');
  assert.match(h.animations[1].options.easing,/cubic-bezier/);
  h.animations[1].resolve();
  await Promise.resolve();
 }
 const responsive=css.slice(css.indexOf('/* CROSS-DEVICE SCHEDULE MORPH v2'));
 assert.match(responsive,/@media\(min-width:601px\) and \(max-width:900px\)/);
 assert.match(responsive,/@media\(min-width:901px\)/);
 assert.match(responsive,/@keyframes scheduleSoftArrival/);
 assert.match(responsive,/prefers-reduced-motion:reduce/);
});

test('rapid consecutive selections cancel obsolete animations without stale DOM swaps',async()=>{
 const h=harness('month',true,1080,true);
 h.f.transitionScheduleMode(()=>h.calls.push(['first-sync']));
 h.state.scheduleMode='week';
 h.f.transitionScheduleMode(()=>h.calls.push(['second-sync']));
 assert.equal(h.animations[0].cancelled,true);
 h.animations[0].resolve();
 await Promise.resolve();
 assert.equal(h.page.updates,0);
 h.animations[1].resolve();
 await Promise.resolve();
 assert.equal(h.page.updates,1);
 assert.ok(h.buttons[0].classList.contains('active'));
 assert.equal(h.calls.some(x=>x[0]==='first-sync'),false);
 assert.equal(h.calls.some(x=>x[0]==='second-sync'),true);
 h.animations[2].resolve();
 await Promise.resolve();
});

test('reduce-motion setting skips both shrink and expansion on every device',()=>{
 const h=harness('month',true,1280,true,true);
 h.f.transitionScheduleMode();
 assert.equal(h.animations.length,0);
 assert.equal(h.page.updates,1);
 assert.equal(h.calls.some(x=>x[0]==='full-render'),false);
});

test('older iPad browsers use a CSS zoom-in fallback instead of direct content jump',()=>{
 const h=harness('month',true,820);
 h.f.transitionScheduleMode();
 assert.equal(h.page.updates,1);
 assert.match(app,/schedule-soft-arrival/);
 assert.match(css,/\.page\.page-schedule\.schedule-soft-arrival/);
 assert.match(css,/\.page\.page-schedule\.schedule-soft-arrival\{animation-duration:\.18s!important;\}/);
});

test('fixed header uses one shared layout in week/month and keeps the switch static',()=>{
 assert.match(app,/function fixedScheduleHeader\(\)\{return \x60<div class="compact-month-header schedule-fixed-header"/);
 assert.match(app,/state\.prefs\.scheduleLayout==='original'\?heading\('YOUR TIMETABLE'/);
 assert.match(app,/state\.prefs\.scheduleLayout==='original'\?'<div class="compact-month-header"/);
 assert.match(app,/const fixedLayout=state\.prefs\.scheduleLayout!=='original'/);
 assert.match(app,/const outgoingTarget=fixedLayout\?pageRoot\?\.querySelector\?\.\('\.schedule-transition-content'\):pageRoot/);
 assert.match(app,/const incomingTarget=fixedLayout\?pageRoot\.querySelector\?\.\('\.schedule-transition-content'\):pageRoot/);
 const responsive=css.slice(css.indexOf('/* STABLE SIDE-BY-SIDE TIMETABLE COMPARISON v3'));
 assert.match(responsive,/\.page-schedule \.schedule-fixed-header\{/);
 assert.match(responsive,/min-height:66px/);
 assert.match(responsive,/\.schedule-fixed-header \.schedule-view-switch\{/);
 assert.match(responsive,/@media\(min-width:901px\)/);
 assert.match(responsive,/@media\(max-width:600px\)/);
});

test('three timetable layout variants can be compared in Settings and remembered at restart',()=>{
 assert.match(app,/scheduleLayout:'fixed',\.\.\.saved\(PREF,\{\}\)/);
 assert.match(app,/data-choice="scheduleLayout"/);
 assert.match(app,/if\(kind==='scheduleLayout'\)return \[/);
 assert.match(app,/value:'original',label:en\?'Original layout':'原版布局'/);
 assert.match(app,/value:'fixed',label:en\?'Fixed switch':'固定按钮版'/);
 assert.match(app,/value:'wide',label:en\?'Wide centered switch':'横向居中版'/);
 assert.match(app,/\['original','fixed','wide'\]\.includes\(value\)/);
 assert.match(app,/state\.prefs\.scheduleLayout==='wide'\?'横向居中版'/);
 assert.match(app,/function selectScheduleLayout\(value\)\{/);
 assert.match(app,/state\.prefs\.scheduleLayout=value;\s*storePrefs\(\)/);
 assert.match(app,/case'selectScheduleLayout':selectScheduleLayout\(target\.dataset\.value\)/);
});

test('third mode renders identical centered wide header in both week and month',()=>{
 const from=app.indexOf('function wideScheduleHeader(){');
 const to=app.indexOf('function scheduleViewSwitch(){',from);
 assert.ok(from>=0&&to>from,'third wide header helper exists');
 const helper=app.slice(from,to);
 const wide=new Function('heading','E','term','scheduleViewSwitch',
  helper+'return wideScheduleHeader();')(
  (eyebrow,title,description)=>'<header>'+eyebrow+':'+title+':'+description+'</header>',
  s=>s,()=>({name:'2026–2027 第一学期'}),
  ()=>'<div class="schedule-view-switch"><button>周视图</button><button>月视图</button></div>'
 );
 assert.match(wide,/YOUR TIMETABLE/);
 assert.match(wide,/把每一周，过得从容有序。/);
 assert.match(wide,/<div class="schedule-wide-header"><div class="schedule-view-switch">/);
 assert.equal((wide.match(/schedule-view-switch/g)||[]).length,1);
 // Both calendar modes get exactly the same wide header, outside their
 // independently replaced schedule content.
 assert.match(app,/state\.prefs\.scheduleLayout==='wide'\?wideScheduleHeader\(\):fixedScheduleHeader\(\)/);
 assert.match(app,/return \x60\$\{state\.prefs\.scheduleLayout==='wide'\?wideScheduleHeader\(\):''\}<section class="compact-month-view"/);
 assert.match(app,/state\.prefs\.scheduleLayout==='wide'\?'':fixedScheduleHeader\(\)/);
 assert.match(app,/const fixedLayout=state\.prefs\.scheduleLayout!=='original'/);
 assert.match(app,/replacement\.replaceWith\(selector\)/);
});

test('wide centered selector has equal full-width buttons across responsive breakpoints',()=>{
 const wide=css.slice(css.indexOf('/* THIRD TIMETABLE LAYOUT — WIDE CENTERED RAIL v1'));
 assert.ok(wide.length>900,'third layout CSS must exist');
 assert.match(wide,/\.page-schedule \.schedule-wide-header\{/);
 assert.match(wide,/max-width:900px/);
 assert.match(wide,/margin:0 auto 18px/);
 assert.match(wide,/\.page-schedule \.schedule-wide-header \.schedule-view-switch\{/);
 assert.match(wide,/width:100%/);
 assert.match(wide,/\.schedule-view-switch > button\{\s*flex:1 1 0;\s*width:50%/);
 assert.match(wide,/@media\(max-width:660px\)/);
 assert.match(wide,/@media\(min-width:661px\) and \(max-width:900px\)/);
 assert.match(app,/scheduleLayout:'fixed',\.\.\.saved\(PREF,\{\}\)/,
  'existing users keep their saved layout, new users keep the current default');
});

test('the original variant retains the previous shorter timing and page-level animation',()=>{
 assert.match(app,/const scale=fixedLayout\?/);
 assert.match(app,/width>=900\?\.987:width>=600\?\.980:\.973/);
 assert.match(app,/width>=900\?80:95/);
 assert.match(app,/width>=900\?165:width>=600\?180:195/);
 assert.match(app,/const incoming=fixedLayout\?\[/);
 assert.match(app,/easing:fixedLayout\?'cubic-bezier\(\.24,\.68,\.30,1\)'/);
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
,'state','schedulePage','render','snapshotLiquidSelectors','enhanceLiquidSelectors','window',
  'setSelectorGlass','confirmGlassSelection','requestAnimationFrame',
  body+'return {transitionScheduleMode,renderScheduleContent};')(
  ()=>hasHost?page:null,state,()=>'<section class="new-calendar">calendar</section>',
  ()=>calls.push(['full-render']),
  ()=>{calls.push(['snapshot']);return new Map([['weekday-choice',{value:'1',x:0}]])},
  (node,previous)=>{assert.equal(previous.has('weekday-choice'),true);calls.push(['enhance',node]);},
  {matchMedia:()=>({matches:reduced}),GZUCM_I18N:{apply:(node,language)=>calls.push(['translate',node,language])}},
  (node,rect)=>{calls.push(['glass',rect]);},
  node=>{calls.push(['confirm',node]);},
  callback=>{callback();return 1}
 );
 return {f,calls,page,lens,buttons,reused:()=>reused,state,doc,animations};
}

test('week/month switch updates only timetable and does not snapshot browser View Transitions',()=>{
 const h=harness();
 h.f.transitionScheduleMode(()=>h.calls.push(['sync']));
 assert.equal(h.page.updates,1);
 assert.equal(h.page.innerHTML,'<section class="new-calendar">calendar</section>');
 assert.equal(h.reused(),true);
 assert.deepEqual(h.calls.map(x=>x[0]),['snapshot','aria','aria','glass','confirm','enhance','translate','sync']);
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


test('desktop Mac and wide iPad use a short shrink-then-expand visual handoff',async()=>{
 const h=harness('month',true,1180,true);
 h.f.transitionScheduleMode(()=>h.calls.push(['sync']));
 assert.equal(h.page.updates,0,'old page stays visible while it shrinks');
 assert.equal(h.animations.length,1);
 assert.equal(h.animations[0].frames[1].transform,'scale(0.974)');
 assert.equal(h.animations[0].options.duration,180);
 assert.equal(h.animations[0].frames[1].opacity,.18);
 h.animations[0].resolve();
 await Promise.resolve();
 assert.equal(h.page.updates,1);
 assert.equal(h.reused(),true);
 assert.equal(h.animations.length,2);
 assert.equal(h.animations[1].frames[0].transform,'scale(0.974)');
 assert.equal(h.animations[1].frames.at(-1).transform,'scale(1)');
 assert.equal(h.animations[1].options.duration,300);
 assert.equal(h.calls.some(x=>x[0]==='full-render'),false);
 h.animations[1].resolve();
 await Promise.resolve();
 assert.equal(h.animations[1].cancelled,true);
 assert.equal(h.calls.some(x=>x[0]==='sync'),true);
});

test('tablet and phone get responsive zoom amplitudes without overshooting 100%',async()=>{
 for(const [width,expected,duration] of [[780,'scale(0.966)',325],[390,'scale(0.958)',345]]){
  const h=harness('month',true,width,true);
  h.f.transitionScheduleMode();
  assert.equal(h.animations[0].frames[1].transform,expected);
  h.animations[0].resolve();
  await Promise.resolve();
  assert.equal(h.animations[1].frames[0].transform,expected);
  assert.equal(h.animations[1].options.duration,duration);
  assert.equal(h.animations[1].frames.at(-1).transform,'scale(1)');
  assert.match(h.animations[1].options.easing,/cubic-bezier/);
  h.animations[1].resolve();
  await Promise.resolve();
 }
 const responsive=css.slice(css.indexOf('/* CROSS-DEVICE SCHEDULE MORPH v2'));
 assert.match(responsive,/@media\(min-width:601px\) and \(max-width:900px\)/);
 assert.match(responsive,/@media\(min-width:901px\)/);
 assert.match(responsive,/@keyframes scheduleSoftArrival/);
 assert.match(responsive,/prefers-reduced-motion:reduce/);
});

test('rapid consecutive selections cancel obsolete animations without stale DOM swaps',async()=>{
 const h=harness('month',true,1080,true);
 h.f.transitionScheduleMode(()=>h.calls.push(['first-sync']));
 h.state.scheduleMode='week';
 h.f.transitionScheduleMode(()=>h.calls.push(['second-sync']));
 assert.equal(h.animations[0].cancelled,true);
 h.animations[0].resolve();
 await Promise.resolve();
 assert.equal(h.page.updates,0);
 h.animations[1].resolve();
 await Promise.resolve();
 assert.equal(h.page.updates,1);
 assert.ok(h.buttons[0].classList.contains('active'));
 assert.equal(h.calls.some(x=>x[0]==='first-sync'),false);
 assert.equal(h.calls.some(x=>x[0]==='second-sync'),true);
 h.animations[2].resolve();
 await Promise.resolve();
});

test('reduce-motion setting skips both shrink and expansion on every device',()=>{
 const h=harness('month',true,1280,true,true);
 h.f.transitionScheduleMode();
 assert.equal(h.animations.length,0);
 assert.equal(h.page.updates,1);
 assert.equal(h.calls.some(x=>x[0]==='full-render'),false);
});

test('older iPad browsers use a CSS zoom-in fallback instead of direct content jump',()=>{
 const h=harness('month',true,820);
 h.f.transitionScheduleMode();
 assert.equal(h.page.updates,1);
 assert.match(app,/schedule-soft-arrival/);
 assert.match(css,/\.page\.page-schedule\.schedule-soft-arrival/);
 assert.match(css,/\.page\.page-schedule\.schedule-soft-arrival\{animation-duration:\.18s!important;\}/);
});

test('fixed header uses one shared layout in week/month and keeps the switch static',()=>{
 assert.match(app,/function fixedScheduleHeader\(\)\{return \x60<div class="compact-month-header schedule-fixed-header"/);
 assert.match(app,/state\.prefs\.scheduleLayout==='original'\?heading\('YOUR TIMETABLE'/);
 assert.match(app,/state\.prefs\.scheduleLayout==='original'\?'<div class="compact-month-header"/);
 assert.match(app,/const fixedLayout=state\.prefs\.scheduleLayout!=='original'/);
 assert.match(app,/const outgoingTarget=fixedLayout\?pageRoot\?\.querySelector\?\.\('\.schedule-transition-content'\):pageRoot/);
 assert.match(app,/const incomingTarget=fixedLayout\?pageRoot\.querySelector\?\.\('\.schedule-transition-content'\):pageRoot/);
 const responsive=css.slice(css.indexOf('/* STABLE SIDE-BY-SIDE TIMETABLE COMPARISON v3'));
 assert.match(responsive,/\.page-schedule \.schedule-fixed-header\{/);
 assert.match(responsive,/min-height:66px/);
 assert.match(responsive,/\.schedule-fixed-header \.schedule-view-switch\{/);
 assert.match(responsive,/@media\(min-width:901px\)/);
 assert.match(responsive,/@media\(max-width:600px\)/);
});

test('three timetable layout variants can be compared in Settings and remembered at restart',()=>{
 assert.match(app,/scheduleLayout:'fixed',\.\.\.saved\(PREF,\{\}\)/);
 assert.match(app,/data-choice="scheduleLayout"/);
 assert.match(app,/if\(kind==='scheduleLayout'\)return \[/);
 assert.match(app,/value:'original',label:en\?'Original layout':'原版布局'/);
 assert.match(app,/value:'fixed',label:en\?'Fixed switch':'固定按钮版'/);
 assert.match(app,/value:'wide',label:en\?'Wide centered switch':'横向居中版'/);
 assert.match(app,/\['original','fixed','wide'\]\.includes\(value\)/);
 assert.match(app,/state\.prefs\.scheduleLayout==='wide'\?'横向居中版'/);
 assert.match(app,/function selectScheduleLayout\(value\)\{/);
 assert.match(app,/state\.prefs\.scheduleLayout=value;\s*storePrefs\(\)/);
 assert.match(app,/case'selectScheduleLayout':selectScheduleLayout\(target\.dataset\.value\)/);
});

test('third mode renders identical centered wide header in both week and month',()=>{
 const from=app.indexOf('function wideScheduleHeader(){');
 const to=app.indexOf('function scheduleViewSwitch(){',from);
 assert.ok(from>=0&&to>from,'third wide header helper exists');
 const helper=app.slice(from,to);
 const wide=new Function('heading','E','term','scheduleViewSwitch',
  helper+'return wideScheduleHeader();')(
  (eyebrow,title,description)=>'<header>'+eyebrow+':'+title+':'+description+'</header>',
  s=>s,()=>({name:'2026–2027 第一学期'}),
  ()=>'<div class="schedule-view-switch"><button>周视图</button><button>月视图</button></div>'
 );
 assert.match(wide,/YOUR TIMETABLE/);
 assert.match(wide,/把每一周，过得从容有序。/);
 assert.match(wide,/<div class="schedule-wide-header"><div class="schedule-view-switch">/);
 assert.equal((wide.match(/schedule-view-switch/g)||[]).length,1);
 // Both calendar modes get exactly the same wide header, outside their
 // independently replaced schedule content.
 assert.match(app,/state\.prefs\.scheduleLayout==='wide'\?wideScheduleHeader\(\):fixedScheduleHeader\(\)/);
 assert.match(app,/return \x60\$\{state\.prefs\.scheduleLayout==='wide'\?wideScheduleHeader\(\):''\}<section class="compact-month-view"/);
 assert.match(app,/state\.prefs\.scheduleLayout==='wide'\?'':fixedScheduleHeader\(\)/);
 assert.match(app,/const fixedLayout=state\.prefs\.scheduleLayout!=='original'/);
 assert.match(app,/replacement\.replaceWith\(selector\)/);
});

test('wide centered selector has equal full-width buttons across responsive breakpoints',()=>{
 const wide=css.slice(css.indexOf('/* THIRD TIMETABLE LAYOUT — WIDE CENTERED RAIL v1'));
 assert.ok(wide.length>900,'third layout CSS must exist');
 assert.match(wide,/\.page-schedule \.schedule-wide-header\{/);
 assert.match(wide,/max-width:900px/);
 assert.match(wide,/margin:0 auto 18px/);
 assert.match(wide,/\.page-schedule \.schedule-wide-header \.schedule-view-switch\{/);
 assert.match(wide,/width:100%/);
 assert.match(wide,/\.schedule-view-switch > button\{\s*flex:1 1 0;\s*width:50%/);
 assert.match(wide,/@media\(max-width:660px\)/);
 assert.match(wide,/@media\(min-width:661px\) and \(max-width:900px\)/);
 assert.match(app,/scheduleLayout:'fixed',\.\.\.saved\(PREF,\{\}\)/,
  'existing users keep their saved layout, new users keep the current default');
});

test('the original variant retains the previous shorter timing and page-level animation',()=>{
 assert.match(app,/const scale=fixedLayout\?/);
 assert.match(app,/width>=900\?\.987:width>=600\?\.980:\.973/);
 assert.match(app,/width>=900\?80:95/);
 assert.match(app,/width>=900\?165:width>=600\?180:195/);
 assert.match(app,/const incoming=fixedLayout\?\[/);
 assert.match(app,/easing:fixedLayout\?'cubic-bezier\(\.24,\.68,\.30,1\)'/);
});

test('weekday, week arrows and month arrows use the same locally updated timetable',()=>{
 assert.match(app,/if\(target\.dataset\.day!==undefined\)\{state\.weekday=Number\(target\.dataset\.day\);renderScheduleContent\(\);/);
 assert.match(app,/state\.week=clamp\(state\.week\+\(act==='nextWeek'\?1:-1\),1,\(term\(\)\.totalWeeks\|\|19\)\+1\);renderScheduleContent\(\)/);
 assert.match(app,/state\.monthLoading=false;state\.monthLoadError=0;renderScheduleContent\(\);loadMonth\(\);break;/);
 assert.match(app,/const previousSelectors=snapshotLiquidSelectors\(pageRoot\);/);
 assert.match(app,/enhanceLiquidSelectors\(pageRoot,previousSelectors\)/);
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
,'state','schedulePage','render','snapshotLiquidSelectors','enhanceLiquidSelectors','window',
  'setSelectorGlass','confirmGlassSelection','requestAnimationFrame',
  body+'return {transitionScheduleMode,renderScheduleContent};')(
  ()=>hasHost?page:null,state,()=>'<section class="new-calendar">calendar</section>',
  ()=>calls.push(['full-render']),
  node=>calls.push(['enhance',node]),
  {matchMedia:()=>({matches:reduced}),GZUCM_I18N:{apply:(node,language)=>calls.push(['translate',node,language])}},
  (node,rect)=>{calls.push(['glass',rect]);},
  node=>{calls.push(['confirm',node]);},
  callback=>{callback();return 1}
 );
 return {f,calls,page,lens,buttons,reused:()=>reused,state,doc,animations};
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


test('desktop Mac and wide iPad use a short shrink-then-expand visual handoff',async()=>{
 const h=harness('month',true,1180,true);
 h.f.transitionScheduleMode(()=>h.calls.push(['sync']));
 assert.equal(h.page.updates,0,'old page stays visible while it shrinks');
 assert.equal(h.animations.length,1);
 assert.equal(h.animations[0].frames[1].transform,'scale(0.974)');
 assert.equal(h.animations[0].options.duration,180);
 assert.equal(h.animations[0].frames[1].opacity,.18);
 h.animations[0].resolve();
 await Promise.resolve();
 assert.equal(h.page.updates,1);
 assert.equal(h.reused(),true);
 assert.equal(h.animations.length,2);
 assert.equal(h.animations[1].frames[0].transform,'scale(0.974)');
 assert.equal(h.animations[1].frames.at(-1).transform,'scale(1)');
 assert.equal(h.animations[1].options.duration,300);
 assert.equal(h.calls.some(x=>x[0]==='full-render'),false);
 h.animations[1].resolve();
 await Promise.resolve();
 assert.equal(h.animations[1].cancelled,true);
 assert.equal(h.calls.some(x=>x[0]==='sync'),true);
});

test('tablet and phone get responsive zoom amplitudes without overshooting 100%',async()=>{
 for(const [width,expected,duration] of [[780,'scale(0.966)',325],[390,'scale(0.958)',345]]){
  const h=harness('month',true,width,true);
  h.f.transitionScheduleMode();
  assert.equal(h.animations[0].frames[1].transform,expected);
  h.animations[0].resolve();
  await Promise.resolve();
  assert.equal(h.animations[1].frames[0].transform,expected);
  assert.equal(h.animations[1].options.duration,duration);
  assert.equal(h.animations[1].frames.at(-1).transform,'scale(1)');
  assert.match(h.animations[1].options.easing,/cubic-bezier/);
  h.animations[1].resolve();
  await Promise.resolve();
 }
 const responsive=css.slice(css.indexOf('/* CROSS-DEVICE SCHEDULE MORPH v2'));
 assert.match(responsive,/@media\(min-width:601px\) and \(max-width:900px\)/);
 assert.match(responsive,/@media\(min-width:901px\)/);
 assert.match(responsive,/@keyframes scheduleSoftArrival/);
 assert.match(responsive,/prefers-reduced-motion:reduce/);
});

test('rapid consecutive selections cancel obsolete animations without stale DOM swaps',async()=>{
 const h=harness('month',true,1080,true);
 h.f.transitionScheduleMode(()=>h.calls.push(['first-sync']));
 h.state.scheduleMode='week';
 h.f.transitionScheduleMode(()=>h.calls.push(['second-sync']));
 assert.equal(h.animations[0].cancelled,true);
 h.animations[0].resolve();
 await Promise.resolve();
 assert.equal(h.page.updates,0);
 h.animations[1].resolve();
 await Promise.resolve();
 assert.equal(h.page.updates,1);
 assert.ok(h.buttons[0].classList.contains('active'));
 assert.equal(h.calls.some(x=>x[0]==='first-sync'),false);
 assert.equal(h.calls.some(x=>x[0]==='second-sync'),true);
 h.animations[2].resolve();
 await Promise.resolve();
});

test('reduce-motion setting skips both shrink and expansion on every device',()=>{
 const h=harness('month',true,1280,true,true);
 h.f.transitionScheduleMode();
 assert.equal(h.animations.length,0);
 assert.equal(h.page.updates,1);
 assert.equal(h.calls.some(x=>x[0]==='full-render'),false);
});

test('older iPad browsers use a CSS zoom-in fallback instead of direct content jump',()=>{
 const h=harness('month',true,820);
 h.f.transitionScheduleMode();
 assert.equal(h.page.updates,1);
 assert.match(app,/schedule-soft-arrival/);
 assert.match(css,/\.page\.page-schedule\.schedule-soft-arrival/);
 assert.match(css,/\.page\.page-schedule\.schedule-soft-arrival\{animation-duration:\.18s!important;\}/);
});

test('fixed header uses one shared layout in week/month and keeps the switch static',()=>{
 assert.match(app,/function fixedScheduleHeader\(\)\{return \x60<div class="compact-month-header schedule-fixed-header"/);
 assert.match(app,/state\.prefs\.scheduleLayout==='original'\?heading\('YOUR TIMETABLE'/);
 assert.match(app,/state\.prefs\.scheduleLayout==='original'\?'<div class="compact-month-header"/);
 assert.match(app,/const fixedLayout=state\.prefs\.scheduleLayout!=='original'/);
 assert.match(app,/const outgoingTarget=fixedLayout\?pageRoot\?\.querySelector\?\.\('\.schedule-transition-content'\):pageRoot/);
 assert.match(app,/const incomingTarget=fixedLayout\?pageRoot\.querySelector\?\.\('\.schedule-transition-content'\):pageRoot/);
 const responsive=css.slice(css.indexOf('/* STABLE SIDE-BY-SIDE TIMETABLE COMPARISON v3'));
 assert.match(responsive,/\.page-schedule \.schedule-fixed-header\{/);
 assert.match(responsive,/min-height:66px/);
 assert.match(responsive,/\.schedule-fixed-header \.schedule-view-switch\{/);
 assert.match(responsive,/@media\(min-width:901px\)/);
 assert.match(responsive,/@media\(max-width:600px\)/);
});

test('three timetable layout variants can be compared in Settings and remembered at restart',()=>{
 assert.match(app,/scheduleLayout:'fixed',\.\.\.saved\(PREF,\{\}\)/);
 assert.match(app,/data-choice="scheduleLayout"/);
 assert.match(app,/if\(kind==='scheduleLayout'\)return \[/);
 assert.match(app,/value:'original',label:en\?'Original layout':'原版布局'/);
 assert.match(app,/value:'fixed',label:en\?'Fixed switch':'固定按钮版'/);
 assert.match(app,/value:'wide',label:en\?'Wide centered switch':'横向居中版'/);
 assert.match(app,/\['original','fixed','wide'\]\.includes\(value\)/);
 assert.match(app,/state\.prefs\.scheduleLayout==='wide'\?'横向居中版'/);
 assert.match(app,/function selectScheduleLayout\(value\)\{/);
 assert.match(app,/state\.prefs\.scheduleLayout=value;\s*storePrefs\(\)/);
 assert.match(app,/case'selectScheduleLayout':selectScheduleLayout\(target\.dataset\.value\)/);
});

test('third mode renders identical centered wide header in both week and month',()=>{
 const from=app.indexOf('function wideScheduleHeader(){');
 const to=app.indexOf('function scheduleViewSwitch(){',from);
 assert.ok(from>=0&&to>from,'third wide header helper exists');
 const helper=app.slice(from,to);
 const wide=new Function('heading','E','term','scheduleViewSwitch',
  helper+'return wideScheduleHeader();')(
  (eyebrow,title,description)=>'<header>'+eyebrow+':'+title+':'+description+'</header>',
  s=>s,()=>({name:'2026–2027 第一学期'}),
  ()=>'<div class="schedule-view-switch"><button>周视图</button><button>月视图</button></div>'
 );
 assert.match(wide,/YOUR TIMETABLE/);
 assert.match(wide,/把每一周，过得从容有序。/);
 assert.match(wide,/<div class="schedule-wide-header"><div class="schedule-view-switch">/);
 assert.equal((wide.match(/schedule-view-switch/g)||[]).length,1);
 // Both calendar modes get exactly the same wide header, outside their
 // independently replaced schedule content.
 assert.match(app,/state\.prefs\.scheduleLayout==='wide'\?wideScheduleHeader\(\):fixedScheduleHeader\(\)/);
 assert.match(app,/return \x60\$\{state\.prefs\.scheduleLayout==='wide'\?wideScheduleHeader\(\):''\}<section class="compact-month-view"/);
 assert.match(app,/state\.prefs\.scheduleLayout==='wide'\?'':fixedScheduleHeader\(\)/);
 assert.match(app,/const fixedLayout=state\.prefs\.scheduleLayout!=='original'/);
 assert.match(app,/replacement\.replaceWith\(selector\)/);
});

test('wide centered selector has equal full-width buttons across responsive breakpoints',()=>{
 const wide=css.slice(css.indexOf('/* THIRD TIMETABLE LAYOUT — WIDE CENTERED RAIL v1'));
 assert.ok(wide.length>900,'third layout CSS must exist');
 assert.match(wide,/\.page-schedule \.schedule-wide-header\{/);
 assert.match(wide,/max-width:900px/);
 assert.match(wide,/margin:0 auto 18px/);
 assert.match(wide,/\.page-schedule \.schedule-wide-header \.schedule-view-switch\{/);
 assert.match(wide,/width:100%/);
 assert.match(wide,/\.schedule-view-switch > button\{\s*flex:1 1 0;\s*width:50%/);
 assert.match(wide,/@media\(max-width:660px\)/);
 assert.match(wide,/@media\(min-width:661px\) and \(max-width:900px\)/);
 assert.match(app,/scheduleLayout:'fixed',\.\.\.saved\(PREF,\{\}\)/,
  'existing users keep their saved layout, new users keep the current default');
});

test('the original variant retains the previous shorter timing and page-level animation',()=>{
 assert.match(app,/const scale=fixedLayout\?/);
 assert.match(app,/width>=900\?\.987:width>=600\?\.980:\.973/);
 assert.match(app,/width>=900\?80:95/);
 assert.match(app,/width>=900\?165:width>=600\?180:195/);
 assert.match(app,/const incoming=fixedLayout\?\[/);
 assert.match(app,/easing:fixedLayout\?'cubic-bezier\(\.24,\.68,\.30,1\)'/);
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
