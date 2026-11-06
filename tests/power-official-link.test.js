'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');
const page=app.slice(app.indexOf('function powerPage(){'),app.indexOf('function powerChart('));

test('all official electricity-query controls link directly to the school portal',()=>{
 assert.match(page,/const officialPowerUrl='https:\/\/ecard\.gzucm\.edu\.cn\/user\/powerfee\/index'/);
 assert.equal((page.match(/href="\$\{officialPowerUrl\}"/g)||[]).length,3);
 assert.match(page,/<a class="hero-button" href="\$\{officialPowerUrl\}"[^>]*>[^<]*刷新官方数据<\/a>/);
 assert.match(page,/<a class="btn primary" href="\$\{officialPowerUrl\}"[^>]*>[^<]*前往官网查询实时电量<\/a>/);
 assert.doesNotMatch(page,/data-action="syncPower"/);
});

test('web electricity query states its limits immediately next to the button',()=>{
 assert.match(page,/<div class="power-official-query">[\s\S]*?class="power-query-hint">点击可显示官方数据（在学校官网查看）；当前网页暂不支持直接抓取官方电费数据<\/span>/);
 assert.match(css,/#app \.power-official-query\{/);
 assert.match(css,/#app \.power-query-hint\{/);
});

test('unavailable power authorization shows nonblocking feedback, not a popup',()=>{
 const sync=app.slice(app.indexOf('async function syncPower('),app.indexOf('async function syncAcademic('));
 assert.doesNotMatch(sync,/powerHelp\(/);
 assert.match(sync,/if\(!automatic\)toast\(state\.powerError\);/);
});
