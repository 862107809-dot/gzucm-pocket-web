'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const bridge=require('../server/power-bridge');
const source=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const now=new Date().toISOString();
const day=now.slice(0,10);
const payload={
 power:{balance:34.5,unit:'度',roomLabel:'测试宿舍A',updatedAt:now,token:'do-not-forward'},
 powerDaily:[{date:day,usage:2.1,remain:34.5,total:90,studentId:'sensitive'}],
 historyStatus:'complete',
 cookie:'not-forwarded'
};

test('one-time pairing binds only a push token and never school credentials',()=>{
 const pair=bridge.create();
 assert.match(pair.code,/^[A-Z0-9_-]{12}$/);
 assert.equal(bridge.read(pair.id).status,'pending');
 const session=bridge.claim(pair.code);
 assert.match(session.token,/^[-_A-Za-z0-9]{40,100}$/);
 assert.throws(()=>bridge.claim(pair.code),/无效|使用/);
 const output=bridge.push(session.token,payload);
 assert.equal(output.ok,true);
 const view=bridge.read(pair.id);
 assert.equal(view.status,'paired');
 assert.equal(view.power.balance,34.5);
 assert.equal(view.power.source,'ios-native');
 assert.equal(view.historyStatus,'complete');
 assert.deepEqual(view.powerDaily.map(x=>x.usage),[2.1]);
 assert.equal(view.history.length,1);
 assert.equal(view.history[0].balance,34.5);
 assert.equal(JSON.stringify(view).includes('do-not-forward'),false);
 assert.equal(JSON.stringify(view).includes('sensitive'),false);
 assert.equal(JSON.stringify(view).includes('not-forwarded'),false);
 bridge.revoke(pair.id);
 assert.equal(bridge.read(pair.id).status,'expired');
 assert.throws(()=>bridge.push(session.token,payload),/授权/);
});

test('invalid or future records cannot masquerade as a valid reading',()=>{
 assert.throws(()=>bridge.clean({...payload,power:{...payload.power,balance:'not-a-number'}}),/余额/);
 assert.throws(()=>bridge.clean({...payload,power:{...payload.power,updatedAt:'2035-01-01T00:00:00Z'}}),/时间/);
 const safe=bridge.clean({...payload,powerDaily:[
  {date:'2026-02-30',usage:3,remain:6},
  {date:day,usage:-1,remain:6},
  {date:day,usage:1,remain:6}
 ]});
 assert.equal(safe.powerDaily.length,1);
 assert.equal(safe.powerDaily[0].usage,1);
});

test('web UI implements generate, read, revoke and safe storage paths',()=>{
 const app=source('app.js');
 const server=source('server/server.js');
 assert.match(app,/async function beginPowerPairing\(/);
 assert.match(app,/async function refreshPowerBridge\(/);
 assert.match(app,/case'pairPower':beginPowerPairing\(\)/);
 assert.match(app,/case'refreshBridge':refreshPowerBridge\(\)/);
 assert.match(app,/case'disconnectBridge':disconnectPowerBridge\(\)/);
 assert.match(app,/state\.powerBridgeVersion=result\.version/);
 assert.match(app,/source:'ios-native'/);
 assert.match(server,/power\/bridge\/start/);
 assert.match(server,/power\/bridge\/push/);
 assert.match(server,/power\/bridge\/claim/);
});
