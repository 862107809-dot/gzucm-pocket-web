'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');

const root=path.join(__dirname,'..');
const material=fs.readFileSync(path.join(root,'liquid-material.css'),'utf8');
const styles=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const cache=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const section=material.slice(material.indexOf('/* GLASS SELECTION FOREGROUND SAFETY v3'));

test('Safari popover: text is always above the moving glass and its duplicate blur is disabled',()=>{
 assert.ok(section.length>1100,'foreground stacking safety rules must be loaded last');
 assert.match(section,/\.safari-floating-menu\{\s*isolation:isolate;/);
 assert.match(section,/\.safari-floating-menu \.safari-menu-glider,[\s\S]*?backdrop-filter:none!important;/);
 assert.match(section,/\.safari-floating-menu \.safari-menu-option\{[\s\S]*?z-index:2;/);
 assert.match(section,/\.safari-menu-option > :is\(\.safari-menu-icon,\.safari-menu-text,\.safari-menu-check\)/);
 assert.match(section,/\.safari-menu-text strong\{\s*color:var\(--ink\)!important;/);
 assert.match(section,/\.safari-menu-text small\{\s*color:var\(--muted\)!important;/);
 assert.match(app,/glider\.className='safari-menu-glider'/);
 assert.match(app,/safari-menu-text/);
});
test('all shared selection lenses sample the background only on their outer glass shell',()=>{
 for(const selector of ['.safari-floating-menu .safari-menu-glider',
   '.liquid-selector > .liquid-choice-highlight','.bottom-nav .bottom-liquid-surface']){
  assert.ok(section.includes(selector),'missing inner-lens safeguard for '+selector);
 }
 assert.match(section,/-webkit-backdrop-filter:none!important;/);
 assert.match(section,/backdrop-filter:none!important;/);
 assert.doesNotMatch(section,/(^|\n)\s*(?:animation|transition)(?:-[a-z]+)?\s*:/m,
  'fix cannot change timings, bounce or swipe logic');
});
test('3 renderers × 2 effective themes, system dark and CSS fallback share the same safety rules',()=>{
 for(const mode of ['webgl','svg','frosted']){
  assert.ok(material.includes('data-glass-engine="'+mode+'"'),'missing optical renderer '+mode);
  for(const theme of ['light','dark']){
   assert.ok(section.includes(':root[data-glass-engine] .safari-floating-menu .safari-menu-glider'),
    'selected foreground missing in '+mode+'/'+theme);
   assert.ok(section.includes(':root[data-glass-engine] .liquid-selector > .liquid-choice-highlight'),
    'rail foreground missing in '+mode+'/'+theme);
   assert.ok(section.includes(':root[data-glass-engine] .bottom-nav .bottom-liquid-surface'),
    'Dock foreground missing in '+mode+'/'+theme);
  }
 }
 assert.ok(section.includes(':root[data-active-theme] .safari-floating-menu .safari-menu-glider'),
  'explicit and system-driven dark/light appearance must both be covered');
 assert.ok(section.includes(':root .safari-floating-menu .safari-menu-glider'),
  'fallback without optical renderer data attribute must be covered');
 assert.match(app,/document\.documentElement\.dataset\.activeTheme=dark\?'dark':'light'/);
 assert.ok(html.includes('/liquid-material.css?v=20261106-glass-choice-foreground7'));
 assert.ok(cache.includes('/liquid-material.css?v=20261106-glass-choice-foreground7'));
 assert.ok(cache.includes('gzucm-pocket-web-v71-20261106-glass-choice-foreground7'));
});

function chromiumBinary(){
 const candidates=[process.env.CHROMIUM_BIN,'chromium','chromium-browser','google-chrome'].filter(Boolean);
 for(const command of candidates){
  const found=spawnSync(command,['--version'],{encoding:'utf8',timeout:2500});
  if(!found.error&&found.status===0)return command;
 }
 return null;
}
const browser=chromiumBinary();
test('real browser computed-style matrix: 3 glass modes × light/dark menu and controls', {skip:!browser},()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gzucm-glass-choice-'));
 try{
  const file=path.join(directory,'matrix.html');
  const fixture=`<!doctype html><html><head><meta charset="utf-8"><style>${styles}</style>
   <style>${material}</style></head><body style="min-height:850px;padding:40px">
   <div class="safari-floating-menu" style="position:relative;left:0;top:0;width:280px;animation:none">
     <div class="safari-menu-title">玻璃渲染模式</div>
     <button class="safari-menu-option"><span class="safari-menu-icon">✧</span><span class="safari-menu-text"><strong>增强液态</strong><small>WebGL + SVG</small></span></button>
     <button class="safari-menu-option"><span class="safari-menu-icon">☼</span><span class="safari-menu-text"><strong>液态玻璃</strong><small>CSS + SVG</small></span></button>
     <span class="safari-menu-glider" aria-hidden="true"></span>
     <button class="safari-menu-option selected"><span class="safari-menu-icon">♢</span><span class="safari-menu-text"><strong>毛玻璃</strong><small>轻量 CSS 毛玻璃</small></span></button>
   </div>
   <div class="segmented liquid-selector" style="position:relative;display:flex;width:260px;margin-top:25px">
     <span class="liquid-choice-highlight" style="width:120px;height:44px;transform:translate3d(0px,0px,0)"></span>
     <button class="active">周视图</button><button>月视图</button>
   </div>
   <div class="bottom-nav" style="position:relative;left:0;bottom:0;transform:none">
     <span class="bottom-liquid-indicator"><span class="bottom-liquid-surface"></span></span>
     <button class="bottom-item active">课表</button><button class="bottom-item">成绩</button>
   </div>
   <pre id="matrix-results"></pre>
   <script>
   const modes=['webgl','svg','frosted'],themes=['light','dark'],results=[];
   const $=s=>document.querySelector(s);
   const glider=$('.safari-menu-glider'),choice=$('.safari-menu-option.selected');
   glider.style.width=choice.offsetWidth+'px';
   glider.style.height=choice.offsetHeight+'px';
   glider.style.transform='translate3d('+choice.offsetLeft+'px,'+choice.offsetTop+'px,0)';
   for(const engine of modes)for(const theme of themes){
     document.documentElement.dataset.glassEngine=engine;
     document.documentElement.dataset.activeTheme=theme;
     document.documentElement.dataset.theme=theme;
     document.documentElement.dataset.glassBackdrop='yes';
     const s=x=>getComputedStyle($(x));
     const lens=s('.safari-menu-glider'),button=s('.safari-menu-option.selected'),
       label=s('.safari-menu-option.selected strong'),hint=s('.safari-menu-option.selected small');
     const rect=choice.getBoundingClientRect();
     const hit=document.elementFromPoint(rect.left+rect.width*.55,rect.top+rect.height*.52);
     const checks={
       menuLensNoBlur:lens.backdropFilter==='none'&&(!lens.webkitBackdropFilter||lens.webkitBackdropFilter==='none'),
       railLensNoBlur:s('.liquid-choice-highlight').backdropFilter==='none',
       dockLensNoBlur:s('.bottom-liquid-surface').backdropFilter==='none',
       labelAboveLens:Number(button.zIndex)>Number(lens.zIndex),
       labelsPresent:label.color!=='rgba(0, 0, 0, 0)'&&hint.opacity!=='0',
       activeButtonClickable:!!hit?.closest('.safari-menu-option.selected')
     };
     results.push({engine,theme,checks});
   }
   document.querySelector('#matrix-results').textContent=JSON.stringify(results);
   <\/script></body></html>`;
  fs.writeFileSync(file,fixture);
  const output=spawnSync(browser,['--headless','--no-sandbox','--disable-gpu',
   '--disable-dev-shm-usage','--no-first-run','--virtual-time-budget=1500',
   '--dump-dom','file://'+file],{encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
  assert.equal(output.status,0,output.stderr?.slice(-2000));
  const match=output.stdout.match(/<pre id="matrix-results">([^<]+)<\/pre>/);
  assert.ok(match,'browser did not return matrix results');
  const results=JSON.parse(match[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&'));
  assert.equal(results.length,6);
  for(const entry of results){
   assert.deepEqual(Object.entries(entry.checks).filter(([,ok])=>!ok),[],
    'unreadable selection: '+entry.engine+'/'+entry.theme+' '+JSON.stringify(entry.checks));
  }
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
