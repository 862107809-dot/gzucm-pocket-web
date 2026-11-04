'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const begin=source.indexOf("const SCHOOL_SSO_URL=");
const end=source.indexOf("function powerHelp(",begin);
assert.ok(begin>=0 && end>begin,'official password modal must exist');
function renderMode(mode){
  const state={},rendered=[];
  const factory=new Function('state','openModal','I',source.slice(begin,end)+'\nreturn connectModal;');
  const connect=factory(state,(title,body)=>rendered.push({title,body}),()=>'<svg/>');
  connect(mode);
  return {state,body:rendered.at(-1).body};
}
test('password mode opens official school SSO without generating a QR',()=>{
  const result=renderMode('password');
  assert.equal(result.state.authMode,'password');
  assert.match(result.body,/data-action="openOfficialLogin"/);
  assert.match(result.body,/学校官方认证窗口/);
  assert.match(result.body,/统一身份认证/);
  assert.doesNotMatch(result.body,/data-action="startQr"|id="qr-panel"/);
});
test('password mode explicitly says that school SSO alone does not sync the website',()=>{
  assert.match(renderMode('password').body,/完成独立授权/);
  assert.match(renderMode('password').body,/本站不接收学校密码/);
});
test('QR mode keeps the existing explicit QR start action, not password login',()=>{
  const result=renderMode('qr');
  assert.equal(result.state.authMode,'qr');
  assert.match(result.body,/data-action="startQr"/);
  assert.match(result.body,/id="qr-panel"/);
  assert.doesNotMatch(result.body,/data-action="openOfficialLogin"/);
});
test('no password action calls the QR start routine',()=>{
  assert.doesNotMatch(source,/case'startPassword':state\.authMode='password';startQr\(\)/);
  assert.match(source,/case'authPassword':connectModal\('password'\)/);
  assert.match(source,/case'authQr':connectModal\('qr'\)/);
  assert.match(source,/case'openOfficialLogin':openOfficialLogin\(\)/);
  assert.match(source,/state\.casAvailable\?'\/auth\/cas\/start':SCHOOL_SSO_URL/);
});
