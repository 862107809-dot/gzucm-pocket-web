/* 演示数据全部为虚构，任何字段都不能视为个人真实教务记录。 */
(function () {
  const firstMonday = '2026-08-31';
  const courses = [
    {name:'局部解剖学',teachers:'教学团队',weekday:1,startUnit:1,endUnit:2,startTime:'08:30',endTime:'10:05',room:'实验楼 301',category:'实验教学',content:'颈部局部解剖',tone:0},
    {name:'生理学',teachers:'示例教师',weekday:1,startUnit:6,endUnit:7,startTime:'14:00',endTime:'15:35',room:'教学楼 B204',category:'理论教学',content:'神经系统生理',tone:1},
    {name:'中医诊断学',teachers:'示例教师',weekday:2,startUnit:3,endUnit:4,startTime:'10:20',endTime:'11:55',room:'教学楼 A306',category:'理论教学',content:'八纲辨证',tone:2},
    {name:'医学微生物学',teachers:'示例教师',weekday:2,startUnit:8,endUnit:9,startTime:'15:40',endTime:'17:15',room:'实验楼 210',category:'实验教学',content:'细菌形态观察',tone:3},
    {name:'中医各家学说',teachers:'示例教师',weekday:3,startUnit:1,endUnit:2,startTime:'08:30',endTime:'10:05',room:'教学楼 A201',category:'理论教学',content:'金元四大家',tone:4},
    {name:'病理生理学',teachers:'示例教师',weekday:3,startUnit:6,endUnit:7,startTime:'14:00',endTime:'15:35',room:'教学楼 C102',category:'理论教学',content:'水电解质代谢紊乱',tone:5},
    {name:'大学英语',teachers:'示例教师',weekday:4,startUnit:1,endUnit:2,startTime:'08:30',endTime:'10:05',room:'外语楼 401',category:'理论教学',content:'Academic communication',tone:6},
    {name:'局部解剖学',teachers:'教学团队',weekday:4,startUnit:6,endUnit:7,startTime:'14:00',endTime:'15:35',room:'实验楼 301',category:'实验教学',content:'腹部局部解剖',tone:0},
    {name:'医学统计学',teachers:'示例教师',weekday:5,startUnit:3,endUnit:4,startTime:'10:20',endTime:'11:55',room:'教学楼 B302',category:'理论教学',content:'假设检验',tone:7},
    {name:'形势与政策',teachers:'示例教师',weekday:5,startUnit:12,endUnit:13,startTime:'19:00',endTime:'20:35',room:'学术报告厅',category:'理论教学',content:'专题学习',tone:8},
  ];
  const sessions = [];
  const start = new Date(firstMonday+'T12:00:00');
  for(let week=1; week<=19;week++) for(const c of courses){
    if(c.weekday === 5 && week % 2 === 0 && c.name === '形势与政策') continue;
    const d = new Date(start); d.setDate(d.getDate()+(week-1)*7+c.weekday-1);
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    sessions.push({...c,week,date:iso,code:'DEMO-'+c.tone,schoolColor:'',teachingMode:'',courseSeq:'',content:week % 3 === 0 ? '综合复习与案例讨论' : c.content});
  }
  window.GZUCM_DEMO = {
    schemaVersion:1,
    demo:true,
    campus:'undergrad',
    semester:{code:'202601',name:'2026—2027 学年 第一学期',firstMondayIso:firstMonday,totalWeeks:19},
    sessions,
    grades:[
      {name:'人体解剖学',term:'2025—2026 学年 第二学期',score:91,gpa:4.1,credit:4,category:'专业基础课',nature:'必修',classify:'',passed:true},
      {name:'中医基础理论',term:'2025—2026 学年 第二学期',score:89,gpa:3.9,credit:3,category:'专业基础课',nature:'必修',classify:'',passed:true},
      {name:'大学英语',term:'2025—2026 学年 第二学期',score:94,gpa:4.4,credit:2,category:'通识课',nature:'必修',classify:'',passed:true},
      {name:'医用化学',term:'2025—2026 学年 第一学期',score:86,gpa:3.6,credit:3,category:'专业基础课',nature:'必修',classify:'',passed:true},
      {name:'中国医学史',term:'2025—2026 学年 第一学期',score:93,gpa:4.3,credit:2,category:'专业课',nature:'必修',classify:'',passed:true},
      {name:'摄影艺术鉴赏',term:'2025—2026 学年 第一学期',score:96,gpa:4.6,credit:2,category:'公共选修课',nature:'选修',classify:'美育类',passed:true},
    ],
    levels:[{name:'大学英语六级（演示）',term:'2025—2026 学年',total:548,level:'合格',date:'2026-06-01',parts:[['听力','183'],['阅读','196'],['写作与翻译','169']]}],
    fitness:[{term:'2025—2026 学年',total:'84.2',level:'良好',items:[{label:'50 米',value:'7.7 秒',score:'85'},{label:'立定跳远',value:'220 cm',score:'83'}]}],
    exams:[],
    power:{balance:38.6,unit:'度',roomLabel:'大学城校区 · 示例宿舍',updatedAt:'演示数据'},
    powerDaily:[{date:'2026-10-29',usage:3.2,remain:57.8},{date:'2026-10-30',usage:2.9,remain:54.9},{date:'2026-10-31',usage:3.4,remain:51.5},{date:'2026-11-01',usage:3.1,remain:48.4},{date:'2026-11-02',usage:3.5,remain:44.9},{date:'2026-11-03',usage:3.0,remain:41.9},{date:'2026-11-04',usage:3.3,remain:38.6}]
  };
})();
