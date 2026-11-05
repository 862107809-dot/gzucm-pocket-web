/*
 * Local electricity snapshots. No school passwords, cookies, room IDs or
 * authenticated tokens are stored or transmitted by this module.
 *
 * A balance snapshot is NOT daily consumption: deposits and manual room changes
 * make balance differences unreliable for usage estimates.
 */
(function (root, factory) {
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.GZUCM_POWER_SNAPSHOTS=api;
})(typeof window!=='undefined'?window:null, function () {
 'use strict';
 const DAY=86400000;
 const MAX_DAYS=90;
 function dayOf(at){
  const dt=new Date(at);
  return Number.isFinite(dt.getTime())?dt.toISOString().slice(0,10):'';
 }
 function normalize(entry) {
  if(!entry||typeof entry!=='object')return null;
  const at=new Date(entry.at);
  const balance=Number(entry.balance);
  const roomLabel=String(entry.roomLabel||'').trim().slice(0,64);
  const source=String(entry.source||'');
  if(!Number.isFinite(at.getTime())||!Number.isFinite(balance)||balance<0||balance>1e6||
   !roomLabel||!['ecard-live','ecard-page'].includes(source))return null;
  return {at:at.toISOString(),date:dayOf(at),balance,roomLabel,source};
 }
 function compact(rows, now=new Date()){
  const limit=now.getTime()-MAX_DAYS*DAY;
  const byDay=new Map();
  const input=Array.isArray(rows)?rows.slice(-300):[];
  for(const x of input) {
   const row=normalize(x);
   if(!row)continue;
   const t=Date.parse(row.at);
   if(t<limit||t>now.getTime()+60000)continue;
   const key=row.roomLabel+'\0'+row.date;
   if(!byDay.has(key)||Date.parse(byDay.get(key).at)<t)byDay.set(key,row);
  }
  return [...byDay.values()].sort((a,b)=>a.at.localeCompare(b.at)).slice(-90);
 }
 function append(rows,power,now=new Date()) {
  if(!power||!['ecard-live','ecard-page'].includes(power.source))return compact(rows,now);
  const timestamp=new Date(power.updatedAt||now);
  const value=normalize({at:timestamp,balance:power.balance,roomLabel:power.roomLabel,source:power.source});
  if(!value)return compact(rows,now);
  const sameRoom=(Array.isArray(rows)?rows:[]).filter(x=>x?.roomLabel===value.roomLabel);
  return compact([...sameRoom,value],now);
 }
 function cachedPower(power){
  if(!power||!['ecard-live','ecard-page','ecard-cache'].includes(power.source))return null;
  const balance=Number(power.balance),updatedAt=power.updatedAt,roomLabel=String(power.roomLabel||'').slice(0,64);
  if(!Number.isFinite(balance)||balance<0||balance>1e6||!Number.isFinite(Date.parse(updatedAt))||!roomLabel)return null;
  return {balance,unit:'度',roomLabel,updatedAt,source:'ecard-cache'};
 }
 return Object.freeze({normalize,compact,append,cachedPower});
});
