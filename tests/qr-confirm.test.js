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
test('keeps official school QR confirmation URL',async()=>{
 const url='https://jw.gzucm.edu.cn/#/qrcodeConfirm/showConfirm?qrcodeId='+id;
 const result=await mock(url).startQR();
 assert.equal(result.confirmUrl,url);
});
test('normalizes relative school QR confirmation URL',async()=>{
 const result=await mock('/#/qrcodeConfirm/showConfirm?qrcodeId='+id).startQR();
 assert.equal(result.confirmUrl,'https://jw.gzucm.edu.cn/#/qrcodeConfirm/showConfirm?qrcodeId='+id);
});
test('rejects foreign QR confirmation host and uses only documented school route',async()=>{
 const result=await mock('https://untrusted.example/sso?opaque=secret').startQR();
 assert.equal(new URL(result.confirmUrl).hostname,'jw.gzucm.edu.cn');
 assert.equal(result.confirmUrl,'https://jw.gzucm.edu.cn/#/qrcodeConfirm/showConfirm?qrcodeId='+id);
 assert.ok(!result.confirmUrl.includes('opaque'));
});
test('does not reconstruct foreign URLs when QR identifier is malformed',async()=>{
 await assert.rejects(()=>mock('https://untrusted.example/', 'foo/../').startQR(),
   /二维码标识格式不符合预期/);
});
