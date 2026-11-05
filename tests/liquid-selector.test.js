'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');
const start=app.indexOf('let liquidSelectorPointer=null;');
const end=app.indexOf('function render(){',start);
assert.ok(start>=0&&end>start,'shared selector logic is present');
function names(initial=[]){
 const values=new Set(initial);
 return {
  contains:x=>values.has(x),
  add:(...xs)=>xs.forEach(x=>values.add(x)),
  remove:(...xs)=>xs.forEach(x=>values.delete(x)),
  toggle:(x,force)=>{if(force)values.add(x);else values.delete(x);}
 };
}
function harness(kind='schedule',vertical=false){
 let sounds=0,armed=0,clicks=0,frame=null;
 const menu=kind==='menu';
 const classNames=menu?['safari-floating-menu']:kind==='days'?['day-strip']:kind==='grade'?['segmented']:['schedule-view-switch'];
 const group={
  classList:names(classNames),children:[],scrollTop:0,
  getBoundingClientRect:()=>({left:0,top:0,width:300,height:180}),
  setPointerCapture:id=>{group.pointer=id;},
  hasPointerCapture:id=>group.pointer===id,
  releasePointerCapture:()=>{group.pointer=null;},
  matches:sel=>sel==='.sidebar nav'&&vertical,
  prepend(el){group.children.unshift(el);group.glass=el;},
  querySelector(sel){
   if(sel.includes('.liquid-choice-highlight')||sel.includes('.safari-menu-glider'))return group.glass;
   if(sel.includes('[data-grade-tab]'))return kind==='grade'?group.buttons[0]:null;
   return null;
  },
  querySelectorAll:()=>group.buttons,
  getClientRects:()=>[{}]
 };
 group.buttons=Array.from({length:3},(_,i)=>{
  const top=vertical?i*50:0,left=vertical?0:i*100;
  const button={
   tagName:'BUTTON',dataset:kind==='grade'?{gradeTab:['course','level','fitness'][i]}:{mode:['week','month','term'][i]},
   offsetLeft:left,offsetTop:top,offsetWidth:vertical?180:100,offsetHeight:50,
   classList:names(i===0?['active']:[]),isConnected:true,
   getBoundingClientRect:()=>({left,top,width:vertical?180:100,height:50}),
   getAttribute:attr=>attr==='aria-pressed'?(i===0?'true':'false'):null,
   contains(node){return node===button;},
   click(){clicks++;group.clicked=i;group.transformOnClick=group.glass?.style?.transform;},
   closest(sel){
    if(sel==='.bottom-nav'||sel==='input,textarea,select')return null;
    if(sel==='.safari-floating-menu')return menu?group:null;
    if(sel==='.liquid-selector')return !menu?group:null;
    return null;
   }
  };
  return button;
 });
 group.children.push(...group.buttons);
 if(menu){
  group.glass={style:{},classList:names(['safari-menu-glider']),isConnected:true};
 }else group.glass=null;
 const doc={createElement:()=>({
  tagName:'SPAN',style:{},className:'',classList:names(),isConnected:true,setAttribute:()=>{}
 })};
 const window={matchMedia:()=>({matches:false})};
 const selectors=new Function('document','window','armLiquidSound','playLiquidTick',
  'requestAnimationFrame','cancelAnimationFrame',
  app.slice(start,end)+
  'return {enhanceLiquidSelectors,liquidPointerDown,liquidPointerMove,liquidPointerFinish,'+
  'snapshotLiquidSelectors,liquidSelectorId,guardLiquidSelectorClick,confirmGlassSelection};')(
   doc,window,()=>armed++,()=>sounds++,cb=>{frame=cb;return 1},()=>{frame=null});
 if(!menu)selectors.enhanceLiquidSelectors({querySelectorAll:()=>[group]});
 const event=(i,x,y)=>({
  pointerId:1,button:0,isPrimary:true,clientX:x,clientY:y,cancelable:true,
  target:group.buttons[i],preventDefault(){this.prevented=true;}
 });
 return {group,selectors,event,runFrame:()=>{const cb=frame;frame=null;cb?.();},
  stats:()=>({sounds,armed,clicks})};
}
test('all segmented, weekday, sidebar and popover glass choices use drag-only enlargement and confirmation shadow',()=>{
 const tail=css.slice(css.indexOf('/* CONFIRM-ONLY DOCK OVERHANG v2'));
 for(const kind of ['.segmented','.schedule-view-switch','.day-strip']){
  assert.ok(tail.includes(kind),'drag-only animation covers '+kind);
 }
 assert.match(tail,/\.liquid-selector\.is-rail-pressed > \.liquid-choice-highlight\{\s*scale:1!important;/);
 assert.match(tail,/\.liquid-selector\.is-rail-dragging > \.liquid-choice-highlight\{\s*scale:1\.085!important;/);
 assert.match(tail,/\.sidebar \.liquid-selector > \.liquid-choice-highlight\{\s*scale:1!important;/);
 assert.match(tail,/\.sidebar \.liquid-selector > \.liquid-choice-highlight\.is-dragging\{\s*scale:1\.065 1\.07!important;/);
 assert.match(tail,/\.safari-floating-menu \.safari-menu-glider\.is-dragging\{\s*scale:1\.06;/);
 const h=harness('grade');
 h.selectors.confirmGlassSelection(h.group.glass);
 assert.ok(h.group.glass.classList.contains('is-confirmed'));
 const e=h.event(0,40,20);
 h.selectors.liquidPointerDown(e);
 assert.ok(h.group.classList.contains('is-rail-pressed'));
 h.selectors.liquidPointerMove(h.event(0,245,20));
 h.runFrame();
 assert.ok(h.group.classList.contains('is-rail-dragging'));
 h.selectors.liquidPointerFinish(h.event(0,245,20));
 assert.equal(h.group.clicked,2);
 assert.ok(h.group.glass.classList.contains('is-confirmed'));
});
test('segmented mode and grade filters still support swipe and liquid glass',()=>{
 for(const kind of ['schedule','grade']){
  const h=harness(kind);
  h.selectors.liquidPointerDown(h.event(0,40,20));
  h.selectors.liquidPointerMove(h.event(0,243,22));
  h.runFrame();
  assert.equal(h.group.glass.style.transform,'translate3d(193px,0px,0)');
  assert.ok(h.group.glass.classList.contains('is-dragging'));
  assert.ok(h.group.buttons[2].classList.contains('is-scrubbed'));
  h.selectors.liquidPointerFinish(h.event(0,243,22));
  assert.equal(h.group.clicked,2,kind+' did not select final tab');
  assert.equal(h.stats().sounds,1,kind+' should tick once for crossing');
  assert.equal(h.stats().armed,1);
  assert.equal(h.stats().clicks,1);
 }
});
test('horizontal rail gently settles on taps and keeps drag magnification',()=>{
 const h=harness('grade');
 assert.ok(h.group.classList.contains('is-horizontal-rail'));
 h.selectors.liquidPointerDown(h.event(0,40,20));
 assert.ok(h.group.classList.contains('is-rail-pressed'),'full rail must grow before any movement');
 assert.equal(h.group.classList.contains('is-rail-dragging'),false);
 h.selectors.liquidPointerFinish(h.event(0,40,20));
 assert.equal(h.group.classList.contains('is-rail-pressed'),false);
 assert.equal(h.group.classList.contains('is-rail-releasing'),true,'tap must start a gentle spring on the rail');
 assert.equal(h.stats().clicks,0);
 assert.match(css,/transform-origin:center center/);
 assert.match(css.slice(css.indexOf('/* NO-BOUNCE CLICK FEEDBACK v1')),/\.liquid-selector:is\(\.is-rail-releasing,\.is-rail-settling\)/);
});
test('horizontal rail edge light and glow clamp at either side then clear',()=>{
 const h=harness('schedule');
 h.selectors.liquidPointerDown(h.event(0,40,20));
 h.selectors.liquidPointerMove(h.event(0,-100,20));
 h.runFrame();
 assert.ok(h.group.classList.contains('is-rail-dragging'));
 assert.ok(h.group.classList.contains('is-rail-edge-left'));
 assert.equal(h.group.glass.style.transform,'translate3d(0px,0px,0)');
 h.selectors.liquidPointerMove(h.event(0,490,20));
 h.runFrame();
 assert.equal(h.group.classList.contains('is-rail-edge-left'),false);
 assert.ok(h.group.classList.contains('is-rail-edge-right'));
 h.selectors.liquidPointerFinish(h.event(0,490,20));
 assert.equal(h.group.classList.contains('is-rail-edge-right'),false);
 assert.equal(h.stats().clicks,1);
 assert.match(css,/\.is-rail-edge-left::before/);
 assert.match(css,/\.is-rail-edge-right::after/);
});
test('a vertical scroll ends rail enlargement without selecting anything',()=>{
 const h=harness('schedule');
 h.selectors.liquidPointerDown(h.event(0,40,20));
 assert.ok(h.group.classList.contains('is-rail-pressed'));
 h.selectors.liquidPointerMove(h.event(0,43,95));
 assert.equal(h.group.classList.contains('is-rail-pressed'),false);
 h.selectors.liquidPointerFinish(h.event(0,43,95));
 assert.equal(h.group.classList.contains('is-rail-releasing'),false);
 assert.equal(h.stats().clicks,0);
});
test('horizontal rail swipe releases without any second spring or reset',()=>{
 const h=harness('grade');
 h.selectors.liquidPointerDown(h.event(0,40,20));
 h.selectors.liquidPointerMove(h.event(0,230,20));
 h.runFrame();
 h.selectors.liquidPointerFinish(h.event(0,230,20));
 assert.equal(h.group.classList.contains('is-rail-dropping'),false);
 assert.equal(h.group.classList.contains('is-rail-releasing'),false);
 h.selectors.enhanceLiquidSelectors({querySelectorAll:()=>[h.group]});
 assert.equal(h.group.classList.contains('is-rail-dropping'),false);
 assert.equal(h.group.classList.contains('is-rail-settling'),false);
 const easing=css.slice(css.indexOf('/* UNIFIED V-SYNC GESTURES v2'));
 assert.match(easing,/\.liquid-selector\.is-rail-dropping\{\s*animation:none!important;/);
 assert.match(easing,/transition:scale var\(--pocket-gesture-release\)/);
});
test('popovers remain vertically scrubbed while weekdays use horizontal glass navigation',()=>{
 const menu=harness('menu',true);
 menu.selectors.liquidPointerDown(menu.event(0,30,20));
 assert.equal(menu.group.classList.contains('is-rail-pressed'),false);
 const days=harness('days');
 assert.ok(days.group.classList.contains('is-horizontal-rail'));
 assert.ok(days.group.glass,'weekday choices need a shared moving glass lens');
 assert.match(css,/\.day-strip\.liquid-selector > \.liquid-choice-highlight\{/);
});
test('horizontal rail grows both the whole segment and its selected glass on first touch',()=>{
 const h=harness('grade');
 const down=h.event(0,40,20);
 h.selectors.liquidPointerDown(down);
 assert.equal(h.group.classList.contains('is-rail-pressed'),true);
 assert.equal(h.group.buttons[0].classList.contains('is-pressed'),true);
 assert.match(css,/\.liquid-selector\.is-rail-pressed\s*> \.liquid-choice-highlight\{scale:1\.09;\}/);
 h.selectors.liquidPointerFinish(down);
 assert.equal(h.group.buttons[0].classList.contains('is-pressed'),false);
 assert.equal(h.group.classList.contains('is-rail-releasing'),true);
 const gentle=css.slice(css.indexOf('/* GENTLE BUTTON AND RAIL SPRINGS v1'));
 assert.match(gentle,/\.liquid-selector\.is-rail-pressed\{/);
 assert.match(gentle,/\.liquid-selector\.is-rail-dragging\{/);
 assert.match(gentle,/\.liquid-selector\.is-rail-pressed > button\.is-pressed\{/);
 assert.match(gentle,/@keyframes pocketRailSoftSpring/);
});
test('horizontal rail press cancels label enlargement once drag begins',()=>{
 const h=harness('grade');
 h.selectors.liquidPointerDown(h.event(0,40,20));
 assert.equal(h.group.buttons[0].classList.contains('is-pressed'),true);
 h.selectors.liquidPointerMove(h.event(0,220,22));
 assert.equal(h.group.buttons[0].classList.contains('is-pressed'),false);
 assert.equal(h.group.classList.contains('is-rail-dragging'),true);
 h.selectors.liquidPointerFinish(h.event(0,220,22));
});
test('horizontal drag magnifies outer rail and the scrubbed button but not the containing card',()=>{
 const section=css.slice(css.indexOf('/* GENTLE BUTTON AND RAIL SPRINGS v1'));
 assert.match(section,/#app :is\(\.segmented,\.schedule-view-switch,\.day-strip\)\.liquid-selector\.is-rail-dragging\{\s*scale:1\.026!important;/);
 assert.match(section,/\.liquid-selector\.is-rail-dragging > button\.is-scrubbed\{\s*scale:1\.065!important;/);
 assert.match(section,/\.liquid-selector\.is-rail-pressed > \.liquid-choice-highlight\{\s*scale:1\.045!important;/);
 assert.match(section,/\.liquid-selector\.is-rail-dragging > \.liquid-choice-highlight\{\s*scale:1\.08!important;/);
 const h=harness('days');
 h.selectors.liquidPointerDown(h.event(0,40,20));
 assert.ok(h.group.classList.contains('is-rail-pressed'));
 h.selectors.liquidPointerMove(h.event(0,220,20));
 assert.ok(h.group.classList.contains('is-rail-dragging'));
 assert.ok(h.group.buttons[2].classList.contains('is-scrubbed'));
 h.selectors.liquidPointerFinish(h.event(0,220,20));
 assert.equal(h.group.classList.contains('is-rail-dropping'),false,'swipe must not start base spring');
});

test('fast flicks without a preceding move still choose grade and timetable options',()=>{
 for(const kind of ['grade','schedule','days']){
  const h=harness(kind);
  h.selectors.liquidPointerDown(h.event(0,40,20));
  h.selectors.liquidPointerFinish(h.event(0,245,20));
  assert.equal(h.group.clicked,2);
  assert.equal(h.stats().clicks,1);
  assert.equal(h.group.classList.contains('is-rail-dropping'),false);
 }
});
test('vertical release without move does not select a grade choice',()=>{
 const h=harness('grade');
 h.selectors.liquidPointerDown(h.event(0,40,20));
 h.selectors.liquidPointerFinish(h.event(0,52,120));
 assert.equal(h.stats().clicks,0);
});
test('grade and timetable rails use the Dock tap-or-drag direction lock',()=>{
 for(const kind of ['grade','schedule','days']){
  const h=harness(kind);
  h.selectors.liquidPointerDown(h.event(0,40,20));
  h.selectors.liquidPointerMove(h.event(0,47,24));
  assert.equal(h.group.classList.contains('is-rail-dragging'),false);
  h.selectors.liquidPointerMove(h.event(0,55,24));
  assert.equal(h.group.classList.contains('is-rail-dragging'),true);
  h.selectors.liquidPointerFinish(h.event(0,55,24));
  assert.equal(h.group.classList.contains('is-rail-dropping'),false);
 }
});
test('drag moves the glass with cached geometry rather than measuring each frame',()=>{
 const h=harness('grade');
 h.group.offsetWidth=300;
 const oldRect=h.group.getBoundingClientRect;
 let rectReads=0;
 h.group.getBoundingClientRect=()=>{rectReads++;return oldRect();};
 h.selectors.liquidPointerDown(h.event(0,40,20));
 const afterDown=rectReads;
 h.selectors.liquidPointerMove(h.event(0,245,20));h.runFrame();
 h.selectors.liquidPointerMove(h.event(0,210,20));h.runFrame();
 assert.equal(rectReads,afterDown,'no layout read on rAF during animated scaling');
 const moved=parseFloat(h.group.glass.style.transform.match(/translate3d\(([-\d.]+)px/)[1]);
 const expected=150+(210-150)/1.026-50;
 assert.ok(Math.abs(moved-expected)<.1,'glass follows 102.6% rail scaling');
 h.selectors.liquidPointerFinish(h.event(0,210,20));
});

test('horizontal rail snapshots preserve unscaled lens geometry while expanded',()=>{
 const h=harness('grade');
 const group=h.group;
 group.offsetWidth=300;
 group.getBoundingClientRect=()=>({left:-6,top:-2,width:312,height:187.2});
 group.glass.getBoundingClientRect=()=>({left:98,top:5,width:108,height:52});
 group.glass.style={width:'100px',height:'50px',transform:'translate3d(100px,0px,0)'};
 const m=h.selectors.snapshotLiquidSelectors({querySelectorAll:()=>[group]});
 const snapshot=m.get('grade-type');
 assert.equal(snapshot.x,100);
 assert.equal(snapshot.y,0);
 assert.equal(snapshot.width,100);
 assert.equal(snapshot.height,50);
});
test('weekdays glide across seven dates and commit nearest on release without an eighth grid cell',()=>{
 const h=harness('days');
 assert.ok(h.group.glass,'weekday strip must gain a travelling glass lens');
 assert.ok(h.group.classList.contains('liquid-selector'));
 h.selectors.liquidPointerDown(h.event(0,40,20));
 h.selectors.liquidPointerMove(h.event(0,243,22));
 h.runFrame();
 assert.equal(h.group.glass.style.transform,'translate3d(193px,0px,0)');
 assert.ok(h.group.buttons[2].classList.contains('is-scrubbed'));
 h.selectors.liquidPointerFinish(h.event(0,243,22));
 assert.equal(h.group.clicked,2,'dragging across weekdays must select last hovered date');
 assert.equal(h.stats().sounds,1);
 assert.match(app,/return `<div class="day-strip" role="group"/);
 assert.match(app,/\.segmented,\.schedule-view-switch,\.day-strip,\.sidebar nav/);
 assert.match(css,/\.day-strip\.liquid-selector > \.liquid-choice-highlight\{/);
});
test('vertical page scroll never activates a horizontal selection',()=>{
 const h=harness('schedule');
 h.selectors.liquidPointerDown(h.event(0,40,20));
 h.selectors.liquidPointerMove(h.event(0,44,94));
 h.selectors.liquidPointerFinish(h.event(0,44,94));
 assert.equal(h.stats().clicks,0);
 assert.equal(h.stats().sounds,0);
});
test('a tap without a drag preserves ordinary button click',()=>{
 const h=harness('grade');
 h.selectors.liquidPointerDown(h.event(0,40,20));
 h.selectors.liquidPointerFinish(h.event(0,40,20));
 assert.equal(h.stats().clicks,0);
});
test('settings popover choices also support vertical scrubbing',()=>{
 const h=harness('menu',true);
 h.selectors.liquidPointerDown(h.event(0,30,23));
 h.selectors.liquidPointerMove(h.event(0,30,132));
 h.runFrame();
 assert.ok(h.group.glass.classList.contains('is-dragging'));
 h.selectors.liquidPointerFinish(h.event(0,30,132));
 assert.equal(h.group.clicked,2);
 assert.equal(h.stats().sounds,1);
});
test('cancelled gesture does not change the current selection',()=>{
 const h=harness('schedule');
 h.selectors.liquidPointerDown(h.event(0,40,20));
 h.selectors.liquidPointerMove(h.event(0,241,20));
 h.selectors.liquidPointerFinish(h.event(0,241,20),true);
 assert.equal(h.stats().clicks,0);
});
test('source-based dialogs and menus both reverse shrink to their trigger',()=>{
 assert.match(app,/function recordDialogOrigin\(trigger\)/);
 assert.match(app,/function liquidDialogFrames\(/);
 assert.match(app,/function closeModal\(immediate=false\)/);
 assert.match(app,/clearInterval\(state\.poll\);state\.poll=null/);
 assert.match(app,/menu\.classList\.add\('is-closing'\)/);
 assert.match(app,/--popover-origin-x/);
 assert.match(css,/@keyframes glassDialogBloom/);
 assert.match(css,/@keyframes glassDialogReturn/);
 assert.match(css,/@keyframes glassPopoverBloom/);
 assert.match(css,/@keyframes glassPopoverReturn/);
});
test('reduced-motion, readable contrast and quiet sound preference are supported',()=>{
 assert.match(app,/soundEffects:true/);
 assert.match(app,/data-action="toggleSound"/);
 assert.match(app,/state\.prefs\.soundEffects===false/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/prefers-reduced-transparency:reduce/);
 assert.match(css,/\.liquid-selector > \.liquid-choice-highlight/);
 assert.match(css,/\.safari-floating-menu \.safari-menu-glider/);
 assert.match(css,/\.bottom-item\.is-scrubbed/);
});

test('iOS Settings switch stretches instantly, tracks finger drag and settles without rerender',()=>{
 const from=app.indexOf('let liquidSwitchPointer=null;');
 const to=app.indexOf('function guardLiquidSelectorClick(event){',from);
 assert.ok(from>=0&&to>from);
 let stored=0,rendered=0,armed=0,tones=0;
 const state={prefs:{soundEffects:false,hapticEffects:true}};
 const f=new Function('state','storePrefs','render','armLiquidSound','playLiquidTick',
  app.slice(from,to)+
  'return {liquidSwitchDown,liquidSwitchMove,liquidSwitchFinish,commitLiquidSwitch};')(
  state,()=>stored++,()=>rendered++,()=>armed++,()=>tones++);
 const classList=names();
 const vars=new Map(),attrs=new Map();
 const button={
  classList,dataset:{action:'toggleSound'},pointerId:null,
  style:{setProperty:(k,v)=>vars.set(k,v),removeProperty:k=>vars.delete(k)},
  setAttribute:(k,v)=>attrs.set(k,v),
  setPointerCapture(id){button.pointerId=id;},
  hasPointerCapture(id){return button.pointerId===id;},
  releasePointerCapture(){button.pointerId=null;}
 };
 const ev=(x,y)=>({
  pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y,cancelable:true,
  target:{closest:sel=>sel==='.switch[role="switch"]'?button:null},
  preventDefault(){this.prevented=true;}
 });
 f.liquidSwitchDown(ev(10,20));
 assert.ok(classList.contains('is-pressed'),'thumb must stretch at pointerdown without moving');
 assert.equal(stored,0,'press is preview only');
 f.liquidSwitchMove(ev(19,20));
 assert.ok(classList.contains('is-dragging'));
 assert.equal(vars.get('--switch-thumb-x'),'9.00px','thumb follows live delta, not only binary snapping');
 f.liquidSwitchMove(ev(43,22));
 assert.ok(classList.contains('preview-on'));
 assert.equal(vars.get('--switch-thumb-x'),'14.00px','stretch thumb cannot leave the track');
 f.liquidSwitchFinish(ev(43,22));
 assert.equal(state.prefs.soundEffects,true);
 assert.equal(stored,1);
 assert.equal(rendered,0,'no DOM remount while the switch spring settles');
 assert.ok(classList.contains('on'));
 assert.equal(attrs.get('aria-checked'),'true');
 assert.equal(vars.has('--switch-thumb-x'),false);
 assert.equal(classList.contains('is-pressed'),false);
 assert.equal(armed,1);
 assert.equal(tones,1);
 f.liquidSwitchDown(ev(42,20));
 assert.ok(classList.contains('is-pressed'));
 f.liquidSwitchMove(ev(3,20));
 assert.ok(classList.contains('preview-off'));
 f.liquidSwitchFinish(ev(3,20));
 assert.equal(state.prefs.soundEffects,false);
 assert.equal(attrs.get('aria-checked'),'false');
 assert.equal(stored,2);
 assert.equal(rendered,0);
 // A simple tap now commits on pointerup, avoiding a shrink-and-rewind
 // before click. The subsequent click must be suppressed by capture logic.
 f.liquidSwitchDown(ev(10,20));
 assert.ok(classList.contains('is-pressed'));
 f.liquidSwitchFinish(ev(10,20));
 assert.equal(stored,3);
 assert.equal(classList.contains('is-pressed'),false);
 assert.equal(state.prefs.soundEffects,true);
 assert.equal(attrs.get('aria-checked'),'true');
 f.commitLiquidSwitch(button,true); // repeated same value is idempotent
 assert.equal(stored,3);
 assert.equal(rendered,0);
 f.liquidSwitchDown(ev(10,20));
 f.liquidSwitchMove(ev(13,95));
 assert.equal(classList.contains('is-pressed'),false,'vertical scroll cancels stretched thumb');
 f.liquidSwitchFinish(ev(13,95));
 assert.equal(stored,3,'vertical scroll cannot toggle the switch');
});
test('iOS-style switches have dedicated thumb physics and respect motion settings',()=>{
 assert.match(css,/\.switch\[role="switch"\]\.is-pressed\{/);
 assert.match(css,/--switch-thumb-width:30px/);
 assert.match(css,/\.switch\[role="switch"\]\.is-dragging::after/);
 assert.match(css,/transform:translate3d\(var\(--switch-thumb-x\),0,0\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(app,/if\(target\.closest\('\.switch\[role="switch"\]'\)\)return;/);
 assert.match(app,/case'toggleSound':commitLiquidSwitch\(target/);
 assert.match(app,/case'toggleHaptics':commitLiquidSwitch\(target/);
});
test('finger-up transform is committed before the click, never briefly returning to the old tab',()=>{
 const h=harness('schedule');
 h.selectors.liquidPointerDown(h.event(0,40,20));
 h.selectors.liquidPointerMove(h.event(0,205,21));
 h.runFrame();
 h.selectors.liquidPointerFinish(h.event(0,243,21));
 assert.equal(h.group.clicked,2);
 assert.equal(h.group.transformOnClick,'translate3d(193px,0px,0)');
 const css=fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');
 assert.match(app,/const changed=!!\(old&&\(old\.value!==liquidSelectorValue\(active\)\|\|old\.dragging\)/);
 assert.match(app,/void glass\.offsetWidth/);
 assert.match(css,/\.page\.page-stable\{animation:none!important/);
});
