/*
 * GZUCM Pocket progressive optical glass renderer.
 * CSS owns real backdrop blur and foreground readability. SVG draws an optical
 * rim/mask. WebGL adds a lightweight, transparent edge/light shader.
 *
 * IMPORTANT: WebGL does NOT sample or capture student data/the DOM behind
 * glass. True background refraction requires an authorized background texture;
 * CSS backdrop-filter provides the actual underlying scene blur instead.
 *
 * Three automatic modes: webgl -> svg -> frosted CSS, with graceful recovery.
 */
(function(global){
 'use strict';
 const NS='http://www.w3.org/2000/svg';
 const MAX_GL=2;
 const MAX_PIXELS=360000;
 const MAX_DPR=1.5;
 const candidates='.bottom-nav,.schedule-view-switch,.segmented,.topbar,.sidebar';
 const live=new Map();
 let engine='frosted',backdrop=false,brokenGL=false,webglAvailable=null,raf=0,started=false;
 let nextId=0;

 function media(query){
  try{return !!global.matchMedia?.(query)?.matches;}catch{return false;}
 }
 function cssBackdrop(){
  try{
   return !!(global.CSS?.supports?.('backdrop-filter','blur(2px)')||
       global.CSS?.supports?.('-webkit-backdrop-filter','blur(2px)'));
  }catch{return false;}
 }
 function svgSupported(){
  try{
   const el=document.createElementNS(NS,'svg');
   return !!el?.createSVGRect||typeof global.SVGElement!=='undefined';
  }catch{return false;}
 }
 function getGL(canvas){
  try{
   return canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,
    stencil:false,premultipliedAlpha:true,powerPreference:'low-power',
    preserveDrawingBuffer:false});
  }catch{return null;}
 }
 function webglSupported(){
  try{
   const canvas=document.createElement('canvas'),gl=getGL(canvas);
   if(!gl||!gl.createShader||!gl.createProgram)return false;
   gl.getExtension('WEBGL_lose_context')?.loseContext();
   return true;
  }catch{return false;}
 }
 function chooseEngine(){
  const preferContrast=media('(prefers-contrast: more)');
  const reduceTransparency=media('(prefers-reduced-transparency: reduce)');
  backdrop=cssBackdrop();
  if(preferContrast||reduceTransparency||!backdrop)return 'frosted';
  if(!svgSupported())return 'frosted';
  if(!brokenGL){
   if(webglAvailable===null)webglAvailable=webglSupported();
   if(webglAvailable)return 'webgl';
  }
  return 'svg';
 }
 function rootMode(){
  const root=document.documentElement;
  root?.setAttribute?.('data-glass-engine',engine);
  root?.setAttribute?.('data-glass-backdrop',backdrop?'yes':'no');
 }
 function elt(tag){return document.createElementNS(NS,tag);}
 function mark(tag,attrs){
  const node=elt(tag);
  for(const [k,v] of Object.entries(attrs||{}))node.setAttribute(k,String(v));
  return node;
 }
 function addSVG(target){
  const id='gzucm-optics-'+(++nextId);
  const svg=mark('svg',{
   class:'lg-optic-svg','aria-hidden':'true','focusable':'false',
   viewBox:'0 0 100 45',preserveAspectRatio:'none'
  });
  const defs=mark('defs');
  const gradient=mark('linearGradient',{id:id+'-top',x1:'0%',y1:'0%',x2:'95%',y2:'70%'});
  gradient.append(mark('stop',{offset:'0%','stop-color':'#fff','stop-opacity':'.75'}),
   mark('stop',{offset:'32%','stop-color':'#fff','stop-opacity':'.43'}),
   mark('stop',{offset:'68%','stop-color':'#d6f6e5','stop-opacity':'.14'}),
   mark('stop',{offset:'100%','stop-color':'#fff','stop-opacity':'0'}));
  const mask=mark('mask',{id:id+'-clip',maskUnits:'userSpaceOnUse'});
  const maskRect=mark('rect',{fill:'#fff'});
  mask.append(maskRect);
  defs.append(gradient,mask);
  const group=mark('g',{mask:'url(#'+id+'-clip)'});
  const top=mark('path',{fill:'none',stroke:'url(#'+id+'-top)',
   'stroke-linecap':'round'});
  const bottom=mark('path',{fill:'none',stroke:'currentColor',
   'stroke-opacity':'.16','stroke-linecap':'round'});
  group.append(top,bottom);
  svg.append(defs,group);
  target.appendChild(svg);
  return {svg,maskRect,top,bottom};
 }
 function setSVGGeometry(item,rect){
  const {svg,maskRect,top,bottom}=item;
  if(!svg||!rect)return;
  const w=Math.max(1,rect.width),h=Math.max(1,rect.height);
  const radius=Math.min(Math.min(w,h)/2,Math.max(10,parseFloat(getComputedStyle(item.el).borderTopLeftRadius)||20));
  const r=Math.max(2,radius-1),x=1,y=1;
  svg.setAttribute('viewBox','0 0 '+w.toFixed(2)+' '+h.toFixed(2));
  for(const [k,v] of Object.entries({x:0,y:0,width:w,height:h,rx:radius,ry:radius}))
   maskRect.setAttribute(k,v);
  top.setAttribute('d','M '+(x+r)+' '+y+' H '+(w-x-r)+' Q '+(w-x)+' '+y+' '+(w-x)+' '+(y+r));
  top.setAttribute('stroke-width',Math.max(1.1,Math.min(2.1,h*.027)));
  bottom.setAttribute('d','M '+x+' '+(h-r-1)+' Q '+x+' '+(h-1)+' '+(x+r)+' '+(h-1)+
   ' H '+(w-r-1));
  bottom.setAttribute('stroke-width',Math.max(.6,Math.min(1.1,h*.015)));
 }
 const VERTEX=[
  'attribute vec2 a_position;',
  'varying vec2 v_uv;',
  'void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}'
 ].join('\n');
 const FRAGMENT=[
  'precision mediump float;',
  'varying vec2 v_uv;',
  'uniform vec2 u_resolution;',
  'uniform vec2 u_touch;',
  'uniform float u_radius;',
  'uniform float u_dark;',
  'float sdRounded(vec2 p,vec2 b,float r){',
  ' vec2 q=abs(p)-b+vec2(r);',
  ' return length(max(q,0.))-r+min(max(q.x,q.y),0.);',
  '}',
  'void main(){',
  ' vec2 uv=vec2(v_uv.x,1.0-v_uv.y);',
  ' vec2 p=uv*u_resolution;',
  ' vec2 center=u_resolution*.5;',
  ' float d=sdRounded(p-center,center-vec2(1.5),min(u_radius,min(center.x,center.y)));',
  ' float inside=1.0-smoothstep(-.6,1.6,d);',
  ' float edge=exp(-abs(d+1.2)/3.3);',
  ' float top=pow(1.0-uv.y,5.0)*.22;',
  ' vec2 diff=uv-u_touch;',
  ' float glint=exp(-dot(diff*vec2(2.0,2.5),diff*vec2(2.0,2.5))*10.0)*.17;',
  ' float iridescence=sin(uv.x*5.5+uv.y*7.0)*.5+.5;',
  ' vec3 light=vec3(.92,1.0,.95)*(edge*.35+top+glint);',
  ' light+=vec3(.05,.19,.10)*edge*iridescence*.25;',
  ' light=mix(light,light*.66,u_dark);',
  ' float alpha=min(.35,(edge*.21+top*.38+glint*.37))*inside;',
  ' gl_FragColor=vec4(light*alpha,alpha);',
  '}'
 ].join('\n');
 function compile(gl,type,src){
  const shader=gl.createShader(type);
  if(!shader)throw new Error('WebGL shader allocation failed');
  gl.shaderSource(shader,src);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
   const msg=gl.getShaderInfoLog(shader)||'Shader compilation failed';
   gl.deleteShader(shader);throw new Error(msg);
  }
  return shader;
 }
 function setupGL(item){
  const canvas=document.createElement('canvas');
  canvas.className='lg-optic-canvas';
  canvas.setAttribute('aria-hidden','true');
  const gl=getGL(canvas);
  if(!gl)throw new Error('WebGL context unavailable');
  const vert=compile(gl,gl.VERTEX_SHADER,VERTEX);
  const frag=compile(gl,gl.FRAGMENT_SHADER,FRAGMENT);
  const program=gl.createProgram();
  if(!program)throw new Error('WebGL program unavailable');
  gl.attachShader(program,vert);gl.attachShader(program,frag);gl.linkProgram(program);
  gl.deleteShader(vert);gl.deleteShader(frag);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
   throw new Error(gl.getProgramInfoLog(program)||'WebGL link failed');
  }
  const buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const names={position:gl.getAttribLocation(program,'a_position'),
   res:gl.getUniformLocation(program,'u_resolution'),
   touch:gl.getUniformLocation(program,'u_touch'),
   radius:gl.getUniformLocation(program,'u_radius'),
   dark:gl.getUniformLocation(program,'u_dark')};
  item.canvas=canvas;item.gl=gl;item.program=program;item.buffer=buffer;item.names=names;
  item.touch=[.25,.18];
  canvas.addEventListener('webglcontextlost',e=>{
   e.preventDefault();
   if(item.disposing)return; // deliberate teardown is not a GPU failure
   brokenGL=true;
   schedule();
  });
  canvas.addEventListener('webglcontextrestored',()=>{
   if(item.disposing)return;
   brokenGL=false;webglAvailable=null;schedule();
  });
  item.el.appendChild(canvas);
 }
 function draw(item){
  const {canvas,gl,program,buffer,names}=item;
  if(!canvas||!gl||!canvas.isConnected||gl.isContextLost?.())return;
  const rect=item.el.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const dpr=Math.max(1,Math.min(MAX_DPR,global.devicePixelRatio||1));
  const pixels=rect.width*rect.height*dpr*dpr;
  const reduction=Math.min(1,Math.sqrt(MAX_PIXELS/Math.max(1,pixels)));
  const w=Math.max(1,Math.round(rect.width*dpr*reduction));
  const h=Math.max(1,Math.round(rect.height*dpr*reduction));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  gl.viewport(0,0,w,h);
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.enableVertexAttribArray(names.position);
  gl.vertexAttribPointer(names.position,2,gl.FLOAT,false,0,0);
  gl.uniform2f(names.res,rect.width,rect.height);
  gl.uniform2f(names.touch,item.touch[0],item.touch[1]);
  gl.uniform1f(names.radius,Math.min(36,rect.height*.33));
  const dark=document.documentElement.dataset.theme==='dark'||
   (document.documentElement.dataset.theme!=='light'&&media('(prefers-color-scheme: dark)'));
  gl.uniform1f(names.dark,dark?1:0);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  if(gl.getError?.()===gl.OUT_OF_MEMORY){
   brokenGL=true;
   schedule();
  }
 }
 function destroy(item){
  item.disposing=true;
  if(item.frame&&typeof global.cancelAnimationFrame==='function')global.cancelAnimationFrame(item.frame);
  item.frame=0;
  item.svg?.remove();
  item.canvas?.remove();
  try{
   if(item.gl){
    if(item.buffer)item.gl.deleteBuffer(item.buffer);
    if(item.program)item.gl.deleteProgram(item.program);
    item.gl.getExtension('WEBGL_lose_context')?.loseContext();
   }
  }catch{}
 }
 function clear(){
  for(const item of live.values())destroy(item);
  live.clear();
 }
 function refresh(){
  if(typeof document==='undefined')return;
  const chosen=chooseEngine();
  if(chosen!==engine){clear();engine=chosen;}
  rootMode();
  const priority=['bottom-nav','schedule-view-switch','segmented','topbar','sidebar'];
  const targets=Array.from(document.querySelectorAll(candidates));
  targets.sort((a,b)=>priority.indexOf(priority.find(x=>a.classList?.contains(x))||'sidebar')-
   priority.indexOf(priority.find(x=>b.classList?.contains(x))||'sidebar'));
  for(const [el,item] of live){
   if(!el.isConnected||!targets.includes(el)||!el.getBoundingClientRect().width){
    destroy(item);live.delete(el);
   }
  }
  if(engine==='frosted'){clear();return;}
  let contexts=Array.from(live.values()).filter(x=>x.gl).length;
  for(const el of targets){
   const rect=el.getBoundingClientRect();
   if(!rect.width||!rect.height||rect.width*rect.height>MAX_PIXELS)continue;
   let item=live.get(el);
   if(!item){
    item={el,...addSVG(el)};
    live.set(el,item);
   }
   if(engine==='webgl'&&contexts<MAX_GL&&!item.gl){
    try{setupGL(item);contexts++;}
    catch{
     brokenGL=true;clear();engine='svg';rootMode();return refresh();
    }
   }
   setSVGGeometry(item,rect);
   if(item.gl){try{draw(item);}catch{brokenGL=true;schedule();}}
  }
 }
 function schedule(){
  if(raf)return;
  if(typeof global.requestAnimationFrame!=='function'){refresh();return;}
  raf=global.requestAnimationFrame(()=>{raf=0;refresh();});
 }
 function pointerMove(e){
  if(engine!=='webgl')return;
  const item=live.get(e.target?.closest?.(candidates));
  if(!item?.gl)return;
  const rect=item.el.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  item.touch=[
   Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),
   Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height))];
  if(item.frame)return;
  item.frame=global.requestAnimationFrame?.(()=>{
   item.frame=0;
   if(item.gl&&item.el.isConnected){try{draw(item);}catch{brokenGL=true;schedule();}}
  })||0;
 }
 function listenMedia(query){
  try{
   const m=global.matchMedia?.(query);
   if(m?.addEventListener)m.addEventListener('change',schedule);
   else m?.addListener?.(schedule);
  }catch{}
 }
 function setup(){
  if(started)return;
  started=true;
  schedule();
  document.addEventListener('pointermove',pointerMove,{passive:true});
  document.addEventListener('visibilitychange',()=>{
   if(!document.hidden)schedule();
  });
  for(const q of ['(prefers-color-scheme: dark)','(prefers-contrast: more)',
   '(prefers-reduced-transparency: reduce)'])listenMedia(q);
  global.addEventListener?.('resize',schedule,{passive:true});
 }
 global.GZUCM_GLASS_OPTICS={
  refresh:schedule,
  status:()=>({mode:engine,backdrop,webgl:engine==='webgl',
   surfaces:live.size}),
  detect:()=>({backdrop:cssBackdrop(),svg:svgSupported(),
   webgl:!brokenGL&&webglSupported()}),
  destroy:clear
 };
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
 }
})(typeof window!=='undefined'?window:{});
