'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const I=require('../i18n');
const fs=require('node:fs');
const path=require('node:path');

test('English interface translation has working QR and electricity terms',()=>{
 assert.equal(I.translate('密码登录暂不支持'),'Password login is currently unavailable');
 assert.equal(I.translate('扫码登录'),'QR login');
 assert.equal(I.translate('宿舍电费'),'Dorm electricity');
 assert.equal(I.translate('第 9 周'),'Week 9');
 assert.equal(I.translate('共 4 节'),'4 classes');
});
test('Does not guess translations of student course names',()=>{
 assert.equal(I.translate('局部解剖学'),'局部解剖学');
});
test('English selector is wired on navigation and settings, persisting preference',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.match(js,/id="language-select"/);
 assert.match(js,/id="language-settings"/);
 assert.match(js,/state\.prefs\.language=t\.value==='en'\?'en':'zh'/);
 assert.match(js,/storePrefs\(\);render\(\);applyLanguage\(\)/);
});
test('Browser loads translation module before app',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.ok(html.indexOf('/i18n.js?')<html.indexOf('/app.js?'));
});
