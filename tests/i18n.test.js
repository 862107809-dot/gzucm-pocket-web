'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const I=require('../i18n');
const fs=require('node:fs');
const path=require('node:path');
const han=/[\u3400-\u9fff\uF900-\uFAFF]/;
const examples=[
 '2026—2027 学年 第一学期 · 第 10 周',
 '第 10 / 19 教学周','2 节','38.6 度',
 '大学英语','局部解剖学','毛泽东思想和中国特色社会主义理论体系概论',
 '完全未收录的新课程','未知教师','实验室 203',
 '密码登录暂不支持','扫码登录','宿舍电费','今日课程'
];
test('English mode never exposes Chinese text in known or unknown school fields',()=>{
 for(const source of examples){
  const translated=I.translate(source);
  assert.ok(!han.test(translated),source+' still contains Chinese: '+translated);
 }
});
test('Common academic fields have proper English labels',()=>{
 assert.equal(I.translate('大学英语'),'College English');
 assert.equal(I.translate('局部解剖学'),'Regional Anatomy');
 assert.equal(I.translate('宿舍电费'),'Dorm electricity');
 assert.equal(I.translate('第 9 周'),'Week 9');
 assert.equal(I.translate('共 4 节'),'4 class periods');
 assert.equal(I.translate('2026—2027 学年 第一学期'),'2026–2027 academic year · Semester 1');
});
test('No pinyin: unknown records get an English-only placeholder',()=>{
 assert.equal(I.translate('完全未收录的新课程'),'[Translation unavailable]');
 assert.doesNotMatch(I.translate('完全未收录的新课程'),/wan|quan|xin|ke|cheng|lu/i);
 const pkg=JSON.parse(fs.readFileSync(path.join(__dirname,'..','package.json'),'utf8'));
 assert.ok(!pkg.dependencies?.['pinyin-pro']);
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.doesNotMatch(html,/pinyin-pro/i);
 const server=fs.readFileSync(path.join(__dirname,'..','server','server.js'),'utf8');
 assert.doesNotMatch(server,/pinyin-pro/i);
});
test('Only one EN/ZH language button is rendered and the old selectors are absent',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 const sourceMatches=js.match(/data-action="toggleLanguage"/g)||[];
 assert.equal(sourceMatches.length,1);
 assert.match(js,/state\.prefs\.language==='en'\?'ZH':'EN'/);
 assert.match(js,/case'toggleLanguage':toggleLanguage\(\);break;/);
 assert.match(js,/state\.prefs\.language=state\.prefs\.language==='en'\?'zh':'en'/);
 assert.match(js,/storePrefs\(\);\s*render\(\)/);
 assert.doesNotMatch(js,/id="language-select"|id="language-settings"/);
 assert.doesNotMatch(js,/\bcase'language-select'\b/);
});
test('Browser loads translation module before app',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.ok(html.indexOf('/i18n.js?')<html.indexOf('/app.js?'));
});
