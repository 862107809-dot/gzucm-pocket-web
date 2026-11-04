'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const start=code.indexOf('function dayDate(week,day){');
const end=code.indexOf('function countedGrade(',start);
assert.ok(start>=0&&end>start,'weekly/monthly calendar helper functions exist');

function environment(){
 const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 const dt=x=>new Date(String(x).slice(0,10)+'T12:00:00');
 const addDays=(d,n)=>{const out=new Date(d);out.setDate(out.getDate()+n);return out;};
 const sessions=[
  {week:8,weekday:7,name:'Sunday class',room:'S101',startUnit:1},
  {week:9,weekday:3,name:'Wednesday class',room:'W201',startUnit:3},
  {week:9,weekday:5,name:'Friday class',room:'F101',startUnit:5}
 ];
 const semester={name:'2026-2027',firstMondayIso:'2026-09-07',totalWeeks:20};
 const state={week:9,weekday:0,monthCursor:'2026-11-01',monthSelected:'2026-11-04',
  monthLoading:false,prefs:{language:'zh'},scheduleMode:'month',data:{semester,sessions}};
 const term=()=>semester;
 const currentSessions=(w,day)=>sessions.filter(s=>s.week===w&&(day===null||s.weekday===day));
 const courseDate=s=>iso(addDays(dt(semester.firstMondayIso),(s.week-1)*7+s.weekday-1));
 const fmt=(d,o)=>new Intl.DateTimeFormat('zh-CN',o).format(d);
 const calendarDays=[['周日',0],['周一',1],['周二',2],['周三',3],['周四',4],['周五',5],['周六',6]];
 const factory=new Function('state','dt','iso','addDays','term','currentSessions','courseDate',
  'fmt','calendarDays','dayNames','E','I','heading','courseRow','empty','today','colorIndex',
  'card','sectionTitle',
  code.slice(start,end)+'return {dayDate,displayDaySessions,monthCoursesIndex,monthPage,dayStrip,calendarGrid};');
 const api=factory(state,dt,iso,addDays,term,currentSessions,courseDate,fmt,calendarDays,
  ['周一','周二','周三','周四','周五','周六','周日'],
  s=>String(s),()=>'',()=>'',s=>'<p>'+s.name+'</p>',()=>'',()=>dt('2026-11-04'),
  ()=>1,s=>s,()=>'',);
 return {...api,iso,state};
}
test('week begins Sunday even though official school weekday 7 belongs to previous academic week',()=>{
 const {dayDate,displayDaySessions,iso}=environment();
 assert.equal(iso(dayDate(9,0)),'2026-11-01');
 assert.equal(iso(dayDate(9,1)),'2026-11-02');
 assert.equal(iso(dayDate(9,6)),'2026-11-07');
 assert.equal(displayDaySessions(9,0)[0].name,'Sunday class');
 assert.equal(displayDaySessions(9,3)[0].name,'Wednesday class');
});
test('month calendar starts Sunday and includes every calendar day',()=>{
 const {monthPage,monthCoursesIndex}=environment();
 const out=monthPage();
 assert.ok(out.includes('Sunday class')||out.includes('Wednesday class'));
 const first=out.indexOf('class="month-weekday sunday"');
 const second=out.indexOf('class="month-weekday ',first+12);
 assert.ok(first>=0&&second>first);
 assert.match(out,/data-date="2026-11-01"/);
 assert.match(out,/data-date="2026-11-30"/);
 assert.match(out,/data-date="2026-12-05"/);
 const index=monthCoursesIndex();
 assert.equal(index.get('2026-11-01')[0].name,'Sunday class');
});
test('week and month modes are reachable without overwriting school course dates',()=>{
 assert.match(code,/data-action="scheduleView" data-mode="week"/);
 assert.match(code,/data-action="scheduleView" data-mode="month"/);
 assert.match(code,/case'scheduleView':/);
 assert.match(code,/case'prevMonth':case'nextMonth':/);
 assert.match(code,/function loadSundayWeek\(\)/);
 assert.match(code,/async function loadMonth\(\)/);
 assert.match(code,/state\.loadedWeeks\.add\(week\)/);
 assert.match(code,/const courseDate = s => s\.date \|\|/);
});
test('monthly view fetches only teaching weeks and does not reload already fetched weeks',()=>{
 assert.match(code,/if\(week>=1&&week<=\(term\(\)\.totalWeeks\|\|19\)&&!state\.loadedWeeks\.has\(week\)\)/);
 assert.match(code,/Promise\.allSettled\(batch\.map\(week=>api\('academic\/week\?week='\+week\)\)\)/);
});
