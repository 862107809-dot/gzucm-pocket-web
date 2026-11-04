/*
 * Progressive enhancement for Safari/Chromium Liquid Glass.
 *
 * Optical engine: Deepika Rao, MIT (vendor/liquid-glass.js).
 * - Native WebKit CSS backdrop-filter is the default, always usable in Safari.
 * - Chromium SVG refraction only on a small number of navigation surfaces.
 * - No third-party network requests, no background capture of student records.
 * - Never modifies text, student data, login flows or event handlers.
 */
(function(global){
 'use strict';
 const active=new Map();
 const limited='.topbar,.bottom-nav,.modal-card,.segmented';
 const maxArea=420000;
 const maxWidth=800;
 const maxCount=4;
 let raf=0;

 function allowed(){
   if(typeof document==='undefined'||typeof matchMedia!=='function')return false;
   const coarse=matchMedia('(pointer: coarse)').matches;
   const lessTransparency=matchMedia('(prefers-reduced-transparency: reduce)').matches;
   const moreContrast=matchMedia('(prefers-contrast: more)').matches;
   return !lessTransparency&&!moreContrast&&!coarse;
 }

 function refresh(){
  if(typeof document==='undefined')return;
  for(const [el,instance] of active){
   if(!el.isConnected){try{instance.destroy();}catch{}active.delete(el);}
  }
  if(!allowed()||typeof global.liquidGlass!=='function')return;
  let count=active.size;
  for(const el of document.querySelectorAll(limited)){
   if(count>=maxCount)break;
   if(active.has(el))continue;
   const r=el.getBoundingClientRect();
   if(!r.width||!r.height||r.width>maxWidth||r.width*r.height>maxArea)continue;
   // Prefer the real native browser compositing path for all Safari users.
   // Library does Chromium refraction, Safari retains CSS gradient/frost.
   try{
    const opts=el.matches('.segmented')
      ?{scale:-36,chroma:2,border:.12,mapBlur:5,blur:7,saturate:1.3,fallbackBlur:18}
      :{scale:-54,chroma:3,border:.08,mapBlur:9,blur:10,saturate:1.5,fallbackBlur:20};
    const instance=global.liquidGlass(el,opts);
    if(instance?.supported){active.set(el,instance);count++;}
    else if(instance)instance.destroy();
   }catch{
    // Safari hardware/Chromium filter errors always leave the CSS fallback.
   }
  }
 }

 function schedule(){
  if(typeof requestAnimationFrame!=='function'){refresh();return;}
  if(raf)return;
  raf=requestAnimationFrame(()=>{raf=0;refresh();});
 }

 // Specular highlight stays on the outer CSS layer, no per-frame SVG redraw.
 function light(event){
  const target=event.target?.closest?.('.topbar,.bottom-nav,.language-switch,.segmented');
  if(!target)return;
  const r=target.getBoundingClientRect();
  if(!r.width||!r.height)return;
  target.style.setProperty('--glass-x',Math.round((event.clientX-r.x)/r.width*100)+'%');
  target.style.setProperty('--glass-y',Math.round((event.clientY-r.y)/r.height*100)+'%');
 }

 function setup(){
  schedule();
  if(typeof document==='undefined')return;
  const motion=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!motion)document.addEventListener('pointermove',light,{passive:true});
  // Observe only container-level changes to avoid work on every translated text.
  for(const id of ['app','modal-root']){
   const root=document.getElementById(id);
   if(root&&typeof MutationObserver!=='undefined')
    new MutationObserver(schedule).observe(root,{childList:true});
  }
 }
 global.GZUCM_GLASS={refresh:schedule,selector:limited};
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
 }
})(typeof window!=='undefined'?window:{});
