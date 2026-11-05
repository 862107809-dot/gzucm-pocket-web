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
  {week:9,weekday:3,name:'Wednesday class',room:'W201',startUnit:3,startTime:'08:30',endTime:'10:10'},
  {week:9,weekday:3,name:'Second Wednesday class',room:'W202',startUnit:5,startTime:'10:20',endTime:'12:00'},
  {week:9,weekday:3,name:'Third Wednesday class',room:'W203',startUnit:7,startTime:'14:00',endTime:'15:40'},
  {week:9,weekday:3,name:'Fourth Wednesday class',room:'W204',startUnit:9,startTime:'16:00',endTime:'17:40'},
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
  'card','sectionTitle','courseKey','openModal',
  code.slice(start,end)+'return {dayDate,displayDaySessions,monthCoursesIndex,monthPage,openMonthDayDetail,dayStrip,calendarGrid};');
 let lastDialog=null;
 const api=factory(state,dt,iso,addDays,term,currentSessions,courseDate,fmt,calendarDays,
  ['周一','周二','周三','周四','周五','周六','周日'],
  s=>String(s),()=>'',()=>'',s=>'<p>'+s.name+'</p>',()=>'',()=>dt('2026-11-04'),
  ()=>1,s=>s,()=>'',s=>s.name+'|'+s.week,(title,body)=>{lastDialog={title,body};});
 return {...api,iso,state,dialog:()=>lastDialog};
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


test('the entire November calendar fits into seven equal columns, without a long agenda',()=>{
 const {monthPage}=environment();
 const html=monthPage();
 assert.match(html,/class="card month-calendar month-compact"/);
 assert.match(html,/style="--month-weeks:5"/);
 assert.equal((html.match(/class="month-cell /g)||[]).length,35);
 assert.match(html,/data-date="2026-11-01"/);
 assert.match(html,/data-date="2026-11-30"/);
 assert.match(html,/data-date="2026-12-05"/);
 assert.match(html,/class="month-weekday sunday"/);
 assert.doesNotMatch(html,/month-all-courses|month-day-detail|month-scroll-hint/);
 assert.doesNotMatch(html,/class="month-event tone-/);
});
test('the month uses two concise event markers and +N for busy days',()=>{
 const {monthPage}=environment();
 const html=monthPage();
 assert.match(html,/class="month-mini-event tone-/);
 assert.match(html,/class="month-overflow">\+2/);
 assert.equal((html.match(/class="month-mini-event tone-/g)||[]).length,4);
 assert.match(html,/data-action="selectMonthDay"/);
 assert.doesNotMatch(html,/W201|W202|W203|W204/);
});
test('tapping a date exposes every course with details, without rebuilding the whole month',()=>{
 const x=environment();
 x.openMonthDayDetail('2026-11-04');
 const modal=x.dialog();
 assert.ok(modal);
 for(const name of ['Wednesday class','Second Wednesday class','Third Wednesday class','Fourth Wednesday class']){
  assert.ok(modal.body.includes(name),name+' missing in day details');
 }
 assert.match(modal.body,/4 节课程/);
 assert.match(code,/document\.querySelectorAll\('\.month-cell'\)\.forEach/);
 assert.match(code,/openMonthDayDetail\(raw\)/);
});
test('mobile month grid never forces horizontal scrolling or 1050px content',()=>{
 const css=fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');
 assert.match(css,/\.month-calendar\.month-compact\{/);
 assert.match(css,/\.month-compact \.month-grid\{[\s\S]*?grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
 assert.match(css,/\.month-compact \.month-mini-event\{/);
 assert.match(css,/\.month-calendar\.month-compact\{[\s\S]*?overflow:hidden/);
 assert.doesNotMatch(css,/\.month-calendar \.month-grid\{\s*min-width:1050px/);
 assert.doesNotMatch(css,/\.month-calendar \.month-event\{[\s\S]*?min-height:48px/);
});
test('monthly data refresh only updates timetable once after a batch, without rebuilding the app shell',()=>{
 const from=code.indexOf('async function loadMonth(){');
 const until=code.indexOf('async function logout(){',from);
 const body=code.slice(from,until);
 assert.match(body,/const status=\$\('\.month-brief\[role="status"\]'\)/);
 assert.match(body,/if\(serial===state\.monthSerial\)/);
 assert.equal((body.match(/\brender\(\)/g)||[]).length,0);
 assert.equal((body.match(/\brenderScheduleContent\(\)/g)||[]).length,1);
});
