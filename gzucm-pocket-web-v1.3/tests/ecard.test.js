'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {EcardClient,safeUrl,needLogin,parseSetCookies,cookieFor,PORTAL}=require('../server/ecard');
const {parsePowerHtml,parsePowerDailyJson}=require('../server/parsers');

test('真实电费余额来源必须包含有效 powerTips 数字；登录页不得被认作余额',()=>{
 assert.equal(parsePowerHtml('<html><h1>统一身份认证</h1></html>'),null);
 assert.equal(parsePowerHtml('<p id="powerTips">尚未读取</p>'),null);
 const html='<p id="powerTips">剩余电量：11.63度</p><div id="powerTips"></div><input name="schoolAreaNo" value="2"><input value="5754" name="buildingNo"><input name="roomNum" value="5770"><input id="roomChooseText" value="三元里6栋 213"><script>var token="abc123"</script>';
 const info=parsePowerHtml(html);
 assert.deepEqual([info.balance,info.schoolAreaNo,info.buildingNo,info.roomNum,info.token,info.roomLabel],[11.63,'2','5754','5770','abc123','三元里6栋 213']);
});
test('每日用电量映射与不合格响应拒绝',()=>{
 const arr=parsePowerDailyJson({ret:true,obj:{dailyDetailsInfos:[{dateTime:'2026-11-03',dailyUsed:'1.25',leftUsed:'11.63',totalUsed:'33.7',idCard:'sensitive'}]}});
 assert.deepEqual(arr,[{date:'2026-11-03',usage:1.25,remain:11.63,total:33.7}]);
 assert.throws(()=>parsePowerDailyJson({ret:false,obj:{dailyDetailsInfos:[]}}),/没有返回成功标志/);
 assert.throws(()=>parsePowerDailyJson('<html>login</html>'),/非 JSON/);
});
test('一卡通只连接官方 HTTPS 域名',()=>{
 assert.equal(safeUrl(PORTAL).hostname,'ecard.gzucm.edu.cn');
 for(const bad of ['http://ecard.gzucm.edu.cn/user/index','https://ecard.gzucm.edu.cn.evil.invalid/','https://ecard.gzucm.edu.cn:8443/','https://authserver.gzucm.edu.cn/'])assert.throws(()=>safeUrl(bad),/跳转不是/);
});
test('一卡通两个不同 Path 的 JSESSIONID 不覆盖',()=>{
 const jar=new Map();parseSetCookies('ecard.gzucm.edu.cn',['JSESSIONID=user123; Path=/user; HttpOnly','JSESSIONID=sso456; Path=/sso; HttpOnly'],jar);
 assert.match(cookieFor(jar,new URL('https://ecard.gzucm.edu.cn/user/powerfee/index')),/user123/);
 assert.doesNotMatch(cookieFor(jar,new URL('https://ecard.gzucm.edu.cn/user/powerfee/index')),/sso456/);
 assert.equal(new EcardClient().cookies.size,0);
 assert.equal(needLogin().status,428);
});
