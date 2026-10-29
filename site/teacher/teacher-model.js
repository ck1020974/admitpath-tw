/* Grade/original-class filters and teacher-facing class labels. */
(function(root){
  'use strict';
  const gradeOptions=['G10','1001','1002','G11','1101','1102','G12','1201','1202'];
  const groupOptions=['1001主','1002主','10理A','11理主','11文主','11理A','11文H','12理主','12文主','12理A','12文H'];
  const aliases={'1001':'1001主','1002':'1002主','10A':'10理A'};
  const group=student=>aliases[student.teaching_group]||student.teaching_group;
  const grade=student=>{const prefix=String(student.original_class||'').slice(0,2);return ['10','11','12'].includes(prefix)?'G'+prefix:'';};
  function matches(student,{search='',grade:gradeFilter='',group:groupFilter=''}={}){
    const query=search.trim().toLocaleLowerCase();
    return (!query||student.name.toLocaleLowerCase().includes(query)||student.student_id.toLowerCase().includes(query))
      &&(!gradeFilter||(gradeFilter.startsWith('G')?grade(student)===gradeFilter:String(student.original_class)===gradeFilter))
      &&(!groupFilter||group(student)===groupFilter);
  }
  const api={gradeOptions,groupOptions,group,grade,matches};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YuhsinTeacherModel=api;
})(typeof window!=='undefined'?window:globalThis);
