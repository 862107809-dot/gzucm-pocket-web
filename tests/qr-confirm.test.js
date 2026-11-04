'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {SchoolClient}=require('../server/school');
const id='qrcodeLogin_abcdef123456';
function mock(confirmUrl,qrcodeId=id){
  const client=new SchoolClient();
  client.request=async()=>JSON.stringify({code:0,data:JSON.stringify({qrcodeId,confirmUrl})});
  return client;
}
test('keeps verified HTTPS jw school confirmation URL',async()=>{
  const url='https://jw.gzucm.edu.cn/#/qrcodeConfirm/showConfirm?qrcodeId='+id;
  const result=await mock(url).startQR();
  assert.equal(result.confirmUrl,url);
});
test('normalizes relative school QR confirmation URL',async()=>{
  const result=await mock('/#/qrcodeConfirm/showConfirm?qrcodeId='+id).startQR();
  assert.equal(result.confirmUrl,'https://jw.gzucm.edu.cn/#/qrcodeConfirm/showConfirm?qrcodeId='+id);
});
test('preserves other official school hostname while upgrading HTTP to HTTPS',async()=>{
  const url='http://school-login.gzucm.edu.cn/#/qrcodeConfirm/showConfirm?qrcodeId='+id;
  const result=await mock(url).startQR();
  assert.equal(result.confirmUrl,'https://school-login.gzucm.edu.cn/#/qrcodeConfirm/showConfirm?qrcodeId='+id);
  assert.ok(!result.confirmUrl.startsWith('http:'));
});
test('rejects foreign-domain QR confirmation links, rather than silently replacing host',async()=>{
  const url='https://untrusted.example/#/qrcodeConfirm/showConfirm?qrcodeId='+id;
  await assert.rejects(()=>mock(url).startQR(),/受信任的学校域名/);
});
test('rejects malformed QR identifier even with school domain',async()=>{
  const url='http://school-login.gzucm.edu.cn/#/qrcodeConfirm/showConfirm?qrcodeId=invalid';
  await assert.rejects(()=>mock(url,'foo/../').startQR(),/二维码标识格式/);
});
test('rejects tampered QR identifier',async()=>{
  const url='https://jw.gzucm.edu.cn/#/qrcodeConfirm/showConfirm?qrcodeId=qrcodeLogin_DIFFERENT';
  await assert.rejects(()=>mock(url).startQR(),/标识不匹配/);
});
test('rejects wrong school fragment route',async()=>{
  const url='https://jw.gzucm.edu.cn/#/qrcodeConfirm/other?qrcodeId='+id;
  await assert.rejects(()=>mock(url).startQR(),/路径或标识不匹配/);
});
test('rejects an HTTP school hostname with unexpected port',async()=>{
  const url='http://school-login.gzucm.edu.cn:8080/#/qrcodeConfirm/showConfirm?qrcodeId='+id;
  await assert.rejects(()=>mock(url).startQR(),/受信任的学校域名/);
});
