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
   click(){clicks++;group.clicked=i;},
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
  'snapshotLiquidSelectors,liquidSelectorId,guardLiquidSelectorClick};')(
   doc,window,()=>armed++,()=>sounds++,cb=>{frame=cb;return 1},()=>{frame=null});
 if(!menu)selectors.enhanceLiquidSelectors({querySelectorAll:()=>[group]});
 const event=(i,x,y)=>({
  pointerId:1,button:0,isPrimary:true,clientX:x,clientY:y,cancelable:true,
  target:group.buttons[i],preventDefault(){this.prevented=true;}
 });
 return {group,selectors,event,runFrame:()=>{const cb=frame;frame=null;cb?.();},
  stats:()=>({sounds,armed,clicks})};
}
test('all horizontal segmented choices drag to the nearest item with glass and sound',()=>{
 for(const kind of ['schedule','days','grade']){
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
