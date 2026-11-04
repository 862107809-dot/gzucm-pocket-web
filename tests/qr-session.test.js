'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {SchoolClient}=require('../server/school');

test('QR bootstrap happens before QR API call, without requiring login credentials',async()=>{
  const calls=[];
  const c=new SchoolClient();
  c.request=async (url,form)=>{
    calls.push({url,form});
    if(url==='https://jw.gzucm.edu.cn/')return '<html>login</html>';
    return JSON.stringify({code:0,data:JSON.stringify({
      qrcodeId:'qrcodeLogin_abc123',
      confirmUrl:'https://jw.gzucm.edu.cn/#/qrcodeConfirm/showConfirm?qrcodeId=qrcodeLogin_abc123'
    })});
  };
  await c.startQR();
  assert.equal(calls[0].url,'https://jw.gzucm.edu.cn/');
  assert.equal(calls[1].url,'https://jw.gzucm.edu.cn/new/qrcodeLogin/qrcode');
  assert.equal(calls[1].form instanceof Object,true);
});

test('does not consider a JSESSIONID alone sufficient authentication',async()=>{
  const c=new SchoolClient();
  c.captureCookies('jw.gzucm.edu.cn',['JSESSIONID=anon-session; Path=/']);
  c.request=async()=>JSON.stringify({code:-401,message:'尚未登录'});
  assert.equal(c.hasSchoolSessionCookie(),true);
  assert.equal(await c.ping(),false);
});

test('valid timetable response verifies authentication',async()=>{
  const c=new SchoolClient();
  let form;
  c.request=async (url,params)=>{
    form=params;
    return JSON.stringify({code:0,data:[]});
  };
  assert.equal(await c.ping(),true);
  assert.match(form.xnxqdm,/^20\d{4}$/);
  assert.ok(form.d1.length>5);
  assert.ok(form.d2.length>5);
});

test('fallback calendar endpoint resolves false negative from timetable parameter validation',async()=>{
  const c=new SchoolClient();
  const called=[];
  c.request=async url=>{
    called.push(url);
    return JSON.stringify(called.length===1?{code:-2,message:'参数错误'}:{code:0,data:[]});
  };
  assert.equal(await c.ping(),true);
  assert.equal(called.length,2);
  assert.ok(called[1].endsWith('/new/xlxx/data'));
});

test('HTML and nonzero responses never count as authenticated',async()=>{
  const c=new SchoolClient();
  c.request=async()=>'<html>login required</html>';
  assert.equal(await c.ping(),false);
});

test('QR polling refuses to declare a connected session when academic APIs reject login',async()=>{
  const c=new SchoolClient();
  c.qr={id:'qrcodeLogin_abcdef1234',created:Date.now(),lastStatus:'pending'};
  c.request=async url=>url.includes('qrcodeStatus')
    ?JSON.stringify({code:0,data:JSON.stringify({status:'2',url:'/new/finished'})})
    :url.includes('/new/finished')?'ok'
    :JSON.stringify({code:-401,message:'尚未登录'});
  await assert.rejects(()=>c.pollQR(),{code:'GZQR_SESSION_NOT_READY'});
  assert.equal(c.connected,false);
});
