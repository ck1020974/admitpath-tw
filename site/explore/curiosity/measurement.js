/* 匿名施測計次：只保留已送出的階段標記，不含答案或個人識別碼。 */
(function(root){
 'use strict';
 function create(send){
  let recorded={};
  const events={start:['curiosity-assessment-start','開始施測'],quick:['curiosity-assessment-complete','完成初次施測'],deep:['curiosity-deep-complete','完成深入探索']};
  function once(key,name,title){
   if(recorded[key])return false;
   try{if(!send(name,title,{total:true}))return false;}catch{return false;}
   recorded[key]=true;return true;
  }
  function completed(report){
   once('quick',...events.quick);
   if(report.deep)once('deep',...events.deep);
   for(let i=1;i<=(report.extraRounds||0);i++)once('extra-'+i,'curiosity-retest-complete','完成重新測驗');
  }
  return {
   start(){return once('start',...events.start);},
   completed,
   snapshot(){return {...recorded};},
   restore(saved,legacy){
    recorded={};
    for(const key of ['start','quick','deep','extra-1','extra-2','extra-3','extra-4','extra-5'])if(saved?.[key]===true)recorded[key]=true;
    // 舊存檔不回補歷史施測，避免升級後重看結果就增加計數。
    if(!saved&&legacy){recorded.start=true;recorded.quick=true;if(legacy.deep)recorded.deep=true;for(let i=1;i<=(legacy.extraRounds||0);i++)recorded['extra-'+i]=true;}
   },
   reset(){recorded={};},
  };
 }
 const api={create};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YuhsinCuriosityMeasurement=api;
})(typeof window!=='undefined'?window:globalThis);
