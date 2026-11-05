'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','glass-renderer.js'),'utf8');
const material=fs.readFileSync(path.join(__dirname,'..','liquid-material.css'),'utf8');
const observer=fs.readFileSync(path.join(__dirname,'..','glass-effects.js'),'utf8');

function boot(opts={}){
 const queue=[],attrs={};
 let canvasCount=0;
 const fakeGL={
  createShader(){return {};},
  createProgram(){return {};},
  getExtension(){return {loseContext(){}};}
 };
 const node=tag=>({
  tag,attrs:{},children:[],createSVGRect:opts.svg===false?undefined:()=>({}),
  setAttribute(k,v){this.attrs[k]=String(v);},
  append(...children){this.children.push(...children);},
  appendChild(child){this.children.push(child);child.isConnected=true;return child;},
  remove(){this.removed=true;}
 });
 const target=node('div');
 Object.assign(target,{
  classList:{contains:name=>name==='bottom-nav'},
  getBoundingClientRect:()=>({width:320,height:68,left:10,top:20}),
  isConnected:true
 });
 const window={
  SVGElement:opts.svg===false?undefined:function SVGElement(){},
  CSS:{supports:()=>opts.backdrop!==false},
  matchMedia:query=>({
   matches:!!(
    (opts.reduceTransparency&&query.includes('reduced-transparency'))||
    (opts.moreContrast&&query.includes('contrast: more'))||
    (opts.dark&&query.includes('color-scheme: dark'))
   )
  }),
  requestAnimationFrame(cb){queue.push(cb);return queue.length;},
  cancelAnimationFrame(){},
  addEventListener(){},
  devicePixelRatio:1
 };
 const document={
  readyState:'loading',
  documentElement:{dataset:{},setAttribute(k,v){attrs[k]=v;}},
  addEventListener(){},
  querySelectorAll(){return opts.target?[target]:[];},
  createElement(tag){
   const n=node(tag);
   if(tag==='canvas'){
    canvasCount++;
    n.getContext=()=>{
     if(opts.webgl===false||(opts.failSetup&&canvasCount>1))return null;
     return fakeGL;
    };
    n.addEventListener=()=>{};
   }
   return n;
  },
  createElementNS(ns,tag){return node(tag);}
 };
 vm.runInNewContext(source,{window,document,getComputedStyle:()=>({borderTopLeftRadius:'22px'})});
 function flush(){
  for(let step=0;queue.length&&step<40;step++)queue.shift()();
  assert.equal(queue.length,0,'renderer must settle without requestAnimationFrame loops');
 }
 function refresh(){window.GZUCM_GLASS_OPTICS.refresh();flush();return window.GZUCM_GLASS_OPTICS.status();}
 return {refresh,attrs,window,target};
}

test('auto selects WebGL + SVG + CSS when all capability probes pass',()=>{
 const h=boot();
 const state=h.refresh();
 assert.equal(state.mode,'webgl');
 assert.equal(state.webgl,true);
 assert.equal(state.backdrop,true);
 assert.equal(h.attrs['data-glass-engine'],'webgl');
});

test('automatically falls back to SVG + CSS on browsers without WebGL',()=>{
 const h=boot({webgl:false,target:true});
 const state=h.refresh();
 assert.equal(state.mode,'svg');
 assert.equal(h.attrs['data-glass-engine'],'svg');
 assert.equal(state.surfaces,1,'SVG glints stay enabled without WebGL');
 assert.ok(h.target.children.some(x=>x.tag==='svg'));
});

test('if GPU optical initialization fails at runtime, stay on SVG + CSS',()=>{
 const h=boot({failSetup:true,target:true});
 const state=h.refresh();
 assert.equal(state.mode,'svg');
 assert.equal(state.webgl,false);
 assert.ok(h.target.children.some(x=>x.tag==='svg'));
});

test('CSS frost overrides on reduced transparency or increased contrast',()=>{
 for(const key of ['reduceTransparency','moreContrast']){
  const h=boot({[key]:true});
  const state=h.refresh();
  assert.equal(state.mode,'frosted',key);
  assert.equal(h.attrs['data-glass-engine'],'frosted');
 }
});

test('browsers without live background blur use textured CSS frost, not plain white',()=>{
 for(const props of [{backdrop:false},{svg:false}]){
  const h=boot(props),state=h.refresh();
  assert.equal(state.mode,'frosted');
 }
 const h=boot({backdrop:false});h.refresh();
 assert.equal(h.attrs['data-glass-backdrop'],'no');
 assert.match(material,/data-glass-engine="frosted"/);
 assert.match(material,/repeating-linear-gradient\(/);
 assert.match(material,/--lg-frost-chrome:rgba\(240,249,242,\.93\)/);
 assert.match(material,/data-glass-backdrop="no"/);
});

test('material engine respects original animation/gesture logic and is refreshed on SPA render',()=>{
 assert.match(observer,/global\.GZUCM_GLASS_OPTICS\?\.refresh\?\.\(\)/);
 assert.match(source,/const MAX_GL=2/);
 assert.match(source,/const MAX_PIXELS=360000/);
 assert.match(source,/webglcontextlost/);
 assert.match(source,/webglcontextrestored/);
 assert.match(source,/gl\.drawArrays\(gl\.TRIANGLE_STRIP,0,4\)/);
 assert.match(material,/\.lg-optic-svg,\.lg-optic-canvas\{/);
 assert.match(material,/pointer-events:none!important/);
 assert.doesNotMatch(material,/(^|[\r\n])[ \t]*(?:animation|transition)(?:-[a-z]+)?\s*:/m);
});
