/* One exploration route: curiosity → three favourites → subject picks → results, plus an optional deeper check.
   Pure state machine: no DOM, storage or network. The page saves snapshot() and restores it with load(). */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const data=node?require('./data.js'):root.YuhsinCuriosityData;
 const VERSION=4;
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
 const levelBase=Object.fromEntries(data.levelOptions.map(o=>[o.value,o.base]));
 const STRONG_LIMIT=data.strongLimit,WEAK_LIMIT=data.weakLimit,PICK_MIN=data.pickMin;
 const groupOrder=new Map(quick.map((q,i)=>[q.group,i]));
 const typeOrder=['priority','develop','interest','potential','other'];

 function empty(){return {v:VERSION,answers:{},favourites:[],profile:{level:null,strong:[],weak:[]},deep:null};}

 // 由整體程度與勾選換算每科 0–4：強項高一級、吃力低一級、其餘等於整體程度。
 // 必填十科一定有值；選填五科只有被勾選時才計入（沒勾不算低分，也不放進計算）。
 function profileSubjects(profile){
  const base=levelBase[profile.level];if(base===undefined)return {};
  const out={};
  subjectIds.forEach(id=>{
   if(profile.strong.includes(id))out[id]=Math.min(4,base+1);
   else if(profile.weak.includes(id))out[id]=Math.max(0,base-1);
   else if(required.includes(id))out[id]=base;
  });
  return out;
 }
 function weighted(values,weights){
  let sum=0,used=0,total=0;
  for(const [id,w] of Object.entries(weights)){total+=w;const v=values[id];if(typeof v==='number'&&Number.isFinite(v)){used+=w;sum+=v*w;}}
  return {score:used?sum/used:null,coverage:total?used/total:0};
 }
 // 跟自己的其他科目比較：2.75 以上、或高於自己平均且至少「普通」，視為有基礎。
 function level({score,coverage},own){
  if(score===null||coverage<0.5)return 'unknown';
  if(score>=2.75||(own!==null&&score>=2&&score>=own+0.25))return 'strong';
  if(score<1.5&&(own===null||score<own))return 'weak';
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
  const subjectsComplete=()=>levelBase[state.profile.level]!==undefined&&state.profile.strong.length>=PICK_MIN&&state.profile.weak.length>=PICK_MIN;
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
  function setLevel(value){
   if(levelBase[value]===undefined)throw Error('請選擇前段、中間或後段。');
   if(state.profile.level!==value)cancelDeep();
   state.profile.level=value;
  }
  function setPicks(kind,ids){
   const limit=kind==='strong'?STRONG_LIMIT:kind==='weak'?WEAK_LIMIT:null;
   if(limit===null)throw Error('找不到這個選項。');
   if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>!subjectIds.includes(id)))throw Error('找不到這個科目。');
   if(ids.length>limit)throw Error(kind==='strong'?`最拿手的科目最多選 ${limit} 科。`:`比較吃力的科目最多選 ${limit} 科。`);
   const other=state.profile[kind==='strong'?'weak':'strong'];
   if(ids.some(id=>other.includes(id)))throw Error('同一科不能同時是強項和比較吃力。');
   if(JSON.stringify(ids)!==JSON.stringify(state.profile[kind]))cancelDeep();
   state.profile[kind]=ids.slice();
  }

  // 每科的計分值；深入確認完成時，檢查過的科目改用具體內容的平均（同樣是 0–4）。
  function subjectScores(){
   const picked=profileSubjects(state.profile);
   const scores=Object.fromEntries(subjectIds.map(id=>[id,typeof picked[id]==='number'?picked[id]:null]));
   if(deepComplete())state.deep.plan.forEach(row=>{const m=mean(row.goals.map(g=>state.deep.goals[g]));if(m!==null)scores[row.subject]=m;});
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
    const subjects=Object.entries(data.weights[g.id]).map(([id,w])=>({id,label:data.subjects.find(s=>s.id===id).label,weight:w,value:scores[id],pick:state.profile.strong.includes(id)?'strong':state.profile.weak.includes(id)?'weak':required.includes(id)?'base':null}));
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
    strengths:r.subjects.filter(s=>s.weight>=2&&s.pick==='strong').map(s=>s.label)}));
   return clone({version:data.version,deep:deepComplete(),favourites:effectiveFavourites().map(id=>({id,text:itemById.get(id).text})),groups,undeclared:undeclaredFor(groups),
    limits:['這是自評探索，不是能力測驗、科系適合率或錄取預測。','學群權重、題目連結與分類門檻為本站編輯規則，未經測量驗證。','沒勾選的延伸科目（資訊、生活科技、美術、音樂、體育）不算低分，也不放進計算。']});
  }

  // 不分系：最想知道的題目分屬不同領域、有興趣的方向也很分散（broad），或完全沒有明確方向（unclear）時提出。
  function undeclaredFor(groups){
   const rule=data.undeclared,interested=groups.filter(g=>['priority','develop','interest'].includes(g.type));
   const domains=[...new Set(interested.map(g=>rule.domains[g.id]))];
   const favDomains=[...new Set(effectiveFavourites().map(id=>rule.domains[itemById.get(id).group]))];
   if(effectiveFavourites().length===FAVOURITES&&favDomains.length===FAVOURITES&&domains.length>=rule.minDomains)return {reason:'broad',domains:favDomains,group:rule.group};
   if(!interested.length)return {reason:'unclear',domains:[],group:rule.group};
   return null;
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
   const picked=profileSubjects(state.profile);
   focus.forEach(g=>Object.entries(data.weights[g]).forEach(([id,w])=>{if(w>=2&&typeof picked[id]==='number')score[id]=(score[id]||0)+w;}));
   // 沒勾選的延伸科目不檢查；必填十科都會有值。
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
   const p=raw.profile||{};
   if(levelBase[p.level]!==undefined)next.profile.level=p.level;
   const clean=(list,limit,skip=[])=>(Array.isArray(list)?list:[]).filter((id,i,a)=>subjectIds.includes(id)&&a.indexOf(id)===i&&!skip.includes(id)).slice(0,limit);
   next.profile.strong=clean(p.strong,STRONG_LIMIT);next.profile.weak=clean(p.weak,WEAK_LIMIT,next.profile.strong);
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

  return {answer,setFavourites,setLevel,setPicks,subjectValues:()=>clone(profileSubjects(state.profile)),startDeep,cancelDeep,goal,report,load,snapshot,reset,progress,
   questions:()=>clone(quick),deepQuestions:()=>clone(deepItems()),detailPlan,wanted,favouritesNeeded,effectiveFavourites,
   interestComplete,favouritesComplete,subjectsComplete,complete,deepComplete};
 }

 // 結果連結：把作答壓成短字串再轉 base64url。只放作答與（選填的）名字，不放任何其他資料。
 //   a：18 題答案（快速題順序，- 表示未答）  f：最想知道的題目位置  l：整體程度 h/m/l  s：強項科目位置  w：吃力科目位置
 //   d：深入確認 f＝方向代碼、p＝科目.方向、q＝補問題答案、g＝具體內容 0–4
 function toBase64Url(text){const bytes=new TextEncoder().encode(text);let bin='';bytes.forEach(b=>{bin+=String.fromCharCode(b);});return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
 function fromBase64Url(code){const bin=atob(code.replace(/-/g,'+').replace(/_/g,'/'));return new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0)));}
 const levelCode={high:'h',mid:'m',low:'l'},levelFrom={h:'high',m:'mid',l:'low'};
 function encodeShare(snapshot,name=''){
  const payload={v:VERSION,a:data.quickSet.map(id=>[0,1,2].includes(snapshot.answers[id])?String(snapshot.answers[id]):'-').join(''),
   f:snapshot.favourites.map(id=>data.quickSet.indexOf(id)).filter(i=>i>=0),
   l:levelCode[snapshot.profile.level]||'',s:snapshot.profile.strong.map(id=>subjectIds.indexOf(id)),w:snapshot.profile.weak.map(id=>subjectIds.indexOf(id))};
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
  if(!raw||raw.v!==VERSION||typeof raw.a!=='string')throw Error('這個結果連結無法讀取，可能來自舊版本。');
  const answers={};data.quickSet.forEach((id,i)=>{const c=raw.a[i];if(/[012]/.test(c||''))answers[id]=Number(c);});
  const toIds=list=>(Array.isArray(list)?list:[]).map(i=>subjectIds[i]).filter(Boolean);
  const profile={level:levelFrom[raw.l]||null,strong:toIds(raw.s),weak:toIds(raw.w)};
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
  const session=createSession();session.load({v:VERSION,answers,favourites,profile,deep});
  if(!session.complete())throw Error('這個結果連結的作答不完整。');
  return {session,name:typeof raw.n==='string'?raw.n.slice(0,20):''};
 }

 const api={createSession,encodeShare,decodeShare,weighted,level,VERSION,THRESHOLD};
 if(node)module.exports=api;else root.YuhsinCuriosityEngine=api;
})(typeof window!=='undefined'?window:globalThis);
