/* Pure electricity insights: local arithmetic only; never reads cookies or sends requests. */
(function (root, factory) {
 'use strict';
 const api=factory();
 if (typeof module==='object' && module.exports) module.exports=api;
 if (root) root.GZUCM_POWER_INSIGHTS=api;
})(typeof window!=='undefined'?window:null, function () {
 'use strict';
 const MS=86400000;
 function ordinal(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))) return NaN;
  const [y,m,d]=value.split('-').map(Number);
  const timestamp=Date.UTC(y,m-1,d),date=new Date(timestamp);
  return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?
   Math.floor(timestamp/MS):NaN;
 }
 function isoOrdinal(ordinalDay) {return new Date(ordinalDay*MS).toISOString().slice(0,10);}
 function validNumber(value) {
  if (value===null||value===undefined||String(value).trim()==='') return null;
  const n=Number(value);
  return Number.isFinite(n)&&n>=0&&n<=1000000?n:null;
 }
 function normalizeHistory(rows, todayIso) {
  const end=ordinal(todayIso);
  if (!Number.isFinite(end)) return [];
  const byDate=new Map();
  for (const row of Array.isArray(rows)?rows:[]) {
   const date=String(row?.date||'').slice(0,10),day=ordinal(date),usage=validNumber(row?.usage);
   if (!Number.isFinite(day)||day>end||day<end-90||usage===null) continue;
   byDate.set(date,{date,usage,remain:validNumber(row.remain),total:validNumber(row.total)});
  }
  return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
 }
 function calculate(power, rows, options={}) {
  const now=options.now instanceof Date?options.now:new Date();
  const todayIso=options.todayIso||[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  const end=ordinal(todayIso);
  const records=normalizeHistory(rows,todayIso);
  const recent7=records.filter(row=>ordinal(row.date)>=end-6);
  const recent30=records.filter(row=>ordinal(row.date)>=end-29);
  const sum7=recent7.reduce((sum,row)=>sum+row.usage,0);
  const average7=recent7.length?sum7/recent7.length:null;
  const average30=recent30.length?recent30.reduce((sum,row)=>sum+row.usage,0)/recent30.length:null;
  const balance=validNumber(power?.balance);
  const updated=Date.parse(power?.updatedAt||'');
  const ageHours=Number.isFinite(updated)?Math.max(0,(now.getTime()-updated)/3600000):null;
  const newest=records.length?records[records.length-1]:null;
  const latestUsageAge=newest?end-ordinal(newest.date):null;
  const variation=recent7.length>=3&&average7>0?
   Math.sqrt(recent7.reduce((acc,row)=>acc+(row.usage-average7)**2,0)/recent7.length)/average7:null;
  let reason='';
  if (balance===null) reason='暂无有效电量余额';
  else if (recent7.length<3) reason='近7天至少需要3天有效用电记录';
  else if (latestUsageAge>2) reason='用电记录已超过2天未更新';
  else if (ageHours===null) reason='缺少余额更新时间';
  else if (ageHours>48) reason='电量余额超过48小时未更新，请刷新后再预测';
  else if (average7===0) reason='最近记录的用电量均为0，暂无法估算';
  const remainingDays=reason?null:(balance===0?0:balance/average7);
  const predictedDate=remainingDays===null?null:isoOrdinal(end+Math.ceil(remainingDays));
  const trend=average7===null||average30===null||recent30.length<7?null:
   average7>average30*1.12?'up':average7<average30*.88?'down':'steady';
  return {
   balance,records,recent7,recent30,average7,average30,sum7,
   sampleDays:recent7.length,latestUsageAge,ageHours,remainingDays,predictedDate,
   variation,quality:recent7.length>=5&&variation!==null&&variation<.4?'better':'limited',
   trend,reason,available:remainingDays!==null
  };
 }
 return Object.freeze({calculate,normalizeHistory,ordinal});
});
