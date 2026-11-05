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
['玻璃交互音效','Glass interaction sounds'],
['触觉反馈','Haptic feedback'],
['支持震动的手机或平板可获得轻触反馈','Gentle feedback on supported phones and tablets'],
['此浏览器不支持网页震动；设置仍可保留','This browser cannot vibrate for web interactions; preference is saved'],
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
['节课程',' classes'],

['周一','Mon'],['周二','Tue'],['周三','Wed'],['周四','Thu'],['周五','Fri'],['周六','Sat'],['周日','Sun'],
['星期一','Monday'],['星期二','Tuesday'],['星期三','Wednesday'],['星期四','Thursday'],['星期五','Friday'],['星期六','Saturday'],['星期日','Sunday'],
['上一周','Previous week'],['下一周','Next week'],['本周','This week'],

['官方','Official'],['返回','Back'],
['中文','中文'],['语言','Language'],['界面语言','Interface language']
];
pairs.push(...[
['你的校园，你的数据','Your campus, your data'],
['校园空间 · CAMPUS','Campus spaces · CAMPUS'],
['个人中心','Personal settings'],
['非官方独立项目 · 学校密码仅在校方官网输入。演示内容均为虚构。','Unofficial project · Enter passwords only on official school websites. Demo records are fictional.'],
['虚构演示数据','Fictional demo records'],['已与本地服务连接','Connected to local service'],['本地已导入数据','Local data imported'],['本地数据','Local data'],
['教师待定','Instructor TBA'],['这一天没有安排课程','No classes scheduled today'],['可以安排自习、运动或者出去走走。','A great time for studying, exercise, or a walk.'],
['把每一周，过得从容有序。','Plan every week with ease.'],['每节课程的时间、地点与授课内容','Class times, locations and topics'],
['本周暂无课程','No classes this week'],['可以在设置里导入课表','Import a timetable in settings'],
['本周课程分布','This week by day'],['完整周视图','Full week view'],['外观设置','Appearance settings'],
['左右切换教学周，点开课程查看「上课内容」「授课教师」「真实日期」。官方数据以学校教务系统为准。','Switch weeks using the arrows; open a class for its topic, instructor, and actual date. Official school records take precedence.'],
['上课内容','Class topic'],['真实日期','Actual date'],['节次','Periods'],['完整周课表，可左右滚动','Full weekly timetable; scroll horizontally'],
['导出日历','Export calendar'],['看见每一份努力的积累。','See how far you have come.'],
['课程成绩、考级成绩与体测记录。指标仅供参考，以教务系统口径为准。','Course grades, exam scores and fitness records. Figures are illustrative; official school records take precedence.'],
['加权平均分','Weighted average'],['已修学分','Earned credits'],['学分加权 · 不含普通选修','Credit-weighted · Excludes general electives'],
['按参与绩点计算的课程学分加权','Weighted by course credits used in GPA'],['当前记录中已通过课程','Passed courses in current records'],
['课程成绩','Course grades'],['考级成绩','Exam results'],['体测成绩','Fitness scores'],
['搜索课程名称','Search course names'],['没有找到课程成绩','No matching course grades'],
['更换关键词，或在设置中导入数据','Try another keyword or import your records in Settings'],
['未注明学期','Term not specified'],['暂无考级记录','No exam records'],['导入自己的成绩数据后即可查看','Import your academic records to see results'],
['暂无体测记录','No fitness records'],['导入自己的体测数据后即可查看','Import fitness records to view them'],['体测总分','Total fitness score'],
['公选 / 任选','General electives'],['暂无学分','No credits'],['学分','Credits'],['绩点','GPA'],['门',' courses'],
['加权绩点和平均分按参与计算的课程学分加权；普通选修、任选课不计入，专业限选课计入。课程成绩缺少绩点时可能影响结果，统计仅供参考。','GPA and weighted average use the credits of included courses. General electives are excluded while restricted major electives are counted. Missing GPA data may affect results.'],
['公选课按教务字段 kcflmc 分类，个别课程缺少分类时归入「未分类」。毕业所需学分以培养方案为准。','General electives follow the official kcflmc category. Unclassified courses appear as “Other”. Graduation requirements follow your program handbook.'],
['记录查询结果','Record official reading manually'],
['学校官网查电费','Check electricity on school website'],['同步实时电量','Sync live electricity'],
['手动记录','Manual record'],['当前网站尚未获得一卡通服务器端授权，请直接打开下方学校官方页面查询实时余额。','This website has not obtained a campus card server session. Open the official school page to check your live balance.'],
['学校一卡通有独立登录态，Safari 不允许本站读取你在学校网页上的 Cookie。','The campus card uses a separate login. Safari does not let this website read cookies from the school website.'],
['本站不会把未认证的数据伪装成实时查询。','This website will never present unverified data as live readings.'],
['仅记录您从学校官网查询到的电量，不会向学校发送密码或写入学校系统。公开网站的手动记录保存在当前浏览器，不包含教务成绩。','Record a balance you looked up on the official school website. No password or writes go to the school. Manual entries stay in this browser; grades are not saved.'],
['当日用电','Daily usage'],['房间信息','Room details'],['查询结果','Lookup result'],
['中文 / English，自动保存选择','Chinese / English; selection is saved automatically'],
['请切换到「扫码登录」，获取学校二维码。电脑端使用微信扫一扫；手机端可先截图保存二维码，再打开微信 → 右上角「＋」→「扫一扫」→「相册」，选择刚才的截图，进入学校官方确认页完成授权。','Choose QR Login to get a school QR code. Scan it with WeChat on a computer. On a phone, screenshot it and select it in WeChat → Scan → Album, then confirm on the official school page.'],
['不要向任何人发送登录二维码截图。二维码只能用于当前会话，过期后请重新获取。','Never share screenshots of your login QR code. It is valid only for this session and expires.'],
['截图保存二维码','Save a screenshot of the QR code'],['请不要分享二维码截图','Do not share the QR screenshot'],
['界面语言已切换为中文','Interface language changed to Chinese'],
['语言切换','Switch language'],
['正在浏览演示模式','Demo mode is active'],['课表、成绩、电量及人名都是示例，不是学校真实数据。','All displayed classes, grades, electricity balances, and names are sample data, not real school records.']
]);
pairs.push(...[
 // High-confidence GZUCM course names, campus locations and academic labels.
 ['毛泽东思想和中国特色社会主义理论体系概论','Introduction to Mao Zedong Thought and the Theoretical System of Socialism with Chinese Characteristics'],
 ['习近平新时代中国特色社会主义思想概论','Introduction to Xi Jinping Thought on Socialism with Chinese Characteristics for a New Era'],
 ['中国近现代史纲要','Outline of Modern Chinese History'],
 ['马克思主义基本原理','Basic Principles of Marxism'],
 ['思想道德与法治','Ideology, Morality and Rule of Law'],
 ['广州中医药大学','Guangzhou University of Chinese Medicine'],
 ['大学英语','College English'],['局部解剖学','Regional Anatomy'],['系统解剖学','Systematic Anatomy'],
 ['人体解剖学','Human Anatomy'],['中医基础理论','Fundamentals of Traditional Chinese Medicine'],
 ['中医诊断学','Traditional Chinese Medicine Diagnostics'],
 ['中医各家学说','Schools of Traditional Chinese Medicine'],
 ['医学微生物学','Medical Microbiology'],
 ['病理生理学','Pathophysiology'],['生理学','Physiology'],['医学统计学','Medical Statistics'],
 ['中国医学史','History of Chinese Medicine'],['医用化学','Medical Chemistry'],
 ['摄影艺术鉴赏','Photography Appreciation'],['形势与政策','Current Affairs and Policy'],
 ['医学免疫学','Medical Immunology'],['病理学','Pathology'],
 ['组织胚胎学','Histology and Embryology'],['药理学','Pharmacology'],
 ['中药学','Chinese Materia Medica'],['方剂学','Chinese Herbal Formulas'],
 ['内科学','Internal Medicine'],['外科学','Surgery'],['诊断学','Diagnostics'],
 ['中西医结合','Integrated Chinese and Western Medicine'],
 ['临床医学','Clinical Medicine'],['体育','Physical Education'],
 ['高等数学','Advanced Mathematics'],['大学物理','University Physics'],
 ['有机化学','Organic Chemistry'],['英语','English'],['普通话','Mandarin'],
 ['大学城校区','University Town Campus'],['三元里校区','Sanyuanli Campus'],
 ['英语教学楼','English Teaching Building'],
 ['外语楼','Foreign Languages Building'],['实验楼','Laboratory Building'],
 ['教学楼','Teaching Building'],['学术报告厅','Academic Lecture Hall'],
 ['大学城','University Town'],['校园','Campus'],['校区','Campus'],
 ['实验教学','Laboratory Class'],['理论教学','Lecture'],
 ['教学团队','Teaching Team'],['示例教师','Sample Instructor'],
 ['专业基础课','Foundational Major Course'],
 ['公共选修课','General Elective'],['通识课','General Education'],
 ['专业限选课','Major Restricted Elective'],['专业选修课','Major Elective'],
 ['必修课','Required Course'],['任选课','Open Elective'],
 ['第九周','Week 9'],['第十周','Week 10'],
 ['第一学期','Semester 1'],['第二学期','Semester 2'],['第三学期','Semester 3'],
 ['第1学期','Semester 1'],['第2学期','Semester 2'],['第3学期','Semester 3'],
 ['教学周','teaching weeks'],['学年','academic year'],['学期','semester'],
 ['节','periods'],['度','kWh'],['周','week'],
 ['中文','Chinese'],
 ['第 10 / 19 教学周','Teaching week 10 of 19'],
 ['第 9 / 20 教学周','Teaching week 9 of 20'],
 ['今天有','There are'],['接下来的每一步都有方向。','Every step ahead has a purpose.'],
 ['课程名称','Course name'],['讲授内容','Class topic'],['教师','Instructor'],
 ['记录','records'],['实验','laboratory'],['理论','theory'],
 ['专业','Major'],['健康','Health'],['药学','Pharmacy']
]);
pairs.push(...[
 ['周视图','Week view'],['月视图','Month view'],
 ['课表显示方式','Timetable view'],['周日为每周第一天','Sunday is the first day of the week'],
 ['上个月','Previous month'],['下个月','Next month'],['本月','This month'],
 ['默认启动页','Default start page'],
 ['每个月的课程，一目了然。','See your classes across the month.'],
 ['按月查看课程安排','Monthly class schedule'],['周日为第一天的月课表','Monthly timetable starting on Sunday'],
 ['当天暂无课程','No classes on this day'],['选择其他日期查看课程安排。','Select another date to see classes.'],
 ['正在加载本月课表…','Loading this month’s classes…'],
 ['月课表','Monthly timetable'],['周课表','Weekly timetable'],
 ['外观模式','Appearance'],['设置选项','Settings menu'],['全部设置','All settings'],
 ['明亮、清晰','Bright and clear'],['柔和深色玻璃','Soft dark glass'],
 ['与设备外观同步','Match device appearance'],
 ['偏好与数据管理','Preferences and data'],['扫码授权登录','Authorize with a QR code'],
 ['启动页','Start page'],['学习阶段','Program level'],
 ['周日开始的完整周课表，可左右滚动','Weekly timetable starting on Sunday; scroll horizontally'],
 ['周日为每周第一天；学校的教学周编号仍按教务系统原始规则计算，课程日期不变。','Sunday appears first; academic teaching weeks follow the school’s official numbering and class dates remain unchanged.'],
 ['部分教学周加载失败，可稍后重新打开本月','Some teaching weeks could not load. Please retry this month.'],
 ['显示方式','View mode'],['周视图','Week view'],['月视图','Month view']
]);
pairs.push(...[
 ['本月已获取','Classes loaded this month:'],['本月全部课程','All classes this month'],
 ['本月已获取 6 节课程','6 classes loaded this month'],
 ['节课程',' classes'],['天有课','days with classes'],
 ['已获取的课程全部显示，不折叠','All loaded classes displayed; none hidden'],
 ['仍在加载其余教学周','Loading remaining teaching weeks'],
 ['月历可左右滑动查看所有课程；下方还有按日期排列的完整课程清单。','Swipe horizontally through the full monthly calendar. The complete date-by-date class list is below.'],
 ['按日期与上课时间排列','Sorted by date and class time'],
 ['当前月份暂无已获取的课程。已连接教务时可尝试重新加载。','No classes loaded for this month. Try again when connected to school.'],
 ['正在读取当月全部课程，请等待加载完成。','Loading the complete monthly timetable.'],
 ['部分课程加载失败，可重新加载','Some classes failed to load. Please retry.'],
 ['重试未加载课程','Retry missing classes'],
 ['本月已获取','Loaded this month'],
 ['月历可左右滑动查看所有课程','Swipe to see every class in the month'],
 ['完整课程清单','Complete list of classes'],
 ['未命名课程','Unnamed class'],
 ['已获取的课程全部显示','Every loaded class is shown']
]);
pairs.push(...[
 ['玻璃交互音效','Glass interaction sounds'],
 ['滑过导航选项播放轻柔反馈音；不加载外部音频','Play soft feedback when sliding across choices; no external audio files'],
 ['轻柔反馈音','Soft feedback tone'],
 ['滑动选择','Slide to select'],
 ['选项滑动','Sliding selection']
]);
pairs.push(...[
 ['点击日期查看详情','Tap a date to see classes'],
 ['点击查看详情','Tap to see details'],
 ['从周日开始的完整月课表','Complete monthly calendar, starting Sunday'],
 ['当天没有课程','No classes this day'],
 ['选择其他日期查看课表。','Choose another date to view classes.'],
 ['正在同步当月课程…','Syncing classes for this month…'],
 ['部分课程尚未同步 · 可重试','Some classes could not sync · Retry'],
 ['点击日期','Select a date'],
 ['重试','Retry']
]);
const dictionary=[...pairs].sort((a,b)=>b[0].length-a[0].length);
const originalNodes=new WeakMap();
const originalAttrs=new WeakMap();
const SKIP=new Set(['SCRIPT','STYLE','NOSCRIPT','CODE','PRE','TEXTAREA']);
function englishFallback(source){
 // An untranslated school name must not be guessed or romanized.
 // Preserve the exact original only in data/state, visible again in Chinese mode.
 return String(source).replace(/[\u3400-\u9fff\uF900-\uFAFF]+/g,'[Translation unavailable]');
}
function translate(text){
 if(typeof text!=='string'||!/[\u3400-\u9fff\uF900-\uFAFF]/.test(text))return text;
 let out=text;
 // Academic year/term and variable counts are handled before dictionary matching.
 out=out.replace(/(\d{4})\s*[—–-]\s*(\d{4})\s*学年\s*(?:第\s*([一二三四1234])\s*学期)?/g,
   (_,from,to,n)=>from+'–'+to+' academic year'+(n?' · Semester '+({一:1,二:2,三:3,四:4}[n]||n):''));
 out=out.replace(/第\s*(\d+)\s*\/\s*(\d+)\s*教学周/g,'Teaching week $1 of $2');
 out=out.replace(/第\s*(\d+)\s*周/g,'Week $1');
 out=out.replace(/共\s*(\d+)\s*节/g,'$1 class periods');
 out=out.replace(/(\d+)\s*节课程/g,'$1 class periods');
 out=out.replace(/(\d+)\s*天有课/g,'$1 days with classes');
 out=out.replace(/(\d+(?:\.\d+)?)\s*度/g,'$1 kWh');
 out=out.replace(/(\d+(?:\.\d+)?)\s*天/g,'$1 days');
 for(const [zh,en] of dictionary)if(out.includes(zh))out=out.split(zh).join(en);
 // Unknown school-origin text is not translated to pinyin or guessed.
 // Show an English placeholder, with the original retained for Chinese mode.
 return englishFallback(out);
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
