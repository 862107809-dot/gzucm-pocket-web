/* Adaptive animation pacing for GZUCM Pocket.
 * Browsers own vsync: requestAnimationFrame and compositor animations can
 * follow a 90/120Hz display when available, but a website cannot raise the
 * actual screen refresh rate. Short, visible rAF sampling selects a rendering
 * budget without forcing an artificial 60fps timer or perpetual polling. */
(function(global){
 'use strict';
 const doc=global.document,root=doc?.documentElement;
 if(!root)return;
 const raf=global.requestAnimationFrame?.bind(global);
 const caf=global.cancelAnimationFrame?.bind(global);
 let frame=0,epoch=0,rate='standard',hz=60,count=0;
 function apply(mode,estimate,samples){
  rate=mode;hz=estimate;count=samples;
  root.setAttribute('data-motion-rate',mode);
 }
 function decide(intervals){
  if(intervals.length<12)return {rate:'standard',hz:60};
  const sorted=intervals.slice().sort((a,b)=>a-b);
  const median=sorted[Math.floor(sorted.length/2)];
  const p80=sorted[Math.floor(sorted.length*.8)];
  const stable=sorted.filter(v=>v>0&&v<median*1.75).length/intervals.length;
  const estimate=Math.max(15,Math.min(240,Math.round(1000/median)));
  if(median<=11.8&&p80<=16.5&&stable>=.85)return {rate:'high',hz:estimate};
  if(median<=21&&p80<=33&&stable>=.70)return {rate:'standard',hz:estimate};
  return {rate:'economy',hz:estimate};
 }
 function refresh(){
  ++epoch;
  if(frame&&caf)caf(frame);
  frame=0;
  if(doc.visibilityState==='hidden')return;
  if(global.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||
     global.navigator?.connection?.saveData){
   apply('economy',0,0);
   return;
  }
  if(!raf){apply('standard',60,0);return;}
  const id=epoch,intervals=[];
  let previous=null,attempts=0;
  const sample=now=>{
   if(id!==epoch||doc.visibilityState==='hidden')return;
   frame=0;
   attempts++;
   if(previous!==null){
    const delta=now-previous;
    if(delta>1&&delta<90)intervals.push(delta);
   }
   previous=now;
   if(intervals.length>=30||attempts>=46){
    const result=decide(intervals);
    apply(result.rate,result.hz,intervals.length);
    return;
   }
   frame=raf(sample);
  };
  frame=raf(sample);
 }
 const monitor={refresh,status:()=>({rate,estimatedHz:hz,samples:count})};
 global.GZUCM_MOTION=monitor;
 doc.addEventListener?.('visibilitychange',()=>{if(doc.visibilityState!=='hidden')refresh();});
 // The first post-load frames may be uneven; sample once after the app paints.
 if(doc.readyState==='loading')doc.addEventListener?.('DOMContentLoaded',refresh,{once:true});
 else refresh();
})(window);
