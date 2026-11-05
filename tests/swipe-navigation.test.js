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
   'cancelAnimationFrame','closeModal','render','loadMonth','loadSundayWeek','armLiquidSound','playLiquidTick',
   'let liquidGestureSnap=false;\n'+app.slice(start,end)+
   'return {bottomSwipeDown,bottomSwipeMove,bottomSwipeFinish,bottomSwipeClickCapture,navigateBottomModule};')(
    state,win,document,cb=>{raf++;frame=cb;return raf;},()=>{frame=null},
    ()=>{closed++},()=>{renders++;transformOnRender=glass.style.transform;},()=>{scheduleLoads++},()=>{scheduleLoads++},
    ()=>{armed++},()=>{tones++}
   );
 const event=(x,y,id=7)=>({pointerId:id,isPrimary:true,button:0,clientX:x,clientY:y,
  cancelable:true,preventDefault(){this.prevented=true;},
  target:{closest:sel=>sel==='.bottom-nav'?nav:null}});
 return {state,glass,classes,nav,navClasses,navVars,tabClasses,tabs,event,output,
  frame:()=>{const next=frame;frame=null;next?.();},
  counts:()=>({renders,closed,scheduleLoads,captured,tones,armed,transformOnRender})};
}
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
test('vertical scrolling is never converted to bottom tab swipe',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(45,25));
 h.output.bottomSwipeMove(h.event(48,90));
 h.output.bottomSwipeFinish(h.event(49,125));
 assert.equal(h.state.view,'today');
 assert.equal(h.counts().renders,0);
});
test('tap without dragging delegates to existing click handler',()=>{
 const h=harness();
 h.output.bottomSwipeDown(h.event(46,20));
 h.output.bottomSwipeFinish(h.event(46,20));
 assert.equal(h.state.view,'today');
 assert.equal(h.counts().renders,0);
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
