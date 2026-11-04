'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const start=source.indexOf("function connectModal(mode='qr')");
const end=source.indexOf("function powerHelp(",start);
assert.ok(start>=0&&end>start,'login modal function present');
function renderMode(mode){
 const state={};
 const views=[];
 const connect=new Function('state','openModal','I',source.slice(start,end)+'return connectModal;')(
  state,(title,body)=>views.push({title,body}),()=>'<svg/>'
 );
 connect(mode);
 return {mode:state.authMode,body:views.at(-1).body};
}
test('password entry is visibly unsupported, with screenshot and WeChat instructions',()=>{
 const r=renderMode('password');
 assert.equal(r.mode,'password');
 assert.match(r.body,/密码登录暂不支持/);
 assert.match(r.body,/截图保存二维码/);
 assert.match(r.body,/微信/);
 assert.match(r.body,/相册/);
 assert.match(r.body,/data-action="authQr"/);
 assert.doesNotMatch(r.body,/id="qr-panel"|data-action="openOfficialLogin"/);
});
test('QR login remains the default and contains the real QR start button',()=>{
 const r=renderMode();
 assert.equal(r.mode,'qr');
 assert.match(r.body,/id="qr-panel"/);
 assert.match(r.body,/data-action="startQr"/);
 assert.match(r.body,/扫一扫/);
});
test('password click is not routed to QR generation',()=>{
 assert.match(source,/case'authPassword':connectModal\('password'\)/);
 assert.match(source,/case'authQr':connectModal\('qr'\)/);
 assert.doesNotMatch(source,/case'startPassword'/);
});
