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
 constructor(){this.cookies=new Map();this.lastRead=0;this.cachedResult=null;this.cachedMonth='';this.inflight=null;this.inflightMonth='';}
 hasAuthenticatedSession(){return [...this.cookies.values()].some(c=>c.host==='ecard.gzucm.edu.cn'&&c.name==='JSESSIONID'&&c.value&&'/user/powerfee/index'.startsWith(c.path));}
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
  const current=new Date();
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit'}).formatToParts(current);
  const year=parts.find(x=>x.type==='year')?.value;
  const mon=parts.find(x=>x.type==='month')?.value;
  const requested=month||year+'-'+mon;
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(requested))throw Object.assign(Error('月份格式必须为 YYYY-MM'),{status:400});
  if(this.cachedResult&&this.cachedMonth===requested&&Date.now()-this.lastRead<45000)return this.cachedResult;
  if(this.inflight&&this.inflightMonth===requested)return this.inflight;
  this.inflightMonth=requested;
  this.inflight=this.readLive(requested);
  try{
   const result=await this.inflight;
   this.cachedResult=result;this.cachedMonth=requested;this.lastRead=Date.now();
   return result;
  }finally{this.inflight=null;this.inflightMonth='';}
 }
 async readLive(month){
  const html=await this.request(PORTAL);
  const context=parsePowerContext(html);
  let details=parsePowerHtml(html),source='ecard-page';
  const warnings=[];
  // Prefer the authenticated API; an HTML powerTips label may be stale.
  if(context){
   try{
    const result=await this.request(BASE+'/user/powerfee/getBalance',{
     implType:'CGCOMMON1001',schoolAreaNo:context.schoolAreaNo,
     buildingNo:context.buildingNo,roomNum:context.roomNum,from:'',token:context.token
    });
    details=parsePowerBalanceJson(result,context);
    source='ecard-live';
   }catch(err){
    if(!details)throw err;
    warnings.push('余额接口暂不可用，当前显示学校页面上的电量；请到官网核对。');
   }
  }
  if(!details)throw needLogin();
  const {token,schoolAreaNo,roomNum}=details;
  const recordMap=new Map();
  let historyStatus='unavailable';
  if(token&&schoolAreaNo&&roomNum){
   // A seven-day forecast at the beginning of a month needs last month's
   // usage too. Fetch only two adjacent months and at most 3 pages each.
   const m=new Date(month+'-01T12:00:00Z');m.setUTCMonth(m.getUTCMonth()-1);
   const previous=m.toISOString().slice(0,7);
   let complete=true,success=0;
   for(const lastDate of [month,previous]){
    for(let page=1;page<=3;page++){
     try{
      const response=await this.request(BASE+'/user/powerfee/getDailyDetails',{
       roomNum,lastDate,type:'2',implType:'CGCOMMON1001',schoolAreaNo,
       pageNum:String(page),pageSize:'30',token,from:''
      });
      const list=parsePowerDailyJson(response);
      for(const record of list){
       if(record.date.slice(0,7)===lastDate)recordMap.set(record.date,record);
      }
      success++;
      if(list.length<30)break;
     }catch(err){
      complete=false;
      warnings.push('用电明细部分月份读取失败，请稍后刷新。');
      break;
     }
    }
   }
   historyStatus=success?(complete?'complete':'partial'):'unavailable';
  }else warnings.push('学校页面没有提供读取用电明细所需的房间标识');
  const powerDaily=[...recordMap.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const {balance,unit,roomLabel}=details;
  return {power:{balance,unit,roomLabel,updatedAt:new Date().toISOString(),source},
   powerDaily,historyStatus,warnings,source,officialUrl:PORTAL};
 }
 clear(){this.cookies.clear();this.lastRead=0;this.cachedResult=null;this.cachedMonth='';this.inflight=null;this.inflightMonth='';}
}
module.exports={EcardClient,PORTAL,SIGN_IN,needLogin,safeUrl,parseSetCookies,cookieFor};
