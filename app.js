/* GZUCM Pocket Web — school passwords are only typed on official school domains. */
(() => {
'use strict';
const $ = (sel, root=document) => root.querySelector(sel);
const DB = 'gzucm-pocket-web:v1';
const POWER_DB = 'gzucm-pocket-web:manual-power:v1';
const LIVE_POWER_DB = 'gzucm-pocket-web:live-power-cache:v1';
const PREF = 'gzucm-pocket-web:prefs';
const saved = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const state = {
  data: window.GZUCM_DEMO,
  view:'today', week:1, weekday:1, scheduleMode:'week',monthCursor:'',monthSelected:'',monthLoading:false,monthLoadError:0,monthSerial:0,loadedWeeks:new Set(),gradeTab:'course',gradeSearch:'',creditMode:'total',
  connected:false,ecardReady:false,loading:false,poll:null,authMode:'password',casAvailable:false,casVerified:false,ssoPopup:null,powerStatus:'idle',powerLastSync:0,powerLastAttempt:0,powerHistoryStatus:'',powerError:'',powerSnapshots:[],powerLastStored:'',powerBridgeStatus:'unknown',powerBridgeVersion:0,powerBridgeChecked:0,powerBridgeUpdatedAt:'',powerBridgeError:'',
  prefs:{theme:'system',start:'today',wallpaper:'',wallOpacity:.3,language:'zh',soundEffects:true,hapticEffects:true,glassMode:'enhanced',scheduleLayout:'fixed',...saved(PREF,{})}
};
const PUBLIC=window.GZUCM_PUBLIC===true;
const persisted=PUBLIC?null:saved(DB,null);
if (isValidData(persisted)) state.data={...window.GZUCM_DEMO,...persisted,demo:false};
const savedManualPower=PUBLIC?saved(POWER_DB,null):null;
if(savedManualPower?.power?.source==='manual'&&Number.isFinite(Number(savedManualPower.power.balance))&&Number(savedManualPower.power.balance)>=0){
 state.data={...state.data,power:savedManualPower.power,
  powerDaily:Array.isArray(savedManualPower.powerDaily)?savedManualPower.powerDaily.slice(-120):[]};
}
// Preserve sanitized, per-browser electricity readings across reloads.
const lastPowerCache=saved(LIVE_POWER_DB,null);
state.powerSnapshots=window.GZUCM_POWER_SNAPSHOTS?.compact(lastPowerCache?.snapshots||[])||[];
const lastVerified=window.GZUCM_POWER_SNAPSHOTS?.cachedPower(lastPowerCache?.power);
const existingPower=state.data.power;
const isFictitiousPower=state.data.demo&&!['manual','ecard-live','ecard-page','ecard-cache','ios-native','imported'].includes(existingPower?.source);
const existingAge=Date.parse(existingPower?.updatedAt||'');
if(lastVerified&&(isFictitiousPower||!existingPower||
 Date.parse(lastVerified.updatedAt)>(Number.isFinite(existingAge)?existingAge:0))){
 state.data={...state.data,power:lastVerified,
  powerDaily:Array.isArray(lastPowerCache.powerDaily)?lastPowerCache.powerDaily.slice(-90):[]};
 state.powerHistoryStatus='cached';
 state.powerLastStored=lastVerified.updatedAt;
}
state.view=['today','schedule','grades','power','settings'].includes(state.prefs.start)?state.prefs.start:'today';
state.weekday=((new Date().getDay()+6)%7)+1;
applyTheme();
const icons={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
 grades:'<path d="m8 3-5 3v15l9-4 9 4V6l-5-3-4 3z"/><path d="M12 6v11M8 10l4 2 4-2"/>',
 zap:'<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
 settings:'<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"/><path d="m19.4 15 .1.1 1.6 1.2-1.9 3.3-1.9-.8a8 8 0 0 1-2.3 1.3l-.3 2H9.3l-.3-2a8 8 0 0 1-2.3-1.3l-1.9.8-1.9-3.3 1.6-1.2a8 8 0 0 1 0-2.7l-1.6-1.2 1.9-3.3 1.9.8A8 8 0 0 1 9 6.4l.3-2h5.4l.3 2a8 8 0 0 1 2.3 1.3l1.9-.8 1.9 3.3-1.6 1.2a8 8 0 0 1 0 2.7Z" transform="translate(0,-1.6) scale(.94)"/>',
 chevronLeft:'<path d="m15 18-6-6 6-6"/>',chevronRight:'<path d="m9 18 6-6-6-6"/>',
 arrow:'<path d="M5 12h14m-7-7 7 7-7 7"/>', close:'<path d="M18 6 6 18M6 6l12 12"/>',
 refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 9a7 7 0 0 1 12-3l3 6M4 12l3 6a7 7 0 0 0 12-3"/>',
 cloud:'<path d="M20 17a4 4 0 0 0-2-7.5A6 6 0 0 0 6 11a3 3 0 0 0 0 6h14Z"/>',
 shield:'<path d="m12 22 7-4V6l-7-4-7 4v12z"/><path d="m9 12 2 2 4-4"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
 book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/>',
 moon:'<path d="M20 14.8A8 8 0 0 1 9.2 4 8 8 0 1 0 20 14.8Z"/>',
 chart:'<path d="M3 3v18h18M7 16l5-5 4 3 4-7"/>',
 more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 download:'<path d="M12 3v12m-4-4 4 4 4-4M4 18v3h16v-3"/>',upload:'<path d="M12 16V4m-4 4 4-4 4 4M4 18v3h16v-3"/>',
 check:'<path d="m4 12 5 5L20 6"/>',search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
 location:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 sparkle:'<path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3ZM19 17l.7 1.3L21 19l-1.3.7L19 21l-.7-1.3L17 19l1.3-.7L19 17Z"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 edit:'<path d="m15 5 4 4M4 20l4.5-1 11-11a2.8 2.8 0 0 0-4-4l-11 11z"/>',
 chartbar:'<path d="M4 20v-6h4v6M10 20V7h4v13M16 20V3h4v17M2 20h20"/>',
 file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
 link:'<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/>',
 battery:'<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 10v4M6 11h7"/>'
};
const I = (name,size=20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.info}</svg>`;
const E = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Calendar renders many dates: reuse Intl formatters instead of constructing
// 35-42 new formatters for each month switch.
const dateFormatters=new Map();
const fmt=(date,opts)=>{
 const locale=state.prefs.language==='en'?'en-US':'zh-CN';
 const key=locale+'|'+JSON.stringify(opts);
 let formatter=dateFormatters.get(key);
 if(!formatter){
  formatter=new Intl.DateTimeFormat(locale,opts);
  dateFormatters.set(key,formatter);
 }
 return formatter.format(date);
};
const today = () => new Date();
const dt = iso => new Date(String(iso).slice(0,10)+'T12:00:00');
const iso = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const addDays = (date,n) => {const d=new Date(date);d.setDate(d.getDate()+n);return d;};
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const dayNames=['周一','周二','周三','周四','周五','周六','周日'];
const calendarDays=[['周日',0],['周一',1],['周二',2],['周三',3],['周四',4],['周五',5],['周六',6]];
const term=()=>state.data.semester;
const calcWeek = date => Math.floor((dt(iso(date))-dt(term().firstMondayIso))/86400000/7)+1;
function weekNow(){return clamp(calcWeek(today()),1,Math.max(1,term().totalWeeks||19));}
state.week=weekNow();
if(today().getDay()===0){state.week=clamp(calcWeek(addDays(today(),1)),1,(term().totalWeeks||19)+1);state.weekday=0;}
state.scheduleMode=state.prefs.calendarView==='month'?'month':'week';
state.monthCursor=iso(new Date(today().getFullYear(),today().getMonth(),1));
state.monthSelected=iso(today());
function isValidData(v){return !!(v&&typeof v==='object'&&v.semester&&/^\d{4}-\d{2}-\d{2}$/.test(v.semester.firstMondayIso)&&Array.isArray(v.sessions)&&Array.isArray(v.grades));}
function store(){if(PUBLIC)return true;try{localStorage.setItem(DB,JSON.stringify(state.data));return true;}catch(e){toast('浏览器存储空间不足，请导出备份');return false;}}
function storePrefs(){localStorage.setItem(PREF,JSON.stringify(state.prefs));}
/* Original quiet Web Audio UI tick: no files, uploads or autoplay.
 * Browsers initialize sound only from an actual user pointer interaction. */
let liquidAudio=null;
let lastLiquidToneAt=0;
function armLiquidSound(){
 if(state.prefs.soundEffects===false||typeof window==='undefined')return;
 const Ctor=window.AudioContext||window.webkitAudioContext;
 if(!Ctor)return;
 try{
  if(!liquidAudio)liquidAudio=new Ctor();
  if(liquidAudio.state==='suspended')liquidAudio.resume()?.catch?.(()=>{});
 }catch{liquidAudio=null;}
}
function playLiquidTick(index=0){
 if(state.prefs.soundEffects===false||!liquidAudio||liquidAudio.state!=='running')return;
 const time=liquidAudio.currentTime,now=Date.now();
 if(now-lastLiquidToneAt<75)return; // one tone per crossed tab, no buzzing
 lastLiquidToneAt=now;
 try{
  const oscillator=liquidAudio.createOscillator(),volume=liquidAudio.createGain();
  oscillator.type='sine';
  oscillator.frequency.setValueAtTime(520+Math.max(0,Math.min(6,index))*28,time);
  oscillator.frequency.exponentialRampToValueAtTime(380+Math.max(0,index)*13,time+.036);
  volume.gain.setValueAtTime(.0001,time);
  volume.gain.exponentialRampToValueAtTime(.012,time+.006);
  volume.gain.exponentialRampToValueAtTime(.0001,time+.055);
  oscillator.connect(volume);volume.connect(liquidAudio.destination);
  oscillator.start(time);oscillator.stop(time+.06);
  oscillator.onended=()=>{oscillator.disconnect();volume.disconnect();};
 }catch{}
}
function applyTheme(){document.documentElement.dataset.theme=state.prefs.theme==='system'?'':state.prefs.theme;const dark=state.prefs.theme==='dark'||(state.prefs.theme==='system'&&window.matchMedia?.('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.activeTheme=dark?'dark':'light';const meta=$('meta[name="theme-color"]');if(meta)meta.content=dark?'#101d19':'#edf2eb';}
function currentSessions(week=state.week,weekday=null){return (state.data.sessions||[]).filter(s=>Number(s.week)===Number(week)&&(weekday===null||Number(s.weekday)===weekday)).sort((a,b)=>Number(a.startUnit)-Number(b.startUnit));}
const colorIndex = s => Number.isFinite(+s.tone)?(+s.tone)%9:Math.abs([...(s.name||'')].reduce((a,c)=>a+c.charCodeAt(0),0))%9;
const palette=['#81bca1','#85a8d0','#dfba88','#b5a1d5','#d9979a','#7ebdb3','#85a8d0','#dfba88','#b5a1d5'];
const courseDate = s => s.date || iso(addDays(dt(term().firstMondayIso), (s.week-1)*7+s.weekday-1));
const isDemo=()=>!!state.data.demo;
function applyLanguage(){window.GZUCM_I18N?.apply(document.body,state.prefs.language==='en'?'en':'zh');}
let previousBottomTab=null;
let liquidMoveFrame=0;
let liquidGestureSnap=false;
let dockRemountPulse=false;
let dockRemountDrop=false;
let scheduleModeFallbackEntrance=false;
// Preserve the finger-up position through a Dock DOM remount: rects are visually scaled.
let pendingBottomSwipeGeometry=null;
/* Damped harmonic spring: responsive start, smooth velocity decay and a tiny
 * natural settle. Keyframed via Web Animations (available in modern Safari).
 * CSS cubic-bezier remains a fully functional fallback. */
function safariSpringProgress(time,damping=.83,frequency=17){
 const z=Math.min(.98,Math.max(.1,damping));
 const w=frequency*Math.sqrt(1-z*z);
 return 1-Math.exp(-z*frequency*time)*
   (Math.cos(w*time)+(z/Math.sqrt(1-z*z))*Math.sin(w*time));
}
function liquidSpringFrames(startX,startW,endX,endW,duration=540){
 const frames=[];
 const total=48;
 const ratio=endW?startW/endW:1;
 const distance=endX-startX;
 for(let i=0;i<=total;i++){
  const offset=i/total;
  const p=i===total?1:safariSpringProgress(offset*duration/1000);
  const x=startX+distance*p;
  // Width stretch travels only with the glass, never with text or icons.
  const scale=Math.max(.85,Math.min(1.2,ratio+(1-ratio)*p));
  frames.push({offset,transform:'translate3d('+x.toFixed(2)+'px,0,0) scaleX('+scale.toFixed(4)+')'});
 }
 return frames;
}
// No overshoot after a horizontal drag: every frame advances monotonically
// towards the selected tab, unlike the spring reserved for ordinary taps.
function liquidDropFrames(startX,startW,endX,endW){
 const frames=[],count=40,ratio=endW?startW/endW:1,delta=endX-startX;
 for(let i=0;i<=count;i++){
  const offset=i/count;
  const progress=1-Math.pow(1-offset,3);
  const x=startX+delta*progress;
  const scale=Math.max(.85,Math.min(1.2,ratio+(1-ratio)*progress));
  frames.push({offset,transform:'translate3d('+x.toFixed(2)+'px,0,0) scaleX('+scale.toFixed(4)+')'});
 }
 return frames;
}
function alignBottomLiquid(previousTab,previousRect,previousGeometry=null){
 const nav=document.querySelector('#app .bottom-nav');
 if(nav?.classList?.contains?.('is-dock-settling')||nav?.classList?.contains?.('is-dock-dropping')){
  nav.addEventListener?.('animationend',event=>{
   if(['pocketDockSettle','pocketDockClickConfirm','pocketDockSoftSpring'].includes(event.animationName))nav.classList?.remove?.('is-dock-settling');
   if(['pocketDockDrop','pocketDockDragReturn','pocketDockSoftDrop'].includes(event.animationName))nav.classList?.remove?.('is-dock-dropping');
  });
 }
 const glass=nav?.querySelector('.bottom-liquid-indicator');
 const current=nav?.querySelector('.bottom-item.active');
 if(!nav||!glass||!current)return;
 if(liquidMoveFrame){cancelAnimationFrame(liquidMoveFrame);liquidMoveFrame=0;}
 const motionReduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const navRect=nav.getBoundingClientRect();
 if(!navRect.width||!current.offsetWidth)return;
 const inset=3;
 const targetX=current.offsetLeft+inset;
 const targetW=Math.max(12,current.offsetWidth-inset*2);
 const previous=previousTab?nav.querySelector('.bottom-item[data-view="'+previousTab+'"]'):null;
 const fromSwipe=nav.classList?.contains?.('is-dock-dropping')===true;
 const swipeAnchor=fromSwipe?pendingBottomSwipeGeometry:null;
 pendingBottomSwipeGeometry=null;
 const changed=!!(previousTab&&(previousTab!==state.view||liquidGestureSnap)&&!motionReduced);
 const shouldConfirm=!!(previousTab&&previousTab!==state.view)||fromSwipe;
 liquidGestureSnap=false;
 // Only the glass lens travels; no independently outlined tab landing.
 const oldX=swipeAnchor?swipeAnchor.x:previousGeometry?.x!==undefined?previousGeometry.x:
  previousRect?.width?previousRect.left-navRect.left:previous?.offsetLeft+inset;
 const oldW=swipeAnchor?swipeAnchor.width:previousGeometry?.width||previousRect?.width||
  Math.max(12,(previous?.offsetWidth||current.offsetWidth)-inset*2);
 const startX=Number.isFinite(oldX)?oldX:targetX;
 const startW=Number.isFinite(oldW)?oldW:targetW;
 glass.classList.add('is-instant');
 if(shouldConfirm)confirmGlassSelection(glass);
 glass.style.width=(changed?startW:targetW)+'px';
 glass.style.transform='translate3d('+(changed?startX:targetX)+'px,0,0)';
 if(!changed)return;
 void glass.offsetWidth; // Ensure fallback CSS starts at previous location.
 glass.classList.remove('is-instant');
 glass.classList.add(fromSwipe?'is-dropping':'is-moving');
 if(!fromSwipe)glass.addEventListener('animationend',()=>glass.classList.remove('is-moving'),{once:true});
 liquidMoveFrame=requestAnimationFrame(()=>{
  liquidMoveFrame=0;
  if(!glass.isConnected)return;
  if(typeof glass.animate==='function'){
   const duration=fromSwipe?290:330;
   const frames=liquidDropFrames(startX,startW,targetX,targetW); // smooth, monotone for taps and swipes
   glass.classList.add('is-instant');
   glass.style.width=targetW+'px';
   glass.style.transform='translate3d('+targetX+'px,0,0)';
   try{
    // Physically nonlinear sample positions. WAAPI is only the time clock.
    glass.animate(frames,{duration,fill:'none'}).finished.then(()=>{
     glass.classList.remove('is-dropping');
    },()=>{glass.classList.remove('is-dropping');});
    return;
   }catch{glass.classList.remove('is-instant');}
  }
  // Browser fallback: non-linear CSS transition (no third-party runtime).
  glass.style.width=targetW+'px';
  glass.style.transform='translate3d('+targetX+'px,0,0)';
 });
}

/* The same touch-following glass selection for week/month mode,
 * grade filters, credit filters, login choices and desktop sidebar tabs.
 * Weekdays use the same scrub lens but retain seven independent grid cells.
 * The indicator is decorative; native buttons keep their click/ARIA semantics. */
let liquidSelectorPointer=null;
let ignoreLiquidSelectorClickUntil=0;
let pendingHorizontalRailLanding=null;
/* Confirmation is a soft shadow pulse, independent of movement. It also
 * works with keyboard activation and when a selected tab is tapped again. */
function confirmGlassSelection(glass){
 if(!glass?.classList)return;
 glass.classList.remove('is-confirmed');
 void glass.offsetWidth; // replay when the same item is chosen twice
 glass.classList.add('is-confirmed');
 setTimeout(()=>glass.classList?.remove?.('is-confirmed'),440);
}
function isHorizontalLiquidRail(group,menu){
 return !menu&&!group.matches?.('.sidebar nav');
}
function releaseHorizontalLiquidRail(p,cancelled=false){
 if(!p?.rail)return;
 const group=p.group;
 group.classList.remove('is-rail-pressed','is-rail-dragging','is-rail-edge-left','is-rail-edge-right');
 group.style?.setProperty?.('--rail-edge-energy','0');
 p.glass.style?.setProperty?.('--rail-edge-shift','0px');
 p.glass.style?.setProperty?.('--rail-edge-scale','1');
 if(cancelled)return;
 const className=p.dragging?'is-rail-dropping':'is-rail-releasing'; // soft nonlinear return
 group.classList.remove('is-rail-releasing','is-rail-dropping');
 void group.offsetWidth;
 group.classList.add(className);
 group.addEventListener?.('animationend',event=>{
  if(['pocketRailRelease','pocketDockClickConfirm','pocketRailSoftSpring'].includes(event.animationName))group.classList.remove('is-rail-releasing');
  if(['pocketRailDrop','pocketDockDragReturn','pocketRailSoftDrop'].includes(event.animationName))group.classList.remove('is-rail-dropping');
 },{once:true});
}
function liquidSelectorId(group){
 if(group.classList.contains('schedule-view-switch'))return 'schedule-mode';
 if(group.querySelector('[data-grade-tab]'))return 'grade-type';
 if(group.querySelector('[data-credit]'))return 'credit-type';
 if(group.classList.contains('day-strip'))return 'weekday-choice';
 if(group.querySelector('[data-action="authPassword"]'))return 'login-mode';
 if(group.classList.contains('sidebar-nav-main'))return 'sidebar-main';
 if(group.classList.contains('sidebar-nav-account'))return 'sidebar-account';
 return '';
}
function liquidSelectorButtons(group){
 return [...group.children].filter(el=>el.tagName==='BUTTON');
}
function liquidSelectorActive(group){
 const buttons=liquidSelectorButtons(group);
 return buttons.find(el=>el.classList.contains('active')||el.classList.contains('selected')||
  el.getAttribute('aria-pressed')==='true'||el.getAttribute('aria-current')==='page')||
  (group.classList.contains('safari-floating-menu')?buttons[0]:null);
}
function liquidSelectorValue(button){
 return String(button?.dataset.mode??button?.dataset.day??button?.dataset.gradeTab??
  button?.dataset.credit??button?.dataset.action??button?.dataset.view??'');
}
function snapshotLiquidSelectors(root){
 const values=new Map();
 for(const group of root.querySelectorAll('.segmented,.schedule-view-switch,.day-strip,.sidebar nav')){
  const active=liquidSelectorActive(group),id=liquidSelectorId(group);
  if(id&&active){
   const lens=group.querySelector('.liquid-choice-highlight');
   const lensRect=lens?.getBoundingClientRect?.();
   const groupRect=lensRect&&group.getBoundingClientRect();
   // Always snapshot unscaled CSS coordinates. The rail and lens both grow
   // from their centres during touch; their screen rects are magnified.
   const translate=lens?.style?.transform?.match?.(/translate3d\((-?[0-9.]+)px, *(-?[0-9.]+)px,/);
   const railScale=groupRect?.width&&group.offsetWidth?
    groupRect.width/group.offsetWidth:1;
   values.set(id,{value:liquidSelectorValue(active),
    dragging:!!lens?.classList.contains('is-dragging'),
    x:translate?Number(translate[1]):lensRect?(lensRect.left-groupRect.left)/railScale:active.offsetLeft,
    y:translate?Number(translate[2]):lensRect?(lensRect.top-groupRect.top)/railScale:active.offsetTop,
    width:parseFloat(lens?.style?.width)||((lensRect?.width||0)/railScale)||active.offsetWidth,
    height:parseFloat(lens?.style?.height)||((lensRect?.height||0)/railScale)||active.offsetHeight});
  }
 }
 return values;
}
function setSelectorGlass(glass,geometry){
 if(!glass||!geometry)return;
 glass.style.width=Math.max(1,geometry.width)+'px';
 glass.style.height=Math.max(1,geometry.height)+'px';
 glass.style.transform='translate3d('+geometry.x+'px,'+geometry.y+'px,0)';
}
function enhanceLiquidSelectors(root,previous=new Map()){
 if(!root)return;
 for(const group of root.querySelectorAll('.segmented,.schedule-view-switch,.day-strip,.sidebar nav')){
  const id=liquidSelectorId(group),active=liquidSelectorActive(group);
  if(!id||!active)continue;
  group.classList.add('liquid-selector');
  const rail=isHorizontalLiquidRail(group,false);
  if(rail)group.classList.add('is-horizontal-rail');
  // A preserved mode selector already owns its moving glass; never insert
  // a second lens or rebuild its gesture state during a local calendar swap.
  if(group.querySelector(':scope > .liquid-choice-highlight'))continue;
  const glass=document.createElement('span');
  glass.className='liquid-choice-highlight is-instant';
  glass.setAttribute('aria-hidden','true');
  group.prepend(glass);
  const target={x:active.offsetLeft,y:active.offsetTop,
   width:active.offsetWidth,height:active.offsetHeight};
  const old=previous.get(id);
  const changed=!!(old&&(old.value!==liquidSelectorValue(active)||old.dragging)&&
   !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  setSelectorGlass(glass,changed?old:target);
  if(changed||old?.value!==liquidSelectorValue(active))confirmGlassSelection(glass);
  if(changed){
   // Force the starting transform to be committed before the destination;
   // otherwise Safari coalesces the two styles and the lens flashes back.
   void glass.offsetWidth;
   requestAnimationFrame(()=>{
    if(!glass.isConnected)return;
    glass.classList.remove('is-instant');
    setSelectorGlass(glass,target);
   });
  }
  if(rail&&pendingHorizontalRailLanding?.id===id&&
     Date.now()-pendingHorizontalRailLanding.at<700){
   const landing=pendingHorizontalRailLanding.dragged?'is-rail-dropping':'is-rail-settling';
   group.classList.add(landing);
   group.addEventListener?.('animationend',event=>{
    if(['pocketRailSettle','pocketDockClickConfirm','pocketRailSoftSpring'].includes(event.animationName))group.classList.remove('is-rail-settling');
    if(['pocketRailDrop','pocketDockDragReturn','pocketRailSoftDrop'].includes(event.animationName))group.classList.remove('is-rail-dropping');
   },{once:true});
  }
 }
 pendingHorizontalRailLanding=null;
}
function liquidClosestButton(buttons,x,y,vertical){
 let best=null,distance=Infinity,index=-1;
 buttons.forEach((button,i)=>{
  const r=button.getBoundingClientRect();
  const d=Math.abs((vertical?y:x)-(vertical?r.top+r.height/2:r.left+r.width/2));
  if(d<distance){best=button;distance=d;index=i;}
 });
 return {button:best,index};
}
function liquidNearestCached(pointer,x,y){
 if(!pointer?.centers?.length)return liquidClosestButton(pointer.buttons,x,y,pointer.vertical);
 const axis=pointer.vertical?y:x;
 let index=0,dist=Infinity;
 pointer.centers.forEach((center,i)=>{
  const n=Math.abs(axis-center);
  if(n<dist){dist=n;index=i;}
 });
 return {button:pointer.buttons[index],index};
}
function placeLiquidPointerGlass(pointer,x,y){
 const target=liquidNearestCached(pointer,x,y).button;
 if(!target)return;
 const base=pointer.vertical?pointer.firstTop:pointer.firstLeft;
 const limit=pointer.vertical?pointer.lastTop:pointer.lastLeft;
 const size=pointer.vertical?target.offsetHeight:target.offsetWidth;
 // Visual rail scale is accounted for only while finger-following.
 // This avoids a side-anchored feeling as the whole bar grows symmetrically.
 const current=pointer.rail?pointer.group.getBoundingClientRect?.():null;
 const scale=pointer.rail&&current?.width&&pointer.group.offsetWidth?
  current.width/pointer.group.offsetWidth:1;
 const rect=current||pointer.groupRect;
 const raw=(pointer.vertical?(y-rect.top)/scale:(x-rect.left)/scale)-size/2+
  (pointer.vertical?pointer.group.scrollTop:0);
 const pos=Math.max(base,Math.min(limit,raw));
 setSelectorGlass(pointer.glass,{x:pointer.vertical?target.offsetLeft:pos,
  y:pointer.vertical?pos:target.offsetTop,width:target.offsetWidth,height:target.offsetHeight});
 if(pointer.rail){
  const centers=pointer.centers;
  const left=Math.max(0,centers[0]-12-x),right=Math.max(0,x-centers[centers.length-1]-12);
  const edge=left>0?-1:right>0?1:0;
  const energy=Math.min(1,Math.max(left,right)/80);
  pointer.group.classList?.toggle?.('is-rail-edge-left',edge<0);
  pointer.group.classList?.toggle?.('is-rail-edge-right',edge>0);
  pointer.group.style?.setProperty?.('--rail-edge-energy',energy.toFixed(3));
  pointer.glass.style?.setProperty?.('--rail-edge-shift',(edge*energy*6).toFixed(2)+'px');
  pointer.glass.style?.setProperty?.('--rail-edge-scale',(1-energy*.09).toFixed(3));
 }
}
function selectorGlassFor(group){
 return group.querySelector('.liquid-choice-highlight,.safari-menu-glider');
}
function liquidPointerDown(event){
 if(event.isPrimary===false||event.button>0)return;
 if(event.target.closest?.('.bottom-nav')||event.target.closest?.('input,textarea,select'))return;
 const menu=event.target.closest?.('.safari-floating-menu');
 const group=menu||event.target.closest?.('.liquid-selector');
 if(!group)return;
 const buttons=menu?[...group.querySelectorAll('.safari-menu-option')]:liquidSelectorButtons(group);
 if(buttons.length<2||!buttons.some(x=>x.contains(event.target)))return;
 const glass=selectorGlassFor(group);
 if(!glass)return;
 armLiquidSound();
 const vertical=!!menu||group.matches('.sidebar nav');
 // Cache hit rectangles before changing the whole bar's visual size.
 const bounds=buttons.map(button=>button.getBoundingClientRect());
 const rail=isHorizontalLiquidRail(group,!!menu);
 const pressed=rail?buttons.find(button=>button.contains(event.target)):null;
 liquidSelectorPointer={group,glass,buttons,pointerId:event.pointerId,
  x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,
  vertical,dragging:false,scroll:false,groupRect:group.getBoundingClientRect(),
  centers:bounds.map(r=>vertical?r.top+r.height/2:r.left+r.width/2),
  firstLeft:buttons[0].offsetLeft,lastLeft:buttons[buttons.length-1].offsetLeft,
  firstTop:buttons[0].offsetTop,lastTop:buttons[buttons.length-1].offsetTop,
  index:-1,raf:0,source:liquidSelectorActive(group),menu:!!menu,rail,pressed};
 if(rail){
  group.classList?.remove?.('is-rail-releasing','is-rail-settling','is-rail-dropping');
  group.classList?.add?.('is-rail-pressed');
  pressed?.classList?.add?.('is-pressed');
 }
}
function liquidPointerMove(event){
 const p=liquidSelectorPointer;
 if(!p||p.pointerId!==event.pointerId||p.scroll)return;
 const dx=event.clientX-p.x,dy=event.clientY-p.y;
 if(!p.dragging){
  if(!p.vertical&&Math.abs(dy)>11&&Math.abs(dy)>Math.abs(dx)*1.15){
   p.scroll=true;
   p.pressed?.classList?.remove?.('is-pressed');
   releaseHorizontalLiquidRail(p,true);
   return;
  }
  if(p.vertical&&!p.menu&&Math.abs(dx)>11&&Math.abs(dx)>Math.abs(dy)*1.15){p.scroll=true;return;}
  const travelled=p.vertical?Math.abs(dy):Math.abs(dx);
  if(travelled<6)return;
  p.dragging=true;
  p.pressed?.classList?.remove?.('is-pressed');
  if(p.rail)p.group.classList.add('is-rail-dragging');
  p.glass.classList.add('is-instant','is-dragging');
  p.glass.classList.remove('is-moving');
  try{p.group.setPointerCapture(event.pointerId);}catch{}
 }
 if(event.cancelable)event.preventDefault();
 p.lastX=event.clientX;p.lastY=event.clientY;
 const nearest=liquidNearestCached(p,event.clientX,event.clientY);
 if(nearest.index!==p.index&&nearest.index>=0){
  p.index=nearest.index;
  p.buttons.forEach((button,i)=>button.classList.toggle('is-scrubbed',i===nearest.index));
  playLiquidTick(nearest.index);
  window.GZUCM_HAPTICS?.pulse('selection');
 }
 if(p.raf)return;
 p.raf=requestAnimationFrame(()=>{
  p.raf=0;
  if(p.glass.isConnected)placeLiquidPointerGlass(p,p.lastX,p.lastY);
 });
}
function liquidPointerFinish(event,cancelled=false){
 const p=liquidSelectorPointer;
 if(!p||p.pointerId!==event.pointerId)return;
 liquidSelectorPointer=null;
 if(p.raf)cancelAnimationFrame(p.raf);
 try{if(p.group.hasPointerCapture?.(event.pointerId))p.group.releasePointerCapture(event.pointerId);}catch{}
 p.buttons.forEach(button=>button.classList.remove('is-scrubbed'));
 p.pressed?.classList?.remove?.('is-pressed');
 releaseHorizontalLiquidRail(p,cancelled||p.scroll);
 if(p.rail&&!cancelled&&!p.scroll){
  pendingHorizontalRailLanding={id:liquidSelectorId(p.group),at:Date.now(),dragged:p.dragging};
 }
 if(!p.dragging)return;
 if(event.cancelable)event.preventDefault();
 if(cancelled){
  p.glass.classList.remove('is-instant','is-dragging');
  const selected=p.source||liquidSelectorActive(p.group);
  if(selected)setSelectorGlass(p.glass,{x:selected.offsetLeft,y:selected.offsetTop,
   width:selected.offsetWidth,height:selected.offsetHeight});
  return;
 }
 // Place the old lens at the actual finger-up coordinate BEFORE a click
 // triggers render(), then FLIP the new lens from that point without a reset.
 placeLiquidPointerGlass(p,event.clientX,event.clientY);
 // Finger-up may re-light the rail edge after the initial cleanup.
 releaseHorizontalLiquidRail(p,true);
 const nearest=liquidNearestCached(p,event.clientX,event.clientY).button;
 ignoreLiquidSelectorClickUntil=Date.now()+450;
 if(nearest?.isConnected)nearest.click();
 if(p.glass.isConnected&&!p.group.classList.contains('is-closing')){
  p.glass.classList.remove('is-instant','is-dragging');
  if(!cancelled)confirmGlassSelection(p.glass);
  const selected=liquidSelectorActive(p.group);
  if(selected)setSelectorGlass(p.glass,{x:selected.offsetLeft,y:selected.offsetTop,
   width:selected.offsetWidth,height:selected.offsetHeight});
 }
}
/* Binary sound and haptic switches also support dragging their thumbs;
 * tapping remains a native button action, and vertical page scroll is free. */
/* iOS Settings-style switch: the track and thumb stretch immediately on
 * pointerdown; horizontal dragging moves the thumb continuously; release
 * settles to the chosen state in-place without destroying the DOM mid-spring.
 * Vertical scroll is never captured. */
let liquidSwitchPointer=null;
let ignoreLiquidSwitchClickUntil=0;
function switchPreferenceKey(button){
 return button?.dataset?.action==='toggleHaptics'?'hapticEffects':'soundEffects';
}
function commitLiquidSwitch(button,on){
 if(!button)return false;
 const key=switchPreferenceKey(button);
 const previous=state.prefs[key]!==false;
 button.classList?.toggle?.('on',on);
 button.classList?.remove?.('preview-on','preview-off');
 button.setAttribute?.('aria-checked',String(on));
 if(previous===on)return false;
 state.prefs[key]=on;
 storePrefs();
 // Animate the thumb's settling independently from its horizontal travel;
 // no rerender means dragging/tapping never causes a visual rewind.
 if(typeof window==='undefined'||!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){
  button.classList?.remove?.('is-settling');
  void button.offsetWidth; // restart the tiny one-shot spring on rapid toggles
  button.classList?.add?.('is-settling');
  setTimeout(()=>button.classList?.remove?.('is-settling'),490);
 }
 if(typeof window!=='undefined')window.GZUCM_HAPTICS?.pulse('toggle',key==='hapticEffects');
 if(on&&key==='soundEffects'){armLiquidSound();playLiquidTick();}
 // Do not render(): rebuilding the switch during its spring caused a snap.
 return true;
}
function clearLiquidSwitchGesture(button){
 button?.classList?.remove?.('is-pressed','is-dragging','preview-on','preview-off');
 button?.style?.removeProperty?.('--switch-thumb-x');
}
function liquidSwitchDown(event){
 const button=event.target.closest?.('.switch[role="switch"]');
 if(!button||event.isPrimary===false||event.button>0||liquidSwitchPointer)return;
 // A separate, real pointerdown must not inherit the previous drag's
 // ghost-click suppression. A click synthesized by the old drag has no down.
 ignoreLiquidSwitchClickUntil=0;
 const key=switchPreferenceKey(button);
 const initialOn=state.prefs[key]!==false;
 button.classList.add('is-pressed');
 liquidSwitchPointer={button,id:event.pointerId,x:event.clientX,y:event.clientY,
  startOn:initialOn,previewOn:initialOn,position:initialOn?14:0,
  dragging:false,scroll:false};
}
function liquidSwitchMove(event){
 const p=liquidSwitchPointer;
 if(!p||p.id!==event.pointerId||p.scroll)return;
 const dx=event.clientX-p.x,dy=event.clientY-p.y;
 if(!p.dragging){
  if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)*1.1){
   p.scroll=true;
   clearLiquidSwitchGesture(p.button);
   return;
  }
  if(Math.abs(dx)<6||Math.abs(dx)<Math.abs(dy)*1.18)return;
  p.dragging=true;
  p.button.classList.add('is-dragging');
  try{p.button.setPointerCapture(event.pointerId);}catch{}
 }
 if(event.cancelable)event.preventDefault();
 // Keep the stretch-thumb inside its physical track, following the actual
 // finger delta without the initial jump from tapping an arbitrary track spot.
 const x=Math.max(0,Math.min(14,(p.startOn?14:0)+dx));
 const on=x>=7;
 p.position=x;
 p.button.style?.setProperty?.('--switch-thumb-x',x.toFixed(2)+'px');
 p.button.classList.toggle('preview-on',on);
 p.button.classList.toggle('preview-off',!on);
 if(on!==p.previewOn){
  p.previewOn=on;
  if(typeof window!=='undefined')window.GZUCM_HAPTICS?.pulse('selection');
 }
}
function liquidSwitchFinish(event,cancelled=false){
 const p=liquidSwitchPointer;
 if(!p||p.id!==event.pointerId)return;
 liquidSwitchPointer=null;
 try{if(p.button.hasPointerCapture?.(event.pointerId))p.button.releasePointerCapture(event.pointerId);}catch{}
 clearLiquidSwitchGesture(p.button);
 if(p.scroll||cancelled)return;
 // Commit at pointerup for taps AND drags. Leaving it to click makes the
 // stretched thumb briefly shrink in the old state before it moves.
 if(event.cancelable)event.preventDefault();
 ignoreLiquidSwitchClickUntil=Date.now()+350;
 const on=p.dragging?p.position>=7:!p.startOn;
 commitLiquidSwitch(p.button,on);
}
function guardLiquidSwitchClick(event){
 if(!event.isTrusted||Date.now()>ignoreLiquidSwitchClickUntil)return;
 if(!event.target.closest?.('.switch[role="switch"]'))return;
 ignoreLiquidSwitchClickUntil=0;
 event.preventDefault();
 event.stopImmediatePropagation();
}
function guardLiquidSelectorClick(event){
 if(!event.isTrusted||Date.now()>ignoreLiquidSelectorClickUntil)return;
 if(!event.target.closest?.('.liquid-selector,.safari-floating-menu'))return;
 ignoreLiquidSelectorClickUntil=0;
 event.preventDefault();
 event.stopImmediatePropagation();
}
/* Report the REAL runtime optical renderer, not the requested mode alone.
 * The saved choice may safely degrade when the browser lacks a capability. */
function updateGlassModeIndicator(){
 const label=document.getElementById('glass-renderer-mode');
 const detail=document.getElementById('glass-renderer-detail');
 if(!label||!detail)return;
 const optics=window.GZUCM_GLASS_OPTICS;
 optics?.refresh?.();
 const show=()=>{
  if(!label.isConnected||!detail.isConnected)return;
  const info=optics?.status?.();
  const mode=info?.mode;
  const names={webgl:'增强液态',svg:'液态玻璃',frosted:'毛玻璃'};
  label.textContent=names[mode]||'检测不可用';
  const wanted={enhanced:'webgl',standard:'svg',smooth:'frosted'}[info?.requested]||mode;
  const downgraded=mode&&mode!==wanted;
  const blur=info?.backdrop?'原生背景模糊':'模拟毛玻璃纹理';
  if(mode==='webgl'){
   const gpu=Math.max(0,Number(info.gpuSurfaces)||0);
   detail.textContent='当前效果：'+blur+' · SVG 轮廓 · WebGL 高光（GPU 层 '+gpu+' 个）';
  }else if(mode==='svg'){
   detail.textContent=(downgraded?'兼容性降级：':'当前效果：')+blur+' · SVG 玻璃轮廓，无 WebGL';
  }else if(mode==='frosted'){
   detail.textContent=(downgraded?'兼容性降级：':'当前效果：')+blur+' · CSS 毛玻璃；遵循系统显示偏好';
  }else{
   detail.textContent='当前无法读取渲染器状态；基础毛玻璃样式仍然可用';
  }
 };
 if(typeof window.requestAnimationFrame==='function')window.requestAnimationFrame(show);
 else show();
}
function render(){
 hideSafariMenu();
 const root=$('#app');
 const previousLiquidSelectors=snapshotLiquidSelectors(root);
 const oldGlass=root.querySelector('.bottom-liquid-indicator');
 const oldRect=oldGlass?.getBoundingClientRect();
 // CSS transforms reflect layout-space translation; screen rects are enlarged by touch scale.
 const oldMatch=oldGlass?.style?.transform?.match?.(/translate3d\((-?[0-9.]+)px, *(-?[0-9.]+)px,/);
 const oldInlineGeometry=oldMatch?{x:Number(oldMatch[1]),width:parseFloat(oldGlass?.style?.width)||0}:null;
 const oldView=previousBottomTab;
 const modeEntrance=scheduleModeFallbackEntrance&&state.view==='schedule';
 scheduleModeFallbackEntrance=false;
 root.innerHTML=`${sidebar()}<main class="content-area">${topbar()}<div class="page page-${state.view} ${oldView===state.view?'page-stable':'page-enter'}${modeEntrance?' schedule-mode-enter':''}" id="page-content">${page()}</div></main>${bottomNav()}`;
 document.title=state.prefs.language==='en'?`${({today:'Today',schedule:'Timetable',grades:'Grades',power:'Electricity',settings:'Settings'})[state.view]} · GZUCM Pocket`:`${({today:'今日',schedule:'课表',grades:'成绩',power:'电费',settings:'设置'})[state.view]} · 广中医口袋`;
 applyLanguage();
 enhanceLiquidSelectors(root,previousLiquidSelectors);
 restoreSurfaceBounce(root);
 alignBottomLiquid(oldView,oldRect,oldInlineGeometry);
 previousBottomTab=state.view;
 if(state.view==='settings')updateGlassModeIndicator();
}
/* Week/month switches are DOM-local: do not repaint the app shell or take
 * large View Transition snapshots of blurred course cards (slow on Safari).
 * Keep the actual glass selector mounted, so touch/drag never resets.
 * Network refreshes use this same small update without reopening the Dock. */
function renderScheduleContent(confirm=false){
 const pageRoot=$('#page-content');
 if(!pageRoot||state.view!=='schedule'){render();return;}
 const selector=pageRoot.querySelector('.schedule-view-switch');
 pageRoot.innerHTML=schedulePage();
 const replacement=pageRoot.querySelector('.schedule-view-switch');
 if(selector&&replacement){
  replacement.replaceWith(selector);
  for(const button of selector.querySelectorAll('button[data-mode]')){
   const active=button.dataset.mode===state.scheduleMode;
   button.classList.toggle('active',active);
   button.setAttribute('aria-pressed',String(active));
  }
  // The selector changed width between layouts: remeasure once at its new
  // location, never animate from a stale offscreen or stretched snapshot.
  const lens=selector.querySelector('.liquid-choice-highlight');
  const active=selector.querySelector('button.active');
  if(lens&&active){
   const target={x:active.offsetLeft,y:active.offsetTop,
    width:active.offsetWidth,height:active.offsetHeight};
   const smooth=confirm&&state.prefs.scheduleLayout!=='original'&&
    !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
   lens.classList.add('is-instant');
   if(smooth){
    // Commit the old glass position in its new but identical fixed header
    // before letting the shared capsule glide to the other option.
    void lens.offsetWidth;
    requestAnimationFrame(()=>{
     if(!lens.isConnected)return;
     lens.classList.remove('is-instant');
     setSelectorGlass(lens,target);
     confirmGlassSelection(lens);
    });
   }else{
    setSelectorGlass(lens,target);
    if(confirm)confirmGlassSelection(lens);
    requestAnimationFrame(()=>{if(lens.isConnected)lens.classList.remove('is-instant');});
   }
  }
 }
 enhanceLiquidSelectors(pageRoot);
 window.GZUCM_I18N?.apply(pageRoot,state.prefs.language==='en'?'en':'zh');
}
/* Compositor-only shrink → expand handoff on every screen size.
 * Old content contracts before the local DOM swap; the new timetable grows
 * into place without full-page snapshots or any bouncing spring.
 * Epoch cancellation prevents late animations from overwriting rapid taps. */
let scheduleSwitchEpoch=0;
let scheduleSwitchAnimation=null;
function transitionScheduleMode(afterRender){
 const epoch=++scheduleSwitchEpoch;
 try{scheduleSwitchAnimation?.cancel?.();}catch{}
 scheduleSwitchAnimation=null;
 const pageRoot=$('#page-content');
 const fixedLayout=state.prefs.scheduleLayout!=='original';
 const outgoingTarget=fixedLayout?pageRoot?.querySelector?.('.schedule-transition-content'):pageRoot;
 const swap=()=>{
  if(epoch!==scheduleSwitchEpoch||pageRoot?.isConnected===false)return false;
  renderScheduleContent(true);
  afterRender?.();
  return true;
 };
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 if(!pageRoot||state.view!=='schedule'||reduced){swap();return;}
 if(typeof outgoingTarget?.animate!=='function'){
  // Older embedded browsers still get an inexpensive scale-in CSS animation.
  if(swap()){
   pageRoot.classList?.remove?.('schedule-soft-arrival');
   void pageRoot.offsetWidth;
   (fixedLayout?pageRoot.querySelector?.('.schedule-transition-content'):pageRoot)?.classList?.add?.('schedule-soft-arrival');
  }
  return;
 }
 const width=pageRoot.getBoundingClientRect?.().width||pageRoot.clientWidth||0;
 const scale=fixedLayout?(width>=900?.974:width>=600?.966:.958):
  (width>=900?.987:width>=600?.980:.973);
 const outDuration=fixedLayout?(width>=900?180:width>=600?190:200):(width>=900?80:95);
 const inDuration=fixedLayout?(width>=900?300:width>=600?325:345):
  (width>=900?165:width>=600?180:195);
 const contracted='scale('+scale+')';
 const incoming=fixedLayout?[
  {opacity:.18,transform:contracted},
  {opacity:.72,transform:'scale(.994)',offset:.67},
  {opacity:1,transform:'scale(1)'}
 ]:[
  {opacity:.12,transform:contracted},
  {opacity:1,transform:'scale(1)'}
 ];
 const enter=()=>{
  if(!swap())return;
  const incomingTarget=fixedLayout?pageRoot.querySelector?.('.schedule-transition-content'):pageRoot;
  if(pageRoot.isConnected===false||!incomingTarget)return;
  try{
   const animation=incomingTarget.animate(incoming,{
    duration:inDuration,easing:fixedLayout?'cubic-bezier(.24,.68,.30,1)':'cubic-bezier(.20,.82,.30,1)',fill:'both'
   });
   scheduleSwitchAnimation=animation;
   Promise.resolve(animation.finished).then(()=>{
    if(epoch===scheduleSwitchEpoch){
     animation.cancel();
     scheduleSwitchAnimation=null;
    }
   }).catch(()=>{});
  }catch{
   (fixedLayout?pageRoot.querySelector?.('.schedule-transition-content'):pageRoot)?.classList?.add?.('schedule-soft-arrival');
  }
 };
 try{
  const outgoing=outgoingTarget.animate([
   {opacity:1,transform:'scale(1)'},
   {opacity:fixedLayout?.18:.12,transform:contracted}
  ],{duration:outDuration,easing:fixedLayout?'cubic-bezier(.36,0,.65,1)':
   'cubic-bezier(.34,0,.75,.55)',fill:'forwards'});
  scheduleSwitchAnimation=outgoing;
  Promise.resolve(outgoing.finished).then(()=>{
   if(epoch!==scheduleSwitchEpoch)return;
   // Do not paint a reset frame between old/new halves of the transition.
   outgoing.cancel();
   enter();
  }).catch(()=>{});
 }catch{enter();}
}
function navItem(key,label,ico,cls='nav-item') {return `<button type="button" class="${cls} ${state.view===key?'active':''}" data-view="${key}" aria-label="${E(label)}" aria-current="${state.view===key?'page':'false'}">${I(ico)}<span>${label}</span>${cls==='nav-item'&&key==='power'&&state.data.power?.balance<10?'<i class="nav-chip"></i>':''}</button>`;}
function sidebar(){return `<aside class="sidebar"><a href="/" class="brand" aria-label="广中医口袋首页" data-view="today"><div class="brand-mark"><img src="/assets/icon.svg" alt="" /></div><div><div class="brand-title">广中医口袋</div><div class="brand-sub">CAMPUS COMPANION</div></div></a><div class="side-label">校园空间 · CAMPUS</div><nav class="sidebar-nav-main" aria-label="主导航">${navItem('today','今日概览','home')}${navItem('schedule','我的课表','calendar')}${navItem('grades','学业成绩','grades')}${navItem('power','宿舍电费','zap')}</nav><div class="side-label">个人中心</div><nav class="sidebar-nav-account">${navItem('settings','偏好与设置','settings')}</nav><div class="side-spacer"></div><div class="sidebar-footer"><div class="privacy-mark">${I('shield',16)}<strong>你的校园，你的数据</strong></div><p class="tiny">非官方独立项目 · 学校密码仅在校方官网输入。演示内容均为虚构。</p></div></aside>`;}
function topbar(){return `<header class="topbar"><div class="top-left"><span class="top-kicker">GZUCM POCKET</span><button type="button" class="language-switch" data-action="toggleLanguage" aria-label="${state.prefs.language==='en'?'Switch to Chinese':'切换至英文'}" title="${state.prefs.language==='en'?'Switch to Chinese':'切换至英文'}">${state.prefs.language==='en'?'ZH':'EN'}</button><div class="top-divider"></div><span class="top-date">${fmt(today(),{month:'long',day:'numeric',weekday:'long'})}</span></div><div class="top-actions"><span class="status-pill ${isDemo()?'demo':''}" title="${isDemo()?'虚构演示数据':state.connected?'已与本地服务连接':'本地已导入数据'}"><i></i>${isDemo()?'演示模式':state.connected?'已连接':'本地数据'}</span><button class="icon-btn" title="刷新数据" aria-label="刷新数据" data-action="refresh">${I('refresh')}</button><button class="icon-btn theme-trigger" type="button" title="${state.prefs.language==='en'?'Appearance':'外观模式'}" aria-label="${state.prefs.language==='en'?'Choose light or dark appearance':'选择浅色或深色模式'}" data-action="themeMenu" aria-haspopup="menu" aria-expanded="false">${I(state.prefs.theme==='dark'?'moon':state.prefs.theme==='light'?'sun':(window.matchMedia?.('(prefers-color-scheme: dark)').matches?'moon':'sun'))}</button><button type="button" class="icon-btn settings-trigger" title="设置选项" aria-haspopup="menu" aria-expanded="false" aria-label="打开设置选项" data-action="settingsMenu">${I('settings')}</button></div></header>`;}
function bottomNav(){const settle=dockRemountPulse,drop=dockRemountDrop;dockRemountPulse=false;dockRemountDrop=false;return `<nav class="bottom-nav${settle?' is-dock-settling':''}${drop?' is-dock-dropping':''}" aria-label="手机底部导航"><span class="bottom-liquid-indicator is-instant" aria-hidden="true"><span class="bottom-liquid-surface"></span></span>${navItem('today','今日','home','bottom-item')}${navItem('schedule','课表','calendar','bottom-item')}${navItem('grades','成绩','grades','bottom-item')}${navItem('power','电费','zap','bottom-item')}${navItem('settings','设置','settings','bottom-item')}</nav>`;}
function heading(eyebrow,title,sub){return `<div class="eyebrow">${eyebrow}</div><h1 class="page-title">${title}</h1><p class="page-sub">${sub}</p>`;}
function sectionTitle(title,btn=''){return `<div class="section-heading"><h2>${title}</h2>${btn}</div>`;}
function empty(title,subtitle,ic='calendar'){return `<div class="empty">${I(ic,36)}<strong>${E(title)}</strong><p>${E(subtitle)}</p></div>`;}
function page(){return ({today:todayPage,schedule:schedulePage,grades:gradesPage,power:powerPage,settings:settingsPage})[state.view]();}
function card(children,extra=''){return `<section class="card ${extra}">${children}</section>`;}
function metric(name,val,caption,ico){return `<div class="card metric-card"><div class="metric-head"><span>${name}</span><span class="metric-icon">${I(ico)}</span></div><div class="metric-value">${val}</div><div class="metric-caption">${caption}</div></div>`;}
function courseRow(s){const time=E(s.startTime||'--:--');return `<button class="agenda-row" type="button" data-course="${E(courseKey(s))}"><div class="time-stack"><strong>${time}</strong><span>${E(s.endTime||'--:--')}</span></div><div class="course-accent" style="background:${palette[colorIndex(s)]}"></div><div class="agenda-content"><span class="course-name">${E(s.name)}</span><span class="course-sub">${I('location',12)} ${E(s.room||'地点待定')} · ${E(s.teachers||'教师待定')}</span><div class="course-detail-row">${s.content?`<span class="course-tag">${E(s.content)}</span>`:''}<span class="course-tag">${E(s.category||'课程')}</span></div></div><span class="arrow-right">${I('chevronRight',14)}</span></button>`;}
function courseKey(s){return `${s.week}|${s.weekday}|${s.startUnit}|${s.name}`;}
function matchesKey(s,key){return courseKey(s)===key;}
function currentDaySessions(){return (state.data.sessions||[]).filter(s=>courseDate(s)===iso(today())).sort((a,b)=>+a.startUnit-+b.startUnit);}
function nextCourse(){const now=today(), candidates=(state.data.sessions||[]).map(s=>({...s,_start:dt(courseDate(s))})).filter(s=>s.startTime).map(s=>{const [h,m]=s.startTime.split(':').map(Number);s._start.setHours(h,m,0,0);return s;}).filter(s=>s._start>=now).sort((a,b)=>a._start-b._start);return candidates[0]||null;}
function powerInfo(){
 const raw=state.data.power;
 // A demonstration balance must never silently become a live reading after login.
 const data=state.data.demo||['ecard-live','ecard-page','ecard-cache','ios-native','ios-native-cache','manual','imported'].includes(raw?.source)?raw:null;
 const now=today();
 const insight=window.GZUCM_POWER_INSIGHTS?.calculate(data,state.data.powerDaily||[],{now,todayIso:iso(now)});
 return {data,...insight,avg:insight?.average7??0,remaining:insight?.remainingDays??null};
}
function todayPage(){
 const now=today(), days=currentDaySessions(), next=nextCourse(), weekly=currentSessions(weekNow()), power=powerInfo();
 const soon=next&&((next._start-now)/86400000)<7;
 const intro=days.length?`今天有 ${days.length} 节课程，接下来的每一步都有方向。`:'今天没有排课，给自己留一点自由时间。';
 return `${heading('YOUR DAY, BEAUTIFULLY ORGANIZED','每一天，都值得好好安排。',`星期${'日一二三四五六'[now.getDay()]} · ${E(term().name)} · 第 ${weekNow()} 周`)}
 <section class="hero-card"><div class="hero-decoration" aria-hidden="true">${state.prefs.language==='en'?'G':'学'}</div><div class="hero-kicker">TODAY AT A GLANCE · ${fmt(now,{month:'2-digit',day:'2-digit'})}</div><div class="hero-title">${soon?`下一站，${E(next.name)}`:'今天，继续向前。'}</div><p class="hero-desc">${soon?`${E(fmt(next._start,{weekday:'long',hour:'2-digit',minute:'2-digit'}))} · ${E(next.room||'地点待定')}。${E(next.content||intro)}`:intro}</p><div class="hero-bottom"><button class="hero-button" data-view="schedule">查看完整课表 ${I('arrow')}</button><span class="hero-line">第 ${weekNow()} / ${term().totalWeeks} 教学周</span></div></section>
 ${sectionTitle('校园一览')}<div class="metrics-mobile three-col">${metric('今日课程',`${days.length} <small style="font-size:13px">节</small>`,'让每节课都有迹可循','book')}${metric('本周课程',`${weekly.length} <small style="font-size:13px">节</small>`,'按周课程安排','calendar')}${metric('宿舍剩余',power.data?`${(+power.data.balance).toFixed(1)} <small style="font-size:13px">度</small>`:'—',power.data?.source==='manual'?'手动记录':power.data?.source==='ecard-live'?'官方实时同步':power.data?.source==='ecard-page'?'官方页面读取':power.data?.source==='imported'?'导入记录':power.data?.source==='ecard-cache'?'上次读取缓存':power.data?.source==='ios-native'?'iOS App 同步':power.data?.source==='ios-native-cache'?'iOS 历史缓存':isDemo()?'演示数据':power.data?.roomLabel||'尚未连接','zap')}</div>
 ${sectionTitle('今天的课程',`<button class="small-action" data-view="schedule">本周课表 ${I('chevronRight',13)}</button>`)}<div class="two-col"><div class="card"><div class="card-heading">${I('clock',18)} ${fmt(now,{month:'long',day:'numeric',weekday:'long'})}<span class="badge">共 ${days.length} 节</span></div><div class="agenda-list">${days.length?days.map(courseRow).join(''):empty('今天没有课程','课程安排来自当前数据集，留点时间给自己吧。')}</div></div><div class="card"><div class="card-heading">${I('chartbar',18)} 本周概览 <span class="muted tiny">第 ${weekNow()} 周</span></div>${weeklyOverview(weekly)}${power.data?`<div class="power-mini"><div><div class="tiny muted">宿舍电量${power.data?.source==='manual'?' · 手动':power.data?.source==='ecard-live'?' · 官方实时':power.data?.source==='ecard-cache'?' · 历史缓存':power.data?.source==='ios-native'?' · iOS 同步':isDemo()?' · 演示':''}</div><strong>${(+power.data.balance).toFixed(1)} <span class="tiny">度</span></strong><p>${power.sampleDays>=3?'近 7 天已记录日均 '+power.avg.toFixed(1)+' 度':'用电记录不足，暂不预测'}</p></div><button class="icon-btn" data-view="power" aria-label="查看电费">${I('arrow')}</button></div>`:''}</div></div>
 ${isDemo()?`<div class="note warning mt-20"><strong>正在浏览演示模式</strong>：课表、成绩、电量及人名都是示例，不是学校真实数据。可在「设置」中导入自己的 JSON 快照或尝试连接本地只读服务。</div>`:''}`;
}
function weeklyOverview(items){const countMap=new Map();items.forEach(s=>countMap.set(s.name,(countMap.get(s.name)||0)+1));const entries=[...countMap].sort((a,b)=>b[1]-a[1]).slice(0,5);return entries.length?`<div class="overview-list">${entries.map(([name,n],idx)=>`<div><div class="overview-item"><span class="overview-dot" style="background:${palette[idx]}"></span><span class="overview-name">${E(name)}</span><span class="overview-count">${n} 节</span></div><div class="progress-track"><div class="progress-fill" style="width:${n/Math.max(...entries.map(x=>x[1]))*100}%;background:${palette[idx]}"></div></div></div>`).join('')}</div>`:empty('本周暂无课程','可以在设置里导入课表');}
function dayDate(week,day){return addDays(dt(term().firstMondayIso),(week-1)*7+day-1);}
function displayDaySessions(week,day){return day===0?currentSessions(week-1,7):currentSessions(week,day);}
function selectedDaySessions(){return displayDaySessions(state.week,state.weekday);}
function dayStrip(){
 return `<div class="day-strip" role="group" aria-label="选择星期">${calendarDays.map(([label,day])=>{
  const date=dayDate(state.week,day),count=displayDaySessions(state.week,day).length;
  return `<button class="day-tab ${state.weekday===day?'active':''} ${iso(date)===iso(today())?'today':''} ${count?'has-class':''}"
  aria-label="${label} ${fmt(date,{month:'numeric',day:'numeric'})} ${count}节课"
  aria-pressed="${state.weekday===day}" data-day="${day}"><span>${label}</span><strong>${date.getDate()}</strong><i></i></button>`;
 }).join('')}</div>`;
}
function fixedScheduleHeader(){return `<div class="compact-month-header schedule-fixed-header"><span class="eyebrow">YOUR TIMETABLE</span>${scheduleViewSwitch()}</div>`;}
/* Third layout: use the original week heading and a full-width centered
 * 50/50 segmented bar in BOTH week and month. Header stays outside the
 * changing schedule panel to keep its screen position identical. */
function wideScheduleHeader(){return `${heading('YOUR TIMETABLE','把每一周，过得从容有序。',`${E(term().name)} · 每节课程的时间、地点与授课内容`)}<div class="schedule-wide-header">${scheduleViewSwitch()}</div>`;}
function scheduleViewSwitch(){
 return `<div class="schedule-view-switch" role="group" aria-label="课表显示方式">
  <button type="button" class="${state.scheduleMode==='week'?'active':''}" data-action="scheduleView" data-mode="week" aria-pressed="${state.scheduleMode==='week'}">${I('calendar',15)} 周视图</button>
  <button type="button" class="${state.scheduleMode==='month'?'active':''}" data-action="scheduleView" data-mode="month" aria-pressed="${state.scheduleMode==='month'}">${I('calendar',15)} 月视图</button>
 </div>`;
}
function schedulePage(){
 if(state.scheduleMode==='month')return monthPage();
 const sessions=selectedDaySessions(),start=dayDate(state.week,0),end=dayDate(state.week,6);
 return `${state.prefs.scheduleLayout==='original'?heading('YOUR TIMETABLE','把每一周，过得从容有序。',`${E(term().name)} · 每节课程的时间、地点与授课内容`)+scheduleViewSwitch():state.prefs.scheduleLayout==='wide'?wideScheduleHeader():fixedScheduleHeader()}
 <div class="schedule-transition-content" data-schedule-content="week">
 <div class="weekbar"><div class="week-pick"><button class="icon-btn" aria-label="上一周" data-action="prevWeek" ${state.week<=1?'disabled':''}>${I('chevronLeft')}</button>
 <strong>第 ${state.week} 周</strong>
 <button class="icon-btn" aria-label="下一周" data-action="nextWeek" ${state.week>=(term().totalWeeks||19)+1?'disabled':''}>${I('chevronRight')}</button></div>
 <span class="muted tiny">${fmt(start,{month:'numeric',day:'numeric'})} — ${fmt(end,{month:'numeric',day:'numeric'})}</span>
 <div class="inline"><button class="btn small" data-action="thisWeek">本周</button><button class="btn small" data-action="ics">${I('download',15)} 导出日历</button></div></div>
 ${dayStrip()}
 <div class="schedule-layout"><section class="card schedule-day" ${state.prefs.wallpaper?`style="background-image:linear-gradient(rgba(255,255,255,${1-state.prefs.wallOpacity}),rgba(255,255,255,${1-state.prefs.wallOpacity})),url('${state.prefs.wallpaper}');background-size:cover;background-position:center"`:''}>
 <div class="card-heading"><span>${calendarDays.find(x=>x[1]===state.weekday)?.[0]||'周一'} · ${fmt(dayDate(state.week,state.weekday),{month:'long',day:'numeric'})}</span><span class="badge">${sessions.length} 节课程</span></div>
 <div class="agenda-list">${sessions.length?sessions.map(courseRow).join(''):empty('这一天没有安排课程','可以安排自习、运动或者出去走走。','sun')}</div></section>
 <section class="card"><div class="card-heading">${I('calendar',18)} 本周课程分布</div>
 <div class="overview-list">${calendarDays.map(([label,day])=>{const count=displayDaySessions(state.week,day).length;
  return `<button class="agenda-row" data-day="${day}" style="padding:10px 12px;align-items:center"><span class="tiny" style="width:38px">${label}</span><div class="progress-track" style="flex:1;margin:0"><div class="progress-fill" style="width:${Math.min(100,count/5*100)}%"></div></div><strong class="tiny">${count} 节</strong>${I('chevronRight',13)}</button>`}).join('')}</div>
 <div class="note mt-20">周日为每周第一天；学校的教学周编号仍按教务系统原始规则计算，课程日期不变。</div></section></div>
 ${sectionTitle('完整周视图',`<button class="small-action" data-action="appearance">${I('edit',13)} 外观设置</button>`)}
 ${card(calendarGrid(),'calendar-card')}</div>`;
}
function calendarGrid(){
 const slots=[[1,2],[3,4],[6,7],[8,9],[12,13]];
 return `<div class="calendar-visual" role="region" aria-label="周日开始的完整周课表，可左右滚动" tabindex="0">
 <div class="calendar-grid"><div class="cal-head">节次</div>
 ${calendarDays.map(([label,day])=>`<div class="cal-head">${label}<br><span class="tiny">${dayDate(state.week,day).getDate()}</span></div>`).join('')}
 ${slots.map(([from,to])=>`<div class="cal-hour">${from}-${to}</div>
 ${calendarDays.map(([label,day])=>{
 const courses=displayDaySessions(state.week,day).filter(s=>s.startUnit>=from&&s.startUnit<=to);
 return `<div class="cal-cell">${courses.map(course=>`<button data-course="${E(courseKey(course))}" class="cal-event tone-${colorIndex(course)}">${E(course.name)}<small>${E(course.room||'地点待定')}</small></button>`).join('')}</div>`;
 }).join('')}`).join('')}
 </div></div>`;
}
let monthIndexCache=null;
function monthCoursesIndex(){
 const sessions=state.data.sessions||[];
 const semesterKey=term().firstMondayIso;
 if(monthIndexCache&&monthIndexCache.sessions===sessions&&monthIndexCache.semesterKey===semesterKey)
  return monthIndexCache.index;
 const map=new Map();
 for(const course of sessions){
  const date=courseDate(course);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
  if(!map.has(date))map.set(date,[]);
  map.get(date).push(course);
 }
 for(const courses of map.values())courses.sort((a,b)=>Number(a.startUnit)-Number(b.startUnit));
 monthIndexCache={sessions,semesterKey,index:map};
 return map;
}
/* Safari Calendar-style: seven columns fully visible, daily details on tap. */
function monthPage(){
 const first=dt(state.monthCursor),year=first.getFullYear(),month=first.getMonth();
 const start=addDays(first,-first.getDay());
 const daysInMonth=new Date(year,month+1,0).getDate();
 const count=Math.ceil((first.getDay()+daysInMonth)/7)*7;
 const byDate=monthCoursesIndex();
 const en=state.prefs.language==='en';
 const weekdayNames=en?['Sun','Mon','Tue','Wed','Thu','Fri','Sat']:calendarDays.map(x=>x[0]);
 let monthClasses=0,daysWithClass=0;
 const grid=Array.from({length:count},(_,i)=>{
  const date=addDays(start,i),key=iso(date),courses=byDate.get(key)||[];
  const outside=date.getMonth()!==month;
  if(!outside&&courses.length){monthClasses+=courses.length;daysWithClass++;}
  return `<button type="button" class="month-cell ${outside?'outside':''} ${key===iso(today())?'is-today':''} ${state.monthSelected===key?'selected':''}"
   data-action="selectMonthDay" data-date="${key}"
   aria-label="${fmt(date,{month:'long',day:'numeric'})} · ${courses.length} 节课程，点击查看详情"
   aria-pressed="${state.monthSelected===key}">
   <span class="month-date-number">${date.getDate()}</span>
   <span class="month-mini-events" aria-hidden="true">${courses.slice(0,2).map(course=>
    `<span class="month-mini-event tone-${colorIndex(course)}" title="${E(course.name)}">${E(course.name)}</span>`
   ).join('')}${courses.length>2?`<span class="month-overflow">+${courses.length-2}</span>`:''}</span>
  </button>`;
 }).join('');
 return `${state.prefs.scheduleLayout==='wide'?wideScheduleHeader():''}<section class="compact-month-view" aria-label="月课表">
  ${state.prefs.scheduleLayout==='original'?'<div class="compact-month-header"><span class="eyebrow">YOUR TIMETABLE</span>'+scheduleViewSwitch()+'</div>':state.prefs.scheduleLayout==='wide'?'':fixedScheduleHeader()}
  <div class="schedule-transition-content" data-schedule-content="month">
  <div class="month-toolbar"><div class="month-pick">
   <button type="button" class="icon-btn" aria-label="上个月" data-action="prevMonth">${I('chevronLeft')}</button>
   <strong>${fmt(first,{year:'numeric',month:'long'})}</strong>
   <button type="button" class="icon-btn" aria-label="下个月" data-action="nextMonth">${I('chevronRight')}</button>
   </div><div class="inline month-actions">
   <button type="button" class="btn small" data-action="thisMonth">本月</button>
   ${state.monthLoadError&&!state.monthLoading?`<button type="button" class="btn small" data-action="retryMonth">重试</button>`:''}
   </div></div>
  <div class="month-brief muted tiny" role="status">${state.monthLoading?'正在同步当月课程…':state.monthLoadError?'部分课程尚未同步 · 可重试':`${monthClasses} 节课程 · ${daysWithClass} 天有课 · 点击日期查看详情`}</div>
  <div class="card month-calendar month-compact" role="region" aria-label="从周日开始的完整月课表">
   <div class="month-grid" style="--month-weeks:${count/7}">${weekdayNames.map((name,i)=>
    `<div class="month-weekday ${i===0?'sunday':''}">${name}</div>`).join('')}${grid}
   </div>
  </div>
  </div>
 </section>`;
}
function openMonthDayDetail(raw){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))return;
 const date=dt(raw),courses=monthCoursesIndex().get(raw)||[];
 const title=fmt(date,{month:'long',day:'numeric',weekday:'long'});
 const body=`<div class="month-detail-count">${courses.length} 节课程</div>
  <div class="agenda-list">${courses.length?courses.map(courseRow).join(''):
   empty('当天没有课程','选择其他日期查看课表。','calendar')}</div>`;
 openModal(title,body);
}
function countedGrade(g){const c=`${g.category||''} ${g.nature||''}`;if(c.includes('限选'))return true;return !c.includes('选修')&&!c.includes('任选');}
function stats(){const grades=state.data.grades||[],count=grades.filter(g=>countedGrade(g)&&+g.credit>0);const credits=count.reduce((a,g)=>a+(+g.credit||0),0);const sum=count.reduce((a,g)=>a+(+g.credit||0)*(+g.gpa||0),0);const avg=count.reduce((a,g)=>a+(+g.credit||0)*(+g.score||0),0);const earned=grades.filter(g=>g.passed).reduce((a,g)=>a+(+g.credit||0),0);return {gpa:credits?sum/credits:null,avg:credits?avg/credits:null,earned,credits:grades.reduce((a,g)=>a+(+g.credit||0),0)};}
function gradesPage(){const s=stats();return `${heading('ACADEMIC PROGRESS','看见每一份努力的积累。','课程成绩、考级成绩与体测记录。指标仅供参考，以教务系统口径为准。')}
 <div class="three-col">${metric('加权绩点',s.gpa===null?'—':s.gpa.toFixed(2),'学分加权 · 不含普通选修','sparkle')}${metric('加权平均分',s.avg===null?'—':s.avg.toFixed(1),'按参与绩点计算的课程学分加权','chart')}${metric('已修学分',s.earned.toFixed(1),'当前记录中已通过课程','book')}</div>
 ${sectionTitle('我的成绩')}<div class="card"><div class="graded-head"><div class="segmented" role="tablist" aria-label="成绩类型">${[['course','课程成绩'],['level','考级成绩'],['fitness','体测成绩']].map(([key,label])=>`<button data-grade-tab="${key}" class="${state.gradeTab===key?'active':''}" role="tab" aria-selected="${state.gradeTab===key}">${label}</button>`).join('')}</div>${state.gradeTab==='course'?`<label class="search-wrap">${I('search')}<input id="grade-search" class="search-input" type="search" placeholder="搜索课程名称" value="${E(state.gradeSearch)}" aria-label="搜索课程名称"/></label>`:''}</div><div class="mt-12">${gradeRows()}</div></div>
 ${sectionTitle('学分构成')}<div class="two-col">${card(creditBreakdown())}${card(`<div class="card-heading">${I('info',18)} 指标说明</div><div class="note"><strong>统计原则</strong><p class="mb-0">加权绩点和平均分按参与计算的课程学分加权；普通选修、任选课不计入，专业限选课计入。课程成绩缺少绩点时可能影响结果，统计仅供参考。</p></div><div class="note mt-12">公选课按教务字段 kcflmc 分类，个别课程缺少分类时归入「未分类」。毕业所需学分以培养方案为准。</div>`,'') }</div>`;}
function gradeRows(){if(state.gradeTab==='course'){
 const rows=(state.data.grades||[]).filter(g=>g.name?.toLowerCase().includes(state.gradeSearch.toLowerCase()));
 if(!rows.length)return empty('没有找到课程成绩','更换关键词，或在设置中导入数据','grades');
 const groups=new Map();rows.forEach(g=>{const term=g.term||'未注明学期';if(!groups.has(term))groups.set(term,[]);groups.get(term).push(g)});
 return [...groups].map(([term,gs])=>`<div class="group-title">${E(term)} · ${gs.length} 门</div>${gs.map(g=>`<div class="grade-row"><div class="grade-left"><strong>${E(g.name)}</strong><span>${E(g.category||'课程')} · ${(+g.credit||0).toFixed(1)} 学分 · ${E(g.nature||'')}</span></div><div><div class="score">${E(g.score)}</div><div class="score-sub">绩点 ${(+g.gpa||0).toFixed(1)}</div></div></div>`).join('')}`).join('');
}
 if(state.gradeTab==='level'){const rows=state.data.levels||[];return rows.length?rows.map(g=>`<div class="grade-row"><div class="grade-left"><strong>${E(g.name)}</strong><span>${E(g.term||'')} · ${E(g.level||'')}</span><div class="course-detail-row">${(g.parts||[]).map(p=>`<span class="course-tag">${E(Array.isArray(p)?p.join(' '):p.label+' '+p.value)}</span>`).join('')}</div></div><div class="score">${E(g.total)}</div></div>`).join(''):empty('暂无考级记录','导入自己的成绩数据后即可查看');}
 const rows=state.data.fitness||[];return rows.length?rows.map(g=>`<div class="grade-row"><div class="grade-left"><strong>${E(g.term||'体测')}</strong><span>${E(g.level)}</span><div class="course-detail-row">${(g.items||[]).map(x=>`<span class="course-tag">${E(x.label)} ${E(x.value)}</span>`).join('')}</div></div><div><div class="score">${E(g.total)}</div><div class="score-sub">体测总分</div></div></div>`).join(''):empty('暂无体测记录','导入自己的体测数据后即可查看');}
function creditBreakdown(){const grades=(state.data.grades||[]).filter(g=>g.passed);const total=grades.reduce((a,g)=>a+(+g.credit||0),0);const elective=grades.filter(g=>!countedGrade(g));const categorised=new Map();(state.creditMode==='total'?grades:elective).forEach(g=>{const c=state.creditMode==='total'?(g.category||'未分类'):(g.classify||'未分类');categorised.set(c,(categorised.get(c)||0)+(+g.credit||0));});const entries=[...categorised].sort((a,b)=>b[1]-a[1]);return `<div class="card-heading"><span>学分构成</span><span class="segmented"><button data-credit="total" class="${state.creditMode==='total'?'active':''}">总学分</button><button data-credit="elective" class="${state.creditMode==='elective'?'active':''}">公选 / 任选</button></span></div><div class="metric-value">${(state.creditMode==='total'?total:elective.reduce((a,g)=>a+(+g.credit||0),0)).toFixed(1)}<span class="tiny muted"> 学分</span></div><div class="overview-list mt-20">${entries.map(([name,credit],idx)=>`<div><div class="overview-item"><span class="overview-dot" style="background:${palette[idx%9]}"></span><span class="overview-name">${E(name)}</span><span class="overview-count">${credit.toFixed(1)}</span></div><div class="progress-track"><div class="progress-fill" style="background:${palette[idx%9]};width:${Math.min(100,credit/(state.creditMode==='elective'?Math.max(4,...entries.map(x=>x[1])):Math.max(total,1))*100)}%"></div></div></div>`).join('')||empty('暂无学分','')}</div>`;}
function powerPage(){
 const p=powerInfo(),data=p.data,days=p.recent7||[];
 const live=data?.source==='ecard-live',pageBalance=data?.source==='ecard-page';
 const manual=data?.source==='manual';
 const sourceLabel=live?'官方接口实时读取':pageBalance?'官网页面读取（待核验）':manual?'手动记录':data?.source==='imported'?'导入备份（非实时）':data?.source==='ecard-cache'?'上次查询的本地缓存':data?.source==='ios-native'?'iOS App 已配对推送':data?.source==='ios-native-cache'?'iOS App 历史缓存':isDemo()?'演示示例':'尚无有效电量';
 const stamp=Number.isFinite(Date.parse(data?.updatedAt||''))?
  fmt(new Date(data.updatedAt),{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'暂无更新时间';
 const balance=p.balance===null?'--':p.balance.toFixed(2);
 const forecast=p.available?Math.max(0,p.remainingDays).toFixed(1):'—';
 const forecastHint=p.available?
  ('预计约在 '+p.predictedDate+' 耗尽 · '+(p.quality==='better'?'记录较完整':'样本有限')+'，仅供参考'):
  (p.reason||'需要有效的余额及最近用电记录');
 const avg=p.sampleDays?(p.average7??0).toFixed(2):'—';
 const statusText=state.ecardReady?'服务端一卡通授权可用':
  state.powerBridgeStatus==='paired'?'已配对 iOS App，正在接收设备同步的余额':
  '网页版没有学校一卡通授权；可配对 iOS App 获取自动同步记录';
 const snapshots=(state.powerSnapshots||[]).filter(row=>row.roomLabel===data?.roomLabel).slice(-7).reverse();
 const warnings=state.powerHistoryStatus==='partial'?'部分用电明细获取失败，预测以已成功读取的记录为准。':
  state.powerHistoryStatus==='unavailable'?'未能同步用电明细，可能暂时无法估算可用天数。':'';
 return `${heading('DORM ENERGY','点亮宿舍的每一天。','宿舍实时电量、用电统计与可用天数预测；仅对已确认的数据进行计算。')}
 <div class="two-col">
  <div class="power-hero">
   <div><div class="power-label">当前剩余电量 · ${E(sourceLabel)}</div><div class="power-value">${balance}<small> 度</small></div>
   <div class="power-label">${E(data?.roomLabel||'尚未绑定宿舍')}</div>
   <div class="tiny" style="opacity:.86;margin-top:12px">上次更新：${E(stamp)}</div></div>
   <div class="power-foot"><span>${E(statusText)}</span>
    <button type="button" class="hero-button" data-action="syncPower">${I('refresh',14)} ${state.powerStatus==='loading'?'正在同步…':'刷新官方电量'}</button>
   </div>
  </div>
  <section class="card">
   <div class="card-heading">${I('clock',18)} 预计可用天数</div>
   <div class="metric-value" style="font-size:clamp(32px,5vw,50px)">${forecast}<span class="tiny muted"> 天</span></div>
   <p class="muted" style="line-height:1.75;margin-top:12px">${E(forecastHint)}</p>
   <div class="note mt-12">按最近 7 个日历日内 ${p.sampleDays} 天有效记录的日均用电量计算，未考虑未来天气、空调使用变化及充电充值等因素。</div>
  </section>
 </div>
 <div class="metrics-mobile three-col mt-20">
  ${metric('近7天已记录日均',avg+' <small style="font-size:13px">度 / 天</small>','缺失日期不按0度计入','zap')}
  ${metric('近7天记录用电',p.sampleDays?p.sum7.toFixed(2)+' <small style="font-size:13px">度</small>':'—',p.sampleDays+' / 7 天有记录','chartbar')}
  ${metric('近30天记录天数',p.recent30.length+' <small style="font-size:13px">天</small>','仅统计有效的每日数据','calendar')}
 </div>
 ${state.powerError?'<div class="note warning mt-20">'+E(state.powerError)+'</div>':''}
 ${warnings?'<div class="note warning mt-20">'+E(warnings)+'</div>':''}
 <div class="card mt-20">
  <div class="card-heading">${I('link',18)} 绑定 iOS App · 自动同步电量</div>
  <p class="muted tiny">在学校官方网页中通过原生 App 完成一次一卡通登录后，App 可在前台复用授权并向此网站推送只读电量记录。配对仅授权上传余额和用电明细，不上传一卡通 Cookie、密码、验证码或学校登录 Token。</p>
  <div class="note mt-12">当前配对：${E(({paired:'已连接 iOS App',pending:'等待在 App 中输入配对码',expired:'配对服务已重启或授权过期',unknown:'检查中', 'not-paired':'尚未配对'})[state.powerBridgeStatus]||'尚未配对')}${state.powerBridgeUpdatedAt?' · 上次同步 '+E(fmt(new Date(state.powerBridgeUpdatedAt),{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})):''}</div>
  ${state.powerBridgeError?'<div class="note warning mt-12">'+E(state.powerBridgeError)+'</div>':''}
  <div class="inline mt-12" style="gap:10px;flex-wrap:wrap">
   <button type="button" class="btn primary" data-action="pairPower">${I('link',15)} 生成设备配对码</button>
   <button type="button" class="btn" data-action="refreshBridge">${I('refresh',15)} 获取设备同步结果</button>
   ${state.powerBridgeStatus==='paired'?'<button type="button" class="btn danger" data-action="disconnectBridge">解除配对</button>':''}
  </div>
  <p class="tiny muted mt-12">仅在 App 实际打开并成功读取学校电量后自动推送。当前服务采用内存配对：若云服务重启或授权到期，需重新配对；关闭 App 后不保证定时刷新。</p>
 </div>
 <div class="card mt-20"><div class="card-heading">${I('shield',18)} 查询与数据来源</div>
  <p class="muted tiny">${E(statusText)}。本站 Cookie 与学校一卡通 Cookie 不同；只有后台持有经校方授权的有效一卡通会话，才能自动读取官方数据。不会在本站收集学校密码或要求粘贴原始 Cookie。</p>
  <div class="inline" style="gap:10px;flex-wrap:wrap">
   <button class="btn primary" type="button" data-action="syncPower">${I('refresh',15)} 查询实时电量</button>
   <button class="btn" type="button" data-action="editPower">${I('edit',14)} 记录用电</button>
   <a class="btn" href="https://ecard.gzucm.edu.cn/user/powerfee/index" target="_blank" rel="noopener noreferrer">${I('link',15)} 学校官方电费页</a>
  </div>
 </div>
 ${sectionTitle('近7天用电趋势',`<button class="small-action" data-action="syncPower">刷新数据 ${I('refresh',14)}</button>`)}
 <div class="two-col">
  ${card('<div class="card-heading">每日用电折线 <span class="muted tiny">单位：度</span></div>'+powerChart(days),'trend-card')}
  ${card('<div class="card-heading">用电明细 <span class="muted tiny">最近 '+days.length+' 天</span></div>'+
   (days.length?days.slice().reverse().map(d=>'<div class="daily-row"><div><strong>'+E(d.date)+'</strong><div class="tiny muted">剩余 '+(d.remain===null?'未提供':d.remain.toFixed(2)+' 度')+'</div></div><strong>-'+d.usage.toFixed(2)+' 度</strong></div>').join(''):
   empty('暂无有效用电明细','读取官方用电记录，或在“记录用电”中添加至少3天的数据')))}
 </div>
 <section class="card mt-20">
  <div class="card-heading">${I('clock',18)} 自动保存的电量快照 <span class="muted tiny">最近 7 天</span></div>
  <p class="muted tiny">每次成功从官方页面或接口取得电量，自动保存当天最新的一笔余额到当前浏览器。余额变化不等于实际耗电量，因为可能发生充值。</p>
  ${snapshots.length?snapshots.map(s=>`<div class="daily-row"><div><strong>${E(fmt(new Date(s.at),{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}))}</strong><div class="tiny muted">${E(s.roomLabel)} · ${s.source==='ecard-live'?'官方接口':'官网页面'}</div></div><strong>${s.balance.toFixed(2)} 度</strong></div>`).join(''):
   empty('尚无自动记录','当前未完成一卡通独立授权。只有成功查询到真实电量后才会保存，不会把演示数据当作自动记录。')}
 </section>
 <div class="note mt-20">预计可用天数是基于有效历史用电的统计推算，不是学校官方承诺；余额若超过48小时未更新，将暂停展示预测。日均值只使用有实际记录的日期，不会把缺失记录当作零用电。</div>`;
}
function powerChart(rows){if(!rows.length)return empty('还没有趋势记录','记录至少一天的电量即可显示趋势','chart');const vals=rows.map(x=>Math.max(0,+x.usage||0)),max=Math.max(1,...vals)*1.3;const xs=vals.map((_,i)=>40+i*360/Math.max(1,vals.length-1)),ys=vals.map(v=>170-v/max*130);const poly=xs.map((x,i)=>`${x},${ys[i]}`).join(' ');const area=`M ${xs[0]} 170 L ${xs.map((x,i)=>`${x} ${ys[i]}`).join(' L ')} L ${xs.at(-1)} 170 Z`;return `<svg class="power-linechart" viewBox="0 0 440 220" role="img" aria-label="最近用电量折线趋势图"><defs><linearGradient id="chartG" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#76ad8f" stop-opacity=".38"/><stop offset="1" stop-color="#76ad8f" stop-opacity="0"/></linearGradient></defs><path class="chart-axis" d="M40 40H410M40 105H410M40 170H410" fill="none"/><path d="${area}" fill="url(#chartG)"/><polyline points="${poly}" fill="none" stroke="#71ab89" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"/>${xs.map((x,i)=>`<circle cx="${x}" cy="${ys[i]}" r="4" fill="#50886d" stroke="white" stroke-width="2"/>`).join('')}<text class="chart-label" x="3" y="43">${max.toFixed(1)}</text><text class="chart-label" x="15" y="173">0</text>${xs.map((x,i)=>`<text class="chart-label" x="${x}" y="194" text-anchor="middle">${E(String(rows[i].date).slice(5))}</text>`).join('')}</svg>`;}
function settingsPage(){return `${heading('YOUR SPACE','让它更像你的校园生活。','个人偏好、数据管理与本地连接。所有演示数据均为虚构示例。')}
 <div class="settings-grid"><div class="grid-gap"><div class="card"><div class="card-heading">${I('sun',18)} 个性化外观</div><div class="setting-item"><div><div class="setting-label">外观模式</div><div class="setting-hint">跟随 iOS / macOS 系统或手动切换</div></div><button type="button" class="safari-select" data-action="settingChoice" data-choice="theme" aria-haspopup="menu" aria-expanded="false">${state.prefs.theme==='system'?'跟随系统':state.prefs.theme==='light'?'浅色':'深色'}${I('chevronRight',14)}</button></div><div class="setting-item"><div><div class="setting-label">玻璃渲染模式</div><div class="setting-hint">选择后立即生效，下次打开自动恢复</div></div><button type="button" class="safari-select" data-action="settingChoice" data-choice="glass" aria-haspopup="menu" aria-expanded="false">${({enhanced:'增强液态',standard:'液态玻璃',smooth:'毛玻璃'})[state.prefs.glassMode]||'增强液态'}${I('chevronRight',14)}</button></div><div class="setting-item"><div><div class="setting-label">周/月切换布局</div><div class="setting-hint">对比三种课表布局，选择会自动保存</div></div><button type="button" class="safari-select" data-action="settingChoice" data-choice="scheduleLayout" aria-haspopup="menu" aria-expanded="false">${state.prefs.scheduleLayout==='original'?'原版布局':state.prefs.scheduleLayout==='wide'?'横向居中版':'固定按钮版'}${I('chevronRight',14)}</button></div><div class="setting-item"><div><div class="setting-label">当前实际效果</div><div class="setting-hint" id="glass-renderer-detail">正在检测浏览器的实际渲染能力…</div></div><span id="glass-renderer-mode" class="status-pill" role="status" aria-live="polite">检测中</span></div><div class="setting-hint">增强液态：WebGL + SVG；液态玻璃：CSS + SVG；毛玻璃：轻量 CSS。设备不支持时自动降级。</div><div class="setting-item"><div><div class="setting-label">玻璃交互音效</div><div class="setting-hint">滑过导航选项播放轻柔反馈音；不加载外部音频</div></div><button type="button" class="switch ${state.prefs.soundEffects===false?'':'on'}" role="switch" aria-checked="${state.prefs.soundEffects!==false}" aria-label="玻璃交互音效" data-action="toggleSound"></button></div><div class="setting-item"><div><div class="setting-label">触觉反馈</div><div class="setting-hint">${window.GZUCM_HAPTICS?.supported()?'支持震动的手机或平板可获得轻触反馈':'此浏览器不支持网页震动；设置仍可保留'}</div></div><button type="button" class="switch ${state.prefs.hapticEffects===false?'':'on'}" role="switch" aria-checked="${state.prefs.hapticEffects!==false}" aria-label="触觉反馈" data-action="toggleHaptics"></button></div><div class="setting-item"><div><div class="setting-label">默认启动页</div><div class="setting-hint">下次进入时打开的页面</div></div><button type="button" class="safari-select" data-action="settingChoice" data-choice="start" aria-haspopup="menu" aria-expanded="false">${({today:'今日',schedule:'课表',grades:'成绩',power:'电费'})[state.prefs.start]||'今日'}${I('chevronRight',14)}</button></div><div class="setting-item"><div><div class="setting-label">自定义课表背景</div><div class="setting-hint">仅存储在当前浏览器内</div></div><button class="btn small" data-action="wallpaper">${I('upload')} 选择图片</button></div><div class="setting-item"><div><div class="setting-label">背景透明度</div><div class="setting-hint">调整课表图片显示强度</div></div><input class="range" id="opacity-range" type="range" min="0" max="1" step="0.05" value="${state.prefs.wallOpacity}" aria-label="课表背景透明度" /></div>${state.prefs.wallpaper?`<button class="btn small ghost" data-action="clearWallpaper">移除课表背景</button>`:''}</div><div class="card"><div class="card-heading">${I('shield',18)} 隐私与安全</div><div class="note"><strong>数据与隐私</strong><p class="mb-0">${PUBLIC?'公开网站不默认保存学业数据到浏览器 localStorage；服务器内存短暂保存你的教务会话，学校密码仅在官方页面填写。云服务商可能处理访问信息，请勿在公共设备使用。':'私人版本使用浏览器 localStorage 缓存数据，并在本地 Node 服务进程内保存学校会话。'}</p></div><div class="setting-item"><div><div class="setting-label">清除本地数据</div><div class="setting-hint">恢复演示数据，不会删除官方账号信息</div></div><button class="btn small danger" data-action="reset">清除</button></div></div></div>
 <div class="grid-gap"><div class="card"><div class="card-heading">${I('cloud',18)} 连接与同步</div><div class="setting-item"><div><div class="setting-label">同步状态</div><div class="setting-hint">${state.connected?'本科教务已认证':'尚未连接学校系统'}</div></div><span class="status-pill ${state.connected?'':'demo'}">${state.connected?'已连接':'未连接'}</span></div><div class="setting-item"><div><div class="setting-label">学习阶段</div><div class="setting-hint">本科同步为试验性；研究生可导入数据</div></div><button type="button" class="safari-select" data-action="settingChoice" data-choice="campus" aria-haspopup="menu" aria-expanded="false">${state.data.campus==='graduate'?'研究生':'本科'}${I('chevronRight',14)}</button></div><div class="grid-gap mt-12"><button class="btn primary block" data-action="connect">${I('link')} ${PUBLIC?'登录学校教务':'连接学校教务'}</button><button class="btn block" data-action="refresh">${I('refresh')} 尝试同步课表与成绩</button>${state.connected?`<button class="btn danger block" data-action="logout">退出当前学校会话</button>`:''}</div><div class="note warning mt-12"><strong>实验性接口</strong><p class="mb-0">密码登录暂不支持，请截图二维码后通过微信扫一扫（相册识别）登录。扫码授权可同步课表；一卡通电费需要另行查询。</p></div></div><div class="card"><div class="card-heading">${I('file',18)} 数据备份</div><div class="grid-gap"><button class="btn block" data-action="import">${I('upload')} 导入 JSON 数据</button><button class="btn block" data-action="export">${I('download')} 导出当前 JSON 备份</button><button class="btn block" data-action="demo">${I('sparkle')} 切换到演示数据</button></div><div class="setting-hint mt-12">支持本项目 schemaVersion: 1 的 JSON 格式。导入的本地记录不会自动与学校系统核对。</div></div><div class="card"><div class="card-heading">${I('info',18)} 关于</div><p class="tiny muted" style="line-height:1.9">广中医口袋 Web 1.3 · Safari / PWA 适配<br>参考 <a href="https://github.com/Hello-Minecraft/gzucm-pocket" target="_blank" rel="noopener noreferrer">Hello-Minecraft/gzucm-pocket</a>，独立非官方实现。<br>不属于广州中医药大学，不代表学校意见。<br>液态玻璃效果使用 CSS 仿真，不是苹果原生私有 API。</p></div></div></div>`;}
/* Glass dialog expansion uses the pressed control as its visual source.
 * The source is kept so closing collapses back toward that same point. */
let dialogClickOrigin=null;
let dialogReturnFocus=null;
let dialogSource=null;
let dialogAnimation=null;
let dialogCloseId=0;
function recordDialogOrigin(trigger){
 if(!trigger?.getBoundingClientRect||trigger.closest?.('.modal-card'))return;
 const r=trigger.getBoundingClientRect();
 if(r.width<1||r.height<1)return;
 dialogClickOrigin={x:r.left+r.width/2,y:r.top+r.height/2,
  width:r.width,height:r.height,at:Date.now(),trigger};
}
function resolveDialogOrigin(){
 const prior=dialogClickOrigin;
 dialogClickOrigin=null;
 if(prior&&Date.now()-prior.at<850)return prior;
 return {x:window.innerWidth/2,y:window.innerHeight/2,width:18,height:18,trigger:null};
}
function liquidDialogFrames(cardRect,origin,closing=false,duration=420){
 const cx=cardRect.left+cardRect.width/2,cy=cardRect.top+cardRect.height/2;
 const dx=(origin?.x??cx)-cx,dy=(origin?.y??cy)-cy;
 const small=Math.max(.075,Math.min(.22,Math.min(
  (origin?.width||18)/Math.max(cardRect.width,1),
  (origin?.height||18)/Math.max(cardRect.height,1))));
 const frames=[];
 for(let i=0;i<=42;i++){
  const offset=i/42;
  const progress=i===42?1:Math.min(1.015,Math.max(0,safariSpringProgress(offset*duration/1000,closing?.96:.90,closing?20:17)));
  const openProgress=closing?1-progress:progress;
  const scale=small+(1-small)*openProgress;
  frames.push({offset,
   transform:'translate3d('+(dx*(1-openProgress)).toFixed(2)+'px,'+
    (dy*(1-openProgress)).toFixed(2)+'px,0) scale('+scale.toFixed(4)+')',
   opacity:String(Math.min(1,Math.max(0,.03+.97*openProgress))),
   borderRadius:(30+(1-openProgress)*19).toFixed(1)+'px'});
 }
 return frames;
}
function openModal(title,body,actions=''){
 clearInterval(state.poll);state.poll=null;
 const root=$('#modal-root');
 if(!root)return;
 const previousModalSelectors=snapshotLiquidSelectors(root);
 const replacing=!!root.querySelector('.modal-card')&&!root.querySelector('.modal-backdrop.is-closing');
 const origin=replacing?dialogSource:resolveDialogOrigin();
 if(!replacing)dialogReturnFocus=origin.trigger?.isConnected?origin.trigger:null;
 dialogSource=origin;
 dialogCloseId++;
 try{dialogAnimation?.cancel()}catch{}
 dialogAnimation=null;
 root.innerHTML='<div class="modal-backdrop" id="modal-overlay">'+
  '<section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">'+
  '<div class="modal-head"><h2 id="modal-title">'+E(title)+'</h2>'+
  '<button class="icon-btn" data-action="close" aria-label="关闭弹窗">'+I('close')+'</button></div>'+
  '<div class="modal-body">'+body+'</div>'+
  (actions?'<div class="modal-actions">'+actions+'</div>':'')+'</section></div>';
 const card=root.querySelector('.modal-card');
 const backdrop=root.querySelector('.modal-backdrop');
 if(!card||!backdrop)return;
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 if(!replacing&&!reduced){
  const rect=card.getBoundingClientRect();
  card.style.setProperty('--dialog-from-x',Math.round(origin.x-rect.left-rect.width/2)+'px');
  card.style.setProperty('--dialog-from-y',Math.round(origin.y-rect.top-rect.height/2)+'px');
  if(typeof card.animate==='function'){
   try{
    const animation=card.animate(liquidDialogFrames(rect,origin,false,580),
      {duration:580,fill:'none',easing:'linear'});
    dialogAnimation=animation;
    animation.finished.then(()=>{
     if(dialogAnimation===animation)dialogAnimation=null;
     card.classList.remove('liquid-dialog-opening');
    },()=>{});
   }catch{card.classList.add('liquid-dialog-opening');}
  }else card.classList.add('liquid-dialog-opening');
  backdrop.classList.add('liquid-backdrop-opening');
 }
 applyLanguage();
 enhanceLiquidSelectors(root,previousModalSelectors);
 card.focus({preventScroll:true});
}
function closeModal(immediate=false){
 clearInterval(state.poll);state.poll=null;
 const root=$('#modal-root');
 const backdrop=root?.querySelector('.modal-backdrop');
 const card=backdrop?.querySelector('.modal-card');
 if(!root||!backdrop||!card)return;
 const id=++dialogCloseId;
 const focus=dialogReturnFocus;
 const finish=()=>{
  if(dialogCloseId!==id||root.firstElementChild!==backdrop)return;
  root.innerHTML='';
  dialogAnimation=null;
  dialogSource=null;
  dialogReturnFocus=null;
  if(focus?.isConnected)focus.focus({preventScroll:true});
 };
 try{dialogAnimation?.cancel()}catch{}
 dialogAnimation=null;
 if(immediate||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
  finish();return;
 }
 card.inert=true;
 backdrop.classList.add('is-closing');
 card.classList.remove('liquid-dialog-opening');
 const rect=card.getBoundingClientRect();
 const origin=dialogSource||{x:rect.left+rect.width/2,y:rect.top+rect.height/2,width:16,height:16};
 if(typeof card.animate==='function'){
  try{
   const animation=card.animate(liquidDialogFrames(rect,origin,true,460),
    {duration:460,fill:'none',easing:'linear'});
   dialogAnimation=animation;
   animation.finished.then(finish,finish);
   return;
  }catch{}
 }
 card.style.setProperty('--dialog-from-x',Math.round(origin.x-rect.left-rect.width/2)+'px');
 card.style.setProperty('--dialog-from-y',Math.round(origin.y-rect.top-rect.height/2)+'px');
 card.classList.add('liquid-dialog-closing');
 setTimeout(finish,480);
}
let toastTimer=null;
function toast(text){const root=$('#toast-root');root.innerHTML=`<div class="toast">${E(text)}</div>`;applyLanguage();clearTimeout(toastTimer);toastTimer=setTimeout(()=>root.innerHTML='',2800);}
function showCourse(key){const s=(state.data.sessions||[]).find(x=>matchesKey(x,key));if(!s)return;openModal('课程详情',`<div class="course-detail-hero"><div class="tiny muted">${E(s.category||'课程')} · 第 ${s.week} 周</div><strong>${E(s.name)}</strong><p>${E(s.content||'教务系统暂无具体授课内容')}</p></div>${[['时间',`${courseDate(s)} ${dayNames[(s.weekday||1)-1]} · ${s.startTime||'--:--'}—${s.endTime||'--:--'}`],['授课教师',s.teachers||'未提供'],['上课地点',s.room||'未提供'],['教学环节',s.category||'未提供'],['教学模式',s.teachingMode||'未提供'],['课程代码',s.code||'未提供']].map(([k,v])=>`<div class="detail-line"><span class="detail-key">${k}</span><span class="detail-value">${E(v)}</span></div>`).join('')}`);}
function editPowerModal(){
 const current=['manual','ecard-live','ecard-page','imported'].includes(state.data.power?.source)?state.data.power:{};
 const end=iso(today());
 const first=iso(addDays(today(),-90));
 openModal('记录宿舍电量',`<form id="power-form" class="grid-gap">
  <label class="setting-label">宿舍名称<input name="room" class="text-input mt-12" value="${E(current.roomLabel||'')}" placeholder="例如：大学城某宿舍" maxlength="64" required/></label>
  <label class="setting-label">当前剩余电量（度）<input name="balance" class="text-input mt-12" type="number" min="0" max="1000000" step="0.01" required value="${Number.isFinite(+current.balance)?E(current.balance):''}"/></label>
  <label class="setting-label">用电记录日期<input name="date" class="text-input mt-12" type="date" min="${first}" max="${end}" value="${end}" required/></label>
  <label class="setting-label">该日实际用电量（度，可选）<input name="usage" class="text-input mt-12" type="number" min="0" max="1000000" step="0.01" placeholder="例如 3.20"/></label>
  <button type="submit" class="btn primary block">保存本地记录</button>
 </form><div class="note mt-12">可以补录最近90天内的每日用电量。至少录入近7天中的3天且余额不超过48小时，才能显示预计可用天数。这里保存的余额与明细属于手动记录，不会标记为学校实时数据。</div>`);
}
/* Safari-like anchored floating option menus. Non-modal: they never clear QR polling. */
let safariMenuState={anchor:null,kind:''};
function hideSafariMenu(focus=false){
 const old=safariMenuState.anchor;
 if(old?.isConnected)old.setAttribute('aria-expanded','false');
 const portal=$('#popover-root');
 const menu=portal?.querySelector('.safari-floating-menu');
 safariMenuState={anchor:null,kind:''};
 if(focus&&old?.isConnected)old.focus({preventScroll:true});
 if(!portal||!menu||menu.classList.contains('is-closing'))return;
 const finish=()=>{if(portal.firstElementChild===menu)portal.innerHTML='';};
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){finish();return;}
 menu.inert=true;
 menu.style.pointerEvents='none';
 menu.classList.add('is-closing');
 menu.addEventListener('animationend',finish,{once:true});
 setTimeout(finish,305);
}
function safariMenuItems(kind){
 const en=state.prefs.language==='en';
 if(kind==='theme')return [
  {value:'light',label:en?'Light':'浅色模式',hint:en?'Bright appearance':'明亮、清晰',icon:'sun',chosen:state.prefs.theme==='light',action:'selectTheme'},
  {value:'dark',label:en?'Dark':'深色模式',hint:en?'Comfortable low light':'柔和深色玻璃',icon:'moon',chosen:state.prefs.theme==='dark',action:'selectTheme'},
  {value:'system',label:en?'Follow system':'跟随系统',hint:en?'Match device settings':'与设备外观同步',icon:'settings',chosen:state.prefs.theme==='system',action:'selectTheme'}
 ];
 if(kind==='glass')return [
  {value:'enhanced',label:en?'Enhanced Liquid Glass':'增强液态',hint:en?'WebGL + SVG glass highlights':'WebGL + SVG 光学高光',icon:'sparkle',chosen:state.prefs.glassMode==='enhanced',action:'selectGlass'},
  {value:'standard',label:en?'Liquid Glass':'液态玻璃',hint:en?'CSS + SVG glass edge':'CSS + SVG 玻璃轮廓',icon:'sun',chosen:state.prefs.glassMode==='standard',action:'selectGlass'},
  {value:'smooth',label:en?'Frosted Glass':'毛玻璃',hint:en?'Lightweight CSS frosted glass':'轻量 CSS 毛玻璃',icon:'zap',chosen:state.prefs.glassMode==='smooth',action:'selectGlass'}
 ];
 if(kind==='scheduleLayout')return [
  {value:'original',label:en?'Original layout':'原版布局',hint:en?'Previous week/month headers':'保留原来的周视图和月视图布局',icon:'calendar',chosen:state.prefs.scheduleLayout==='original',action:'selectScheduleLayout'},
  {value:'fixed',label:en?'Fixed switch':'固定按钮版',hint:en?'Compact switch stays in one place':'紧凑型周/月按钮固定在同一位置',icon:'check',chosen:state.prefs.scheduleLayout==='fixed',action:'selectScheduleLayout'},
  {value:'wide',label:en?'Wide centered switch':'横向居中版',hint:en?'Full-width week-style bar in both views':'两个视图都采用原周视图的居中横向长条按钮',icon:'calendar',chosen:state.prefs.scheduleLayout==='wide',action:'selectScheduleLayout'}
 ];
 if(kind==='start')return [
  {value:'today',label:en?'Today':'今日',icon:'home',chosen:state.prefs.start==='today',action:'selectStart'},
  {value:'schedule',label:en?'Timetable':'课表',icon:'calendar',chosen:state.prefs.start==='schedule',action:'selectStart'},
  {value:'grades',label:en?'Grades':'成绩',icon:'grades',chosen:state.prefs.start==='grades',action:'selectStart'},
  {value:'power',label:en?'Electricity':'电费',icon:'zap',chosen:state.prefs.start==='power',action:'selectStart'}
 ];
 if(kind==='campus')return [
  {value:'undergrad',label:en?'Undergraduate':'本科',icon:'book',chosen:state.data.campus!=='graduate',action:'selectCampus'},
  {value:'graduate',label:en?'Graduate':'研究生',icon:'book',chosen:state.data.campus==='graduate',action:'selectCampus'}
 ];
 if(kind==='settings')return [
  {value:'settings',label:en?'All settings':'全部设置',hint:en?'Preferences and data':'偏好与数据管理',icon:'settings',action:'openSettings'},
  {value:'connect',label:en?'Connect school':'连接学校教务',hint:en?'Authorized QR sign-in':'扫码授权登录',icon:'link',action:'connect'}
 ];
 return [];
}
function toggleSafariMenu(anchor,kind){
 const portal=$('#popover-root');
 if(!portal||!anchor)return;
 if(safariMenuState.anchor===anchor&&safariMenuState.kind===kind){hideSafariMenu(true);return;}
 hideSafariMenu();
 const items=safariMenuItems(kind);
 if(!items.length)return;
 const en=state.prefs.language==='en';
 const heading=kind==='theme'?(en?'Appearance':'外观模式'):kind==='glass'?(en?'Glass mode':'玻璃渲染模式'):kind==='scheduleLayout'?(en?'Timetable layout':'课表布局'):kind==='settings'?(en?'Settings':'设置选项'):kind==='start'?(en?'Default page':'默认启动页'):(en?'Program':'学习阶段');
 const html=items.map(item=>'<button type="button" class="safari-menu-option'+(item.chosen?' selected':'')+
  '" role="'+(kind==='settings'?'menuitem':'menuitemradio')+'"'+(kind==='settings'?'':' aria-checked="'+String(!!item.chosen)+'"')+' data-action="'+item.action+'" data-value="'+item.value+'">'+
  '<span class="safari-menu-icon" aria-hidden="true">'+I(item.icon||'settings',17)+'</span>'+
  '<span class="safari-menu-text"><strong>'+item.label+'</strong>'+(item.hint?'<small>'+item.hint+'</small>':'')+'</span>'+
  '<span class="safari-menu-check" aria-hidden="true">'+(item.chosen?I('check',15):'')+'</span></button>').join('');
 portal.innerHTML='<div class="safari-floating-menu" role="menu" aria-label="'+heading+'" tabindex="-1"><div class="safari-menu-title">'+heading+'</div>'+html+'</div>';
 const menu=portal.firstElementChild;
 safariMenuState={anchor,kind};
 anchor.setAttribute('aria-expanded','true');
 // Render under the trigger, flip above if the bottom edge would be clipped.
 const r=anchor.getBoundingClientRect();
 const vw=document.documentElement.clientWidth;
 const vh=window.innerHeight;
 const width=menu.offsetWidth,height=menu.offsetHeight;
 const left=Math.max(10,Math.min(r.right-width,vw-width-10));
 const above=r.bottom+height+12>vh&&r.top>height+12;
 const top=above?r.top-height-9:Math.min(r.bottom+9,Math.max(10,vh-height-10));
 menu.style.left=Math.round(left)+'px';
 menu.style.top=Math.round(Math.max(10,top))+'px';
 menu.style.setProperty('--popover-origin-x',Math.round(r.left+r.width/2-left)+'px');
 menu.style.setProperty('--popover-origin-y',Math.round(r.top+r.height/2-top)+'px');
 const chosen=menu.querySelector('.safari-menu-option.selected')||menu.querySelector('.safari-menu-option');
 if(chosen){
  const glider=document.createElement('span');
  glider.className='safari-menu-glider';
  glider.setAttribute('aria-hidden','true');
  menu.insertBefore(glider,chosen);
  setSelectorGlass(glider,{x:chosen.offsetLeft,y:chosen.offsetTop,width:chosen.offsetWidth,height:chosen.offsetHeight});
 }
 menu.classList.toggle('can-scrub',menu.scrollHeight<=menu.clientHeight+3);
 applyLanguage();
 menu.querySelector('.safari-menu-option')?.focus({preventScroll:true});
}
function selectScheduleLayout(value){
 if(!['original','fixed','wide'].includes(value))return;
 if(state.prefs.scheduleLayout===value)return;
 state.prefs.scheduleLayout=value;
 storePrefs();
 render();
 toast(value==='original'?'已切回原版课表布局':value==='wide'?'已切换横向居中版课表布局':'已切换固定按钮版课表布局');
}
function selectGlass(value){
 if(!['enhanced','standard','smooth'].includes(value))return;
 state.prefs.glassMode=value;
 storePrefs();
 window.GZUCM_GLASS_OPTICS?.setMode?.(value);
 render();
 toast(({enhanced:'增强液态',standard:'液态玻璃',smooth:'毛玻璃'})[value]+'模式已保存');
}
function selectTheme(value){
 if(!['light','dark','system'].includes(value))return;
 state.prefs.theme=value;
 storePrefs();
 applyTheme();
 render();
}
function appearanceModal(){openModal('课表外观',`<p>可以在「偏好与设置」中上传背景并调整显示强度，适配 iPhone、iPad 和 Mac。</p><div class="modal-actions"><button class="btn primary" data-view="settings">前往设置 ${I('arrow',14)}</button></div>`);}
function resetModal(){openModal('清除本地数据？',`<p>本操作将清除浏览器保存的课表、成绩和电量记录并恢复演示数据。学校账号与官方系统不受影响。</p>`,`<button class="btn danger" data-action="resetConfirm">清除并恢复演示数据</button><button class="btn" data-action="close">取消</button>`);}
const SCHOOL_SSO_URL='https://jw.gzucm.edu.cn/new/ssoLogin';
function connectModal(mode='qr'){
 state.authMode=mode==='password'?'password':'qr';
 const pwd=state.authMode==='password';
 openModal('登录广中医教务 · 官方身份认证',`<div class="segmented" style="display:flex;margin-bottom:18px" role="group" aria-label="选择教务登录方式"><button type="button" class="${pwd?'active':''}" aria-pressed="${pwd}" data-action="authPassword">账号密码</button><button type="button" class="${!pwd?'active':''}" aria-pressed="${!pwd}" data-action="authQr">扫码登录</button></div>
 ${pwd?`<div class="note warning"><strong>密码登录暂不支持</strong><p class="mb-0">请切换到「扫码登录」，获取学校二维码。电脑端使用微信扫一扫；手机端可先截图保存二维码，再打开微信 → 右上角「＋」→「扫一扫」→「相册」，选择刚才的截图，进入学校官方确认页完成授权。</p></div>
 <button class="btn primary block mt-20" type="button" data-action="authQr">${I('link',15)} 前往微信扫码登录</button><p class="tiny muted mt-12">不要向任何人发送登录二维码截图。二维码只能用于当前会话，过期后请重新获取。</p>`:`<div class="privacy-mark">${I('shield',17)} 学校官方扫码确认 · 不需要在本站输入密码</div>
 <p>请生成学校登录二维码，使用微信扫码完成官方确认。</p>
 <div class="qr-wrap mt-20" id="qr-panel"><button class="btn primary block" data-action="startQr">${I('link',15)} 获取学校登录二维码</button></div>
 <div class="note mt-12"><strong>手机端扫码方法</strong><p class="mb-0">可先将二维码截图保存到相册，再从微信「扫一扫 → 相册」选取图片识别；若学校页面不支持单机操作，请使用另一台设备扫码。请不要分享二维码截图。</p></div>`}
 <p class="tiny muted mt-20">非官方独立项目，学校密码只在校方官方页面输入。<a href="/privacy.html" target="_blank" rel="noopener noreferrer">隐私说明</a></p>`);
}
function powerHelp(message=''){
 const reason=message?`<div class="note warning mb-12">${E(message)}</div>`:'';
 openModal('宿舍电费 · 官方实时查询',`${reason}<p>一卡通使用独立的 SSO 会话、WAF Cookie 与页面 Token。当前公开网站未获得一卡通会话时，不能替你从服务器读取私有电费数据。</p><p>你可以在下方<strong>学校官方页面</strong>直接查看本人实时电量、房间及每日明细；回到广中医口袋后，可点击「记录查询结果」保存手动抄录的电量。手动记录不会被标为实时同步。</p><a class="btn primary block" href="https://ecard.gzucm.edu.cn/user/powerfee/index" target="_blank" rel="noopener noreferrer">${I('link',15)} 打开学校官方电费页面</a><p class="tiny muted mt-12">在学校网站输入密码，不要把校园卡 Cookie 复制给任何人。本功能目前尚不能保证把校方实时数据自动回填到本站。</p>`);
}
function downloadFile(name,content,type){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([content],{type}));a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),6000);}
function exportData(){downloadFile('gzucm-pocket-backup-'+iso(today())+'.json',JSON.stringify({...state.data,schemaVersion:1},null,2),'application/json;charset=utf-8');toast('已导出 JSON 备份');}
function escICS(s){return String(s??'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
function exportICS(){const items=currentSessions(state.week);if(!items.length){toast('本周没有课程可以导出');return;}
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//GZUCM Pocket Web//ZH-CN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:广中医口袋 第'+state.week+'周'];
 items.forEach((s,i)=>{const date=courseDate(s).replaceAll('-',''),start=(s.startTime||'08:30').replace(':','')+'00',end=(s.endTime||'10:00').replace(':','')+'00';lines.push('BEGIN:VEVENT','UID:'+date+'-'+i+'-'+String(s.code||'course').replace(/[^a-zA-Z0-9]/g,'')+'@gzucm-pocket.local','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\..+/,'Z'),'DTSTART;TZID=Asia/Shanghai:'+date+'T'+start,'DTEND;TZID=Asia/Shanghai:'+date+'T'+end,'SUMMARY:'+escICS(s.name),'LOCATION:'+escICS(s.room||''),'DESCRIPTION:'+escICS([s.teachers,s.content].filter(Boolean).join(' · ')),'END:VEVENT');});lines.push('END:VCALENDAR');downloadFile('gzucm-week-'+state.week+'.ics',lines.join('\r\n')+'\r\n','text/calendar;charset=utf-8');toast('已导出本周课程日历');}
async function importData(file){if(!file)return;if(file.size>8*1024*1024){toast('JSON 文件不得超过 8MB');return;}try{const json=JSON.parse(await file.text());if(!isValidData(json)||!Number.isFinite(+json.semester.totalWeeks)||json.semester.totalWeeks>52||json.sessions.length>15000){throw Error('数据格式不符合 schemaVersion 1 的要求');}state.data={schemaVersion:1,campus:json.campus||'undergrad',semester:json.semester,sessions:json.sessions,grades:json.grades,levels:json.levels||[],fitness:json.fitness||[],exams:json.exams||[],power:json.power?{...json.power,source:'imported'}:null,powerDaily:Array.isArray(json.powerDaily)?json.powerDaily:[],demo:false};state.connected=false;state.week=weekNow();store();render();toast('数据已导入，已切换到本地模式');}catch(e){toast('导入失败：'+e.message);}}
async function importWallpaper(file){if(!file)return;if(file.size>10*1024*1024){toast('图片请小于 10MB');return;}if(!['image/jpeg','image/png','image/webp'].includes(file.type)){toast('请选择 JPG、PNG 或 WebP');return;}
 try{const url=URL.createObjectURL(file),img=new Image();img.src=url;await img.decode();const scale=Math.min(1,1200/img.width,900/img.height),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);state.prefs.wallpaper=canvas.toDataURL('image/jpeg',.72);URL.revokeObjectURL(url);storePrefs();render();toast('背景已经更新');}catch{toast('图片读取失败');}}
async function api(path,options={}){const ac=new AbortController(),timeout=setTimeout(()=>ac.abort(),20000);try{const res=await fetch('/api/'+path,{...options,headers:{Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})},credentials:'same-origin',signal:ac.signal,cache:'no-store'});let obj;try{obj=await res.json();}catch{throw Error('服务暂时不可用，请刷新页面或稍后重试');}if(!res.ok)throw Object.assign(Error(obj.error||'请求失败'),{status:res.status,code:obj.code,officialUrl:obj.officialUrl});return obj;}finally{clearTimeout(timeout);}}
async function checkServer(){try{const info=await api('session');state.connected=!!info.connected;state.ecardReady=!!info.ecardReady;state.casAvailable=!!info.casAvailable;state.casVerified=!!info.casVerified;if(PUBLIC){if(state.connected){await syncAcademic();}else if(state.ecardReady||state.view==='power'){render();if(state.view==='power'){if(state.ecardReady)syncPower(true);refreshPowerBridge(true);}}else{connectModal('qr');}}else{render();if(state.view==='power'){if(state.ecardReady)syncPower(true);refreshPowerBridge(true);}}}catch{state.connected=false;if(PUBLIC)toast('无法连接登录服务，请稍后刷新页面');}}
function openOfficialLogin(){
 // Open from a genuine click so browsers do not block the popup.
 // CAS registration is optional and disabled by default.
 const target=state.casAvailable?'/auth/cas/start':SCHOOL_SSO_URL;
 state.ssoPopup=window.open(target,'gzucmSchoolLogin','popup=yes,width=560,height=760,scrollbars=yes,resizable=yes');
 if(!state.ssoPopup){toast('浏览器拦截了学校登录窗口，请允许本站打开弹出窗口');return;}
 try{state.ssoPopup.focus();}catch{}
 if(!state.casAvailable)toast('已打开学校官网；当前尚未配置可返回本站的 CAS 授权回调');
}
async function checkOfficialAuth(){
 try{
  const info=await api('session');
  state.casAvailable=!!info.casAvailable;
  state.casVerified=!!info.casVerified;
  state.connected=!!info.connected;
  if($('#modal-overlay')&&state.authMode==='password')connectModal('password');
  if(state.casVerified&&state.connected)toast('官方身份与教务数据会话均已就绪');
  else if(state.casVerified)toast('学校身份已验证；同步课表还需独立教务授权');
  else if(state.connected)toast('教务会话已连接，可同步数据');
  else toast('尚未取得可供本站使用的官方身份回调，请使用扫码授权同步');
 }catch{toast('无法检查认证状态，请稍后重试');}
}
async function startQr(){state.authMode='qr';const panel=$('#qr-panel');if(!panel)return;if(PUBLIC){state.data=window.GZUCM_DEMO;state.week=weekNow();}panel.innerHTML='<div class="tiny muted">正在请求学校的二维码接口…</div>';try{const qr=await api('qr/start',{method:'POST',body:'{}'});const safe=E(qr.confirmUrl||'');panel.innerHTML=`<div class="qr-frame">${qr.svg?`<img alt="教务系统登录二维码" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.svg)}">`:I('link',54)}</div><div class="tiny muted" style="text-align:center">用学校支持的方式扫码后确认</div><div class="mono-link">学校扫码确认链接已生成 · 为保护登录安全，已隐藏完整链接</div><div class="inline" style="justify-content:center;flex-wrap:wrap"><a class="btn small primary" target="_blank" rel="noopener noreferrer" href="${safe}">${I('link',14)} 打开学校确认页</a><button class="btn small" data-action="copyQr">${I('file',14)} 复制确认链接</button></div><div class="tiny muted" style="text-align:center">仅在学校官方域名输入密码。打开的页面必须完成学校的二维码确认，才能让本站获得同步所需的会话。</div><div class="tiny muted" id="qr-status" role="status">等待扫码…</div>`;state.qrLink=qr.confirmUrl;state.poll=setInterval(pollQr,3500);}catch(e){panel.innerHTML=`<div class="note warning">${E(e.message||'二维码申请失败')}${e.code?'<div class="tiny muted mt-12">诊断代码：'+E(e.code)+'</div>':''}</div><button class="btn primary mt-12" data-action="startQr">重试</button>`;}}
async function pollQr(){if(!$('#qr-panel')){clearInterval(state.poll);state.poll=null;return;}try{const r=await api('qr/status');const el=$('#qr-status');if(el)el.textContent=({pending:'等待扫码…',scanned:'已扫码，请在学校页面确认',confirmed:'认证已确认，正在验证会话…',connected:'已连接学校教务'}[r.status]||r.message||'等待学校响应…');if(r.connected){state.connected=true;closeModal();toast('教务已连接，正在读取课表');await syncAcademic();}}catch(e){const el=$('#qr-status');if(el)el.textContent='查询状态：'+e.message;clearInterval(state.poll);state.poll=null;}}
async function refreshPowerBridge(silent=false){
 if(state.powerBridgeStatus==='checking')return;
 state.powerBridgeChecked=Date.now();
 try{
  const result=await api('power/bridge/read');
  state.powerBridgeStatus=result.status||'not-paired';
  state.powerBridgeError='';
  if(result.updatedAt)state.powerBridgeUpdatedAt=result.updatedAt;
  if(result.status==='paired'&&result.power&&result.version!==state.powerBridgeVersion){
   if(result.source!=='ios-native'||!Number.isFinite(Number(result.power.balance))||
      Number(result.power.balance)<0||Number(result.power.balance)>1000000||
      !['度','kWh','千瓦时','度电'].includes(result.power.unit)||
      !Number.isFinite(Date.parse(result.power.updatedAt||'')))throw Error('设备返回的电量格式无法验证');
   const newPower={...result.power,source:'ios-native'};
   const current=state.data.power;
   const newer=!current||state.data.demo||!Number.isFinite(Date.parse(current.updatedAt||''))||
     Date.parse(newPower.updatedAt)>=Date.parse(current.updatedAt);
   if(newer){
    const sameRoom=current?.roomLabel===newPower.roomLabel&&
      ['ios-native','ios-native-cache'].includes(current?.source);
    let records=Array.isArray(result.powerDaily)?result.powerDaily:[];
    if(result.historyStatus!=='complete'&&sameRoom){
     const map=new Map();
     for(const row of [...(state.data.powerDaily||[]),...records]){
      if(/^20\d{2}-\d{2}-\d{2}$/.test(String(row?.date||'')))map.set(row.date,row);
     }
     records=[...map.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-90);
    }
    const validated=window.GZUCM_POWER_INSIGHTS?.normalizeHistory(records,iso(today()))||[];
    state.data={...state.data,power:newPower,powerDaily:validated};
    state.powerHistoryStatus=result.historyStatus||'';
    state.powerSnapshots=window.GZUCM_POWER_SNAPSHOTS?.append(state.powerSnapshots,newPower,new Date())||[];
    try{
     const power=window.GZUCM_POWER_SNAPSHOTS?.cachedPower(newPower);
     if(power)localStorage.setItem(LIVE_POWER_DB,JSON.stringify({
      power,powerDaily:validated,snapshots:state.powerSnapshots,recordedAt:new Date().toISOString()
     }));
    }catch{state.powerBridgeError='已收到 iOS 电量，但本地缓存写入失败';}
    store();
    if(!silent)toast('已获取配对 iOS App 的电量数据');
   }
   state.powerBridgeVersion=result.version;
  }
  if(state.view==='power'||state.view==='today')render();
  return result;
 }catch(error){
  state.powerBridgeError=String(error?.message||'设备同步读取失败');
  if(state.view==='power')render();
  if(!silent)toast(state.powerBridgeError);
  return null;
 }
}
async function beginPowerPairing(){
 try{
  const result=await api('power/bridge/start',{method:'POST',body:'{}'});
  state.powerBridgeStatus='pending';state.powerBridgeVersion=0;state.powerBridgeUpdatedAt='';
  render();
  const code=String(result.code||'');
  if(!/^[A-Z0-9_-]{12}$/.test(code))throw Error('服务端未返回有效配对码');
  openModal('配对 iOS App · 自动同步',`<p>请在原生「广中医口袋」App 中打开「设置与账户 → 一卡通同步」，填写当前网站地址及下方一次性配对码。</p>
  <div class="card" style="text-align:center"><div class="setting-label">一次性配对码 · 五分钟内有效</div><div class="metric-value" style="font-size:clamp(23px,6vw,34px);letter-spacing:3px;overflow-wrap:anywhere">${E(code)}</div></div>
  <div class="grid-gap mt-12"><button type="button" class="btn primary block" data-action="copyPowerPair" data-code="${E(code)}">${I('file',14)} 复制配对码</button>
  <button type="button" class="btn block" data-action="refreshBridge">${I('refresh',14)} 检查配对及同步状态</button></div>
  <div class="note mt-12">此配对只允许 iOS App 将已读取的余额和用电明细传到本站，不会获得学校 Cookie 或密码。配对服务重启、凭据失效时需再次配对。</div>`);
 }catch(error){state.powerBridgeError=error.message||'生成配对码失败';render();toast(state.powerBridgeError);}
}
async function disconnectPowerBridge(){
 try{await api('power/bridge/revoke',{method:'POST',body:'{}'});}catch{}
 state.powerBridgeStatus='not-paired';state.powerBridgeVersion=0;state.powerBridgeUpdatedAt='';
 state.powerBridgeError='';
 render();toast('已解除网站与 iOS App 配对');
}
async function syncPower(automatic=false){
 if(state.powerStatus==='loading')return;
 state.powerLastAttempt=Date.now();
 if(!state.ecardReady&&state.powerBridgeStatus==='paired'){
  const data=await refreshPowerBridge(automatic);
  if(data?.status==='paired'){
   if(!automatic)toast(data.power?'已检查设备推送的电量':'设备已配对，请先在 iOS App 读取电量');
   return;
  }
 }
 if(!state.ecardReady){
  // Recheck our server session. A browser's own Cookie is not an
  // authorization token for ecard.gzucm.edu.cn.
  try{const session=await api('session');state.ecardReady=!!session.ecardReady;}catch{}
  if(!state.ecardReady){
   state.powerError='当前网站没有可用的一卡通授权会话；请在学校官网查看实时电量，或记录自己的查询结果。';
   if(state.view==='power')render();
   if(!automatic)powerHelp(state.powerError);
   return;
  }
 }
 state.powerStatus='loading';state.powerError='';
 if(state.view==='power')render();
 try{
  const result=await api('power');
  if(!result?.power||!['ecard-live','ecard-page'].includes(result.source)||
   !Number.isFinite(Number(result.power.balance))||Number(result.power.balance)<0||Number(result.power.balance)>1000000){
   throw Error('学校返回的余额缺少有效且可验证的数据来源');
  }
  const previousPower=state.data.power;
  let history=Array.isArray(result.powerDaily)?result.powerDaily:[];
  const sameOfficialRoom=previousPower?.roomLabel===result.power.roomLabel&&
   ['ecard-live','ecard-page'].includes(previousPower?.source);
  if(result.historyStatus!=='complete'&&sameOfficialRoom){
   const records=new Map();
   for(const row of [...(state.data.powerDaily||[]),...history]){
    if(/^20\d{2}-\d{2}-\d{2}$/.test(String(row?.date||'')))records.set(row.date,row);
   }
   history=[...records.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-90);
  }
  state.data={...state.data,power:result.power,powerDaily:history};
  // Successful verified reads create one local balance snapshot per day.
  // This is separate from actual daily usage, which comes from the school.
  state.powerSnapshots=window.GZUCM_POWER_SNAPSHOTS?.append(
   state.powerSnapshots,result.power,new Date())||[];
  state.powerLastSync=Date.now();
  try{
   const power=window.GZUCM_POWER_SNAPSHOTS?.cachedPower(result.power);
   if(power){
    localStorage.setItem(LIVE_POWER_DB,JSON.stringify({
     power,powerDaily:history.slice(-90),snapshots:state.powerSnapshots,
     recordedAt:new Date().toISOString()
    }));
    state.powerLastStored=power.updatedAt;
   }
  }catch{state.powerError='电量已读取，但浏览器本地存储失败，刷新后可能无法保留记录。';}
  state.powerHistoryStatus=result.historyStatus||'';
  state.powerError=Array.isArray(result.warnings)?result.warnings.join(' '):'';
  store();render();
  toast(result.source==='ecard-live'?'已同步官方实时电量':'已读取学校页面电量，请以官网核对为准');
 }catch(e){
  state.powerError=e.message||'电费查询失败';
  if(e.status===428||e.status===401)state.ecardReady=false;
  if(state.view==='power')render();
  if(!automatic&&e.status!==429)powerHelp(state.powerError);
  else if(!automatic)toast(state.powerError);
 }finally{
  state.powerStatus='idle';
  if(state.view==='power')render();
 }
}
async function syncAcademic(){if(state.loading)return;if(state.data.campus==='graduate'){toast('研究生系统尚不支持此扫码同步，请使用 JSON 导入');return;}state.loading=true;toast('正在读取本科教务数据…');try{
 const semester=await api('academic/semester');const sem=semester.semester;const current=clamp(Math.floor((today()-dt(sem.firstMondayIso))/86400000/7)+1,1,sem.totalWeeks);
 const [weekRes,gradesRes]=await Promise.allSettled([api('academic/week?week='+current),api('academic/grades')]);if(weekRes.status==='rejected'&&gradesRes.status==='rejected')throw Error('课表和成绩接口均未成功：'+weekRes.reason.message);
 const prev=PUBLIC||state.data.demo?{}:state.data;
 const hasWeeks=prev.semester?.code===sem.code;
 const old=hasWeeks?(prev.sessions||[]).filter(s=>Number(s.week)!==current):[];
 const data={schemaVersion:1,demo:false,campus:'undergrad',semester:sem,sessions:[...old,...(weekRes.status==='fulfilled'?weekRes.value.sessions:[])],grades:gradesRes.status==='fulfilled'?gradesRes.value.grades:(prev.grades||[]),levels:gradesRes.status==='fulfilled'?gradesRes.value.levels:(prev.levels||[]),fitness:gradesRes.status==='fulfilled'?gradesRes.value.fitness:(prev.fitness||[]),power:prev.power||(['ecard-live','ecard-page','ecard-cache','ios-native','ios-native-cache'].includes(state.data.power?.source)?state.data.power:null)||(PUBLIC?saved(POWER_DB,null)?.power:null)||null,powerDaily:prev.powerDaily||(['ecard-live','ecard-page'].includes(state.data.power?.source)?state.data.powerDaily:null)||(PUBLIC?saved(POWER_DB,null)?.powerDaily:null)||[],exams:prev.exams||[]};
 state.data=data;state.loadedWeeks=new Set(weekRes.status==='fulfilled'?[current]:[]);state.week=current;store();state.view='today';render();toast(`同步完成${weekRes.status==='rejected'?'（课表失败）':''}${gradesRes.status==='rejected'?'（成绩失败）':''}`);
 }catch(e){toast('同步失败：'+e.message);if(!state.connected)connectModal();}finally{state.loading=false;}}
async function loadWeek(week){
 if(!state.connected||state.data.campus==='graduate'||week<1||week>(term().totalWeeks||19)||state.loadedWeeks.has(week))return;
 try{
  const result=await api('academic/week?week='+week);
  state.data.sessions=[...(state.data.sessions||[]).filter(s=>Number(s.week)!==week),...(result.sessions||[])];
  state.loadedWeeks.add(week);
  store();
  if(state.view==='schedule')renderScheduleContent();
  else render();
 }catch(e){toast('本周课表同步失败：'+e.message);}
}
function loadSundayWeek(){
 const week=state.week-1;
 if(week>=1&&week<=(term().totalWeeks||19))loadWeek(week);
}
/** Load only university weeks intersecting the displayed calendar month.
 * No grade fetches and no local caching of public school academic records. */
async function loadMonth(){
 if(!state.connected||state.data.campus==='graduate')return;
 const key=state.monthCursor;
 if(state.monthLoading&&state.monthFetchKey===key)return;
 state.monthFetchKey=key;
 const serial=++state.monthSerial;
 const first=dt(key),last=new Date(first.getFullYear(),first.getMonth()+1,0,12);
 const weeks=new Set();
 for(let d=first;d<=last;d=addDays(d,1)){
  const week=calcWeek(d);
  if(week>=1&&week<=(term().totalWeeks||19)&&!state.loadedWeeks.has(week))weeks.add(week);
 }
 if(!weeks.size){
  state.monthLoading=false;
  state.monthLoadError=0;
  return;
 }
 state.monthLoading=true;
 state.monthLoadError=0;
 const status=$('.month-brief[role="status"]');
 if(status)status.textContent='正在同步当月课程…';
 let failures=0;
 const toFetch=[...weeks].sort((a,b)=>a-b);
 for(let i=0;i<toFetch.length;i+=3){
  const batch=toFetch.slice(i,i+3);
  const results=await Promise.allSettled(batch.map(week=>api('academic/week?week='+week)));
  for(let j=0;j<batch.length;j++){
   if(results[j].status!=='fulfilled'){failures++;continue;}
   const week=batch[j],value=results[j].value;
   state.data.sessions=[...(state.data.sessions||[]).filter(c=>Number(c.week)!==week),...(value.sessions||[])];
   state.loadedWeeks.add(week);
  }
 }
 store();
 if(serial===state.monthSerial){
  state.monthLoading=false;
  state.monthLoadError=failures;
  if(state.view==='schedule'&&state.scheduleMode==='month')renderScheduleContent();
  if(failures)toast('部分教学周加载失败，可重新切换月份或重试');
 }
}
async function logout(){try{await api('logout',{method:'POST',body:'{}'});}catch{}localStorage.removeItem(LIVE_POWER_DB);state.powerSnapshots=[];state.connected=false;state.ecardReady=false;state.powerLastSync=0;state.powerLastAttempt=0;state.loadedWeeks.clear();if(PUBLIC){state.data=window.GZUCM_DEMO;localStorage.removeItem(DB);state.week=weekNow();}toast('已退出学校会话');render();}
function navigateBottomModule(view){
 if(!['today','schedule','grades','power','settings'].includes(view))return;
 if(state.view===view){
  // A repeated tap keeps selection feedback without scaling or bouncing the page.
  return;
 }
 state.view=view;
 closeModal();
 render();
 if(view==='power'){if(state.ecardReady&&Date.now()-state.powerLastAttempt>120000)syncPower(true);if(typeof refreshPowerBridge==='function')refreshPowerBridge(true);}
 if(view==='schedule')state.scheduleMode==='month'?loadMonth():loadSundayWeek();
 window.scrollTo({top:0,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}

/* Touch / pen / mouse drag along bottom navigation:
 * glass follows the finger; release chooses the closest module and springs
 * into place. Vertical swipes remain browser scrolling (touch-action:pan-y).
 */
let bottomSwipe=null;
let ignoreBottomClickUntil=0;
function bottomSwipeLayout(nav){
 const tabs=[...nav.querySelectorAll('.bottom-item')];
 const rect=nav.getBoundingClientRect();
 if(!tabs.length)return null;
 return {tabs,rect,
  width:Math.max(12,tabs[0].offsetWidth-6),
  first:tabs[0].offsetLeft+3,last:tabs[tabs.length-1].offsetLeft+3,
  centers:tabs.map(tab=>{const r=tab.getBoundingClientRect();return r.left+r.width/2;})};
}
function bottomSwipeNearest(sw,x){
 const centers=sw.layout.centers;
 let index=0,best=Infinity;
 centers.forEach((center,i)=>{const n=Math.abs(x-center);if(n<best){index=i;best=n;}});
 return index;
}
function placeBottomSwipeGlass(sw,x){
 const l=sw.layout;
 // The lens remains clamped; overscroll compresses its inner glass and lights the rim.
 const first=l.centers[0],last=l.centers[l.centers.length-1];
 const beyondLeft=Math.max(0,first-12-x),beyondRight=Math.max(0,x-last-12);
 const direction=beyondLeft>0?-1:beyondRight>0?1:0;
 const energy=Math.min(1,Math.max(beyondLeft,beyondRight)/85);
 sw.edge=direction;
 sw.nav.classList?.toggle?.('edge-left',direction<0);
 sw.nav.classList?.toggle?.('edge-right',direction>0);
 sw.nav.style?.setProperty?.('--edge-energy',energy.toFixed(3));
 sw.glass.style?.setProperty?.('--edge-shift',(direction*energy*8).toFixed(2)+'px');
 sw.glass.style?.setProperty?.('--edge-scale',(1-energy*.11).toFixed(3));
 const pos=Math.max(l.first,Math.min(l.last,x-l.rect.left-l.width/2));
 sw.glass.style.width=l.width+'px';
 sw.glass.style.transform='translate3d('+pos+'px,0,0)';
}
function releaseBottomEdge(sw,allowRebound=true){
 sw.nav.classList?.remove?.('edge-left','edge-right');
 sw.nav.style?.setProperty?.('--edge-energy','0');
 sw.glass.style?.setProperty?.('--edge-shift','0px');
 sw.glass.style?.setProperty?.('--edge-scale','1');
 if(sw.edge&&allowRebound){
  sw.glass.classList?.add?.('is-edge-rebound');
  setTimeout(()=>sw.glass.classList?.remove?.('is-edge-rebound'),500);
 }
}
function animateDockRelease(nav){
 if(!nav)return;
 nav.classList?.remove?.('is-dock-releasing');
 // Same-tab taps are animated without rebuilding the entire page.
 void nav.offsetWidth;
 nav.classList?.add?.('is-dock-releasing');
 nav.addEventListener?.('animationend',event=>{
  if(['pocketDockRelease','pocketDockClickConfirm','pocketDockSoftSpring'].includes(event.animationName))nav.classList?.remove?.('is-dock-releasing');
 },{once:true});
}
function animateDockDrop(nav){
 if(!nav)return;
 nav.classList?.remove?.('is-dock-dropping');
 void nav.offsetWidth;
 nav.classList?.add?.('is-dock-dropping');
 nav.addEventListener?.('animationend',event=>{
  if(['pocketDockDrop','pocketDockDragReturn','pocketDockSoftDrop'].includes(event.animationName))nav.classList?.remove?.('is-dock-dropping');
 },{once:true});
}
function bottomSwipeDown(event){
 const nav=event.target.closest?.('.bottom-nav');
 if(!nav||event.isPrimary===false||event.button>0||!nav.getClientRects().length)return;
 if(event.target.closest('input,select,textarea'))return;
 const glass=nav.querySelector('.bottom-liquid-indicator');
 const active=nav.querySelector('.bottom-item.active');
 if(!glass||!active)return;
 // A touch-down immediately magnifies the entire rail, before the
 // layout work needed for optional horizontal scrubbing. Never wait for move.
 nav.classList?.remove?.('is-dock-settling','is-dock-releasing','is-dock-dropping');
 nav.classList?.add?.('is-dock-pressed');
 const pressed=event.target.closest?.('.bottom-item');
 pressed?.classList?.add?.('is-pressed');
 const layout=bottomSwipeLayout(nav);
 if(!layout){
  nav.classList?.remove?.('is-dock-pressed');
  pressed?.classList?.remove?.('is-pressed');
  return;
 }
 armLiquidSound();
 bottomSwipe={pointerId:event.pointerId,nav,glass,layout,pressed,
  startX:event.clientX,startY:event.clientY,
  dragging:false,vertical:false,frame:0,lastX:event.clientX,lastTab:-1,edge:0};
}
function bottomSwipeMove(event){
 const sw=bottomSwipe;
 if(!sw||sw.pointerId!==event.pointerId||sw.vertical)return;
 const dx=event.clientX-sw.startX,dy=event.clientY-sw.startY;
 if(!sw.dragging){
  if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)*1.12){
   sw.vertical=true;
   sw.nav.classList?.remove?.('is-dock-pressed','is-dock-dragging');
   sw.pressed?.classList?.remove?.('is-pressed');
   return;
  }
  if(Math.abs(dx)<6||Math.abs(dx)<Math.abs(dy)*1.2)return;
  sw.dragging=true;
  sw.nav.classList?.add?.('is-dock-dragging');
  sw.pressed?.classList?.remove?.('is-pressed');
  sw.glass.classList.add('is-instant','is-dragging');
  sw.glass.classList.remove('is-moving');
  try{sw.nav.setPointerCapture(event.pointerId);}catch{}
 }
 if(event.cancelable)event.preventDefault();
 sw.lastX=event.clientX;
 const index=bottomSwipeNearest(sw,event.clientX);
 if(index!==sw.lastTab&&index>=0){
  sw.lastTab=index;
  sw.layout.tabs.forEach((tab,i)=>tab.classList.toggle('is-scrubbed',i===index));
  playLiquidTick(index);
  window.GZUCM_HAPTICS?.pulse('selection');
 }
 if(sw.frame)return;
 sw.frame=requestAnimationFrame(()=>{
  sw.frame=0;
  if(sw.glass.isConnected)placeBottomSwipeGlass(sw,sw.lastX);
 });
}
function bottomSwipeFinish(event,cancelled=false){
 const sw=bottomSwipe;
 if(!sw||sw.pointerId!==event.pointerId)return;
 bottomSwipe=null;
 sw.nav.classList?.remove?.('is-dock-pressed','is-dock-dragging');
 sw.pressed?.classList?.remove?.('is-pressed');
 if(sw.frame)cancelAnimationFrame(sw.frame);
 sw.layout.tabs.forEach(tab=>tab.classList.remove('is-scrubbed'));
 try{if(sw.nav.hasPointerCapture?.(event.pointerId))sw.nav.releasePointerCapture(event.pointerId);}catch{}
 if(!sw.dragging){
  releaseBottomEdge(sw,false);
  // A direct Dock tap gives the whole rail one restrained non-linear return;
  // actual horizontal scrubbing remains uninterrupted and does not bounce.
  if(!cancelled&&!sw.vertical){
   confirmGlassSelection(sw.glass);
   animateDockRelease(sw.nav);
  }
  return;
 }
 if(event.cancelable)event.preventDefault();
 ignoreBottomClickUntil=Date.now()+420;
 // Commit the final finger position before the navigation re-renders.
 placeBottomSwipeGlass(sw,event.clientX);
 releaseBottomEdge(sw,false);
 const index=bottomSwipeNearest(sw,event.clientX);
 const next=sw.layout.tabs[index]?.dataset.view;
 if(cancelled||!next||next===state.view){
  sw.glass.classList.remove('is-instant','is-dragging');
  const active=sw.nav.querySelector('.bottom-item.active');
  if(active){
   sw.glass.style.width=Math.max(12,active.offsetWidth-6)+'px';
   sw.glass.style.transform='translate3d('+(active.offsetLeft+3)+'px,0,0)';
  }
  if(!cancelled)confirmGlassSelection(sw.glass);
  animateDockDrop(sw.nav);
  return;
 }
 pendingBottomSwipeGeometry={x:Math.max(sw.layout.first,Math.min(sw.layout.last,
  event.clientX-sw.layout.rect.left-sw.layout.width/2)),width:sw.layout.width};
 liquidGestureSnap=true;
 dockRemountPulse=false;
 dockRemountDrop=true;
 navigateBottomModule(next);
}
function bottomSwipeClickCapture(event){
 if(Date.now()>ignoreBottomClickUntil||!event.target.closest?.('.bottom-nav'))return;
 ignoreBottomClickUntil=0;
 event.preventDefault();
 event.stopImmediatePropagation();
}
/* Gentle button-level non-linear press/release feedback.
 * Never animate an outer card frame: only actual interactive controls rebound.
 * Pointer tracking yields immediately to page scrolling and liquid scrub gestures.
 * Dialogs and floating popovers retain their existing zoom/return animations. */
let wholeSurfacePress=null;
let pendingSurfaceBounce=null;
const wholeSurfaceTimers=new WeakMap();
function captureSurfaceBounce(surface){
 const node=surface?.dataset;
 if(!node)return;
 const keys=['day','gradeTab','credit','date','action','view','course'];
 const name=keys.find(key=>node[key]!==undefined);
 if(!name)return;
 pendingSurfaceBounce={name,value:String(node[name]),at:Date.now()};
}
function restoreSurfaceBounce(root){
 const pending=pendingSurfaceBounce;
 pendingSurfaceBounce=null;
 if(!pending||Date.now()-pending.at>700)return;
 const candidates=root.querySelectorAll?.('[data-day],[data-grade-tab],[data-credit],[data-date],[data-action],[data-view],[data-course]')||[];
 for(const button of candidates){
  if(String(button.dataset?.[pending.name])!==pending.value)continue;
  if(button.closest?.('.modal-card,.safari-floating-menu,.bottom-nav'))continue;
  button.classList.add('pocket-full-release');
  setTimeout(()=>button.classList?.remove?.('pocket-full-release'),540);
  return;
 }
}
const WHOLE_SURFACE_TARGET='button,a[href],[role="button"],[role="switch"],[role="tab"],[data-action],[data-view],[data-day],[data-credit],[data-grade-tab],[data-course],[data-date]';
const WHOLE_SURFACE_POPUP='#modal-root,#popover-root,.modal-backdrop,.modal-card,.safari-floating-menu,.toast-root';
function wholeSurfacePressDown(event){
 if(event.isPrimary===false||event.button>0||wholeSurfacePress)return;
 const target=event.target;
 if(!target?.closest||target.closest(WHOLE_SURFACE_POPUP))return;
 // Text entry and content-editable regions must never jump under the cursor.
 if(target.closest('input,textarea,select,[contenteditable="true"]'))return;
 // Switches have their own iOS-style stretching thumb; do not apply the
 // generic whole-button animation on top of the dedicated switch physics.
 if(target.closest('.switch[role="switch"]'))return;
 let surface=target.closest(WHOLE_SURFACE_TARGET);
 // Never scale the outer frame of a course, overview, or decorative card.
 // Only real controls (buttons/links) within those cards may rebound.
 if(!surface||!surface.closest?.('#app')||surface.closest(WHOLE_SURFACE_POPUP))return;
 if(surface.matches?.('.card,.agenda-row,.hero-card,.calendar-visual,.month-calendar'))return;
 if(surface.closest('.bottom-nav'))return; // Dock scales on its own rail.
 if(surface.closest('.is-horizontal-rail'))return; // A horizontal bar scales as one piece.
 if(surface.matches?.(':disabled,[aria-disabled="true"],input,textarea,select'))return;
 if(surface.closest('input,textarea,select,[contenteditable="true"]'))return;
 const timer=wholeSurfaceTimers.get(surface);
 if(timer)clearTimeout(timer);
 surface.classList?.remove?.('pocket-full-release');
 surface.classList?.add?.('pocket-full-press');
 if(surface.matches?.('.card'))surface.classList?.add?.('pocket-full-card');
 wholeSurfacePress={surface,pointerId:event.pointerId,x:event.clientX,y:event.clientY};
}
function wholeSurfacePressEnd(event,cancelled=false){
 const p=wholeSurfacePress;
 if(!p||p.pointerId!==event.pointerId)return;
 wholeSurfacePress=null;
 p.surface.classList?.remove?.('pocket-full-press');
 if(cancelled){
  p.surface.classList?.remove?.('pocket-full-release','pocket-full-card');
  return;
 }
 p.surface.classList?.add?.('pocket-full-release');
 captureSurfaceBounce(p.surface);
 const handle=setTimeout(()=>{
  p.surface.classList?.remove?.('pocket-full-release','pocket-full-card');
  wholeSurfaceTimers.delete(p.surface);
 },540);
 wholeSurfaceTimers.set(p.surface,handle);
}
function wholeSurfacePressMove(event){
 const p=wholeSurfacePress;
 if(!p||p.pointerId!==event.pointerId)return;
 if(Math.hypot(event.clientX-p.x,event.clientY-p.y)>11)wholeSurfacePressEnd(event,true);
}
function handleClick(event){const target=event.target.closest('[data-view],[data-action],[data-day],[data-course],[data-grade-tab],[data-credit]');if(target&&!target.closest('.modal-card')&&target.dataset.action!=='close')recordDialogOrigin(target);if(!event.target.closest('#popover-root')&&!event.target.closest('[data-action="themeMenu"],[data-action="settingsMenu"],[data-action="settingChoice"]'))hideSafariMenu();if(!target){if(event.target.id==='modal-overlay'){window.GZUCM_HAPTICS?.pulse('close');closeModal();}return;}if(target.matches('a'))event.preventDefault();
 if(target.closest('.liquid-selector,.safari-floating-menu')&&target.matches('button')){
  armLiquidSound();playLiquidTick();
  const group=target.closest('.liquid-selector');
  if(group&&target.classList.contains('active'))confirmGlassSelection(group.querySelector('.liquid-choice-highlight'));
 }
 if(target.dataset.view){if(target.closest('.bottom-nav')){
  dockRemountPulse=target.dataset.view!==state.view; // new Dock retains gentle tap feedback
  if(target.dataset.view===state.view)confirmGlassSelection(target.closest('.bottom-nav')?.querySelector('.bottom-liquid-indicator'));
  armLiquidSound();playLiquidTick();
 }navigateBottomModule(target.dataset.view);return;}
 if(target.dataset.course){showCourse(target.dataset.course);return;}
 if(target.dataset.day!==undefined){state.weekday=Number(target.dataset.day);render();if(state.weekday===0)loadSundayWeek();return;}
 if(target.dataset.gradeTab){state.gradeTab=target.dataset.gradeTab;render();return;}
 if(target.dataset.credit){state.creditMode=target.dataset.credit;render();return;}
 const act=target.dataset.action;
 switch(act){case'prevWeek':case'nextWeek':{state.week=clamp(state.week+(act==='nextWeek'?1:-1),1,(term().totalWeeks||19)+1);render();if(state.week<=term().totalWeeks)loadWeek(state.week);loadSundayWeek();break;}
 case'thisWeek':state.week=weekNow();state.weekday=today().getDay();if(state.weekday===0)state.week=clamp(calcWeek(addDays(today(),1)),1,(term().totalWeeks||19)+1);render();if(state.week<=term().totalWeeks)loadWeek(state.week);loadSundayWeek();break;
 case'scheduleView':{const nextMode=target.dataset.mode==='month'?'month':'week';if(nextMode===state.scheduleMode)break;if(nextMode==='month'){const chosen=dayDate(state.week,state.weekday);state.monthSelected=iso(chosen);state.monthCursor=iso(new Date(chosen.getFullYear(),chosen.getMonth(),1));}else{const chosen=dt(state.monthSelected);state.weekday=chosen.getDay();state.week=clamp(calcWeek(state.weekday===0?addDays(chosen,1):chosen),1,(term().totalWeeks||19)+1);}state.scheduleMode=nextMode;if(nextMode==='month'){state.monthLoading=false;state.monthLoadError=0;}state.prefs.calendarView=nextMode;storePrefs();transitionScheduleMode(()=>{if(nextMode==='month')loadMonth();else{if(state.week<=term().totalWeeks)loadWeek(state.week);loadSundayWeek();}});break;}
 case'prevMonth':case'nextMonth':{const d=dt(state.monthCursor);d.setDate(1);d.setMonth(d.getMonth()+(act==='nextMonth'?1:-1));state.monthCursor=iso(d);state.monthSelected=iso(d);state.monthLoading=false;state.monthLoadError=0;render();loadMonth();break;}
 case'retryMonth':loadMonth();break;
 case'thisMonth':state.monthCursor=iso(new Date(today().getFullYear(),today().getMonth(),1));state.monthSelected=iso(today());state.monthLoading=false;state.monthLoadError=0;render();loadMonth();break;
 case'selectMonthDay':{const raw=target.dataset.date;if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))break;state.monthSelected=raw;if(state.monthCursor.slice(0,7)!==raw.slice(0,7)){const d=dt(raw);state.monthCursor=iso(new Date(d.getFullYear(),d.getMonth(),1));state.monthLoading=false;state.monthLoadError=0;render();loadMonth();}else{document.querySelectorAll('.month-cell').forEach(cell=>{const selected=cell.dataset.date===raw;cell.classList.toggle('selected',selected);cell.setAttribute('aria-pressed',String(selected));});openMonthDayDetail(raw);}break;}
 case'ics':exportICS();break;case'themeMenu':toggleSafariMenu(target,'theme');break;case'settingsMenu':toggleSafariMenu(target,'settings');break;case'settingChoice':toggleSafariMenu(target,target.dataset.choice);break;case'selectTheme':selectTheme(target.dataset.value);break;case'selectGlass':selectGlass(target.dataset.value);break;case'selectScheduleLayout':selectScheduleLayout(target.dataset.value);break;case'selectStart':if(['today','schedule','grades','power'].includes(target.dataset.value)){state.prefs.start=target.dataset.value;storePrefs();render();toast('默认启动页已更新');}break;case'selectCampus':if(['undergrad','graduate'].includes(target.dataset.value)){state.data={...state.data,campus:target.dataset.value,demo:state.data.demo};if(!state.data.demo)store();render();toast(target.dataset.value==='graduate'?'研究生系统暂只支持导入数据':'已设为本科');}break;case'openSettings':state.view='settings';render();window.scrollTo({top:0,behavior:'smooth'});break;case'appearance':appearanceModal();break;case'editPower':editPowerModal();break;case'wallpaper':$('#wallpaper-file').click();break;case'clearWallpaper':state.prefs.wallpaper='';storePrefs();render();toast('已移除课表背景');break;
 case'close':closeModal();break;case'reset':resetModal();break;case'resetConfirm':localStorage.removeItem(DB);localStorage.removeItem(POWER_DB);localStorage.removeItem(LIVE_POWER_DB);state.powerSnapshots=[];state.data=window.GZUCM_DEMO;state.connected=false;state.week=weekNow();closeModal();render();toast('已恢复演示数据');break;
 case'connect':hideSafariMenu();connectModal('qr');break;case'authPassword':connectModal('password');break;case'authQr':connectModal('qr');break;case'openOfficialLogin':openOfficialLogin();break;case'checkOfficialAuth':checkOfficialAuth();break;case'startQr':state.authMode='qr';startQr();break;case'syncPower':syncPower();break;case'pairPower':beginPowerPairing();break;case'refreshBridge':refreshPowerBridge();break;case'disconnectBridge':disconnectPowerBridge();break;case'copyPowerPair':navigator.clipboard?.writeText(target.dataset.code||'').then(()=>toast('配对码已复制'),()=>toast('请手动选择并复制'));break;case'copyQr':navigator.clipboard?.writeText(state.qrLink||'').then(()=>toast('链接已复制'),()=>toast('请手动复制链接'));break;
 case'toggleSound':commitLiquidSwitch(target,state.prefs.soundEffects===false);break;
 case'toggleHaptics':commitLiquidSwitch(target,state.prefs.hapticEffects===false);break;
 case'toggleLanguage':toggleLanguage();break;
  case'refresh':if(state.connected)syncAcademic();else{connectModal();toast('需要先连接学校教务');}break;
 case'logout':logout();break;case'import':$('#import-file').click();break;case'export':exportData();break;
 case'demo':localStorage.removeItem(POWER_DB);localStorage.removeItem(LIVE_POWER_DB);state.powerSnapshots=[];state.data=window.GZUCM_DEMO;state.connected=false;state.week=weekNow();localStorage.removeItem(DB);render();toast('已切换到虚构演示数据');break;
 default:break;}}
function toggleLanguage(){
 state.prefs.language=state.prefs.language==='en'?'zh':'en';
 storePrefs();
 render();
 toast(state.prefs.language==='en'?'Language changed to English':'界面语言已切换为中文');
}
function handleChange(event){const t=event.target;if(t.id==='theme-select'){state.prefs.theme=t.value;storePrefs();applyTheme();render();}if(t.id==='start-select'){state.prefs.start=t.value;storePrefs();toast('默认启动页已更新');}if(t.id==='campus-select'){state.data={...state.data,campus:t.value,demo:state.data.demo};if(!state.data.demo)store();render();toast(t.value==='graduate'?'研究生系统暂只支持导入数据':'已设为本科');}if(t.id==='opacity-range'){state.prefs.wallOpacity=Number(t.value);storePrefs();toast('课表背景显示强度已更新');}}
function handleInput(event){if(event.target.id==='grade-search'){const input=event.target;state.gradeSearch=input.value;const selection=[input.selectionStart,input.selectionEnd];render();const next=$('#grade-search');next?.focus();try{next?.setSelectionRange(...selection);}catch{}}}
function handleSubmit(event){
 if(event.target.id!=='power-form')return;
 event.preventDefault();
 const form=new FormData(event.target);
 const rawBalance=String(form.get('balance')??'').trim();
 const balance=Number(rawBalance),rawUsage=String(form.get('usage')??'').trim();
 const date=String(form.get('date')||'');
 const todayDay=window.GZUCM_POWER_INSIGHTS?.ordinal(iso(today()));
 const recordDay=window.GZUCM_POWER_INSIGHTS?.ordinal(date);
 if(!rawBalance||!Number.isFinite(balance)||balance<0||balance>1000000){toast('请填写有效的当前剩余电量');return;}
 if(!Number.isFinite(recordDay)||recordDay>todayDay||recordDay<todayDay-90){toast('只能补录最近90天的有效日期');return;}
 if(rawUsage&&(!Number.isFinite(Number(rawUsage))||Number(rawUsage)<0||Number(rawUsage)>1000000)){
  toast('请填写有效的每日用电量');return;
 }
 const room=String(form.get('room')||'').trim().slice(0,64);
 if(!room){toast('请填写宿舍名称');return;}
 const previous=state.data.power;
 const keepHistory=previous?.source==='manual'&&previous.roomLabel===room;
 let daily=keepHistory?(state.data.powerDaily||[]).filter(x=>x.date!==date):[];
 if(rawUsage)daily.push({date,usage:Number(rawUsage),remain:date===iso(today())?balance:null,total:null});
 daily.sort((a,b)=>a.date.localeCompare(b.date));
 state.data={...state.data,power:{balance,unit:'度',roomLabel:room,updatedAt:new Date().toISOString(),source:'manual'},powerDaily:daily.slice(-90)};
 state.powerHistoryStatus='manual';state.powerError='';
 if(PUBLIC){
  try{localStorage.setItem(POWER_DB,JSON.stringify({power:state.data.power,powerDaily:state.data.powerDaily}));}
  catch{toast('无法持久保存电量记录');}
 }
 store();closeModal();render();toast('已保存手动电量与用电记录');
}
window.addEventListener('message',event=>{if(event.origin!==window.location.origin||event.source!==state.ssoPopup||event.data?.type!=='GZUCM_CAS_CALLBACK_RETURN')return;checkOfficialAuth();});
// Follow system appearance without overriding the user's explicit choice.
window.matchMedia?.('(prefers-color-scheme: dark)')?.addEventListener?.('change',()=>{if(state.prefs.theme==='system'){applyTheme();render();}});
window.GZUCM_I18N?.observe(document.body,()=>state.prefs.language);
// Only refresh while the site is actually in use; Safari cannot run this
// loop once the PWA/tab is closed or the school session has expired.
function maybeRefreshPower(){
 if(document.visibilityState!=='visible'||state.view!=='power')return;
 if(Date.now()-state.powerBridgeChecked>5*60*1000)refreshPowerBridge(true);
 if(!state.ecardReady)return;
 if(state.powerStatus==='loading'||Date.now()-state.powerLastAttempt<2*60*60*1000)return;
 syncPower(true);
}
document.addEventListener('visibilitychange',maybeRefreshPower);
window.addEventListener('focus',maybeRefreshPower);
setInterval(maybeRefreshPower,10*60*1000);
window.addEventListener('resize',()=>{hideSafariMenu();alignBottomLiquid(null,null);});
window.addEventListener('scroll',e=>{if(!e.target?.closest?.('#popover-root'))hideSafariMenu();},true);
document.addEventListener('pointerdown',liquidSwitchDown,{passive:true});
document.addEventListener('pointermove',liquidSwitchMove,{passive:false});
document.addEventListener('pointerup',event=>liquidSwitchFinish(event),{passive:false});
document.addEventListener('pointercancel',event=>liquidSwitchFinish(event,true),{passive:false});
document.addEventListener('click',guardLiquidSwitchClick,true);
document.addEventListener('pointerdown',liquidPointerDown,{passive:true});
document.addEventListener('pointermove',liquidPointerMove,{passive:false});
document.addEventListener('pointerup',event=>liquidPointerFinish(event),{passive:false});
document.addEventListener('pointercancel',event=>liquidPointerFinish(event,true),{passive:false});
document.addEventListener('click',guardLiquidSelectorClick,true);
document.addEventListener('pointerdown',wholeSurfacePressDown,{passive:true});
document.addEventListener('pointermove',wholeSurfacePressMove,{passive:true});
document.addEventListener('pointerup',wholeSurfacePressEnd,{passive:true});
document.addEventListener('pointercancel',event=>wholeSurfacePressEnd(event,true),{passive:true});
window.addEventListener('blur',()=>{if(wholeSurfacePress)wholeSurfacePressEnd({pointerId:wholeSurfacePress.pointerId},true);});
document.addEventListener('pointerdown',bottomSwipeDown,{passive:true});
document.addEventListener('pointermove',bottomSwipeMove,{passive:false});
document.addEventListener('pointerup',event=>bottomSwipeFinish(event),{passive:false});
document.addEventListener('pointercancel',event=>bottomSwipeFinish(event,true),{passive:false});
document.addEventListener('click',bottomSwipeClickCapture,true);
document.addEventListener('click',handleClick);
document.addEventListener('change',handleChange);
document.addEventListener('input',handleInput);
document.addEventListener('submit',handleSubmit);
document.addEventListener('keydown',e=>{if($('#popover-root')?.firstElementChild){if(e.key==='Escape'){hideSafariMenu(true);e.preventDefault();return;}if(['ArrowDown','ArrowUp'].includes(e.key)){const nodes=[...$('#popover-root').querySelectorAll('.safari-menu-option')];if(nodes.length){const i=nodes.indexOf(document.activeElement);nodes[(i+(e.key==='ArrowDown'?1:-1)+nodes.length)%nodes.length].focus();e.preventDefault();}return;}}if(e.key==='Escape')closeModal();if(state.view==='schedule'&&state.scheduleMode==='week'&&!$('#modal-overlay')&&['ArrowLeft','ArrowRight'].includes(e.key)&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){state.week=clamp(state.week+(e.key==='ArrowRight'?1:-1),1,term().totalWeeks);render();loadWeek(state.week);}});
$('#import-file').addEventListener('change',async e=>{await importData(e.target.files[0]);e.target.value='';});
$('#wallpaper-file').addEventListener('change',async e=>{await importWallpaper(e.target.files[0]);e.target.value='';});
let touchStart=null;document.addEventListener('touchstart',e=>{if(e.target.closest('.calendar-visual,.bottom-nav')){touchStart=null;return;}touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});document.addEventListener('touchend',e=>{if(!touchStart||state.view!=='schedule'||$('#modal-overlay'))return;const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>75&&Math.abs(dy)<55){state.week=clamp(state.week+(dx<0?1:-1),1,term().totalWeeks);render();loadWeek(state.week);}},{passive:true});
render();checkServer();if('serviceWorker'in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'))navigator.serviceWorker.register('/sw.js').catch(()=>{});
})();
