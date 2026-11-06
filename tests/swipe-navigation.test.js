'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');
const start=app.indexOf('function navigateBottomModule(view){');
const end=app.indexOf('function handleClick(event){',start);
assert.ok(start>=0&&end>start,'swipe interaction helper functions must be present');
function harness(){
 let renders=0,closed=0,scheduleLoads=0,raf=0,frame=null,tones=0,armed=0,transformOnRender=null;
 const state={view:'today',scheduleMode:'week'};
 const left=[0,100,200,300,400];
 const names=['today','schedule','grades','power','settings'];
 const tabs=left.map((x,i)=>({
  offsetLeft:x,offsetWidth:100,dataset:{view:names[i]},
  classList:{toggle:()=>{},remove:()=>{}},
  getBoundingClientRect:()=>({left:x,width:100})
 }));
 const classes=new Set();
 const navClasses=new Set(),navVars={};
 const tabClasses=left.map(()=>new Set());
 tabs.forEach((tab,i)=>{
  tab.classList={
   add:(...names)=>names.forEach(x=>tabClasses[i].add(x)),
   remove:(...names)=>names.forEach(x=>tabClasses[i].delete(x)),
   toggle:(name,on)=>on?tabClasses[i].add(name):tabClasses[i].delete(name)
  };
 });
 const glass={
  classList:{add:(...x)=>x.forEach(c=>classes.add(c)),remove:(...x)=>x.forEach(c=>classes.delete(c))},
  style:{setProperty(name,value){this[name]=value;}},isConnected:true
 };
 let captured=null;
 const nav={
  classList:{
   add:(...names)=>names.forEach(name=>navClasses.add(name)),
   toggle:(name,on)=>on?navClasses.add(name):navClasses.delete(name),
   remove:(...names)=>names.forEach(name=>navClasses.delete(name))
  },
  style:{setProperty(name,value){navVars[name]=value;}},
  getClientRects:()=>[{}],
  getBoundingClientRect:()=>({left:0,width:500}),
  setPointerCapture:id=>{captured=id;},
  hasPointerCapture:id=>captured===id,
  releasePointerCapture:id=>{if(captured===id)captured=null;},
  querySelector:sel=>sel==='.bottom-liquid-indicator'?glass:sel==='.bottom-item.active'?tabs[0]:null,
  querySelectorAll:()=>tabs
 };
 const document={};
 const win={matchMedia:()=>({matches:false}),scrollTo:()=>{}};
 const output=new Function('state','window','document','requestAnimationFrame',
   'cancelAnimationFrame','closeModal','render','loadMonth','loadSundayWeek','armLiquidSound','playLiquidTick','confirmGlassSelection',
   'let liquidGestureSnap=false;let dockRemountPulse=false;let dockRemountDrop=false;let pendingBottomSwipeGeometry=null;\n'+app.slice(start,end)+
   'return {bottomSwipeDown,bottomSwipeMove,bottomSwipeFinish,bottomSwipeClickCapture,navigateBottomModule,getDockFlags:()=>({pulse:dockRemountPulse,drop:dockRemountDrop}),getLanding:()=>pendingBottomSwipeGeometry};')(
    state,win,document,cb=>{raf++;frame=cb;return raf;},()=>{frame=null},
    ()=>{closed++},()=>{renders++;transformOnRender=glass.style.transform;},()=>{scheduleLoads++},()=>{scheduleLoads++},
    ()=>{armed++},()=>{tones++},lens=>lens?.classList?.add('is-confirmed')
   );
 const event=(x,y,id=7)=>({pointerId:id,isPrimary:true,button:0,clientX:x,clientY:y,
  cancelable:true,preventDefault(){this.prevented=true;},
  target:{closest:sel=>sel==='.bottom-nav'?nav:null}});
 return {state,glass,classes,nav,navClasses,navVars,tabClasses,tabs,event,output,
  frame:()=>{const next=frame;frame=null;next?.();},
  counts:()=>({renders,closed,scheduleLoads,captured,tones,armed,transformOnRender})};
}
test('mobile Dock occupies its own bottom row instead of covering scrolled cards',()=>{
 const section=css.slice(css.indexOf('/* NON-OVERLAPPING MOBILE DOCK v1'));
 assert.ok(section.length>1100,'dedicated Dock layout must be present');
 assert.match(section,/@media\(max-width:900px\)/);
 assert.match(section,/#app\.app-shell\{\s*display:flex;\s*flex-direction:column;/);
 assert.match(section,/height:100dvh/);
 assert.match(section,/padding-bottom:calc\(12px \+ env\(safe-area-inset-bottom,0px\)\)/);
 assert.match(section,/#app\.app-shell > \.content-area\{\s*flex:1 1 auto;\s*min-height:0;/);
 assert.match(section,/overflow-y:auto/);
 assert.match(section,/#app\.app-shell > \.bottom-nav\{\s*position:relative!important;/);
 assert.match(section,/flex:0 0 72px/);
 assert.match(section,/bottom:auto!important/);
 assert.match(section,/margin:15px auto 0!important/);
 assert.match(section,/align-self:center/);
 // The fixed-position style remains available on older desktop/alternative
 // layouts, but is explicitly overridden at the mobile breakpoint.
 assert.match(css,/@media\(max-width:900px\)[^\n]*\{\.app-shell\{display:block/);
 assert.match(css,/@media\(min-width:901px\)/);
});

test('content scroll isolation keeps sticky header and Dock gesture hit targets separate',()=>{
 const section=css.slice(css.indexOf('/* NON-OVERLAPPING MOBILE DOCK v1'));
 assert.match(section,/overscroll-behavior-y:contain/);
 assert.match(section,/-webkit-overflow-scrolling:touch/);
 assert.match(section,/scrollbar-width:none/);
 assert.match(section,/padding-bottom:14px/);
 assert.match(section,/overflow:visible/);
 assert.match(app,/root\.innerHTML=\`\$\{sidebar\(\)\}<main class="content-area">/);
 assert.match(app,/\$\{bottomNav\(\)\}\`;/);
 assert.match(app,/\.bottom-nav/);
});
test('compact navigation adapts to iPad portrait, landscape, Mac and desktop widths',()=>{
 const responsive=css.slice(css.indexOf('/* CROSS-DEVICE COMPACT NAVIGATION v1'));
 assert.ok(responsive.length>1200,'responsive navigation rules must exist');
 assert.match(responsive,/@media \(min-width:601px\) and \(max-width:900px\)/);
 assert.match(responsive,/width:min\(calc\(100% - 64px\),540px\)/);
 assert.match(responsive,/max-width:calc\(100% - 64px\)/);
 assert.match(responsive,/inset:-10px -13px/);
 assert.match(responsive,/@media \(min-width:901px\)/);
 assert.match(responsive,/grid-template-columns:244px minmax\(0,1fr\)/);
 assert.match(responsive,/\.sidebar \.liquid-selector > \.liquid-choice-highlight\{[\s\S]*?scale:1\.04 1\.05/);
 assert.match(responsive,/@media \(min-width:901px\) and \(max-width:1180px\)/);
 assert.match(responsive,/grid-template-columns:212px minmax\(0,1fr\)/);
 assert.match(responsive,/@media \(prefers-reduced-motion:reduce\)/);
 assert.match(app,/class="sidebar-nav-main"/);
 assert.match(app,/class="bottom-nav\$\{settle/);
});

test('Dock stays within its border at rest, expands only while dragged, then contracts after landing',()=>{
 const section=css.slice(css.indexOf('/* CONFIRM-ONLY DOCK OVERHANG v2'));
 assert.ok(section.length>1500);
 assert.match(section,/#app \.bottom-nav \.bottom-liquid-indicator \.bottom-liquid-surface\{\s*inset:0;/);
 assert.match(section,/#app \.bottom-nav\.is-dock-dragging \.bottom-liquid-indicator \.bottom-liquid-surface,/);
 assert.match(section,/\.bottom-liquid-indicator\.is-dragging \.bottom-liquid-surface\{\s*inset:-10px -13px;/);
 assert.match(section,/#app \.bottom-nav\.is-dock-pressed \.bottom-liquid-indicator\{\s*scale:1!important;/);
 assert.match(section,/@keyframes pocketDockGlassReturn\{\s*0%\{inset:-10px -13px;\}\s*100%\{inset:0;\}/);
 assert.match(section,/\.bottom-nav\.is-dock-releasing,[\s\S]*?animation:pocketDockClickConfirm/);
 assert.match(app,/if\(shouldConfirm\)confirmGlassSelection\(glass\)/);
 assert.match(app,/pocketDockSoftDrop'\].includes\(event.animationName\)/);
});

test('same-tab swipe confirms with a shadow without navigation or stale glass state',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(46,20));
 h.output.bottomSwipeMove(h.event(84,20));
 h.frame();
 h.output.bottomSwipeFinish(h.event(46,20));
 assert.equal(h.state.view,'today');
 assert.equal(h.counts().renders,0);
 assert.ok(h.classes.has('is-confirmed'));
 assert.equal(h.navClasses.has('is-dock-dropping'),false,'swipe release cannot trigger a container spring');
});
test('Dock base and its selected button grow together; swipe geometry compensates visual scale',()=>{
 const section=css.slice(css.indexOf('/* GENTLE BUTTON AND RAIL SPRINGS v1'));
 assert.match(section,/#app \.bottom-nav\.is-dock-pressed\{scale:1\.018!important;/);
 assert.match(section,/#app \.bottom-nav\.is-dock-dragging\{scale:1\.027!important;/);
 assert.match(section,/\.bottom-item:not\(\.is-scrubbed\)\.is-pressed\{\s*scale:1\.045!important;/);
 assert.match(section,/\.bottom-item\.is-scrubbed\{\s*scale:1\.065!important;/);
 assert.match(section,/@keyframes pocketDockSoftSpring/);
 assert.match(section,/@keyframes pocketDockSoftDrop/);
 assert.match(app,/function bottomSwipeLocalX\(sw,x\)/);
 assert.match(app,/bottomSwipeLocalX\(sw,event\.clientX\)/);
 const h=harness();
 h.output.bottomSwipeDown(h.event(46,20));
 assert.ok(h.navClasses.has('is-dock-pressed'));
 h.output.bottomSwipeMove(h.event(258,20));
 assert.ok(h.navClasses.has('is-dock-dragging'));
 h.frame();
 h.output.bottomSwipeFinish(h.event(258,20));
 assert.deepEqual(h.output.getDockFlags(),{pulse:false,drop:false});
});

test('narrow Dock keeps centered safe margins while the active lens slightly crosses its rim',()=>{
 const section=css.slice(css.indexOf('/* COMPACT DOCK WITH CONTROLLED PILL OVERHANG'));
 assert.ok(section.length>0,'compact mobile Dock rules should exist');
 assert.match(section,/width:min\(calc\(100% - 42px\),560px\)/);
 assert.match(section,/margin-inline:auto!important/);
 assert.match(section,/inset:-10px -13px/);
 assert.match(section,/\.bottom-nav \.bottom-item\{min-width:0;flex:1 1 0;\}/);
 // Hit positions and drag geometry remain unchanged: only the optical face
 // expands so a rightmost pill does not throw content out of the viewport.
 assert.match(app,/const targetX=current\.offsetLeft\+inset/);
 assert.match(app,/const targetW=Math\.max\(12,current\.offsetWidth-inset\*2\)/);
 assert.match(app,/sw\.glass\.style\.transform='translate3d\('/);
});

test('fast pointer-up without an intermediate move still classifies an intentional swipe',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(46,20));
 h.output.bottomSwipeFinish(h.event(265,20));
 assert.equal(h.state.view,'grades','release position must decide the intended tab');
 assert.equal(h.counts().renders,1);
 assert.equal(h.navClasses.has('is-dock-releasing'),false);
 assert.equal(h.navClasses.has('is-dock-dropping'),false);
 assert.match(app,/before deciding tap versus horizontal scrub/);
});

test('fast vertical pointer-up without a move never changes Dock tab',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(46,20));
 h.output.bottomSwipeFinish(h.event(52,110));
 assert.equal(h.state.view,'today');
 assert.equal(h.counts().renders,0);
 assert.equal(h.navClasses.has('is-dock-releasing'),false);
});

test('native compositor interpolates Dock glide across high-refresh screens without 40-step sampling',()=>{
 const code=app.slice(app.indexOf('function liquidDropFrames('),app.indexOf('function alignBottomLiquid('));
 assert.match(code,/easing:'cubic-bezier\(\.20,\.82,\.30,1\)'/);
 assert.match(code,/offset:0/);
 assert.match(code,/offset:1/);
 assert.doesNotMatch(code,/count=40|for\(let i=0/);
});

test('small finger wobble stays a tap while clear horizontal movement becomes drag',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(46,20));
 h.output.bottomSwipeMove(h.event(53,23));
 assert.equal(h.navClasses.has('is-dock-dragging'),false,'7px is not a swipe');
 h.output.bottomSwipeMove(h.event(65,23));
 assert.equal(h.navClasses.has('is-dock-dragging'),true,'19px is an intentional swipe');
 h.frame();
 h.output.bottomSwipeFinish(h.event(65,23));
 assert.equal(h.state.view,'today');
 assert.equal(h.counts().renders,0);
 assert.equal(h.navClasses.has('is-dock-dropping'),false);
});
test('diagonal or vertical movements never accidentally switch Dock modules',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(46,20));
 h.output.bottomSwipeMove(h.event(61,37));
 assert.equal(h.navClasses.has('is-dock-dragging'),false);
 h.output.bottomSwipeMove(h.event(66,65));
 assert.equal(h.navClasses.has('is-dock-dragging'),false);
 h.output.bottomSwipeFinish(h.event(66,65));
 assert.equal(h.state.view,'today');
 assert.equal(h.counts().renders,0);
});
test('Dock measures once before press and does not read DOM geometry in each frame',()=>{
 const h=harness();
 h.nav.offsetWidth=500;
 const getRect=h.nav.getBoundingClientRect;
 let reads=0;
 h.nav.getBoundingClientRect=()=>{reads++;return getRect();};
 h.output.bottomSwipeDown(h.event(46,20));
 const initially=reads;
 h.output.bottomSwipeMove(h.event(255,20));h.frame();
 h.output.bottomSwipeMove(h.event(310,20));h.frame();
 assert.equal(reads,initially,'live geometry reads inside a swipe cause layout thrash');
 const x=parseFloat(h.glass.style.transform.match(/translate3d\(([-\d.]+)px/)[1]);
 const expected=250+(310-250)/1.027-47;
 assert.ok(Math.abs(x-expected)<.1,'glass stays under the finger after base magnification');
 h.output.bottomSwipeFinish(h.event(310,20));
});

test('finger drag follows the pointer and selects nearest bottom module on release',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(46,20));
 h.output.bottomSwipeMove(h.event(258,23));
 h.frame();
 assert.ok(h.classes.has('is-dragging'));
 assert.ok(h.classes.has('is-instant'));
 assert.equal(h.glass.style.transform,'translate3d(211px,0,0)');
 h.output.bottomSwipeFinish(h.event(258,23));
 assert.equal(h.state.view,'grades');
 assert.equal(h.counts().renders,1);
 assert.ok(h.counts().armed>=1);
 assert.equal(h.counts().tones,1);
 assert.equal(h.counts().closed,1);
 assert.equal(h.counts().captured,null);
});
test('finger-up anchor is stored unscaled so a re-render cannot snap the lens backwards',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(46,20));
 h.output.bottomSwipeMove(h.event(236,21));
 h.frame();
 h.output.bottomSwipeFinish(h.event(355,21));
 assert.deepEqual(h.output.getLanding(),{x:308,width:94});
 assert.equal(h.counts().transformOnRender,'translate3d(308px,0,0)');
 assert.match(app,/const swipeAnchor=fromSwipe\?pendingBottomSwipeGeometry:null/);
 assert.match(app,/previousGeometry\?\.x!==undefined/);
});

test('vertical scrolling is never converted to bottom tab swipe',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(45,25));
 h.output.bottomSwipeMove(h.event(48,90));
 h.output.bottomSwipeFinish(h.event(49,125));
 assert.equal(h.state.view,'today');
 assert.equal(h.counts().renders,0);
});
test('tap without dragging gently springs the entire Dock while preserving optical confirmation',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(46,20));
 assert.ok(h.navClasses.has('is-dock-pressed'),'touch-down still tracks gesture');
 assert.equal(h.navClasses.has('is-dock-dragging'),false);
 h.output.bottomSwipeFinish(h.event(46,20));
 assert.equal(h.state.view,'today');
 assert.equal(h.counts().renders,0);
 assert.equal(h.navClasses.has('is-dock-releasing'),true,'simple tap gives the Dock a gentle spring');
 assert.ok(h.classes.has('is-confirmed'),'tap keeps a non-bouncing shadow cue');
 assert.match(css.slice(css.indexOf('/* GENTLE BUTTON AND RAIL SPRINGS v1')),/\.bottom-nav\.is-dock-releasing,/);
});
test('ordinary Dock click switches view without a rail spring, while drag still requests a landing',()=>{
 const h=harness();
 h.output.navigateBottomModule('grades');
 assert.equal(h.state.view,'grades');
 assert.equal(h.counts().renders,1);
 assert.deepEqual(h.output.getDockFlags(),{pulse:false,drop:false});
 assert.match(app,/const frames=liquidDropFrames\(startX,startW,targetX,targetW\)/);
 assert.doesNotMatch(app,/const frames=fromSwipe\?[\s\S]*?liquidSpringFrames/);
 assert.match(css.slice(css.indexOf('/* NO-BOUNCE CLICK FEEDBACK v1')),/\.bottom-liquid-indicator\.is-moving \.bottom-liquid-surface\{\s*animation:none!important;/);
});

test('Dock swipe releases directly without an extra bounce',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(46,20));
 h.output.bottomSwipeMove(h.event(85,20));
 h.frame();
 h.output.bottomSwipeFinish(h.event(46,20));
 assert.equal(h.navClasses.has('is-dock-dropping'),false);
 assert.equal(h.navClasses.has('is-dock-releasing'),false);
 assert.equal(h.classes.has('is-edge-rebound'),false);
 const motion=css.slice(css.indexOf('/* UNIFIED V-SYNC GESTURES v2'));
 assert.match(motion,/\.bottom-nav\.is-dock-dropping,/);
 assert.match(motion,/animation:none!important;/);
 assert.match(motion,/transition:scale var\(--pocket-gesture-release\)/);
});
test('swiping to another Dock module commits the lens without bouncing the whole Dock',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(46,20));
 h.output.bottomSwipeMove(h.event(265,20));
 h.frame();
 h.output.bottomSwipeFinish(h.event(265,20));
 assert.equal(h.state.view,'grades');
 assert.deepEqual(h.output.getDockFlags(),{pulse:false,drop:false});
 assert.match(app,/dockRemountDrop=false; \/\/ swipe changes the lens only/);
});
test('dragged Dock buttons never render their own borders or outlines',()=>{
 assert.match(css,/\.bottom-nav\.is-dock-dragging \.bottom-item::before/);
 assert.match(css,/content:none!important/);
 assert.match(css,/\.bottom-nav\.is-dock-dragging \.bottom-item\.is-scrubbed/);
});
test('swiping to an edge clamps glass and allows last tab selection',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(46,20));
 h.output.bottomSwipeMove(h.event(730,21));
 h.frame();
 assert.equal(h.glass.style.transform,'translate3d(403px,0,0)');
 h.output.bottomSwipeFinish(h.event(480,21));
 assert.equal(h.state.view,'settings');
});
test('touch-action pan-y, reduced motion and calendar gestures remain safe',()=>{
 assert.match(css,/touch-action:pan-y/);
 assert.match(css,/\.bottom-liquid-indicator\.is-dragging/);
 assert.match(css,/--motion-fluid:cubic-bezier/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(app,/document\.addEventListener\('pointerdown',bottomSwipeDown/);
 assert.match(app,/document\.addEventListener\('pointermove',bottomSwipeMove/);
 assert.match(app,/document\.addEventListener\('pointerup',event=>bottomSwipeFinish\(event\)/);
 assert.match(app,/calendar-visual,\.bottom-nav/);
 assert.match(app,/document\.addEventListener\('click',bottomSwipeClickCapture,true\)/);
});

test('release uses the final pointer coordinate, not the previous animation frame',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(46,20));
 h.output.bottomSwipeMove(h.event(235,22));
 h.frame();
 h.output.bottomSwipeFinish(h.event(355,22));
 assert.equal(h.state.view,'power');
 assert.equal(h.counts().transformOnRender,'translate3d(308px,0,0)');
});
test('dragging back to the already-selected tab does not repaint the entire page',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(46,20));
 h.output.bottomSwipeMove(h.event(80,21));
 h.frame();
 h.output.bottomSwipeFinish(h.event(45,21));
 assert.equal(h.state.view,'today');
 assert.equal(h.counts().renders,0);
 assert.equal(h.glass.style.transform,'translate3d(3px,0,0)');
});

test('entire bottom tab visibly lifts on pointer press, then releases',()=>{
 const h=harness();
 const press=h.event(46,20);
 press.target.closest=sel=>sel==='.bottom-nav'?h.nav:sel==='.bottom-item'?h.tabs[0]:null;
 h.output.bottomSwipeDown(press);
 assert.ok(h.tabClasses[0].has('is-pressed'));
 h.output.bottomSwipeFinish(press);
 assert.equal(h.tabClasses[0].has('is-pressed'),false);
 assert.equal(h.counts().renders,0);
});
test('overswiping left and right reveals light while glass remains clamped',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(46,20));
 h.output.bottomSwipeMove(h.event(-120,20));
 h.frame();
 assert.ok(h.navClasses.has('edge-left'));
 assert.equal(h.glass.style.transform,'translate3d(3px,0,0)');
 assert.ok(Number(h.navVars['--edge-energy'])>0);
 assert.ok(Number(h.glass.style['--edge-scale'])<1);
 h.output.bottomSwipeMove(h.event(730,21));
 h.frame();
 assert.equal(h.navClasses.has('edge-left'),false);
 assert.ok(h.navClasses.has('edge-right'));
 assert.equal(h.glass.style.transform,'translate3d(403px,0,0)');
 h.output.bottomSwipeFinish(h.event(480,21));
 assert.equal(h.navClasses.has('edge-right'),false);
 assert.equal(h.state.view,'settings');
});
test('App Store-style whole-tab visuals include spring and reduced-motion fallback',()=>{
 assert.match(css,/\.bottom-nav \.bottom-item\.is-pressed/);
 assert.match(css,/\.bottom-nav\.edge-left::before/);
 assert.match(css,/\.bottom-nav\.edge-right::after/);
 assert.match(css,/\.bottom-liquid-indicator\.is-edge-rebound/);
 assert.match(css,/@keyframes pocketTabLanding/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('the entire Dock rail grows on press and drag, then settles on release',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(46,20));
 assert.ok(h.navClasses.has('is-dock-pressed'));
 h.output.bottomSwipeMove(h.event(235,20));
 assert.ok(h.navClasses.has('is-dock-dragging'));
 h.frame();
 h.output.bottomSwipeFinish(h.event(235,20));
 assert.equal(h.navClasses.has('is-dock-pressed'),false);
 assert.equal(h.navClasses.has('is-dock-dragging'),false);
 assert.match(css,/\.bottom-nav\.is-dock-pressed\{/);
 assert.match(css,/\.bottom-nav\.is-dock-dragging\{/);
 assert.match(css,/@keyframes pocketDockSettle/);
});
test('vertical scrolling cancels the Dock rail enlargement immediately',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(46,20));
 h.output.bottomSwipeMove(h.event(50,110));
 assert.equal(h.navClasses.has('is-dock-pressed'),false);
 assert.equal(h.navClasses.has('is-dock-dragging'),false);
});
