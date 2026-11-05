'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');

const begin=app.indexOf('function updateGlassModeIndicator(){');
const end=app.indexOf('function render(){',begin);
assert.ok(begin>=0&&end>begin,'runtime renderer status helper is available');
const helper=app.slice(begin,end);

function settingsStatus(value){
 const label={textContent:'检测中',isConnected:true};
 const detail={textContent:'',isConnected:true};
 const queue=[];
 let refreshed=0;
 const window={
  GZUCM_GLASS_OPTICS:{
   refresh(){refreshed++;},
   status(){return value;}
  },
  requestAnimationFrame(cb){queue.push(cb);return queue.length;}
 };
 const document={
  getElementById(id){return id==='glass-renderer-mode'?label:id==='glass-renderer-detail'?detail:null;}
 };
 const update=new Function('window','document',helper+'return updateGlassModeIndicator;')(window,document);
 update();
 assert.equal(queue.length,1,'update waits for the renderer capability refresh frame');
 queue.shift()();
 return {label:label.textContent,detail:detail.textContent,refreshed};
}

test('Settings exposes a visible actual runtime engine without manual selection',()=>{
 assert.match(app,/id="glass-renderer-mode"[^>]*role="status"/);
 assert.match(app,/id="glass-renderer-detail"/);
 assert.match(app,/if\(state\.view==='settings'\)updateGlassModeIndicator\(\)/);
 assert.match(app,/浏览器的实际渲染能力/);
 assert.doesNotMatch(helper,/navigator\.userAgent/,'do not guess render mode from browser name');
});

test('WebGL mode displays active GPU surface count and live backdrop support',()=>{
 const r=settingsStatus({mode:'webgl',backdrop:true,gpuSurfaces:2});
 assert.equal(r.label,'WebGL 增强');
 assert.match(r.detail,/原生背景模糊/);
 assert.match(r.detail,/当前 GPU 层 2 个/);
 assert.equal(r.refreshed,1);
});

test('SVG mode shows capability downgrade, not a misleading WebGL label',()=>{
 const r=settingsStatus({mode:'svg',backdrop:true,gpuSurfaces:0});
 assert.equal(r.label,'CSS + SVG');
 assert.match(r.detail,/WebGL 当前不可用/);
});

test('CSS frosted status reports simulated background when native backdrop unsupported',()=>{
 const r=settingsStatus({mode:'frosted',backdrop:false,gpuSurfaces:0});
 assert.equal(r.label,'CSS 毛玻璃');
 assert.match(r.detail,/模拟毛玻璃纹理/);
});

test('status displays a safe unavailable message when render API cannot be read',()=>{
 const r=settingsStatus(null);
 assert.equal(r.label,'检测不可用');
 assert.match(r.detail,/基础毛玻璃样式仍然可用/);
});
