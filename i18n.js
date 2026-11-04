/* GZUCM Pocket interface translations.
 * Only fixed UI labels and predictable status phrases are translated.
 * Names/courses returned by the school remain as received where not in UI glossary.
 */
(()=>{
'use strict';
const pairs=[
['密码登录暂不支持','Password login is currently unavailable'],
['请使用微信扫码登录','Please sign in by scanning with WeChat'],
['请切换到「扫码登录」','Please switch to “QR login”'],
['请切换到「扫码登录」，获取学校二维码。电脑端使用微信扫一扫；手机端可先截图保存二维码，再打开微信 → 右上角「＋」→「扫一扫」→「相册」，选择刚才的截图，进入学校官方确认页完成授权。','Switch to QR login to get a school QR code. On a computer, scan it with WeChat. On a phone, take a screenshot, open WeChat → + → Scan → Album and choose the screenshot to confirm on the school site.'],
['可先将二维码截图保存到相册，再从微信「扫一扫 → 相册」选取图片识别；若学校页面不支持单机操作，请使用另一台设备扫码。请不要分享二维码截图。','Save a screenshot of the QR code, then select it in WeChat → Scan → Album. If this does not work on one device, scan from another device. Do not share the QR image.'],
['非官方独立项目，学校密码只在校方官方页面输入。','Independent, unofficial project. Only enter your school password on the official school site.'],
['扫码授权可同步课表；一卡通电费需要另行查询。','QR authorization can sync your timetable; campus electricity requires a separate lookup.'],
['本周课程','Classes this week'],['今日课程','Classes today'],['宿舍剩余','Dorm balance'],
['今日概览','Today'],['我的课表','My timetable'],['学业成绩','Grades'],['宿舍电费','Dorm electricity'],['偏好与设置','Settings'],
['课表','Timetable'],['成绩','Grades'],['电费','Electricity'],['设置','Settings'],['今日','Today'],
['点亮宿舍的每一天。','Power your dorm, every day.'],['让它更像你的校园生活。','Make campus life yours.'],
['每一天，都值得好好安排。','Every day deserves a good plan.'],
['请生成学校登录二维码，使用微信扫码完成官方确认。','Generate a QR code and use WeChat to confirm on the official school site.'],
['登录广中医教务 · 官方身份认证','GZUCM Academic Login · School Verification'],
['登录学校教务','Connect to Academic Services'],['连接学校教务','Connect to Academic Services'],
['学校官方扫码确认 · 不需要在本站输入密码','Official QR confirmation · No password entered here'],
['账号密码','Password'],['扫码登录','QR login'],['密码登录','Password login'],
['前往微信扫码登录','Continue with WeChat QR login'],['获取学校登录二维码','Get school login QR code'],
['手机端扫码方法','Scan on a phone'],['学校官方确认页','Official school confirmation page'],
['学校扫码确认链接已生成 · 为保护登录安全，已隐藏完整链接','QR link ready · Hidden to protect your login'],
['打开学校确认页','Open school confirmation page'],['复制确认链接','Copy confirmation link'],
['等待扫码…','Waiting for QR scan…'],['已扫码，请在学校页面确认','Scanned · Confirm on school page'],
['认证已确认，正在验证会话…','Confirmed · Verifying session…'],['已连接学校教务','Academic services connected'],
['正在请求学校的二维码接口…','Requesting school QR code…'],['扫码已确认，但教务会话尚未生效','QR confirmed, but academic session is not ready'],
['刷新实时数据','Refresh live data'],['刷新数据','Refresh data'],
['尝试同步课表与成绩','Sync timetable and grades'],['正在读取本科教务数据…','Loading academic records…'],
['已连接','Connected'],['未连接','Not connected'],['尚未连接','Not connected'],['尚未连接学校系统','Not connected to school'],
['本科教务已认证','Undergraduate academic session verified'],['同步状态','Sync status'],
['实时余额','Live balance'],['剩余电量','Remaining electricity'],['当前剩余电量','Remaining electricity'],
['官方接口实时读取','Official live data'],['本地记录','Local record'],['演示示例','Demo data'],['演示模式','Demo mode'],
['用电概览','Electricity overview'],['近 7 天日均','7-day daily average'],['预计可用','Estimated days left'],
['用电预测由最近记录推算，仅供参考。','Usage forecast is based on recent records and is for reference only.'],
['只有标注“官方接口实时读取”的余额属于同步结果；演示和手动记录均不代表学校实时余额。','Only balances labeled “Official live data” come from the school. Demo or manual values are not live readings.'],
['打开学校实时电费页','Open official electricity page'],['打开学校官方电费页面','Open official electricity page'],
['官方一卡通实时查询','Official campus card electricity'],['最近用电趋势','Electricity usage trend'],
['近 7 天用电量','Usage over 7 days'],['每日明细','Daily details'],['暂无用电明细','No electricity records'],
['关于真实电费同步','About live electricity syncing'],['学校官方电费页面','Official school electricity page'],
['宿舍电量与用电趋势：支持尝试读取一卡通真实接口，也可以打开学校官方页面直接查询。','Dorm electricity and usage trends: check the official school portal or sync when authorized.'],
['今天的课程','Today’s classes'],['本周概览','This week at a glance'],['本周课表','This week’s timetable'],
['查看完整课表','View full timetable'],['校园一览','Campus overview'],['今天没有课程','No classes today'],
['今天没有排课，给自己留一点自由时间。','No classes today. Enjoy some free time.'],
['今天，继续向前。','Keep moving forward today.'],['下一站，','Next up: '],
['让每节课都有迹可循','Stay on top of every class'],['按周课程安排','Weekly class schedule'],
['课程安排来自当前数据集，留点时间给自己吧。','There are no classes in the current dataset today. Enjoy some free time.'],
['宿舍电量','Dorm electricity'],['演示数据','Demo data'],
['暂无日均用电数据','No daily usage data'],['尚未绑定宿舍','No dorm linked'],
['约可使用','Estimated for'],['仅供参考','For reference only'],['单位：度 / 天','Unit: kWh/day'],
['剩余','Remaining'],['用电量','Electricity used'],['记录至少一天的电量即可显示趋势','Log at least one day to see a trend'],
['还没有趋势记录','No trend data'],['没有课程','No classes'],['没有成绩','No grades'],
['登录信息','Login information'],['隐私与安全','Privacy and security'],['隐私说明','Privacy policy'],
['个性化外观','Appearance'],['外观模式','Theme'],['跟随系统','Follow system'],['浅色','Light'],['深色','Dark'],
['默认启动页','Default start page'],['下次进入时打开的页面','Page to open next time'],
['自定义课表背景','Timetable wallpaper'],['选择图片','Choose image'],['背景透明度','Wallpaper opacity'],['移除课表背景','Remove wallpaper'],
['数据与隐私','Data and privacy'],['清除本地数据','Clear local data'],['恢复演示数据，不会删除官方账号信息','Restore demo records without affecting your school account'],
['清除','Clear'],['连接与同步','Connection and sync'],['学习阶段','Program level'],['本科','Undergraduate'],['研究生','Graduate'],
['本科同步为试验性；研究生可导入数据','Undergraduate sync is experimental; graduate data can be imported'],
['尝试同步课表与成绩','Sync timetable and grades'],['退出当前学校会话','Sign out of school session'],
['实验性接口','Experimental integration'],['数据备份','Data backup'],['导入 JSON 数据','Import JSON file'],
['导出当前 JSON 备份','Export JSON backup'],['切换到演示数据','Switch to demo data'],
['关于','About'],['非官方独立项目','Unofficial independent project'],
['不属于广州中医药大学，不代表学校意见。','Not affiliated with or endorsed by Guangzhou University of Chinese Medicine.'],
['当前数据集','Current dataset'],['当前页面','Current page'],['刷新','Refresh'],
['重新加载最新页面','Reload latest page'],['正在打开广中医口袋…','Opening GZUCM Pocket…'],
['取消','Cancel'],['保存','Save'],['保存本地记录','Save local record'],['手动记录','Enter manually'],
['记录宿舍电量','Record dorm electricity'],['宿舍名称','Dorm room'],['剩余电量（度）','Remaining (kWh)'],
['今日用电量（度，可选）','Today’s usage (kWh, optional)'],['仅添加到当前设备，不会写入学校系统。','Saved on this device only; nothing is sent to the school.'],
['导入失败','Import failed'],['同步失败','Sync failed'],['需要先连接学校教务','Connect to the school first'],
['正在尝试查询一卡通官方实时余额…','Checking official campus card electricity…'],
['尝试实时同步','Try live sync'],['正在尝试','Trying'],['一卡通','Campus card'],
['前往设置','Go to settings'],['查看电费','View electricity'],
['课程详情','Course details'],['授课教师','Instructor'],['上课地点','Location'],
['教学环节','Activity type'],['教学模式','Teaching mode'],['课程代码','Course code'],
['时间','Time'],['地点待定','Location TBA'],
['学分构成','Credit breakdown'],['指标说明','Metrics explained'],['统计原则','Calculation method'],
['总学分','Total credits'],['加权绩点','Weighted GPA'],['平均分','Average grade'],['专业课','Major courses'],
['必修','Required'],['选修','Elective'],['未分类','Unclassified'],['合格','Pass'],['良好','Good'],
['中国时间','China time'],['全部课程','All courses'],['我的成绩','My grades'],
['第','Week '],['周',' week'],['节课程',' classes'],['节',' classes'],
['天',' days'],['度',' kWh'],['演示',' Demo'],
['周一','Mon'],['周二','Tue'],['周三','Wed'],['周四','Thu'],['周五','Fri'],['周六','Sat'],['周日','Sun'],
['星期一','Monday'],['星期二','Tuesday'],['星期三','Wednesday'],['星期四','Thursday'],['星期五','Friday'],['星期六','Saturday'],['星期日','Sunday'],
['上一周','Previous week'],['下一周','Next week'],['本周','This week'],
['月','month'],['学年','academic year'],['学期','term'],
['官方','Official'],['返回','Back'],
['中文','中文'],['语言','Language'],['界面语言','Interface language']
];
const dictionary=[...pairs].sort((a,b)=>b[0].length-a[0].length);
const originalNodes=new WeakMap();
const originalAttrs=new WeakMap();
const SKIP=new Set(['SCRIPT','STYLE','NOSCRIPT','CODE','PRE','TEXTAREA']);
function translate(text){
 if(typeof text!=='string'||!/[\u3400-\u9fff]/.test(text))return text;
 let out=text;
 // Longest fixed UI strings first. Do not machine translate official academic records.
 for(const [zh,en] of dictionary)if(out.includes(zh))out=out.split(zh).join(en);
 out=out.replace(/星期([一二三四五六日])/g,(_,d)=>({一:'Monday',二:'Tuesday',三:'Wednesday',四:'Thursday',五:'Friday',六:'Saturday',日:'Sunday'})[d]);
 return out;
}
function apply(root,language='zh'){
 if(typeof document==='undefined'||!root)return;
 const en=language==='en';
 document.documentElement.lang=en?'en':'zh-CN';
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes=[];
 let node;
 while((node=walker.nextNode()))nodes.push(node);
 for(const n of nodes){
  if(!n.parentElement||SKIP.has(n.parentElement.tagName)||n.parentElement.closest('[data-no-translate]'))continue;
  if(!originalNodes.has(n))originalNodes.set(n,n.nodeValue);
  const src=originalNodes.get(n);
  const next=en?translate(src):src;
  if(n.nodeValue!==next)n.nodeValue=next;
 }
 const elements=root.querySelectorAll?root.querySelectorAll('[placeholder],[title],[aria-label]'):[];
 for(const el of elements){
  let src=originalAttrs.get(el);
  if(!src){src={};originalAttrs.set(el,src);}
  for(const attr of ['placeholder','title','aria-label']){
   if(!el.hasAttribute(attr))continue;
   if(!Object.prototype.hasOwnProperty.call(src,attr))src[attr]=el.getAttribute(attr);
   const next=en?translate(src[attr]):src[attr];
   if(el.getAttribute(attr)!==next)el.setAttribute(attr,next);
  }
 }
}
function observe(root,getLanguage){
 if(typeof MutationObserver==='undefined'||!root)return null;
 const observer=new MutationObserver(mutations=>{
  for(const m of mutations){
   for(const n of m.addedNodes){
    if(n.nodeType===1)apply(n,getLanguage());
    else if(n.nodeType===3)apply(n.parentElement,getLanguage());
   }
  }
 });
 observer.observe(root,{childList:true,subtree:true});
 return observer;
}
const API={translate,apply,observe};
if(typeof window!=='undefined')window.GZUCM_I18N=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})();
