'use strict';
/**
 * Read-only adapter for the campus card's *authenticated* power page.
 * This intentionally does not accept usernames, passwords or raw cookies from a public website.
 * An authenticated ecard session is a necessary precondition; visiting the school portal
 * in a separate Safari tab cannot make its HttpOnly cookies available to this service.
 */
const https = require('node:https');
const {URL,URLSearchParams} = require('node:url');
const {parsePowerHtml,parsePowerContext,parsePowerBalanceJson,parsePowerDailyJson} = require('./parsers');
const BASE='https://ecard.gzucm.edu.cn';
const PORTAL=BASE+'/user/powerfee/index';
const SIGN_IN=BASE+'/sso/login?plat=gzzyy';
const BROWSER_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
function needLogin(){return Object.assign(new Error('一卡通需要单独完成学校官方认证；网页无法读取你在另一个 Safari 标签中的一卡通 Cookie。请使用下方“打开学校实时电费页”查询。'),{status:428,code:'ECARD_LOGIN_REQUIRED',officialUrl:PORTAL});}
function safeUrl(v){const u=new URL(v);if(u.protocol!=='https:'||u.hostname!=='ecard.gzucm.edu.cn'||u.port)throw Error('一卡通跳转不是已允许的学校域名');return u;}
function parseSetCookies(host,arr,jar){for(const raw of arr||[]){const [first,...flags]=raw.split(';');const ix=first.indexOf('=');if(ix<1)continue;const name=first.slice(0,ix).trim(),value=first.slice(ix+1);const path=flags.find(v=>/^\s*path=/i.test(v))?.split('=')[1]?.trim()||'/';const key=host+'\0'+path+'\0'+name;const del=flags.find(v=>/^\s*max-age=/i.test(v));if(!value||del&&Number(del.split('=')[1])<=0){jar.delete(key);continue;}if(path.startsWith('/'))jar.set(key,{host,path,name,value});}}
function cookieFor(jar,url){return [...jar.values()].filter(c=>c.host===url.hostname&&url.pathname.startsWith(c.path)).sort((a,b)=>b.path.length-a.path.length).map(c=>`${c.name}=${c.value}`).join('; ');}
class EcardClient{
 constructor(){this.cookies=new Map();this.lastRead=0;}
 hasAuthenticatedSession(){return [...this.cookies.values()].some(c=>c.host==='ecard.gzucm.edu.cn'&&c.name==='JSESSIONID'&&c.value&&c.path.startsWith('/user'));}
 async request(target,body=null,hop=0){
  const u=safeUrl(target);if(hop>4)throw Error('一卡通页面重定向过多');
  const encoded=body===null?null:new URLSearchParams(body).toString();
  const headers={'User-Agent':BROWSER_UA,'Accept':'text/html,application/json;q=0.9,*/*;q=0.7','Accept-Language':'zh-CN,zh;q=0.9','Referer':BASE+'/user/index','X-Requested-With':'XMLHttpRequest'};
  const cookie=cookieFor(this.cookies,u);if(cookie)headers.Cookie=cookie;
  if(encoded!==null){headers['Content-Type']='application/x-www-form-urlencoded; charset=UTF-8';headers['Content-Length']=Buffer.byteLength(encoded);}
  const response=await new Promise((resolve,reject)=>{const req=https.request(u,{method:encoded===null?'GET':'POST',headers,timeout:16000,rejectUnauthorized:true},res=>{const chunks=[];let size=0;res.on('data',chunk=>{size+=chunk.length;if(size>2_000_000){req.destroy(Error('一卡通响应过大'));return;}chunks.push(chunk);});res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString('utf8')}));res.on('error',reject);});req.on('timeout',()=>req.destroy(Error('一卡通响应超时')));req.on('error',reject);if(encoded!==null)req.write(encoded);req.end();});
  parseSetCookies(u.hostname,response.headers['set-cookie'],this.cookies);
  if([301,302,303,307,308].includes(response.status)&&response.headers.location){
   const next=new URL(response.headers.location,u);if(next.hostname==='authserver.gzucm.edu.cn')throw needLogin();safeUrl(next.href);return this.request(next.href,null,hop+1);
  }
  if(response.status===401||response.status===403)throw needLogin();
  if(response.status>=400)throw Object.assign(new Error('一卡通接口返回 HTTP '+response.status),{status:502});
  if(/统一身份认证|authserver\.gzucm\.edu\.cn|id=["']loginForm/i.test(response.body))throw needLogin();
  return response.body;
 }
 async live(month){
  if(!this.hasAuthenticatedSession())throw needLogin();
  const html=await this.request(PORTAL);
  // The page may render a static powerTips balance, or fetch it dynamically from
  // getBalance using the bound room IDs and session token.
  const context=parsePowerContext(html);
  let details=parsePowerHtml(html);
  if(context){
    try{
      const result=await this.request(BASE+'/user/powerfee/getBalance',{
        implType:'CGCOMMON1001',schoolAreaNo:context.schoolAreaNo,
        buildingNo:context.buildingNo,roomNum:context.roomNum,from:'',token:context.token
      });
      details=parsePowerBalanceJson(result,context);
    }catch(err){
      if(!details)throw err;
      console.warn('[GZUCM ecard]','balance_api=unavailable','page_balance=available');
    }
  }
  if(!details)throw needLogin();
  const {token,schoolAreaNo,roomNum}=details;
  const day=(month&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))?month:new Date().toISOString().slice(0,7);
  const warnings=[];let powerDaily=[];
  if(token&&schoolAreaNo&&roomNum){
   try{
    const records=new Map();
    for(let page=1;page<=4;page++){
     const response=await this.request(BASE+'/user/powerfee/getDailyDetails',{roomNum,lastDate:day,type:'2',implType:'CGCOMMON1001',schoolAreaNo,pageNum:String(page),pageSize:'30',token,from:''});
     const list=parsePowerDailyJson(response);for(const record of list)records.set(record.date,record);
     if(list.length<30)break;
    }
    powerDaily=[...records.values()].sort((a,b)=>a.date.localeCompare(b.date));
   }catch(err){warnings.push('实时余额已读取，但用电明细暂时无法同步：'+String(err.message).slice(0,90));}
  }else warnings.push('一卡通页面缺少用电明细所需的房间标识或 Token');
  this.lastRead=Date.now();
  const {balance,unit,roomLabel}=details;
  return {power:{balance,unit,roomLabel,updatedAt:new Date().toISOString(),source:'ecard-live'},powerDaily,warnings,source:'ecard-live',officialUrl:PORTAL};
 }
 clear(){this.cookies.clear();this.lastRead=0;}
}
module.exports={EcardClient,PORTAL,SIGN_IN,needLogin,safeUrl,parseSetCookies,cookieFor};
