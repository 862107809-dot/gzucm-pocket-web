'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');
const start=app.indexOf('let wholeSurfacePress=null;');
const end=app.indexOf('function handleClick(event){',start);
assert.ok(start>=0&&end>start,'full-surface tactile handlers must exist');
function harness(){
 const timers=new Map();
 let now=0;
 const f=new Function('setTimeout','clearTimeout',
  app.slice(start,end)+
  'return {wholeSurfacePressDown,wholeSurfacePressMove,wholeSurfacePressEnd,restoreSurfaceBounce};')(
  fn=>{const id=++now;timers.set(id,fn);return id;},
  id=>timers.delete(id));
 const makeSurface=(kind='button',options={})=>{
  const classes=new Set();
  const surface={
   classList:{
    add:(...c)=>c.forEach(x=>classes.add(x)),
    remove:(...c)=>c.forEach(x=>classes.delete(x)),
    contains:x=>classes.has(x)
   },
   closest:sel=>{
    if(sel==='#app')return options.outside?null:{};
    if(sel.includes('modal-root')||sel.includes('popover-root'))return options.popup?{}:null;
    if(sel==='.bottom-nav')return options.dock?{}:null;
    if(sel.includes('input,textarea,select'))return options.input?{}:null;
    return null;
   },
   matches:sel=>sel==='.card'&&kind==='card'||sel.includes(':disabled')&&!!options.disabled
  };
  const target={
   closest:sel=>{
    if(sel.includes('modal-root')||sel.includes('popover-root'))return options.popup?{}:null;
    if(sel.includes('input,textarea,select'))return options.input?{}:null;
    if(sel==='.card')return kind==='card'?surface:null;
    if(sel.includes('button,a[href]'))return kind==='card'?null:surface;
    return null;
   }
  };
  return {target,surface,classes};
 };
 const event=(target,x=40,y=30,id=1)=>({target,pointerId:id,clientX:x,clientY:y,isPrimary:true,button:0});
 const flush=()=>{for(const [id,fn] of [...timers]){timers.delete(id);fn();}};
 return {f,makeSurface,event,flush};
}
test('a control visibly enlarges on pointerdown without any pointer movement',()=>{
 const h=harness(),b=h.makeSurface();
 h.f.wholeSurfacePressDown(h.event(b.target));
 assert.equal(b.classes.has('pocket-full-press'),true);
 assert.match(css,/@keyframes pocketFullSurfacePress\{\s*0%\{scale:1\.065;\}/);
 assert.match(css,/@keyframes pocketCardSurfacePress\{\s*0%\{scale:1\.012;\}/);
});
test('full interactive button surface rises and springs back on release',()=>{
 const h=harness(),b=h.makeSurface();
 h.f.wholeSurfacePressDown(h.event(b.target));
 assert.equal(b.classes.has('pocket-full-press'),true);
 h.f.wholeSurfacePressEnd(h.event(b.target));
 assert.equal(b.classes.has('pocket-full-press'),false);
 assert.equal(b.classes.has('pocket-full-release'),true);
 h.flush();
 assert.equal(b.classes.has('pocket-full-release'),false);
});
test('full card surface lifts slightly but remains a static card',()=>{
 const h=harness(),c=h.makeSurface('card');
 h.f.wholeSurfacePressDown(h.event(c.target));
 assert.equal(c.classes.has('pocket-full-card'),true);
 h.f.wholeSurfacePressEnd(h.event(c.target));
 h.flush();
 assert.equal(c.classes.has('pocket-full-card'),false);
});
test('dialogs, popovers, Dock and disabled controls are excluded',()=>{
 for(const exclude of [{popup:true},{dock:true},{disabled:true},{outside:true},{input:true}]){
  const h=harness(),b=h.makeSurface('button',exclude);
  h.f.wholeSurfacePressDown(h.event(b.target));
  assert.equal(b.classes.has('pocket-full-press'),false,JSON.stringify(exclude));
 }
});
test('moving finger to scroll cancels press before browser scroll begins',()=>{
 const h=harness(),b=h.makeSurface();
 h.f.wholeSurfacePressDown(h.event(b.target));
 h.f.wholeSurfacePressMove(h.event(b.target,40,54));
 assert.equal(b.classes.has('pocket-full-press'),false);
 assert.equal(b.classes.has('pocket-full-release'),false,'scrolling must not trigger a delayed rebound');
 h.flush();
});
test('press only follows the primary pointer',()=>{
 const h=harness(),b=h.makeSurface();
 h.f.wholeSurfacePressDown({...h.event(b.target),button:2});
 assert.equal(b.classes.has('pocket-full-press'),false);
 h.f.wholeSurfacePressDown({...h.event(b.target),isPrimary:false});
 assert.equal(b.classes.has('pocket-full-press'),false);
});
test('styles animate whole-element scale, honor reduce motion, and avoid popup roots',()=>{
 assert.match(css,/#app \.pocket-full-press\{/);
 assert.match(css,/@keyframes pocketFullSurfacePress/);
 assert.match(css,/@keyframes pocketCardSurfacePress/);
 assert.match(css,/@keyframes pocketFullSurfaceRelease/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(app,/const WHOLE_SURFACE_POPUP=/);
 assert.match(css,/\.bottom-nav\.is-dock-pressed\{/);
 assert.match(css,/\.bottom-nav\.is-dock-dragging\{/);
 assert.match(css,/@keyframes pocketDockSettle/);
});

test('cancelled pointer immediately resets and never animates a delayed spring',()=>{
 const h=harness(),b=h.makeSurface();
 h.f.wholeSurfacePressDown(h.event(b.target));
 h.f.wholeSurfacePressEnd(h.event(b.target),true);
 assert.equal(b.classes.has('pocket-full-press'),false);
 assert.equal(b.classes.has('pocket-full-release'),false);
});

test('weekday tap rebound is transferred to the recreated button after render',()=>{
 const h=harness(),old=h.makeSurface();
 old.surface.dataset={day:'4'};
 h.f.wholeSurfacePressDown(h.event(old.target));
 h.f.wholeSurfacePressEnd(h.event(old.target));
 const classes=new Set();
 const newButton={
  dataset:{day:'4'},
  classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},
  closest:()=>null
 };
 const otherButton={
  dataset:{day:'3'},
  classList:{add:()=>{throw Error('wrong day rebounded');},remove:()=>{}},
  closest:()=>null
 };
 h.f.restoreSurfaceBounce({querySelectorAll:()=>[otherButton,newButton]});
 assert.equal(classes.has('pocket-full-release'),true);
 h.flush();
 assert.equal(classes.has('pocket-full-release'),false);
});
