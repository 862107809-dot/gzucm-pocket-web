'use strict';
const https=require('node:https');
const {URL,URLSearchParams}=require('node:url');
const {parseJSON,requireLogin,parseSemester,parseWeek,parseGrades,parseLevels,parseFitness,parseExams}=require('./parsers');
const JW='https://jw.gzucm.edu.cn';
const ALLOWED=new Set(['jw.gzucm.edu.cn']);
const USER_AGENT='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
function checkUrl(url){const u=new URL(url);if(u.protocol!=='https:'||!ALLOWED.has(u.hostname)||u.port)throw Error('为保护学校会话，已阻止跳转到未经允许的域名');return u;}
class SchoolClient{
 constructor(){this.cookies=new Map();this.connected=false;this.qr=null;this.semester=null;}
 cookieHeader(url){const u=new URL(url);return [...this.cookies.values()].filter(c=>c.host===u.hostname&&u.pathname.startsWith(c.path)&&(!c.expires||c.expires>Date.now())).map(c=>c.name+'='+c.value).join('; ');}
 captureCookies(host,cookies){for(const raw of cookies||[]){const parts=String(raw).split(';');const [first,...attrs]=parts;const ix=first.indexOf('=');if(ix<1)continue;const name=first.slice(0,ix).trim(),value=first.slice(ix+1).trim();const path=attrs.map(a=>a.trim()).find(a=>/^path=/i.test(a))?.slice(5)||'/';if(!name||!path.startsWith('/'))continue;const key=host+'\t'+path+'\t'+name;const maxAge=attrs.find(a=>/^\s*max-age=/i.test(a))?.split('=')[1];if(!value||maxAge==='0'){this.cookies.delete(key);continue;}this.cookies.set(key,{host,path,name,value,expires:undefined});}}
 async request(url,form=null,referer=null,redirects=0){const u=checkUrl(url);if(redirects>4)throw Error('学校认证跳转次数超出安全限制');const method=form===null?'GET':'POST';const body=form===null?null:new URLSearchParams(form).toString();const headers={'User-Agent':USER_AGENT,'Accept':'application/json, text/javascript, */*; q=0.01','X-Requested-With':'XMLHttpRequest','Accept-Language':'zh-CN,zh;q=0.9','Referer':referer||JW+'/new/welcome.page?ui=new'};if(body!==null){headers['Content-Type']='application/x-www-form-urlencoded; charset=UTF-8';headers['Content-Length']=Buffer.byteLength(body);}const cookie=this.cookieHeader(u.toString());if(cookie)headers.Cookie=cookie;
 const result=await new Promise((resolve,reject)=>{const req=https.request(u,{method,headers,timeout:15000,rejectUnauthorized:true},res=>{const chunks=[];let len=0;res.on('data',c=>{len+=c.length;if(len>3_000_000){req.destroy(Error('学校响应超过大小限制'));return;}chunks.push(c);});res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString('utf8')}));res.on('error',reject);});req.on('timeout',()=>req.destroy(Error('学校接口连接超时，请检查网络或校园 VPN')));req.on('error',reject);if(body!==null)req.write(body);req.end();});
 this.captureCookies(u.hostname,result.headers['set-cookie']);
 if([301,302,303,307,308].includes(result.status)&&result.headers.location){
    const nextUrl=new URL(result.headers.location,u);
    // Safe production diagnostic: never log full URLs, query parameters, cookies, tickets or bodies.
    const destination=nextUrl.hostname==='jw.gzucm.edu.cn'?'jw.gzucm.edu.cn':nextUrl.hostname==='authserver.gzucm.edu.cn'?'authserver.gzucm.edu.cn':'other-domain';
    console.warn('[GZUCM auth redirect]', 'status='+result.status, 'from='+u.hostname, 'to='+destination);
    const next=nextUrl.toString();
    checkUrl(next);
    return this.request(next,null,url,redirects+1);
  }
 if(result.status>=500)throw Error('学校系统暂时不可用（HTTP '+result.status+'）');if(result.status===401||result.status===403)throw Error('学校拒绝访问，可能需要重新登录');return result.body;
 }
 async startQR(){
  this.connected=false;this.semester=null;this.cookies.clear();
  let phase='school-request';
  try {
    const raw=await this.request(JW+'/new/qrcodeLogin/qrcode',{},JW+'/');
    phase='parse-json';
    const root=parseJSON(raw);
    phase='check-response';
    if(root.code!==0&&String(root.code)!=='0')throw Error(root.message||'学校没有接受二维码申请');
    const detail=typeof root.data==='string'?parseJSON(root.data):root.data;
    if(!detail?.qrcodeId||!detail.confirmUrl)throw Error('学校二维码响应缺少必要字段');
    phase='verify-confirm-url';
    const qrId=String(detail.qrcodeId);
    const original=String(detail.confirmUrl);
    let url=new URL(original,JW);
    // Diagnostics reveal only public origin classification; never log QR identifiers,
    // link path/query/fragment, student details, Cookie values or CAS tickets.
    const hostClass=url.hostname==='jw.gzucm.edu.cn'?'jw'
      :url.hostname==='authserver.gzucm.edu.cn'?'sso'
      :url.hostname.endsWith('.gzucm.edu.cn')?'other-school':'external';
    const routeClass=url.hash.startsWith('#/qrcodeConfirm/showConfirm')?'school-qr-fragment'
      :url.pathname.includes('/qrcodeConfirm/')?'school-qr-path':'other';
    const sourceClass=original.startsWith('/')&&!original.startsWith('//')?'relative':'absolute';
    const schemeClass=url.protocol==='https:'?'https':url.protocol==='http:'?'http':'other';
    const fallbackNeeded=url.protocol!=='https:'||url.hostname!=='jw.gzucm.edu.cn'||!!url.port;
    const hasSchoolSessionCookie=!!this.cookieHeader(JW+'/new/qrcodeLogin/qrcodeStatus');
    console.warn('[GZUCM QR origin]',
      'source='+sourceClass,
      'scheme='+schemeClass,
      'host='+hostClass,
      'route='+routeClass,
      'fallback='+String(fallbackNeeded),
      'school_cookie='+String(hasSchoolSessionCookie));
    // QR confirmation is opened on the USER's device, not requested from
    // our server. The QR issuer may point to another official school subdomain.
    // Preserve the original school host rather than substituting jw.gzucm.edu.cn.
    // Require HTTPS, the documented QR fragment route, and an exact matching ID.
    if(!/^qrcodeLogin_[A-Za-z0-9_-]{4,240}$/.test(qrId)){
      throw Error('学校二维码标识格式不符合预期');
    }
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port
      ||!(url.hostname==='gzucm.edu.cn'||url.hostname.endsWith('.gzucm.edu.cn'))){
      throw Error('学校二维码确认地址不是受信任的学校域名');
    }
    const hashUrl=new URL(url.hash.slice(1),JW);
    if(hashUrl.pathname!=='/qrcodeConfirm/showConfirm'
      ||hashUrl.searchParams.get('qrcodeId')!==qrId){
      throw Error('学校二维码确认地址的路径或标识不匹配');
    }
    // The school's legacy URL can use plain HTTP. Never send the user to an
    // unencrypted authentication page: upgrade to HTTPS on the SAME host.
    const insecure=url.protocol==='http:';
    url=new URL('https://'+url.hostname+'/#/qrcodeConfirm/showConfirm?qrcodeId='+encodeURIComponent(qrId));
    console.warn('[GZUCM QR link]', 'school_host_preserved=true', 'https_upgraded='+String(insecure));
    this.qr={id:qrId,confirmUrl:url.href,created:Date.now(),lastStatus:'pending'};
    return {confirmUrl:url.href};
  } catch(err) {
    // Privacy-safe diagnostic. Never log URL paths, query strings, cookies or QR identifiers.
    const code=String(err?.message||'').includes('未经允许的域名')
      ? 'URL_DENIED'
      : String(err?.message||'').includes('超时') ? 'TIMEOUT'
      : String(err?.message||'').includes('ENOTFOUND') ? 'DNS_FAILURE'
      : String(err?.message||'').includes('ECONN') ? 'CONNECTION_FAILURE'
      : String(err?.message||'').includes('Unexpected token') ? 'INVALID_JSON'
      : 'UNEXPECTED';
    const phaseCode='GZQR_'+phase.toUpperCase().replaceAll('-','_')+'_'+code;
    console.warn('[GZUCM QR diagnostic]', 'phase='+phase, 'category='+code);
    err.code=phaseCode;
    throw err;
  }
}
 async pollQR(){
  if(!this.qr)throw Error('请先获取学校二维码');
  if(Date.now()-this.qr.created>30*60_000)throw Error('二维码已过期，请重新获取');
  if(this.connected)return {status:'connected',connected:true};
  let phase='request';
  try{
    const raw=await this.request(JW+'/new/qrcodeLogin/qrcodeStatus',{qrcodeId:this.qr.id},JW+'/');
    phase='parse-response';
    const root=parseJSON(raw);
    if(root.code!==0&&String(root.code)!=='0')throw Error(root.message||'学校查询扫码状态失败');
    const detail=typeof root.data==='string'?parseJSON(root.data):root.data||{};
    phase='read-status';
    // School versions have returned scanInfo either as an object or as JSON text.
    // Prefer the nested status when available; do not silently turn missing status into "0".
    let info=detail.scanInfo;
    if(typeof info==='string'){
      try{info=JSON.parse(info);}catch{info=null;}
    }
    if(!info||typeof info!=='object'||Array.isArray(info))info=detail;
    const rawStatus=info.status??detail.status;
    if(rawStatus===undefined||rawStatus===null){
      const err=Error('学校返回的扫码状态缺少 status 字段');
      err.code='GZQR_STATUS_MISSING';
      throw err;
    }
    const code=String(rawStatus);
    const known=code==='0'?'pending':code==='1'?'scanned':code==='2'?'confirmed':'other';
    this.qr.pollCount=(this.qr.pollCount||0)+1;
    if(known!==this.qr.lastStatus||this.qr.pollCount===1||this.qr.pollCount%6===0){
      // No student details, IDs, QR links, tokens, Cookie or response bodies in logs.
      console.warn('[GZUCM QR poll]', 'state='+known, 'nested='+String(info!==detail), 'attempt='+this.qr.pollCount);
    }
    if(code==='0'){this.qr.lastStatus='pending';return {status:'pending',connected:false};}
    if(code==='1'){this.qr.lastStatus='scanned';return {status:'scanned',connected:false};}
    if(code==='2'){
      phase='finish-login';
      this.qr.lastStatus='confirmed';
      const target=info.url||detail.url;
      if(!target){const err=Error('学校已确认扫码，但未返回登录完成地址');err.code='GZQR_FINAL_URL_MISSING';throw err;}
      const jump=new URL(String(target),JW);
      checkUrl(jump);
      await this.request(jump.href,null,JW+'/');
      phase='verify-session';
      const verified=await this.ping();
      this.connected=verified;
      if(!verified){const err=Error('扫码已确认，但教务会话尚未生效');err.code='GZQR_SESSION_NOT_READY';throw err;}
      this.qr.lastStatus='connected';
      console.warn('[GZUCM QR poll]', 'state=connected');
      return {status:'connected',connected:true};
    }
    console.warn('[GZUCM QR poll]', 'state=other');
    return {status:'pending',message:'学校返回了未知的扫码状态，请刷新二维码重试',connected:false};
  }catch(err){
    const reason=String(err?.message||'');
    const cat=reason.includes('未经允许的域名')?'URL_DENIED':reason.includes('超时')?'TIMEOUT':reason.includes('登录')?'AUTH_ERROR':'OTHER';
    console.warn('[GZUCM QR poll error]', 'phase='+phase, 'category='+cat);
    if(!err.code)err.code='GZQR_POLL_'+phase.toUpperCase().replaceAll('-','_')+'_'+cat;
    throw err;
  }
}
 async ping(){try{const raw=await this.request(JW+'/new/student/xsgrkb/getCalendarWeekDatas',{xnxqdm:'',zc:'',d1:'',d2:''},JW+'/new/student/xsgrkb/main.page');const j=parseJSON(raw);requireLogin(j);return String(j.code)==='0';}catch{return false;}}
 ensure(){if(!this.connected)throw Error('尚未通过学校身份认证，请先扫码连接');}
 async getSemester(code){this.ensure();const d=new Date(),guess=code||`${d.getMonth()>=7?d.getFullYear():d.getFullYear()-1}${d.getMonth()>=7?'01':'02'}`;if(!/^20\d{4}$/.test(guess)||!['01','02'].includes(guess.slice(-2)))throw Error('学期编码格式无效');if(this.semester?.code===guess)return this.semester;const raw=await this.request(JW+'/new/xlxx/data',{xnxqdm:guess},JW+'/new/welcome.page?ui=new');this.semester=parseSemester(raw,guess);return this.semester;}
 async getWeek(week){this.ensure();const sem=await this.getSemester();if(!Number.isInteger(week)||week<1||week>sem.totalWeeks)throw Error('教学周不在校历范围内');const d1=new Date(sem.firstMondayIso+'T12:00:00');d1.setDate(d1.getDate()-1);const d2=new Date(d1);d2.setDate(d1.getDate()+(sem.totalWeeks+2)*7);const format=d=>d.toISOString().slice(0,10)+' 00:00:00';const raw=await this.request(JW+'/new/student/xsgrkb/getCalendarWeekDatas',{xnxqdm:sem.code,zc:String(week),d1:format(d1),d2:format(d2)},JW+'/new/student/xsgrkb/main.page');return parseWeek(raw,sem,week);}
 async getGrades(){this.ensure();const jobs=[['grades','/new/student/xskccj/kccjDatas',{xnxqdm:'',source:'kccjlist',ismax:'1',page:'1',rows:'500',sort:'xnxqdm,kcmc',order:'desc,asc'},'/new/student/xskccj/main.page',parseGrades],['levels','/new/student/xskjcj/datas',{page:'1',rows:'100',sort:'xnxqdm',order:'asc'},'/new/student/xskjcj/xskjcjlist.page',parseLevels],['fitness','/new/student/xstccj/datas',{page:'1',rows:'100',sort:'xnxqdm',order:'asc'},'/new/student/xstccj',parseFitness]];const res=await Promise.allSettled(jobs.map(async([,endpoint,form,ref,parse])=>parse(await this.request(JW+endpoint,form,JW+ref))));if(res.every(x=>x.status==='rejected'))throw res[0].reason;return {grades:res[0].status==='fulfilled'?res[0].value:[],levels:res[1].status==='fulfilled'?res[1].value:[],fitness:res[2].status==='fulfilled'?res[2].value:[],warnings:res.map((x,i)=>x.status==='rejected'?jobs[i][0]+'未读取成功':null).filter(Boolean)};}
 async getExams(){this.ensure();const sem=await this.getSemester();const raw=await this.request(JW+'/new/student/xsksrw/paginateXsksrw',{xnxqdm:sem.code,page:'1',rows:'60',sort:'zc,xq,jcdm2',order:'asc'},JW+'/new/student/xsksrw/list.page');return parseExams(raw);}
 clear(){this.cookies.clear();this.connected=false;this.qr=null;this.semester=null;}
}
const QRCode=require('./vendor/QRCode');
const correction=require('./vendor/QRCode/QRErrorCorrectLevel');
function qrSvg(url){const qr=new QRCode(-1,correction.M);qr.addData(url);qr.make();const n=qr.getModuleCount(),pad=4,segments=[];for(let y=0;y<n;y++){for(let x=0;x<n;x++){if(qr.isDark(y,x))segments.push(`M${x+pad} ${y+pad}h1v1h-1z`);}}const size=n+2*pad;return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path fill="#123d2b" d="${segments.join('') }"/></svg>`;}
module.exports={SchoolClient,qrSvg,checkUrl};
