/* Pure four-route state machine. No persistence or network side effects. */
(function(root){
 'use strict';
 const data=typeof module!=='undefined'&&module.exports?require('./data.js'):root.YuhsinCuriosityData;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const valid=v=>Number.isInteger(v)&&v>=0&&v<=4;
 const interestValid=v=>Number.isInteger(v)&&v>=0&&v<=3;
 const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
 const shuffle=(a,r)=>{const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
 function weighted(values,weights){let sum=0,used=0,total=0;for(const [id,w] of Object.entries(weights)){total+=w;if(valid(values[id])||typeof values[id]==='number'&&Number.isFinite(values[id])&&values[id]>=0&&values[id]<=4){used+=w;sum+=values[id]*w;}}return {score:used?sum/used:null,coverage:used/total,usedWeight:used,totalWeight:total};}
 function classify({interest,score,coverage,threshold=2}){if(!Number.isFinite(interest)||!Number.isFinite(score)||coverage<0.5)return 'other';if(interest>=threshold)return score>=3?'priority':score<=1?'interest':'develop';return score>=3?'potential':'other';}
 function sampleInterest(random){
  const pool=shuffle(data.items,random),selected=[],concepts=new Set();
  for(let round=0;round<2;round++){
   const layer=[];
   for(const g of shuffle(data.groups,random)){const q=pool.find(q=>q.group===g.id&&!selected.some(p=>p.id===q.id)&&!layer.some(p=>p.id===q.id)&&!concepts.has(q.concept));if(!q)throw Error('情境題庫不足。');layer.push(q);concepts.add(q.concept);}
   selected.push(...shuffle(layer,random));
  }
  return clone(selected);
 }
 function createSession({random=Math.random}={}){
  let state,interestPool,abilityPool,candidatePool;
  function reset(){interestPool=sampleInterest(random);abilityPool=[];candidatePool=null;state={mode:null,depth:null,profiles:Object.fromEntries(data.subjects.map(s=>[s.id,null])),profilesDone:false,screens:{},finals:[],finalized:false,ratings:{},plan:[],goals:{},sampling:null};}
  reset();
  const count=()=>state.mode==='interest'?(state.depth==='quick'?18:36):(state.depth==='quick'?10:15);
  const overviewScore=id=>{const w=weighted(state.profiles,data.weights[id]);return w.coverage>=0.5?w.score??-1:-1;};
  const questions=()=>clone((state.mode==='ability'?abilityPool:interestPool).slice(0,count()));
  const batches=()=>{const q=questions();return Array.from({length:q.length/6},(_,i)=>q.slice(i*6,i*6+6));};
  function start(mode,depth){if(!['interest','ability'].includes(mode)||!['quick','deep'].includes(depth))throw Error('請選擇探索版本。');if(state.mode===mode&&state.depth===depth)return;if(state.mode){reset();}state.mode=mode;state.depth=depth;}
  function profile(id,value){if(!data.subjects.some(s=>s.id===id)||value!==null&&!valid(value))throw Error('請選擇有效的學科表現。');if(state.profiles[id]===value)return;state.profiles[id]=value;state.profilesDone=false;if(state.mode==='ability'){abilityPool=[];state.sampling=null;}state.plan=[];}
  function finishProfiles(){if(!data.subjects.filter(s=>s.required).every(s=>valid(state.profiles[s.id])))throw Error('請完成基本科目的自評。');state.profilesDone=true;}
  function prepareAbility(){if(!state.profilesDone)throw Error('請先完成學科概覽。');if(abilityPool.length)return;
   const pool=shuffle(data.items,random),ranked=pool.map(q=>({q,score:overviewScore(q.group)})).sort((a,b)=>b.score-a.score).map(x=>x.q);
   const chosen=[],used=new Set(),strength=[],cross=[];
   const add=(list,n,kind)=>{for(const q of list){if(kind.length===n)break;if(used.has(q.id)||chosen.some(p=>p.concept===q.concept)||chosen.filter(p=>p.group===q.group).length>=2)continue;chosen.push(q);used.add(q.id);kind.push(q);}if(kind.length!==n)throw Error('情境配題不足。');};
   add(ranked,6,strength);add(pool.filter(q=>!strength.some(s=>s.group===q.group)).concat(pool),4,cross);
   abilityPool=shuffle(strength,random).concat(shuffle(cross,random));
   add(ranked,9,strength);add(pool.filter(q=>!strength.some(s=>s.group===q.group)).concat(pool),6,cross);
   abilityPool.push(...shuffle(strength.slice(6),random),...shuffle(cross.slice(4),random));
   state.sampling={strength:state.depth==='quick'?6:9,cross:state.depth==='quick'?4:6};
  }
  function answer(index,value){const q=questions()[index];if(!q||!interestValid(value))throw Error('請選擇目前最接近的想法。');if(state.ratings[q.id]!==value){state.ratings[q.id]=value;state.plan=[];}}
  function screen(index,skipped){const q=batches()[index];if(!q)throw Error('找不到這一輪。');const ids=q.map(q=>q.id);if(!Array.isArray(skipped)||new Set(skipped).size!==skipped.length||skipped.some(id=>!ids.includes(id))||skipped.length<2||skipped.length>3)throw Error('每輪請打叉 2～3 個問題。');const next={skipped:skipped.slice()};if(JSON.stringify(state.screens[index])!==JSON.stringify(next)){state.screens[index]=next;candidatePool=null;const excluded=new Set(Object.values(state.screens).flatMap(s=>s.skipped));state.finals=state.finals.filter(id=>!excluded.has(id));state.finalized=false;state.plan=[];}}
  function candidates(){if(!screeningComplete())return [];if(!candidatePool){const excluded=new Set(Object.values(state.screens).flatMap(s=>s.skipped));candidatePool=shuffle(questions().filter(q=>!excluded.has(q.id)),random);}return clone(candidatePool);}
  const screeningComplete=()=>batches().every((_,i)=>Boolean(state.screens[i]));
  function pickBatches(){const pool=candidates(),n=state.depth==='quick'?2:4;return pool.length?Array.from({length:n},(_,i)=>pool.slice(Math.floor(i*pool.length/n),Math.floor((i+1)*pool.length/n))):[];}
  function finalize(ids){if(!screeningComplete()||!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>!candidates().some(q=>q.id===id))||pickBatches().some(batch=>{const count=batch.filter(q=>ids.includes(q.id)).length;return count<2||count>3;}))throw Error('每輪請勾選 2～3 個最想探索的問題。');state.finals=ids.slice();state.finalized=true;state.plan=[];}
  const interestComplete=()=>state.mode==='ability'?questions().length===count()&&questions().every(q=>interestValid(state.ratings[q.id])):screeningComplete()&&state.finalized;
  function interestRows(){return data.groups.map(g=>{const evidence=questions().filter(q=>q.interestGroups.includes(g.id)).map(q=>{let value=state.ratings[q.id];if(state.mode==='interest'){const i=Math.floor(questions().findIndex(p=>p.id===q.id)/6),s=state.screens[i];value=s?(s.skipped.includes(q.id)?0:state.finals.includes(q.id)?3:1):null;}return {id:q.id,text:q.text,value};});return {...g,interest:mean(evidence.filter(e=>interestValid(e.value)).map(e=>e.value)),evidence};});}
  function prepareDetails(){if(!interestComplete())throw Error('請先完成興趣探索。');if(state.plan.length)return;
   const seen=id=>questions().findIndex(q=>q.interestGroups.includes(id));
   const ranked=interestRows().filter(g=>g.interest!==null).sort((a,b)=>b.interest-a.interest||(state.mode==='ability'?overviewScore(b.id)-overviewScore(a.id):0)||seen(a.id)-seen(b.id)),ids=[];
   const add=id=>{if(ids.length<4&&!ids.includes(id))ids.push(id);};
   // Reserve capacity for actual strengths before interest-related subjects fill the plan.
   if(state.mode==='ability')data.subjects.filter(s=>valid(state.profiles[s.id])&&state.profiles[s.id]>=3).sort((a,b)=>state.profiles[b.id]-state.profiles[a.id]).slice(0,2).forEach(s=>add(s.id));
   for(const g of ranked.slice(0,3)){Object.entries(data.weights[g.id]).filter(([,w])=>w>=2).sort((a,b)=>b[1]-a[1]).slice(0,2).forEach(([id])=>add(id));}
   for(const g of ranked)Object.keys(data.weights[g.id]).forEach(add);
   state.plan=ids.map(id=>{const context=ranked.find(g=>data.weights[g.id][id]>=2)||ranked.find(g=>data.weights[g.id][id])||data.groups.find(g=>data.weights[g.id][id]===3)||data.groups.find(g=>data.weights[g.id][id]);return {subject:id,context:context.id,goals:data.detailGoals(id,context.id)};});
  }
  function goal(id,value){if(!valid(value)||!state.plan.some(row=>row.goals.some(g=>g.id===id)))throw Error('請選擇有效的掌握自評。');state.goals[id]=value;}
  const detailComplete=()=>state.plan.length>=3&&state.plan.every(row=>row.goals.every(g=>valid(state.goals[g.id])));
  function upgrade(){if(state.depth!=='quick')return;state.depth='deep';state.finalized=state.mode==='ability'?state.finalized:false;state.plan=[];if(state.mode==='interest'){candidatePool=null;state.finals=[];}if(state.mode==='ability'&&state.profilesDone){if(!abilityPool.length)prepareAbility();state.sampling={strength:9,cross:6};}}
  function report(){if(!interestComplete()||state.depth==='quick'&&!state.profilesDone||state.depth==='deep'&&!detailComplete()||state.mode==='ability'&&!state.profilesDone)throw Error('請先完成本版本的探索。');
   const values=state.depth==='quick'?state.profiles:Object.fromEntries(state.plan.map(row=>[row.subject,mean(row.goals.map(g=>state.goals[g.id]))]));
   const threshold=state.mode==='interest'?1.5:2;
   const groups=interestRows().map(g=>{const basis=weighted(values,data.weights[g.id]),type=classify({interest:g.interest,...basis,threshold});return {id:g.id,name:g.name,interest:g.interest,evidence:g.evidence,...basis,type,typeName:data.resultTypes[type].name,basis:state.depth==='quick'?'overview':'details',subjects:Object.entries(data.weights[g.id]).filter(([id])=>Number.isFinite(values[id])).map(([id,weight])=>({id,label:data.subjects.find(s=>s.id===id).label,value:values[id],weight})),goals:state.plan.filter(row=>data.weights[g.id][row.subject]).flatMap(row=>row.goals.map(goal=>({...goal,value:state.goals[goal.id],subjectId:row.subject}))),source:g.collego.url};});
   return clone({version:data.version,mode:state.mode,depth:state.depth,validated:false,interestMethod:state.mode==='interest'?'relative-screening':'four-point-rating',interestThreshold:threshold,profiles:state.profiles,profileUse:state.depth==='quick'?'scoring':'sampling-only',screens:state.screens,finals:state.finals,pickRounds:state.mode==='interest'?pickBatches().map(b=>b.map(q=>q.id)):[],questions:questions(),ratings:state.ratings,detailPlan:state.plan,goalAnswers:state.goals,groups,limits:['自評不是實測能力，篩選是相對興趣，不是科系適合率。','學群權重、題目連結與分類門檻為本站編輯規則，未經測量驗證。','略過的科目不算零分；已評估權重不足一半或沒有興趣題的方向放在其他學群。','快速版只用概覽，深入版只用具體掌握；兩版分數不可直接比較。']});
  }
  return {reset,start,profile,finishProfiles,prepareAbility,answer,screen,finalize,candidates,pickBatches,screeningComplete,interestComplete,prepareDetails,goal,detailComplete,upgrade,report,questions,batches,detailPlan:()=>clone(state.plan),profileComplete:()=>state.profilesDone,snapshot:()=>clone(state)};
 }
 const api={createSession,classify,weighted,sampleInterest};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YuhsinCuriosityEngine=api;
})(typeof window!=='undefined'?window:globalThis);
