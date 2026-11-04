'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {SchoolClient} = require('../server/school');
const QR_ID='qrcodeLogin_abcdef123456';
function simulatedPoll(body) {
 const c=new SchoolClient();
 c.qr={id:QR_ID,created:Date.now(),lastStatus:'pending'};
 c.request=async()=>JSON.stringify(body);
 return c;
}
test('recognizes pending from school status 0',async()=>{
 const c=simulatedPoll({code:0,data:JSON.stringify({status:'0'})});
 const result=await c.pollQR();
 assert.deepEqual(result,{status:'pending',connected:false});
});
test('recognizes scanned from nested scanInfo object',async()=>{
 const c=simulatedPoll({code:0,data:{status:'0',scanInfo:{status:'1'}}});
 const result=await c.pollQR();
 assert.deepEqual(result,{status:'scanned',connected:false});
});
test('recognizes scanned from nested scanInfo JSON string',async()=>{
 const c=simulatedPoll({code:0,data:JSON.stringify({status:'0',scanInfo:JSON.stringify({status:'1'})})});
 const result=await c.pollQR();
 assert.deepEqual(result,{status:'scanned',connected:false});
});
test('completes session after confirmed code 2 with same-origin finish URL',async()=>{
 const c=simulatedPoll({code:0,data:JSON.stringify({scanInfo:{status:'2',url:'/new/login/finished'}})});
 const seen=[];
 c.request=async url=>{
  seen.push(url);
  return seen.length===1?JSON.stringify({code:0,data:JSON.stringify({scanInfo:{status:'2',url:'/new/login/finished'}})}):'OK';
 };
 c.ping=async()=>true;
 const result=await c.pollQR();
 assert.equal(result.connected,true);
 assert.equal(c.connected,true);
 assert.equal(seen[1],'https://jw.gzucm.edu.cn/new/login/finished');
});
test('rejects a scan response without status, instead of treating it as pending',async()=>{
 const c=simulatedPoll({code:0,data:JSON.stringify({scanInfo:{other:'field'}})});
 await assert.rejects(()=>c.pollQR(),{code:'GZQR_STATUS_MISSING'});
});
test('blocks external finish URL even when school status is confirmed',async()=>{
 const c=simulatedPoll({code:0,data:{scanInfo:{status:'2',url:'https://evil.example/private'}}});
 await assert.rejects(()=>c.pollQR(),/未经允许的域名/);
});
