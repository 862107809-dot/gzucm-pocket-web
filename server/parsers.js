'use strict';
/** Normalize read-only official response formats. No student names, phone numbers or IDs persisted. */
const text=(o,k)=>o&&o[k]!==null&&o[k]!==undefined?String(o[k]):'';
const num=(o,k,alt=0)=>{const n=Number(o?.[k]);return Number.isFinite(n)?n:alt;};
const parseJSON=str=>{try{return JSON.parse(str);}catch{throw new Error('学校响应不是有效 JSON，可能已跳转到登录页面');}};
function requireLogin(json){const code=String(json?.code??'');const msg=String(json?.message??json?.msg??'');if(code==='-401'||/尚未登录|登录失效|重新登录|已在别处登录/.test(msg))throw new Error('学校登录状态失效，请重新认证');}
function utcDay(iso){const m=String(iso).slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return NaN;return Date.UTC(+m[1],+m[2]-1,+m[3]);}
function addDays(iso,n){const d=new Date(utcDay(iso)+n*864e5);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):'';}
function weekOf(firstMonday,date){return Math.floor((utcDay(date)-utcDay(firstMonday))/864e5/7)+1;}
function parseSemester(raw,code){const root=typeof raw==='string'?parseJSON(raw):raw;requireLogin(root);if(!Array.isArray(root?.data))throw Error('校历缺少 data 数组');let maxWeek=0,firstMonday='';for(const group of root.data){if(!Array.isArray(group))continue;for(const row of group){if(!Array.isArray(row)||!row.length||text(row[0],'type')!=='zc')continue;const w=num(row[0],'value',0);if(w>maxWeek)maxWeek=w;if(w===1&&!firstMonday){const day=row.slice(1).find(d=>d?.type==='day'&&/^\d{4}-\d{2}-\d{2}/.test(d.fullText||''));if(day)firstMonday=addDays(day.fullText,1);}}}if(!firstMonday||maxWeek<1||maxWeek>30)throw Error('校历数据不完整，无法确定第一周日期及总周数');const yr=Number(String(code).slice(0,4)),spring=String(code).endsWith('02');return {code:String(code),name:`${yr}—${yr+1} 学年 ${spring?'第二':'第一'}学期`,firstMondayIso:firstMonday,totalWeeks:maxWeek};}
function roomName(o,week){const main=text(o,'jxcdmc').trim();if(main)return main;const tokens=text(o,'jxcdmc2').split(',').map(x=>x.trim()).filter(Boolean);if(tokens.length){const match=week!=null?tokens.find(s=>s.endsWith('-'+week)):null;return (match||tokens[0]).replace(/-\d+$/,'').trim();}return text(o,'cdmc').trim();}
function parseWeek(raw,semester,requestedWeek){const root=typeof raw==='string'?parseJSON(raw):raw;requireLogin(root);if(!Array.isArray(root?.data))throw Error('课表响应缺少 data 数组');const out=[];for(const r of root.data){if(!r||typeof r!=='object')continue;const name=text(r,'kcmc'),weekday=num(r,'xq');if(!name||weekday<1||weekday>7)continue;const date=text(r,'qsrq').slice(0,10);let wk=Number.isFinite(utcDay(date))?weekOf(semester.firstMondayIso,date):requestedWeek;if(!Number.isInteger(wk)||wk<1||wk>semester.totalWeeks)wk=requestedWeek;const start=num(r,'ps'),end=Math.max(start,num(r,'pe',start));const s={name,code:text(r,'kcdm'),teachers:text(r,'teaxms'),week:wk,weekday,startUnit:start,endUnit:end,startTime:text(r,'qssj').slice(0,5),endTime:text(r,'jssj').slice(0,5),room:roomName(r,wk),category:text(r,'jxhjmc'),teachingMode:text(r,'jxmsmc'),mergedClasses:text(r,'jxbmc'),studyHours:text(r,'xs'),courseSeq:text(r,'kcbh'),schoolColor:text(r,'bgcolor'),content:text(r,'sknrjj'),date,teachLink:text(r,'jxhjmc'),teachForm:text(r,'jxxsmc'),campus:'undergrad'};out.push(s);}return out;}
function parseGrades(raw){const root=typeof raw==='string'?parseJSON(raw):raw;requireLogin(root);if(!Array.isArray(root?.rows))throw Error('课程成绩响应缺少 rows');return root.rows.filter(o=>text(o,'kcmc')&&Number.isFinite(Number(o.zcjfs))).map(o=>({term:text(o,'xnxqmc'),name:text(o,'kcmc'),score:num(o,'zcjfs'),gpa:num(o,'cjjd'),credit:num(o,'xf'),category:text(o,'kcdlmc'),classify:text(o,'kcflmc'),nature:text(o,'ksxzmc'),remark:text(o,'bz'),passed:num(o,'zcjfs')>=60}));}
function parseLevels(raw){const root=typeof raw==='string'?parseJSON(raw):raw;requireLogin(root);if(!Array.isArray(root?.rows))throw Error('考级响应缺少 rows');const labels=['听力','阅读','写作','翻译','其他'];return root.rows.filter(o=>text(o,'kjkcmc')).map(o=>({name:text(o,'kjkcmc'),term:text(o,'xnxqmc'),total:num(o,'zcj'),level:text(o,'djmc'),date:text(o,'kssj'),parts:labels.map((label,i)=>[label,text(o,'xm'+(i+1)+'cj')]).filter(p=>p[1]&&p[1]!=='0.0')}));}
function parseFitness(raw){const root=typeof raw==='string'?parseJSON(raw):raw;requireLogin(root);if(!Array.isArray(root?.rows))throw Error('体测响应缺少 rows');const pairs=[['身高','sg',''],['体重','tz','tzpf'],['肺活量','fhl','fhlpf'],['50 米','wsm','wsmpf'],['坐位体前屈','zwtqq','zwtqqpf'],['立定跳远','ldty','ldtypf'],['引体/仰卧','ytxsorywqz','ytxsorywqzpf'],['800/1000 米','yqmorbbm','yqmorbbmpf']];return root.rows.map(o=>({term:text(o,'xnxqmc'),total:text(o,'zf'),level:text(o,'dj'),items:pairs.filter(([,key])=>text(o,key)).map(([label,key,score])=>({label,value:text(o,key),score:text(o,score),grade:''}))}));}
function parseExams(raw){const root=typeof raw==='string'?parseJSON(raw):raw;requireLogin(root);if(!Array.isArray(root?.rows))return [];return root.rows.map(o=>({course:text(o,'kcmc'),date:text(o,'rq')||text(o,'ksrq'),time:text(o,'kssj')||text(o,'jcdm2'),room:text(o,'cdmc')||text(o,'jxcdmc'),seat:text(o,'zwh'),type:text(o,'ksxzmc')||text(o,'kslxmc')}));}
function attr(tag,key){const m=String(tag).match(new RegExp('(?:^|\\s)'+key+'\\s*=\\s*(["\\\'])(.*?)\\1','i'));return m?.[2]||'';}
function inputValue(html,name){for(const m of String(html).matchAll(/<input\b[^>]*>/gi)){if(attr(m[0],'name')===name||attr(m[0],'id')===name)return attr(m[0],'value');}return '';}
function parsePowerHtml(html){
 const tips=[...String(html).matchAll(/<(?:div|span|p|label|strong)[^>]*\bid=["']powerTips["'][^>]*>([^<]*)/gi)];
 const tip=tips.map(m=>m[1]?.trim()).find(Boolean)||'';
 // Do not mistake a time, date, status code or unrelated text for a balance.
 const num=tip.match(/(?:剩余(?:电量|电费)?|电量余额|余额)\s*[：:]?\s*([0-9]+(?:\.[0-9]+)?)/)||
  tip.match(/^\s*([0-9]+(?:\.[0-9]+)?)\s*(?:度|kWh)\s*$/i);
 if(!num||!Number.isFinite(Number(num[1]))||Number(num[1])>1000000)return null;
 const token=String(html).match(/\b(?:var|let|const)\s+token\s*=\s*["']([^"']+)["']/i)?.[1]||'';
 const roomNum=inputValue(html,'roomNum'),schoolAreaNo=inputValue(html,'schoolAreaNo'),buildingNo=inputValue(html,'buildingNo');
 const roomLabel=inputValue(html,'roomChooseText')||inputValue(html,'roomChoose')||roomNum||'宿舍';
 return {balance:Number(num[1]),unit:'度',roomLabel,roomNum,schoolAreaNo,buildingNo,token};
}
function parsePowerContext(html){
 const source=String(html||'');
 // Never infer a balance from an empty or unrelated login page.
 if(!source.includes('powerfee')&&!/name=["']roomNum["']|id=["']roomNum["']/.test(source))return null;
 const token=source.match(/\b(?:var|let|const)\s+token\s*=\s*["']([^"']+)["']/i)?.[1]||inputValue(source,'token');
 const roomNum=inputValue(source,'roomNum');
 const schoolAreaNo=inputValue(source,'schoolAreaNo');
 const buildingNo=inputValue(source,'buildingNo');
 if(!token||!roomNum||!schoolAreaNo||!buildingNo)return null;
 return {token,roomNum,schoolAreaNo,buildingNo,
 roomLabel:inputValue(source,'roomChooseText')||inputValue(source,'roomChoose')||'房间 '+roomNum};
}
function parsePowerBalanceJson(raw,room){
 let root;
 try{root=typeof raw==='string'?JSON.parse(raw):raw;}
 catch{throw Error('一卡通余额接口返回非 JSON 数据');}
 if(root?.ret!==true&&String(root?.ret)!=='true')throw Error('一卡通余额接口未返回成功状态');
 const value=root?.obj?.powerBalance;
 if(value===undefined||value===null||!/^\d+(?:\.\d+)?$/.test(String(value).trim()))throw Error('一卡通余额接口未返回有效电量');
 const balance=Number(value);
 if(!Number.isFinite(balance)||balance<0||balance>1000000)throw Error('一卡通电量数值超出合理范围');
 const respRoom=String(root?.obj?.roomNum??'');
 if(room?.roomNum&&respRoom&&room.roomNum!==respRoom)throw Error('一卡通返回的房间标识与当前页面不一致');
 return {balance,unit:'度',roomLabel:room?.roomLabel||'宿舍',
 roomNum:room?.roomNum||respRoom,schoolAreaNo:room?.schoolAreaNo||'',buildingNo:room?.buildingNo||'',token:room?.token||''};
}
function parsePowerDailyJson(raw){
 let root;
 try{root=typeof raw==='string'?JSON.parse(raw):raw;}catch{throw Error('用电明细返回非 JSON 数据');}
 if(root?.ret!==true && String(root?.ret)!=='true')throw Error('一卡通明细接口没有返回成功标志');
 const arr=root?.obj?.dailyDetailsInfos;
 if(!Array.isArray(arr))throw Error('一卡通明细响应缺少 dailyDetailsInfos');
 const validQuantity=value=>{
  if(value===null||value===undefined||String(value).trim()==='')return null;
  const n=Number(value);
  return Number.isFinite(n)&&n>=0&&n<=1000000?n:null;
 };
 const validDay=value=>{
  const day=String(value??'').slice(0,10).replace(/\//g,'-');
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(day))return '';
  const [y,m,d]=day.split('-').map(Number);
  const dt=new Date(Date.UTC(y,m-1,d));
  return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d?day:'';
 };
 return arr.map(x=>{
  const date=validDay(x.dateTime??x.accountTime??x.date??x.time);
  const usage=validQuantity(x.dailyUsed);
  const remain=validQuantity(x.leftUsed);
  const total=validQuantity(x.totalUsed);
  return date&&usage!==null?{date,usage,remain,total}:null;
 }).filter(Boolean);
}
function countedGrade(g){const c=`${g.category||''} ${g.nature||''}`;return c.includes('限选')||(!c.includes('选修')&&!c.includes('任选'));}
module.exports={parseJSON,requireLogin,parseSemester,parseWeek,parseGrades,parseLevels,parseFitness,parseExams,parsePowerHtml,parsePowerContext,parsePowerBalanceJson,parsePowerDailyJson,weekOf,addDays,countedGrade};
