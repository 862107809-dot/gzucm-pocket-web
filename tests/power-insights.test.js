'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const insights=require('../power-insights.js');
const {EcardClient}=require('../server/ecard');
const {parsePowerDailyJson}=require('../server/parsers');

const now=new Date('2026-11-05T04:00:00.000Z');
const power={balance:24,updatedAt:'2026-11-05T03:00:00.000Z',source:'ecard-live',roomLabel:'Test room'};
const options={now,todayIso:'2026-11-05'};
const history=[
 {date:'2026-10-31',usage:2,remain:34},
 {date:'2026-11-02',usage:3,remain:31},
 {date:'2026-11-04',usage:4,remain:27}
];

test('forecast uses the most recent seven calendar days across month boundaries',()=>{
 const result=insights.calculate(power,history,options);
 assert.equal(result.sampleDays,3);
 assert.equal(result.sum7,9);
 assert.equal(result.average7,3);
 assert.equal(result.remainingDays,8);
 assert.equal(result.predictedDate,'2026-11-13');
 assert.equal(result.quality,'limited');
});
test('missing days are not silently treated as zero, and fewer than 3 days means no forecast',()=>{
 const result=insights.calculate(power,[history[0],history[2]],options);
 assert.equal(result.average7,3);
 assert.equal(result.sampleDays,2);
 assert.equal(result.remainingDays,null);
 assert.match(result.reason,/至少需要3天/);
});
test('stale balance or consumption suspends estimate even if historic average is nonzero',()=>{
 const stale={...power,updatedAt:'2026-11-01T00:00:00Z'};
 assert.equal(insights.calculate(stale,history,options).remainingDays,null);
 const old=history.map((row,i)=>({...row,date:['2026-10-24','2026-10-25','2026-10-26'][i]}));
 assert.equal(insights.calculate(power,old,options).remainingDays,null);
});
test('dedupe, impossible dates, future records and invalid consumption are discarded',()=>{
 const input=[
  {date:'2026-11-02',usage:1},
  {date:'2026-11-02',usage:2},
  {date:'2026-02-30',usage:100},
  {date:'2026-11-08',usage:15},
  {date:'2026-11-01',usage:-4},
  {date:'2026-11-04',usage:''}
 ];
 const result=insights.calculate(power,input,options);
 assert.equal(result.records.length,1);
 assert.equal(result.records[0].usage,2);
 assert.equal(insights.ordinal('2026-02-30'),NaN);
});
test('zero balance yields zero days, and all-zero usage cannot be extrapolated',()=>{
 const zeroBalance=insights.calculate({...power,balance:0},history,options);
 assert.equal(zeroBalance.remainingDays,0);
 const nothing=history.map(x=>({...x,usage:0}));
 const noUsage=insights.calculate(power,nothing,options);
 assert.equal(noUsage.remainingDays,null);
 assert.match(noUsage.reason,/为0/);
});
test('official daily parser rejects nulls and impossible records instead of making up zero usage',()=>{
 const sample={ret:true,obj:{dailyDetailsInfos:[
  {dateTime:'2026-11-04',dailyUsed:'1.50',leftUsed:'23'},
  {dateTime:'2026-11-03',dailyUsed:null,leftUsed:'22'},
  {dateTime:'2026-11-05',dailyUsed:'-3',leftUsed:'23'},
  {dateTime:'2026-02-30',dailyUsed:'2.1',leftUsed:'23'}
 ]}};
 assert.deepEqual(parsePowerDailyJson(sample),[{date:'2026-11-04',usage:1.5,remain:23,total:null}]);
});
test('ecard live read collects current and previous months and caches per-session results',async()=>{
 const e=new EcardClient();
 e.cookies.set('dummy',{host:'ecard.gzucm.edu.cn',path:'/user',name:'JSESSIONID',value:'test-token'});
 const html='<html><input name="schoolAreaNo" value="2"><input name="buildingNo" value="1"><input name="roomNum" value="9"><input name="roomChooseText" value="Test room"><script>var token="t"</script></html>';
 const calls=[];
 e.request=async(url,form)=>{
  calls.push({url,form});
  if(url.endsWith('/index'))return html;
  if(url.endsWith('/getBalance'))return JSON.stringify({ret:true,obj:{roomNum:'9',powerBalance:'24.00'}});
  if(url.endsWith('/getDailyDetails'))return JSON.stringify({ret:true,obj:{dailyDetailsInfos:form.lastDate==='2026-10'?
   [{dateTime:'2026-10-31',dailyUsed:'2',leftUsed:'34'}]:
   [{dateTime:'2026-11-04',dailyUsed:'4',leftUsed:'27'}]}});
  throw Error('unexpected upstream');
 };
 const first=await e.live('2026-11');
 assert.equal(first.power.source,'ecard-live');
 assert.equal(first.historyStatus,'complete');
 assert.deepEqual(first.powerDaily.map(x=>x.date),['2026-10-31','2026-11-04']);
 assert.equal(calls.length,4);
 const second=await e.live('2026-11');
 assert.equal(first,second);
 assert.equal(calls.length,4);
});
test('a daily-history outage never disguises missing readings as successful zeros',async()=>{
 const e=new EcardClient();
 e.cookies.set('dummy',{host:'ecard.gzucm.edu.cn',path:'/user',name:'JSESSIONID',value:'test-token'});
 const html='<input name="schoolAreaNo" value="2"><input name="buildingNo" value="1"><input name="roomNum" value="9"><script>var token="t"</script>';
 e.request=async(url)=>{
  if(url.endsWith('/index'))return html;
  if(url.endsWith('/getBalance'))return JSON.stringify({ret:true,obj:{roomNum:'9',powerBalance:'15'}});
  throw Error('offline');
 };
 const result=await e.live('2026-11');
 assert.equal(result.source,'ecard-live');
 assert.equal(result.historyStatus,'unavailable');
 assert.equal(result.powerDaily.length,0);
 assert.ok(result.warnings.length>0);
});
