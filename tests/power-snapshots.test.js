'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const snapshot=require('../power-snapshots.js');
const get=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const now=new Date('2026-11-05T04:00:00Z');

test('stores one trusted balance per room and calendar day without saving credentials',()=>{
 const one={balance:19.2,roomLabel:'校园某宿舍',updatedAt:'2026-11-05T01:00:00Z',source:'ecard-live',token:'secret-should-not-be-saved',cookie:'private-cookie'};
 let rows=snapshot.append([] ,one,now);
 rows=snapshot.append(rows,{...one,balance:18.5,updatedAt:'2026-11-05T03:00:00Z'},now);
 assert.equal(rows.length,1);
 assert.equal(rows[0].balance,18.5);
 assert.equal(rows[0].source,'ecard-live');
 assert.equal(JSON.stringify(rows).includes('secret'),false);
 assert.equal(JSON.stringify(rows).includes('cookie'),false);
});

test('school electricity history follows Asia/Shanghai day at UTC rollover',()=>{
 const rows=snapshot.append([],{
  balance:13.2,roomLabel:'宿舍',source:'ios-native',
  updatedAt:'2026-11-04T18:30:00Z'
 },new Date('2026-11-04T19:00:00Z'));
 assert.equal(rows.length,1);
 assert.equal(rows[0].date,'2026-11-05');
});

test('manual balances and fake data cannot be written to official history',()=>{
 const rows=snapshot.append([],{balance:10,roomLabel:'A',source:'manual'},now);
 assert.deepEqual(rows,[]);
 assert.equal(snapshot.cachedPower({balance:10,source:'manual',updatedAt:'2026-11-05',roomLabel:'A'}),null);
});

test('cache reads never present an earlier official balance as current live',()=>{
 const out=snapshot.cachedPower({balance:15,unit:'度',roomLabel:'A',updatedAt:'2026-11-04T12:00:00Z',source:'ecard-live',token:'do-not-save'});
 assert.equal(out.source,'ecard-cache');
 assert.equal(Object.hasOwn(out,'token'),false);
 assert.equal(out.balance,15);
});

test('new room history is never merged with previous dorm',()=>{
 const old=snapshot.append([],{balance:30,roomLabel:'A',source:'ecard-live',updatedAt:'2026-11-04T00:00:00Z'},now);
 const next=snapshot.append(old,{balance:25,roomLabel:'B',source:'ecard-live',updatedAt:'2026-11-05T01:00:00Z'},now);
 assert.deepEqual(next.map(x=>x.roomLabel),['B']);
});

test('invalid and aged records are discarded',()=>{
 const list=snapshot.compact([
  {at:'2026-08-01T00:00:00Z',roomLabel:'A',balance:14,source:'ecard-live'},
  {at:'2026-11-03T00:00:00Z',roomLabel:'A',balance:-2,source:'ecard-live'},
  {at:'2026-11-04T00:00:00Z',roomLabel:'A',balance:12,source:'ecard-page'}
 ],now);
 assert.equal(list.length,1);
 assert.equal(list[0].balance,12);
});

test('website loads snapshots and stores them on successful reads',()=>{
 const html=get('index.html'),sw=get('sw.js'),server=get('server/server.js'),app=get('app.js');
 assert.ok(html.indexOf('power-snapshots.js?')>html.indexOf('power-insights.js?'));
 assert.ok(html.indexOf('power-snapshots.js?')<html.indexOf('app.js?'));
 assert.ok(server.includes("'/power-snapshots.js':'power-snapshots.js'"));
 assert.match(sw,/power-snapshots\.js\?/);
 assert.match(app,/localStorage\.setItem\(LIVE_POWER_DB/);
 assert.match(app,/powerSnapshots=window\.GZUCM_POWER_SNAPSHOTS\?\.append/);
 assert.match(app,/case'demo':localStorage\.removeItem\(POWER_DB\);localStorage\.removeItem\(LIVE_POWER_DB\)/);
});
