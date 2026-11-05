'use strict';
/**
 * Explicitly opted-in, push-only bridge from the native GZUCM Pocket app.
 * Does not accept/store school cookies, passwords, tokens or student IDs.
 * Transient in-process memory is deliberate: without durable deployment storage,
 * a server restart requires a fresh pairing. Never claim permanent login.
 */
const crypto=require('node:crypto');
const MAX_LINKS=150,LINK_TTL=30*86400000,PENDING_TTL=5*60000;
const links=new Map(),pending=new Map();
const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const dayOk=value=>{
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(String(value||'')))return false;
 const iso=String(value),date=new Date(iso+'T12:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===iso;
};
function prune(){
 const now=Date.now();
 for(const [code,entry] of pending)if(now>entry.expires)pending.delete(code);
 for(const [id,entry] of links)if(now>entry.expires)links.delete(id);
}
function error(message,status=400){return Object.assign(Error(message),{status});}
function create(){
 prune();
 if(links.size>=MAX_LINKS)throw error('同时连接的网站较多，请稍后重试',429);
 let code;do{code=crypto.randomBytes(9).toString('base64url').toUpperCase();}while(pending.has(code));
 const id=crypto.randomBytes(24).toString('base64url');
 const entry={id,hash:null,status:'pending',attemptedAt:0,pushedAt:0,expires:Date.now()+LINK_TTL,version:0,snapshot:null,history:[],lastDay:'',lastRoom:'',lastUnit:''};
 links.set(id,entry);
 pending.set(code,{id,expires:Date.now()+PENDING_TTL});
 return {code,id,expiresAt:new Date(Date.now()+PENDING_TTL).toISOString()};
}
const failed={count:0,reset:0};
function claim(code){
 prune();
 const now=Date.now();
 if(now>failed.reset){failed.count=0;failed.reset=now+60000;}
 if(++failed.count>60)throw error('配对验证请求过多，请稍后重试',429);
 const key=String(code||'').trim().toUpperCase();
 if(!/^[A-Z0-9_-]{12}$/.test(key))throw error('配对码无效或已经过期',404);
 const pendingEntry=pending.get(key);
 if(!pendingEntry||pendingEntry.expires<Date.now())throw error('配对码无效或已经过期',404);
 const entry=links.get(pendingEntry.id);
 pending.delete(key);
 if(!entry||entry.status!=='pending')throw error('配对码已经使用',409);
 const token=crypto.randomBytes(32).toString('base64url');
 entry.hash=hash(token);
 entry.status='paired';
 return {token,expiresAt:new Date(entry.expires).toISOString()};
}
function clean(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw error('电量数据格式无效');
 const power=input.power;
 if(!power||typeof power!=='object')throw error('缺少电量余额');
 const n=Number(power.balance),label=String(power.roomLabel||'').trim();
 if(!Number.isFinite(n)||n<0||n>1000000||!label||label.length>64||!['度','kWh','千瓦时','度电'].includes(power.unit))throw error('余额或宿舍信息格式无效');
 const at=Date.parse(power.updatedAt||'');
 if(!Number.isFinite(at)||at>Date.now()+60000||at<Date.now()-7*86400000)throw error('电量更新时间无效');
 const rows=Array.isArray(input.powerDaily)?input.powerDaily:[];
 if(rows.length>90)throw error('用电明细超过 90 条');
 const daily=new Map();
 for(const row of rows){
  if(!row||!dayOk(row.date))continue;
  const usage=Number(row.usage),remain=row.remain==null?null:Number(row.remain),total=row.total==null?null:Number(row.total);
  if(!Number.isFinite(usage)||usage<0||usage>100000||remain!==null&&(!Number.isFinite(remain)||remain<0||remain>1000000)||
     total!==null&&(!Number.isFinite(total)||total<0||total>1000000))continue;
  daily.set(row.date,{date:row.date,usage,remain,total});
 }
 return {power:{balance:n,unit:power.unit,roomLabel:label,updatedAt:new Date(at).toISOString(),source:'ios-native'},
  powerDaily:[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-90),
  historyStatus:input.historyStatus==='complete'?'complete':'partial',
  source:'ios-native'};
}
function findToken(token){
 prune();
 if(typeof token!=='string'||!/^[-_A-Za-z0-9]{40,100}$/.test(token))throw error('设备授权无效或已失效',401);
 const digest=hash(token);
 for(const entry of links.values()){
  if(entry.hash&&crypto.timingSafeEqual(Buffer.from(entry.hash),Buffer.from(digest)))return entry;
 }
 throw error('设备授权无效或已失效，请重新配对',401);
}
function push(token,payload){
 const entry=findToken(token),now=Date.now();
 if(now-entry.attemptedAt<15000)throw error('同步太频繁，请稍后重试',429);
 entry.attemptedAt=now;
 const snapshot=clean(payload);
 if(entry.lastRoom!==snapshot.power.roomLabel||entry.lastUnit!==snapshot.power.unit)entry.history=[];
 entry.lastRoom=snapshot.power.roomLabel;entry.lastUnit=snapshot.power.unit;
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(snapshot.power.updatedAt));
 entry.history=entry.history.filter(x=>x.date!==date);
 entry.history.push({date,balance:snapshot.power.balance,at:snapshot.power.updatedAt});
 entry.history=entry.history.sort((a,b)=>a.at.localeCompare(b.at)).slice(-90);
 entry.snapshot=snapshot;
 entry.status='paired';
 entry.pushedAt=now;
 entry.version++;
 return {ok:true,receivedAt:new Date(now).toISOString()};
}
function read(id){
 prune();
 const entry=links.get(id);
 if(!entry)return {status:'expired'};
 return {status:entry.status,paired:!!entry.hash,updatedAt:entry.pushedAt?new Date(entry.pushedAt).toISOString():null,
  version:entry.version,expiresAt:new Date(entry.expires).toISOString(),
  ...(entry.snapshot?{...entry.snapshot,history:entry.history}:{} )};
}
function revoke(id){
 prune();const entry=links.get(id);
 if(!entry)return;
 links.delete(id);
 for(const [code,p] of pending)if(p.id===id)pending.delete(code);
}
module.exports={create,claim,push,read,revoke,clean};
