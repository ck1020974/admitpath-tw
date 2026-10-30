/* Grade/teaching-group filters, login lights, exploration status and teacher-facing labels. */
(function(root){
  'use strict';
  const gradeOptions=['G10','1001','1002','G11','1101','1102','G12','1201','1202'];
  const groupOptions=['1001主','1002主','10理A','11理主','11文主','11理A','11文H','12理主','12文主','12理A','12文H'];
  const aliases={'1001':'1001主','1002':'1002主','10A':'10理A'};
  const DAY=86400000;
  const loginOptions=[
    {value:'green',label:'7天內'},
    {value:'yellow',label:'90天內'},
    {value:'red',label:'超過90天'},
    {value:'off',label:'從未'},
  ];
  const examOptions=[
    {value:'deep',label:'已深入'},
    {value:'quick',label:'未深入'},
    {value:'in_progress',label:'作答中'},
    {value:'none',label:'未作答'},
  ];
  const abbreviations={'數理化':'數理','醫藥衛生':'醫衛','生命科學':'生科','生物資源':'生資','地球環境':'地環','建築設計':'建築','社會心理':'社心','大眾傳播':'大傳','文史哲':'文史','遊憩運動':'遊憩'};
  const group=student=>aliases[student.teaching_group]||student.teaching_group;
  const grade=student=>{const prefix=String(student.original_class||'').slice(0,2);return ['10','11','12'].includes(prefix)?'G'+prefix:'';};
  const abbreviate=name=>{const base=String(name||'').replace(/學群$/,'');return abbreviations[base]||base;};
  function login(lastSignIn,now=Date.now()){
    if(!lastSignIn)return 'off';
    const age=now-new Date(lastSignIn).getTime();
    return age<=7*DAY?'green':age<=90*DAY?'yellow':'red';
  }
  function loginDate(lastSignIn){
    if(!lastSignIn)return '從未登入';
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(lastSignIn)).map(p=>[p.type,p.value]));
    return parts.year+'/'+parts.month+'/'+parts.day;
  }
  function exam(summary){
    const status=summary?.exam_status||'none';
    const groups=status==='deep'?(summary.priority_groups||[]).map(abbreviate):[];
    const label=status==='deep'?(groups.length?groups.join('、'):'無'):examOptions.find(o=>o.value===status)?.label||'未作答';
    return {status,label,groups};
  }
  function matches(student,{search='',grade:gradeFilter='',group:groupFilter='',login:loginFilter='',exam:examFilter='',tag=''}={},summary,now=Date.now()){
    const query=search.trim().toLocaleLowerCase();
    // Search also finds a 優先學群 by abbreviation (醫衛) or full name (醫藥衛生學群).
    const groupText=summary?.exam_status==='deep'?(summary.priority_groups||[]).flatMap(name=>[name,abbreviate(name)]).join(' ').toLocaleLowerCase():'';
    return (!query||student.name.toLocaleLowerCase().includes(query)||student.student_id.toLowerCase().includes(query)||groupText.includes(query))
      &&(!gradeFilter||(gradeFilter.startsWith('G')?grade(student)===gradeFilter:String(student.original_class)===gradeFilter))
      &&(!groupFilter||group(student)===groupFilter)
      &&(!loginFilter||login(summary?.last_sign_in_at,now)===loginFilter)
      &&(!examFilter||(summary?.exam_status||'none')===examFilter)
      &&(!tag||exam(summary).groups.includes(tag));
  }
  // Sort keys: login ascending puts never-signed-in first, then the longest absence; tracking ascending puts fewest first.
  function compare(key,direction,a,b){
    const value=s=>key==='login'?(s?.last_sign_in_at?new Date(s.last_sign_in_at).getTime():-Infinity):(s?.tracking_count||0);
    const diff=value(a)-value(b);
    return diff===0?0:(diff<0?-1:1)*(direction==='desc'?-1:1);
  }
  const api={gradeOptions,groupOptions,loginOptions,examOptions,group,grade,abbreviate,login,loginDate,exam,matches,compare};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YuhsinTeacherModel=api;
})(typeof window!=='undefined'?window:globalThis);
