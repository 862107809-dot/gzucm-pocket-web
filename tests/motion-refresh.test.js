'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'..','motion-refresh.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');
function simulate(step,options={}){
 const attrs=new Map(),listeners={};
 let now=0,frames=[],nextId=0;
 const doc={
  readyState:'complete',visibilityState:'visible',
  documentElement:{setAttribute:(name,value)=>attrs.set(name,value)},
  addEventListener:(name,fn)=>{listeners[name]=fn;}
 };
 const win={
  document:doc,navigator:{connection:{saveData:!!options.saveData}},
  matchMedia:()=>({matches:!!options.reduced}),
  requestAnimationFrame:fn=>{frames.push({id:++nextId,fn});return nextId;},
  cancelAnimationFrame:id=>{frames=frames.filter(x=>x.id!==id);}
 };
 vm.runInNewContext(code,{window:win});
 let iterations=0;
 while(frames.length&&iterations++<60){
  const {fn}=frames.shift();
  now+=step;
  fn(now);
 }
 return {rate:win.GZUCM_MOTION.status().rate,
  hz:win.GZUCM_MOTION.status().estimatedHz,
  samples:win.GZUCM_MOTION.status().samples,attrs,listeners,win,doc,
  advance(ms){now+=ms;const {fn}=frames.shift()||{};fn?.(now);}};
}
test('native rAF measures actual high-refresh cadence without imposing a 60 fps cap',()=>{
 const result=simulate(1000/120);
 assert.equal(result.rate,'high');
 assert.ok(result.hz>=110&&result.hz<=130);
 assert.equal(result.attrs.get('data-motion-rate'),'high');
 assert.ok(result.samples>=30);
 assert.doesNotMatch(code,/setInterval\s*\(|setTimeout\s*\(/);
});
test('60 Hz refresh is recognized as standard automatically',()=>{
 const result=simulate(1000/60);
 assert.equal(result.rate,'standard');
 assert.ok(result.hz>=55&&result.hz<=65);
});
test('device with fewer completed frames simplifies active optical work',()=>{
 const result=simulate(1000/35);
 assert.equal(result.rate,'economy');
 assert.equal(result.attrs.get('data-motion-rate'),'economy');
 const enhanced=css.slice(css.indexOf('/* UNIFIED V-SYNC GESTURES v2'));
 assert.match(enhanced,/data-motion-rate="economy"/);
 assert.match(enhanced,/filter:none!important/);
 assert.match(enhanced,/will-change:transform/);
});
test('reduced-motion or data-saver does not waste frames on sampling',()=>{
 for(const opts of [{reduced:true},{saveData:true}]){
  const result=simulate(1000/120,opts);
  assert.equal(result.rate,'economy');
  assert.equal(result.samples,0);
 }
});
test('hidden tabs postpone sampling until visible again',()=>{
 const r=simulate(1000/60);
 assert.equal(typeof r.listeners.visibilitychange,'function');
 r.doc.visibilityState='hidden';
 r.listeners.visibilitychange();
 assert.equal(r.rate,'standard');
 r.doc.visibilityState='visible';
 r.listeners.visibilitychange();
 assert.equal(r.win.GZUCM_MOTION.status().rate,'standard');
});
