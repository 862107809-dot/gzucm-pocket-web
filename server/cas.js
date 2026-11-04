'use strict';
/**
 * Optional university-approved CAS client.
 * Identity verification does NOT produce a JW JSESSIONID or grant access to JW data.
 * Never accept a service callback or validation endpoint from the browser.
 */
const https=require('node:https');
const {URL}=require('node:url');
const LOGIN='https://authserver.gzucm.edu.cn/authserver/login';
const VALIDATE='https://authserver.gzucm.edu.cn/authserver/serviceValidate';
const CALLBACK_PATH='/auth/cas/callback';

function configuration(env=process.env){
 const registered=String(env.CAS_REGISTERED_CALLBACK_URL||'').trim();
 const approved=env.CAS_SSO_APPROVED==='1';
 let service=null;
 try{
  if(registered){
   const u=new URL(registered);
   if(u.protocol==='https:'&&u.pathname===CALLBACK_PATH&&!u.search&&!u.hash&&!u.username&&!u.password&&!u.port&&u.hostname!=='authserver.gzucm.edu.cn'){
    service=u.href;
   }
  }
 }catch{}
 return {enabled:approved&&!!service,service,
   reason:!approved?'学校尚未批准本站接入 CAS':!service?'未配置已获校方登记的 HTTPS 回调地址':''};
}
function loginUrl(service){
 const u=new URL(LOGIN);
 u.searchParams.set('service',service);
 return u.href;
}
function ticketValidFormat(ticket){
 return /^ST-[A-Za-z0-9._-]{8,900}$/.test(ticket);
}
function casSuccessXML(body){
 // CAS responses originate from the pinned university validation endpoint.
 // Never treat login HTML, 302 or a validation failure as success.
 if(typeof body!=='string'||body.length>131072||/<!DOCTYPE|<!ENTITY/i.test(body))return false;
 if(!/<(?:[\w-]+:)?serviceResponse\b/.test(body))return false;
 return /<(?:[\w-]+:)?authenticationSuccess(?:\s[^>]*)?>/.test(body)
   && /<\/(?:[\w-]+:)?authenticationSuccess\s*>/.test(body)
   && !/<(?:[\w-]+:)?authenticationFailure\b/.test(body);
}
function validateTicket(ticket,service,{transport=https}={}){
 if(!ticketValidFormat(ticket))return Promise.resolve(false);
 const u=new URL(VALIDATE);
 u.searchParams.set('service',service);
 u.searchParams.set('ticket',ticket);
 return new Promise((resolve,reject)=>{
  const req=transport.get(u,{timeout:10000,rejectUnauthorized:true,headers:{
   'Accept':'application/xml,text/xml','User-Agent':'GZUCM-Pocket-NonOfficial-CAS/1'
  }},res=>{
   if(res.statusCode!==200){res.resume();resolve(false);return;}
   let length=0;const chunks=[];
   res.on('data',chunk=>{
    length+=chunk.length;
    if(length>131072){req.destroy(new Error('CAS 验证响应超过安全上限'));return;}
    chunks.push(chunk);
   });
   res.on('end',()=>resolve(casSuccessXML(Buffer.concat(chunks).toString('utf8'))));
   res.on('error',reject);
  });
  req.on('timeout',()=>req.destroy(new Error('CAS 身份验证超时')));
  req.on('error',reject);
 });
}
module.exports={configuration,loginUrl,ticketValidFormat,casSuccessXML,validateTicket,CALLBACK_PATH};
