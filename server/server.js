'use strict';
/** Zero-dependency local server. Authentication cookies are kept ONLY in process memory. */
const http=require('node:http');
const https=require('node:https');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {SchoolClient,qrSvg}=require('./school');
const {EcardClient,PORTAL}=require('./ecard');
const CAS=require('./cas');
const ROOT=path.resolve(__dirname,'..');
const PORT=Number(process.env.PORT)||4173;
// Loopback by default. Do not expose school session cookies to public networks.
const PUBLIC=process.env.PUBLIC_MODE==='1';
const HOST=process.env.HOST||'127.0.0.1';
const TLS_CERT=process.env.TLS_CERT||'';
const TLS_KEY=process.env.TLS_KEY||'';
const LAN=!['127.0.0.1','localhost','::1'].includes(HOST);
const ACCESS_CODE=process.env.ACCESS_CODE||'';
// Never expose student sessions over plain HTTP or without an access gate.
if(Boolean(TLS_CERT)!==Boolean(TLS_KEY))throw Error('TLS_CERT 与 TLS_KEY 必须同时指定');
if(LAN&&!PUBLIC&&(!TLS_CERT||!TLS_KEY||ACCESS_CODE.length<12))throw Error('远程设备访问必须设置受信任的 HTTPS 证书和长度至少 12 位的 ACCESS_CODE');
const ACCESS_DIGEST=crypto.createHash('sha256').update('gzucm-lan-v1|'+ACCESS_CODE).digest('hex');
function hasAccess(req){if(PUBLIC||!LAN)return true;const token=readCookies(req).gzaccess||'';return token.length===ACCESS_DIGEST.length&&crypto.timingSafeEqual(Buffer.from(token),Buffer.from(ACCESS_DIGEST));}
function pairingPage(res,failed=false){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#eaf4ec"><title>设备配对 · 广中医口袋</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;background:radial-gradient(circle at top left,#c4e3ce,#eaf3ef 45%,#f6f7ee);color:#173e2e;min-height:100vh;display:grid;place-items:center;margin:0;padding:20px}main{width:min(100%,390px);background:rgba(255,255,255,.68);backdrop-filter:blur(24px);border:1px solid #ffffffbd;border-radius:28px;padding:32px;box-shadow:0 15px 45px #254d3120}h1{font-size:26px;margin:0 0 12px}p{font-size:14px;color:#667d70;line-height:1.7}label{font-size:13px;font-weight:700}input{width:100%;box-sizing:border-box;border:1px solid #b8cdbf;border-radius:13px;padding:15px;font-size:17px;margin:10px 0 16px}button{width:100%;background:#28694d;color:#fff;border:0;border-radius:14px;padding:15px;font-size:15px;font-weight:700}small{display:block;margin-top:18px;color:#6e8375;line-height:1.65}.error{color:#a23635}</style><main><h1>连接你的校园空间</h1><p>此设备正在访问由你自己的 Mac 运行的私人服务。请填写 Mac 终端中设置的访问口令。</p>${failed?'<p class="error">配对码不正确，请重试。</p>':''}<form action="/pair" method="post"><label for="code">设备访问口令</label><input id="code" name="code" type="password" autocomplete="one-time-code" required autofocus maxlength="256"><button type="submit">安全连接</button></form><small>该口令不是学校密码。学校登录仍在官方页面扫码确认。请勿把此站点暴露到公网。</small></main></html>`);}
function readSmallForm(req){return new Promise((resolve,reject)=>{let size=0,chunks=[];req.on('data',c=>{size+=c.length;if(size>2048){reject(Error('表单过大'));req.destroy();return;}chunks.push(c)});req.on('end',()=>resolve(new URLSearchParams(Buffer.concat(chunks).toString('utf8'))));req.on('error',reject);});}
const TTL=12*60*60*1000;
const sessions=new Map();
const SESSION_COOKIE=PUBLIC?'__Host-gzsid':'gzsid';
const MAX_SESSIONS=300;
const qrStarts=[]; // Shared limiter reduces unintended school QR traffic on a public host.
const powerAttempts=[]; // Avoid overloading the official ecard server from a public service.
const CAS_CONFIG=CAS.configuration();
const CAS_COOKIE=PUBLIC?'__Host-gzcas':'gzcas';
const CAS_PENDING=new Map();
const CAS_MAX_PENDING=100;
const CAS_MAX_AGE=5*60*1000;
function appendCookie(res,cookie){
 const old=res.getHeader('Set-Cookie');
 res.setHeader('Set-Cookie',old?[...(Array.isArray(old)?old:[old]),cookie]:cookie);
}
function casResultPage(res,status){
 const ok=status==='ok';
 const message=ok?'学校统一身份认证已验证；请返回广中医口袋查看状态。教务课表同步仍可能需要独立授权。'
  :'学校身份认证未完成或回调无法验证；请返回广中医口袋使用扫码同步。';
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
 res.end('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>统一认证结果 · 广中医口袋</title></head><body style="margin:0;font:16px/1.7 system-ui;background:#153526;color:#eef8f0;display:grid;place-items:center;min-height:100vh"><main style="max-width:430px;padding:30px"><h1>官方认证结果</h1><p>'+message+'</p><p><a style="color:#ade7c0" href="/">返回广中医口袋</a></p></main><script src="/cas-complete.js" defer></script></body></html>');
}
function finishCasCallback(res,ok){
 appendCookie(res,`${CAS_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
 res.writeHead(303,{'Location':'/auth/cas/complete?status='+(ok?'ok':'failed'),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
 res.end();
}
function qrAllowed(){const now=Date.now();while(qrStarts.length&&qrStarts[0]<now-60000)qrStarts.shift();if(qrStarts.length>=18)return false;qrStarts.push(now);return true;}
function powerAllowed(){const now=Date.now();while(powerAttempts.length&&powerAttempts[0]<now-60000)powerAttempts.shift();if(powerAttempts.length>=24)return false;powerAttempts.push(now);return true;}
function isHttps(req){return req.socket.encrypted || (PUBLIC && req.headers['x-forwarded-proto']==='https');}
function sessionCookie(value){return `${SESSION_COOKIE}=${value}; HttpOnly; Path=/; SameSite=Strict; Max-Age=43200${(PUBLIC||LAN)?'; Secure':''}`;}
const allowedFiles=new Map(Object.entries({
 '/':'index.html','/index.html':'index.html','/boot-check.js':'boot-check.js','/cas-complete.js':'cas-complete.js','/privacy.html':'privacy.html','/styles.css':'styles.css','/app.js':'app.js','/data.js':'data.js','/manifest.webmanifest':'manifest.webmanifest','/sw.js':'sw.js','/assets/icon.svg':'assets/icon.svg','/assets/apple-touch-icon.png':'assets/apple-touch-icon.png'
}));
const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
function secureHeaders(res){if(PUBLIC)res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('Content-Security-Policy',"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; manifest-src 'self'; form-action 'self'");}
function reply(res,status,value,extras={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extras});res.end(JSON.stringify(value));}
function sendFile(res,filename){const full=path.join(ROOT,filename);fs.readFile(full,(err,buf)=>{if(err){reply(res,404,{error:'文件不存在'});return;}res.writeHead(200,{'Content-Type':TYPES[path.extname(filename)]||'application/octet-stream','Cache-Control':filename==='sw.js'?'no-cache':'private, max-age=300'});res.end(buf);});}
function readCookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(s=>{const i=s.indexOf('=');return i>0?[s.slice(0,i).trim(),s.slice(i+1).trim()]:['',''];}).filter(x=>x[0]));}
function getSession(req,res){let sid=readCookies(req)[SESSION_COOKIE],stored=sid&&sessions.get(sid);if(stored&&Date.now()-stored.accessed>TTL){stored.client.clear();stored.ecard.clear();sessions.delete(sid);stored=null;}if(!stored){if(sessions.size>=MAX_SESSIONS)throw Object.assign(Error('当前登录人数较多，请稍后重试'),{status:503});sid=crypto.randomBytes(32).toString('base64url');stored={id:sid,client:new SchoolClient(),ecard:new EcardClient(),accessed:Date.now(),lastRequest:0,lastPowerRequest:0,rotated:false};sessions.set(sid,stored);res.setHeader('Set-Cookie',sessionCookie(sid));}stored.accessed=Date.now();return stored;}
function isPostAllowed(req){const origin=req.headers.origin;if(!origin)return !PUBLIC;try{const u=new URL(origin);return u.host===req.headers.host&&u.protocol===(isHttps(req)?'https:':'http:')&&(req.headers['sec-fetch-site']!=='cross-site');}catch{return false;}}
async function handler(req,res){secureHeaders(res);const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/health'){return reply(res,200,{ok:true,version:'1.3.0'});}
 if(PUBLIC&&!isHttps(req)){return reply(res,426,{error:'此公开站点只能通过受信任的 HTTPS 反向代理访问'});}
 if(url.pathname==='/deployment-config.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});res.end(`window.GZUCM_PUBLIC=${PUBLIC?'true':'false'};`);return;}
 if(LAN&&!PUBLIC&&url.pathname==='/pair'&&req.method==='POST'){
  if(!isPostAllowed(req)){reply(res,403,{error:'跨站表单被拒绝'});return;}
  const fields=await readSmallForm(req),given=String(fields.get('code')||'');
  const digest=crypto.createHash('sha256').update('gzucm-lan-v1|'+given).digest('hex');
  if(given&&crypto.timingSafeEqual(Buffer.from(digest),Buffer.from(ACCESS_DIGEST))){
   res.writeHead(303,{'Location':'/','Set-Cookie':`gzaccess=${ACCESS_DIGEST}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`,'Cache-Control':'no-store'});res.end();return;
  }pairingPage(res,true);return;
 }
 if(!hasAccess(req)){pairingPage(res);return;}
 if(url.pathname==='/auth/cas/complete'&&req.method==='GET'){
  casResultPage(res,url.searchParams.get('status'));return;
 }
 if(url.pathname==='/auth/cas/start'&&req.method==='GET'){
  if(!CAS_CONFIG.enabled){return casResultPage(res,'failed');}
  if(req.headers.host!==new URL(CAS_CONFIG.service).host){return reply(res,400,{error:'CAS 回调域名不符合已登记的域名'});}
  const s=getSession(req,res);
  if(s.casPending)CAS_PENDING.delete(s.casPending);
  if(CAS_PENDING.size>=CAS_MAX_PENDING){return reply(res,429,{error:'当前身份认证请求过多，请稍后重试'});}
  const nonce=crypto.randomBytes(32).toString('base64url');
  s.casPending=nonce;
  CAS_PENDING.set(nonce,{session:s,created:Date.now()});
  appendCookie(res,`${CAS_COOKIE}=${nonce}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=300`);
  res.writeHead(302,{'Location':CAS.loginUrl(CAS_CONFIG.service),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  res.end();return;
 }
 if(url.pathname===CAS.CALLBACK_PATH&&req.method==='GET'){
  const nonce=readCookies(req)[CAS_COOKIE]||'';
  const pending=CAS_PENDING.get(nonce);
  CAS_PENDING.delete(nonce);
  if(!CAS_CONFIG.enabled||!pending||Date.now()-pending.created>CAS_MAX_AGE||pending.session.casPending!==nonce){
   return finishCasCallback(res,false);
  }
  pending.session.casPending=null;
  const ticket=url.searchParams.get('ticket')||'';
  let valid=false;
  if(CAS.ticketValidFormat(ticket)){
   try{valid=await CAS.validateTicket(ticket,CAS_CONFIG.service);}
   catch{valid=false;}
  }
  // CAS authentication proves SSO identity, not an authorized JW academic session.
  if(valid&&[...sessions.values()].includes(pending.session)){
   pending.session.casVerified=true;
   pending.session.casVerifiedAt=Date.now();
   pending.session.accessed=Date.now();
  }
  return finishCasCallback(res,valid);
 }
 if(url.pathname==='/favicon.ico'){res.writeHead(302,{Location:'/assets/icon.svg'});res.end();return;}
 if(!url.pathname.startsWith('/api/')){if(req.method!=='GET'&&req.method!=='HEAD'){reply(res,405,{error:'不支持的方法'});return;}const file=allowedFiles.get(url.pathname);if(!file){reply(res,404,{error:'页面不存在'});return;}sendFile(res,file);return;}
 if(req.method!=='GET'&&req.method!=='POST'){reply(res,405,{error:'不支持的方法'});return;}
 if(req.method==='POST'&&(!isPostAllowed(req)||(PUBLIC&&!String(req.headers['content-type']||'').startsWith('application/json')))){reply(res,403,{error:'非法跨站请求'});return;}
 const s=getSession(req,res);
 try{
  const p=url.pathname;
  if(p==='/api/health'&&req.method==='GET')return reply(res,200,{ok:true,app:'广中医口袋 Web',version:'1.3.0',mode:PUBLIC?'public':LAN?'paired-https':'localhost'});
  if(p==='/api/session'&&req.method==='GET')return reply(res,200,{connected:s.client.connected,casAvailable:CAS_CONFIG.enabled,casVerified:!!s.casVerified,campus:'undergrad',qrPending:!!s.client.qr,powerBackend:'authenticated-session-required',mode:PUBLIC?'public':LAN?'paired-https':'localhost'});
  if(p==='/api/qr/start'&&req.method==='POST'){
   if(Date.now()-s.lastRequest<4000)return reply(res,429,{error:'请勿频繁申请学校二维码'});
   if(PUBLIC&&!qrAllowed())return reply(res,429,{error:'公开站点扫码请求较多，请稍后重试'});
   s.lastRequest=Date.now();s.rotated=false;
   let phase='request-school';
   try{
    const info=await s.client.startQR();
    phase='render-svg';
    const svg=qrSvg(info.confirmUrl);
    console.warn('[GZUCM QR start]', 'phase=complete', 'result=ok');
    return reply(res,200,{confirmUrl:info.confirmUrl,svg});
   }catch(err){
    const category=err?.code?.startsWith('GZQR_')?'school-qr'
     :phase==='render-svg'?'svg-error':'school-qr-other';
    console.warn('[GZUCM QR start]', 'phase='+phase, 'category='+category);
    if(!err?.code)err.code=phase==='render-svg'?'GZQR_SVG_FAILED':'GZQR_START_FAILED';
    if(!err?.message)err.message=phase==='render-svg'?'二维码图形生成失败':'二维码接口请求失败';
    throw err;
   }
  }
  if(p==='/api/qr/status'&&req.method==='GET'){const result=await s.client.pollQR();if(PUBLIC&&result.connected&&!s.rotated){const next=crypto.randomBytes(32).toString('base64url');sessions.delete(s.id);s.id=next;s.rotated=true;sessions.set(next,s);res.setHeader('Set-Cookie',sessionCookie(next));}return reply(res,200,result);}
  if(p==='/api/academic/semester'&&req.method==='GET')return reply(res,200,{semester:await s.client.getSemester(url.searchParams.get('code'))});
  if(p==='/api/academic/week'&&req.method==='GET'){const w=Number(url.searchParams.get('week'));if(!Number.isInteger(w)||w<1||w>30)return reply(res,400,{error:'请输入 1 到 30 的教学周'});return reply(res,200,{sessions:await s.client.getWeek(w),week:w});}
  if(p==='/api/academic/grades'&&req.method==='GET')return reply(res,200,await s.client.getGrades());
  if(p==='/api/academic/exams'&&req.method==='GET')return reply(res,200,{exams:await s.client.getExams()});
  if(p==='/api/power'&&req.method==='GET'){
   if(Date.now()-s.lastPowerRequest<8000)return reply(res,429,{error:'电费查询请至少间隔 8 秒'});
   if(PUBLIC&&!powerAllowed())return reply(res,429,{error:'官方电费查询请求过多，请稍后重试'});
   s.lastPowerRequest=Date.now();
   const result=await s.ecard.live(url.searchParams.get('month'));
   return reply(res,200,result);
  }
  if(p==='/api/logout'&&req.method==='POST'){s.client.clear();s.ecard.clear();if(s.casPending)CAS_PENDING.delete(s.casPending);s.casPending=null;s.casVerified=false;s.casVerifiedAt=0;sessions.delete(s.id);res.setHeader('Set-Cookie',`${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${(PUBLIC||LAN)?'; Secure':''}`);return reply(res,200,{ok:true});}
  return reply(res,404,{error:'API 不存在'});
 }catch(error){const message=String(error?.message||'请求失败').replace(/[\r\n]/g,' ').slice(0,300);const status=error?.status||(/尚未|失效|重新认证/.test(message)?401:/二维码已过期/.test(message)?410:/超时|连接/.test(message)?503:502);return reply(res,status,{error:message,...(error?.code?{code:error.code}:{}),...(error?.officialUrl?{officialUrl:error.officialUrl}:{})});}
}
setInterval(()=>{for(const [sid,s] of sessions){if(Date.now()-s.accessed>TTL){s.client.clear();s.ecard.clear();if(s.casPending)CAS_PENDING.delete(s.casPending);sessions.delete(sid);}}for(const [nonce,p] of CAS_PENDING){if(Date.now()-p.created>CAS_MAX_AGE)CAS_PENDING.delete(nonce);}},600_000).unref();
const listener=(req,res)=>{handler(req,res).catch(err=>{console.error('[gzucm server]',String(err.message).slice(0,130));if(!res.headersSent)reply(res,500,{error:'本地服务内部错误'});else res.end();});};
const server=TLS_CERT ? https.createServer({cert:fs.readFileSync(TLS_CERT),key:fs.readFileSync(TLS_KEY)},listener) : http.createServer(listener);
server.listen(PORT,HOST,()=>{console.log(`广中医口袋 Web 已启动： ${TLS_CERT?'https':'http'}://${HOST}:${PORT}`);console.log(PUBLIC?'公开测试模式（需由 Render 等可信 HTTPS 反向代理提供 TLS），每个浏览器的学校会话相互隔离，重启后会话清空。':LAN?'已启用 HTTPS + 设备访问口令，学校会话仅保存在服务端内存。':'仅限本机访问，学校会话保存在 Node 进程内存中。');});
module.exports={server};
