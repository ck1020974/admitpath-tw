/* One exploration route: curiosity → three favourites → subject feel → results, plus an optional deeper check.
   Pure state machine: no DOM, storage or network. The page saves snapshot() and restores it with load(). */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const data=node?require('./data.js'):root.YuhsinCuriosityData;
 const VERSION=2;
 // 計分規則（本站編輯設定，未經測量驗證）
 const FAVOURITE=3;          // 最想知道＝3、想知道＝2、還好＝1、沒興趣＝0
 const THRESHOLD=1.5;        // 學群興趣平均達 1.5 視為「有興趣」
 const PRIMARY_WEIGHT=2;     // 題目所屬學群的權重是跨群連結的 2 倍
 const FAVOURITES=3;         // 想知道超過 3 題時，挑出最想知道的 3 題
 const POTENTIAL_LIMIT=3;    // 「潛力發掘」最多列 3 個，避免全科都強時清單過長
 const FOCUS_LIMIT=4;        // 深入確認針對前 4 個方向
 const PLAN_LIMIT=4;         // 深入確認最多檢查 4 科
 const clone=x=>JSON.parse(JSON.stringify(x));
 const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
 const itemById=new Map(data.items.map(q=>[q.id,q]));
 const quick=data.quickSet.map(id=>itemById.get(id));
 const subjectIds=data.subjects.map(s=>s.id);
 const required=data.subjects.filter(s=>s.required).map(s=>s.id);
 const subjectValues=data.subjectOptions.map(o=>o.value);
 const groupOrder=new Map(quick.map((q,i)=>[q.group,i]));
 const typeOrder=['priority','develop','interest','potential','other'];

 function empty(){return {v:VERSION,answers:{},favourites:[],subjects:{},deep:null};}

 // 學科感覺 → 計分值。還沒修過、未填都不計入分子與分母。
 function numericSubject(value){return typeof value==='number'?value:null;}
 function weighted(values,weights){
  let sum=0,used=0,total=0;
  for(const [id,w] of Object.entries(weights)){total+=w;const v=values[id];if(typeof v==='number'&&Number.isFinite(v)){used+=w;sum+=v*w;}}
  return {score:used?sum/used:null,coverage:total?used/total:0};
 }
 // 跟自己的其他科目比較：2.5 以上、或高於自己平均且至少「普通」，視為有基礎。
 function level({score,coverage},own){
  if(score===null||coverage<0.5)return 'unknown';
  if(score>=2.5||(own!==null&&score>=2&&score>=own+0.25))return 'strong';
  if(score<1.75&&(own===null||score<own))return 'weak';
  return 'middle';
 }

 function createSession(){
  let state=empty();
  const deepItems=()=>state.deep?state.deep.questions.map(id=>itemById.get(id)):[];
  const isQuick=id=>data.quickSet.includes(id);
  const wanted=()=>quick.filter(q=>state.answers[q.id]===2).map(q=>q.id);
  const favouritesNeeded=()=>wanted().length>FAVOURITES;
  const effectiveFavourites=()=>favouritesNeeded()?state.favourites.filter(id=>wanted().includes(id)):wanted();
  const interestComplete=()=>quick.every(q=>[0,1,2].includes(state.answers[q.id]));
  const favouritesComplete=()=>interestComplete()&&(!favouritesNeeded()||effectiveFavourites().length===FAVOURITES);
  const subjectsComplete=()=>required.every(id=>subjectValues.includes(state.subjects[id]));
  const complete=()=>interestComplete()&&favouritesComplete()&&subjectsComplete();
  const deepComplete=()=>Boolean(state.deep)&&state.deep.questions.every(id=>[0,1,2].includes(state.answers[id]))&&state.deep.plan.every(row=>row.goals.every(g=>Number.isInteger(state.deep.goals[g])&&state.deep.goals[g]>=0&&state.deep.goals[g]<=4));

  function answer(id,value){
   if(!isQuick(id)&&!(state.deep&&state.deep.questions.includes(id)))throw Error('找不到這一題。');
   if(![0,1,2].includes(value))throw Error('請選擇想知道、還好或沒興趣。');
   if(state.answers[id]===value)return;
   // 改了快速題的答案，原本的深入確認就不再對應，需要重新確認。
   if(isQuick(id))cancelDeep();
   state.answers[id]=value;
   if(value!==2)state.favourites=state.favourites.filter(f=>f!==id);
  }
  function setFavourites(ids){
   const pool=wanted();
   if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>!pool.includes(id)))throw Error('只能從標記「想知道」的題目中挑選。');
   // 可以先挑一部分（作答中途存檔），完成條件是剛好 3 題。
   if(ids.length>FAVOURITES)throw Error(`最多挑 ${FAVOURITES} 題。`);
   if(JSON.stringify(ids)!==JSON.stringify(state.favourites))cancelDeep();
   state.favourites=ids.slice();
  }
  function setSubject(id,value){
   if(!subjectIds.includes(id))throw Error('找不到這個科目。');
   if(value===null){if(required.includes(id))throw Error('這一科需要選一個答案。');if(id in state.subjects){cancelDeep();delete state.subjects[id];}return;}
   if(!subjectValues.includes(value))throw Error('請選擇強項、普通、比較吃力或還沒修過。');
   if(state.subjects[id]!==value)cancelDeep();
   state.subjects[id]=value;
  }

  // 每科的計分值；深入確認完成時，檢查過的科目改用具體內容的平均（0–4 換算成 1–3）。
  function subjectScores(){
   const scores=Object.fromEntries(subjectIds.map(id=>[id,numericSubject(state.subjects[id])]));
   if(deepComplete())state.deep.plan.forEach(row=>{const m=mean(row.goals.map(g=>state.deep.goals[g]));if(m!==null)scores[row.subject]=1+m/2;});
   return scores;
  }
  function groupRows(){
   const favs=new Set(effectiveFavourites());
   const answered=quick.concat(deepComplete()?deepItems():[]).filter(q=>[0,1,2].includes(state.answers[q.id]));
   const scores=subjectScores();
   const ownValues=Object.values(scores).filter(v=>typeof v==='number');
   const own=mean(ownValues);
   return data.groups.map(g=>{
    const evidence=answered.filter(q=>q.interestGroups.includes(g.id)).map(q=>({id:q.id,text:q.text,primary:q.group===g.id,favourite:favs.has(q.id),value:favs.has(q.id)?FAVOURITE:state.answers[q.id]}));
    let sum=0,weight=0;evidence.forEach(e=>{const w=e.primary?PRIMARY_WEIGHT:1;sum+=e.value*w;weight+=w;});
    const interest=weight?sum/weight:null;
    const primaryQuick=quick.find(q=>q.group===g.id);
    const basis=weighted(scores,data.weights[g.id]);
    const subjects=Object.entries(data.weights[g.id]).map(([id,w])=>({id,label:data.subjects.find(s=>s.id===id).label,weight:w,value:scores[id],answer:state.subjects[id]??null}));
    return {id:g.id,name:g.name,source:g.collego.url,interest,evidence,primaryAnswer:state.answers[primaryQuick.id],...basis,level:level(basis,own),subjects};
   });
  }
  function classify(rows){
   const interested=r=>r.interest!==null&&r.interest>=THRESHOLD;
   rows.forEach(r=>{r.type=interested(r)?({strong:'priority',middle:'develop',weak:'interest',unknown:'interest'})[r.level]:'other';});
   rows.filter(r=>r.type==='other'&&r.level==='strong'&&r.primaryAnswer!==0)
    .sort((a,b)=>b.score-a.score||(b.interest??0)-(a.interest??0)||groupOrder.get(a.id)-groupOrder.get(b.id))
    .slice(0,POTENTIAL_LIMIT).forEach(r=>{r.type='potential';});
   return rows.sort((a,b)=>typeOrder.indexOf(a.type)-typeOrder.indexOf(b.type)||(b.interest??-1)-(a.interest??-1)||(b.score??-1)-(a.score??-1)||groupOrder.get(a.id)-groupOrder.get(b.id));
  }
  function report(){
   if(!complete())throw Error('請先完成三個步驟。');
   const groups=classify(groupRows()).map(r=>({...r,typeName:data.resultTypes[r.type].name,
    reason:r.evidence.slice().sort((a,b)=>b.value-a.value||Number(b.primary)-Number(a.primary))[0]||null,
    strengths:r.subjects.filter(s=>s.weight>=2&&typeof s.value==='number'&&s.value>=2.5).map(s=>s.label),
    notTaken:r.subjects.filter(s=>s.weight>=2&&s.answer==='na').map(s=>s.label)}));
   return clone({version:data.version,deep:deepComplete(),favourites:effectiveFavourites().map(id=>({id,text:itemById.get(id).text})),groups,
    limits:['這是自評探索，不是能力測驗、科系適合率或錄取預測。','學群權重、題目連結與分類門檻為本站編輯規則，未經測量驗證。','還沒修過或未填的科目不算低分，也不放進計算。']});
  }

  // 深入確認：針對前幾個方向補問其餘情境題，並檢查這些方向最需要的科目。
  function focusGroups(){
   const groups=classify(groupRows());
   const chosen=groups.filter(r=>r.type!=='other').slice(0,FOCUS_LIMIT);
   if(chosen.length)return chosen.map(r=>r.id);
   // 沒有明確興趣時，改從學科強項出發，仍給學生可以接著看的方向。
   return groups.filter(r=>r.score!==null).sort((a,b)=>b.score-a.score||groupOrder.get(a.id)-groupOrder.get(b.id)).slice(0,FOCUS_LIMIT).map(r=>r.id);
  }
  function planFor(focus){
   const score={};
   focus.forEach(g=>Object.entries(data.weights[g]).forEach(([id,w])=>{if(w>=2&&typeof state.subjects[id]==='number')score[id]=(score[id]||0)+w;}));
   return Object.keys(score).sort((a,b)=>score[b]-score[a]||subjectIds.indexOf(a)-subjectIds.indexOf(b)).slice(0,PLAN_LIMIT).map(id=>{
    const context=focus.slice().sort((a,b)=>(data.weights[b][id]||0)-(data.weights[a][id]||0)||focus.indexOf(a)-focus.indexOf(b))[0];
    return {subject:id,context,goals:data.detailGoals(id,context).map(g=>g.id)};
   });
  }
  function startDeep(){
   if(!complete())throw Error('請先完成三個步驟。');
   if(state.deep)return;
   const focus=focusGroups();
   const questions=focus.flatMap(g=>data.items.filter(q=>q.group===g&&!isQuick(q.id)).map(q=>q.id));
   state.deep={focus,questions,plan:planFor(focus),goals:{}};
  }
  function goal(id,value){
   if(!state.deep||!state.deep.plan.some(row=>row.goals.includes(id)))throw Error('找不到這一項。');
   if(!Number.isInteger(value)||value<0||value>4)throw Error('請選擇一個掌握程度。');
   state.deep.goals[id]=value;
  }
  function cancelDeep(){if(state.deep){state.deep.questions.forEach(id=>{delete state.answers[id];});state.deep=null;}}
  function detailPlan(){return state.deep?state.deep.plan.map(row=>({subject:row.subject,context:row.context,goals:data.detailGoals(row.subject,row.context)})):[];}

  // 存檔與結果連結共用同一份資料，載入時逐項檢查，不信任外來內容。
  function load(raw){
   const next=empty();
   if(!raw||raw.v!==VERSION)throw Error('這份作答紀錄的版本不同，請重新開始。');
   Object.entries(raw.answers||{}).forEach(([id,v])=>{if(itemById.has(id)&&[0,1,2].includes(v))next.answers[id]=v;});
   Object.entries(raw.subjects||{}).forEach(([id,v])=>{if(subjectIds.includes(id)&&subjectValues.includes(v))next.subjects[id]=v;});
   const prev=state;state=next;
   try{
    if(Array.isArray(raw.favourites)){const pool=wanted();state.favourites=raw.favourites.filter((id,i,a)=>pool.includes(id)&&a.indexOf(id)===i).slice(0,FAVOURITES);}
    if(raw.deep&&complete()){
     const focus=(raw.deep.focus||[]).filter(g=>data.groups.some(x=>x.id===g)).slice(0,FOCUS_LIMIT);
     const questions=focus.flatMap(g=>data.items.filter(q=>q.group===g&&!isQuick(q.id)).map(q=>q.id));
     const plan=(raw.deep.plan||[]).filter(r=>subjectIds.includes(r.subject)&&data.groups.some(x=>x.id===r.context)).slice(0,PLAN_LIMIT).map(r=>({subject:r.subject,context:r.context,goals:data.detailGoals(r.subject,r.context).map(g=>g.id)}));
     const goals={};plan.forEach(r=>r.goals.forEach(g=>{const v=raw.deep.goals?.[g];if(Number.isInteger(v)&&v>=0&&v<=4)goals[g]=v;}));
     state.deep={focus,questions,plan,goals};
    }
    Object.keys(state.answers).forEach(id=>{if(!isQuick(id)&&!(state.deep&&state.deep.questions.includes(id)))delete state.answers[id];});
   }catch(e){state=prev;throw e;}
  }
  function snapshot(){return clone(state);}
  function reset(){state=empty();}
  const progress=()=>({answered:quick.filter(q=>state.answers[q.id]!==undefined).length,total:quick.length,step:!interestComplete()?1:!favouritesComplete()?2:!subjectsComplete()?3:4});

  return {answer,setFavourites,setSubject,startDeep,cancelDeep,goal,report,load,snapshot,reset,progress,
   questions:()=>clone(quick),deepQuestions:()=>clone(deepItems()),detailPlan,wanted,favouritesNeeded,effectiveFavourites,
   interestComplete,favouritesComplete,subjectsComplete,complete,deepComplete};
 }

 // 結果連結：把作答壓成短字串再轉 base64url。只放作答與（選填的）名字，不放任何其他資料。
 //   a：18 題答案（快速題順序，- 表示未答）  f：最想知道的題目位置  s：15 科（3/2/1/n，- 未填）
 //   d：深入確認 f＝方向代碼、p＝科目.方向、q＝補問題答案、g＝具體內容 0–4
 function toBase64Url(text){const bytes=new TextEncoder().encode(text);let bin='';bytes.forEach(b=>{bin+=String.fromCharCode(b);});return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
 function fromBase64Url(code){const bin=atob(code.replace(/-/g,'+').replace(/_/g,'/'));return new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0)));}
 const subjectCode=v=>v==='na'?'n':typeof v==='number'?String(v):'-';
 const subjectFrom=c=>c==='n'?'na':/[123]/.test(c)?Number(c):undefined;
 function encodeShare(snapshot,name=''){
  const payload={v:VERSION,a:data.quickSet.map(id=>[0,1,2].includes(snapshot.answers[id])?String(snapshot.answers[id]):'-').join(''),
   f:snapshot.favourites.map(id=>data.quickSet.indexOf(id)).filter(i=>i>=0),
   s:subjectIds.map(id=>subjectCode(snapshot.subjects[id])).join('')};
  if(snapshot.deep){
   const goalIds=snapshot.deep.plan.flatMap(r=>r.goals);
   payload.d={f:snapshot.deep.focus.join(''),p:snapshot.deep.plan.map(r=>`${r.subject}.${r.context}`).join(','),
    q:snapshot.deep.questions.map(id=>[0,1,2].includes(snapshot.answers[id])?String(snapshot.answers[id]):'-').join(''),
    g:goalIds.map(id=>Number.isInteger(snapshot.deep.goals[id])?String(snapshot.deep.goals[id]):'-').join('')};
  }
  const clean=String(name||'').trim().slice(0,20);if(clean)payload.n=clean;
  return toBase64Url(JSON.stringify(payload));
 }
 function decodeShare(code){
  let raw;try{raw=JSON.parse(fromBase64Url(String(code)));}catch{throw Error('這個結果連結無法讀取，可能複製不完整。');}
  if(!raw||raw.v!==VERSION||typeof raw.a!=='string'||typeof raw.s!=='string')throw Error('這個結果連結無法讀取，可能來自舊版本。');
  const answers={};data.quickSet.forEach((id,i)=>{const c=raw.a[i];if(/[012]/.test(c||''))answers[id]=Number(c);});
  const subjects={};subjectIds.forEach((id,i)=>{const v=subjectFrom(raw.s[i]||'-');if(v!==undefined)subjects[id]=v;});
  const favourites=(Array.isArray(raw.f)?raw.f:[]).map(i=>data.quickSet[i]).filter(Boolean);
  let deep=null;
  if(raw.d&&typeof raw.d==='object'){
   const focus=String(raw.d.f||'').split('').filter(g=>data.groups.some(x=>x.id===g));
   const plan=String(raw.d.p||'').split(',').filter(Boolean).map(pair=>{const [subject,context]=pair.split('.');return {subject,context};});
   const questions=focus.flatMap(g=>data.items.filter(q=>q.group===g&&!data.quickSet.includes(q.id)).map(q=>q.id));
   questions.forEach((id,i)=>{const c=String(raw.d.q||'')[i];if(/[012]/.test(c||''))answers[id]=Number(c);});
   const goalIds=plan.flatMap(r=>subjectIds.includes(r.subject)&&data.groups.some(x=>x.id===r.context)?data.detailGoals(r.subject,r.context).map(g=>g.id):[]);
   const goals={};goalIds.forEach((id,i)=>{const c=String(raw.d.g||'')[i];if(/[0-4]/.test(c||''))goals[id]=Number(c);});
   deep={focus,plan,goals};
  }
  const session=createSession();session.load({v:VERSION,answers,favourites,subjects,deep});
  if(!session.complete())throw Error('這個結果連結的作答不完整。');
  return {session,name:typeof raw.n==='string'?raw.n.slice(0,20):''};
 }

 const api={createSession,encodeShare,decodeShare,weighted,level,VERSION,THRESHOLD};
 if(node)module.exports=api;else root.YuhsinCuriosityEngine=api;
})(typeof window!=='undefined'?window:globalThis);
