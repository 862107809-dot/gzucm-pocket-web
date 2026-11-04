'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {EcardClient}=require('../server/ecard');
const {parsePowerContext,parsePowerBalanceJson}=require('../server/parsers');
const html='<html><title>powerfee</title><input name="schoolAreaNo" value="2">'+
 '<input name="buildingNo" value="5754"><input name="roomNum" value="5770">'+
 '<input name="roomChooseText" value="测试宿舍"><script>var token="t_123"</script></html>';
test('ecard context extracts room and temporary page token without assuming a balance',()=>{
 const c=parsePowerContext(html);
 assert.deepEqual([c.schoolAreaNo,c.buildingNo,c.roomNum,c.token],['2','5754','5770','t_123']);
 assert.equal(parsePowerContext('<html>login form</html>'),null);
});
test('getBalance response is validated and the room must match',()=>{
 const room=parsePowerContext(html);
 const result=parsePowerBalanceJson({ret:true,obj:{powerBalance:'16.83',roomNum:'5770'}},room);
 assert.equal(result.balance,16.83);
 assert.equal(result.roomLabel,'测试宿舍');
 assert.throws(()=>parsePowerBalanceJson({ret:true,obj:{powerBalance:'abc'}},room),/有效电量/);
 assert.throws(()=>parsePowerBalanceJson({ret:true,obj:{powerBalance:'0',roomNum:'OTHER'}},room),/房间标识/);
 assert.throws(()=>parsePowerBalanceJson({ret:false,msg:'未登录'},room),/成功状态/);
});
test('Unauthenticated electricity query is blocked without outbound request',async()=>{
 const e=new EcardClient();
 e.request=async()=>{throw Error('must not request without authorization');};
 await assert.rejects(()=>e.live(),{code:'ECARD_LOGIN_REQUIRED'});
});
test('Authorized power flow uses balance API, not fake static tips',async()=>{
 const e=new EcardClient();
 e.cookies.set('ecard\0/user\0JSESSIONID',{host:'ecard.gzucm.edu.cn',path:'/user',name:'JSESSIONID',value:'dummy-test-session'});
 const requested=[];
 e.request=async(url,form)=>{
  requested.push({url,form});
  if(url.endsWith('/user/powerfee/index'))return html;
  if(url.endsWith('/user/powerfee/getBalance'))return JSON.stringify({ret:true,obj:{roomNum:'5770',powerBalance:'16.83'}});
  if(url.endsWith('/user/powerfee/getDailyDetails'))return JSON.stringify({ret:true,obj:{dailyDetailsInfos:[]}});
  throw Error('unexpected URL');
 };
 const data=await e.live('2026-11');
 assert.equal(data.source,'ecard-live');
 assert.equal(data.power.balance,16.83);
 assert.equal(data.power.roomLabel,'测试宿舍');
 assert.equal(requested.length,3);
 assert.equal(requested[1].form.roomNum,'5770');
 assert.equal(requested[1].form.buildingNo,'5754');
 assert.equal(requested[1].form.token,'t_123');
});
