/* 學群探索：一個入口、一題一題作答、一頁結果，進度存在這台電腦的瀏覽器。 */
(() => {
 'use strict';
 const data=window.YuhsinCuriosityData,engine=window.YuhsinCuriosityEngine,intros=window.YuhsinGroupIntroductions||{};
 if(!data||!engine)return;
 const STORAGE_KEY='yuhsin-curiosity:v3';
 const el=id=>document.getElementById(id);
 const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const subject=id=>data.subjects.find(s=>s.id===id);
 const short=name=>name.replace(/學群$/,'');
 const interestLabel={3:'最想知道',2:'想知道',1:'還好',0:'沒興趣'};
 const subjectLabel=v=>(data.subjectOptions.find(o=>o.value===v)||{label:'未填'}).label;
 const sectionTypes=['priority','develop','interest','potential'];
 const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

 let session=engine.createSession();
 let view='intro',qMode='quick',qIndex=0,detailPage=0,report=null,shared=null,restartArmed=null,tab=null,advancing=false;

 // ── 存檔 ──
 function save(){
  if(shared)return;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify({snapshot:session.snapshot(),savedAt:Date.now()}));}catch{}
 }
 function restore(){
  try{const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!raw)return null;session.load(raw.snapshot);return raw;}
  catch{session.reset();return null;}
 }
 function clearSaved(){try{localStorage.removeItem(STORAGE_KEY);}catch{}}
 const hasProgress=()=>Object.keys(session.snapshot().answers).length>0;

 // ── 主站連結 ──
 function mainBase(){return ['127.0.0.1','localhost'].includes(location.hostname)&&location.port==='5174'?new URL('http://127.0.0.1:5173/'):new URL('../../',location.href);}
 function mainLink(group,category){
  const url=mainBase();url.searchParams.set('view','explorer');url.searchParams.set('group',group);
  if(category)url.searchParams.set('category',category);
  url.searchParams.set('from','curiosity');
  return url.href;
 }
 document.querySelector('.brand').href=mainBase().href;

 // ── 畫面切換與進度列 ──
 function setBar(step,count,progress){
  el('quizStep').textContent=step;el('quizCount').textContent=count;
  el('quizProgress').style.width=`${Math.round(Math.min(1,Math.max(0,progress))*100)}%`;
 }
 function show(name,focusId){
  view=name;document.body.dataset.view=name;
  document.querySelectorAll('main > .view').forEach(s=>{s.hidden=s.id!==name;});
  el('quizBar').hidden=['intro','results'].includes(name)||Boolean(shared);
  if(name!=='results'&&!shared&&location.hash)history.replaceState(null,'',location.pathname+location.search);
  if(name==='results'&&!shared&&location.hash!=='#results')history.replaceState(null,'',location.pathname+location.search+'#results');
  window.scrollTo({top:0,behavior:'instant'});
  if(focusId)el(focusId).focus({preventScroll:true});
  save();
 }
 function resumeView(){
  const snap=session.snapshot();
  if(!session.interestComplete()){qMode='quick';qIndex=Math.max(0,data.quickSet.findIndex(id=>snap.answers[id]===undefined));return renderQuestion();}
  if(!session.favouritesComplete())return renderFavourites();
  if(!session.subjectsComplete())return renderSubjects();
  if(snap.deep&&!session.deepComplete()){
   const missing=session.deepQuestions().findIndex(q=>snap.answers[q.id]===undefined);
   if(missing>=0){qMode='deep';qIndex=missing;return renderQuestion();}
   const plan=session.detailPlan();detailPage=Math.max(0,plan.findIndex(row=>row.goals.some(g=>snap.deep.goals[g.id]===undefined)));return renderDeepDetails();
  }
  renderResults();
 }

 // ── 入口 ──
 function renderIntro(){
  const resume=hasProgress();
  el('introFirst').hidden=resume;el('introResume').hidden=!resume;
  disarmRestart();el('introError').textContent='';
  if(resume){
   const p=session.progress();
   el('resumeText').textContent=session.complete()?'上次已經完成，可以直接看結果。':p.step===1?`上次做到第 1 步，已回答 ${p.answered} / ${p.total} 題。`:`上次做到第 ${p.step} 步。`;
   el('resumeBar').style.width=`${session.complete()?100:Math.round(p.step===1?p.answered/p.total*60:p.step===2?65:80)}%`;
   el('resume').textContent=session.complete()?'看我的探索結果':'繼續上次的探索';
  }
  show('intro',resume?'resumeTitle':'introTitle');
 }
 function disarmRestart(){restartArmed=null;document.querySelectorAll('[data-restart]').forEach(b=>{b.textContent='重新開始';});}
 function restart(button){
  if(restartArmed!==button){disarmRestart();restartArmed=button;button.textContent='確定清除作答？再按一次';return;}
  clearSaved();session.reset();qIndex=0;detailPage=0;report=null;tab=null;disarmRestart();renderIntro();
 }

 // ── 一題一題作答（快速題與深入補問共用） ──
 const questionList=()=>qMode==='quick'?session.questions():session.deepQuestions();
 function renderQuestion(){
  const list=questionList();qIndex=Math.min(Math.max(qIndex,0),list.length-1);
  const q=list[qIndex],value=session.snapshot().answers[q.id];
  if(qMode==='quick')setBar('第 1 / 3 步・好奇心',`${qIndex+1} / ${list.length}`,qIndex/list.length*0.6);
  else setBar('深入確認・補充問題',`${qIndex+1} / ${list.length}`,qIndex/list.length*0.5);
  el('qNumber').textContent=`第 ${qIndex+1} 題`;
  el('qText').textContent=q.text;
  el('qAnswers').innerHTML=data.interestOptions.map((o,i)=>`<button type="button" class="q-answer v${o.value}" role="radio" aria-checked="${value===o.value}" data-value="${o.value}"><span class="q-key" aria-hidden="true">${i+1}</span><span class="q-label">${esc(o.label)}</span></button>`).join('');
  el('qPrevious').textContent=qIndex?'← 上一題':qMode==='quick'?'← 回到開始':'← 回到結果';
  advancing=false;
  show('question','qText');
 }
 function choose(value){
  if(advancing||view!=='question')return;
  const q=questionList()[qIndex];
  session.answer(q.id,value);save();
  el('qAnswers').querySelectorAll('.q-answer').forEach(b=>b.setAttribute('aria-checked',String(Number(b.dataset.value)===value)));
  advancing=true;
  setTimeout(()=>{
   if(qIndex<questionList().length-1){qIndex++;renderQuestion();return;}
   advancing=false;
   if(qMode==='quick'){if(session.favouritesNeeded())renderFavourites();else renderSubjects();}
   else if(session.detailPlan().length){detailPage=0;renderDeepDetails();}
   else renderResults();
  },reduceMotion?0:220);
 }

 // ── 最想知道 ──
 function renderFavourites(){
  const wanted=session.wanted(),chosen=session.snapshot().favourites;
  setBar('第 2 / 3 步・最想知道','',0.62);
  el('favouritesHint').textContent=`你有 ${wanted.length} 題想知道，從裡面挑出最想知道答案的 3 題。`;
  el('favouriteCards').innerHTML=wanted.map(id=>{const q=data.items.find(x=>x.id===id),on=chosen.includes(id);return `<label class="pick-card ${on?'is-picked':''}"><input type="checkbox" value="${id}" data-favourite ${on?'checked':''}><span class="pick-mark" aria-hidden="true"></span><span>${esc(q.text)}</span></label>`;}).join('');
  el('favouritesError').textContent='';
  updateFavouriteCount();
  show('favourites','favouritesTitle');
 }
 function updateFavouriteCount(){el('favouritesCount').textContent=`已挑 ${session.snapshot().favourites.length} / 3 題`;}

 // ── 學科自評 ──
 function renderSubjects(){
  const values=session.snapshot().subjects;
  setBar('第 3 / 3 步・學科自評','',0.78);
  el('subjectRows').innerHTML=data.profileGroups.map(group=>`<fieldset class="subject-group"><legend>${esc(group.label)}</legend>${group.subjects.map(id=>{const v=values[id];return `<div class="subject-row" role="radiogroup" aria-labelledby="label-${id}"><span class="subject-name" id="label-${id}">${esc(subject(id).label)}</span><div class="scale-options">${data.subjectOptions.map(o=>`<label class="scale-option"><input type="radio" name="s-${id}" value="${o.value}" data-subject="${id}" ${v===o.value?'checked':''}><span>${esc(o.label)}</span></label>`).join('')}</div></div>`;}).join('')}</fieldset>`).join('');
  el('subjectsError').textContent='';
  updateSubjectCount();
  show('subjects','subjectsTitle');
 }
 function updateSubjectCount(){const v=session.snapshot().subjects,req=data.subjects.filter(s=>s.required);el('subjectsCount').textContent=`必填 ${req.filter(s=>v[s.id]!==undefined).length} / ${req.length} 科`;}

 // ── 深入確認：具體內容 ──
 function renderDeepDetails(){
  const plan=session.detailPlan();
  if(!plan.length)return renderResults();
  detailPage=Math.min(Math.max(detailPage,0),plan.length-1);
  const row=plan[detailPage],goals=session.snapshot().deep.goals;
  setBar('深入確認・具體內容',`第 ${detailPage+1} / ${plan.length} 科`,0.5+detailPage/plan.length*0.5);
  el('deepDetailsTitle').textContent=`這些和「${subject(row.subject).label}」有關的事，你做得如何？`;
  el('goalRows').innerHTML=row.goals.map((g,i)=>`<fieldset class="goal-row"><legend><span class="goal-no" aria-hidden="true">${i+1}</span>${esc(g.text)}</legend><div class="scale-options">${data.masteryOptions.map(o=>`<label class="scale-option"><input type="radio" name="g-${g.id}" value="${o.value}" data-goal="${g.id}" ${goals[g.id]===o.value?'checked':''}><span>${esc(o.label)}</span></label>`).join('')}</div></fieldset>`).join('');
  el('deepDetailsError').textContent='';
  el('deepDetailsCount').textContent=`${row.goals.filter(g=>goals[g.id]!==undefined).length} / ${row.goals.length} 項`;
  el('deepDetailsNext').textContent=detailPage<plan.length-1?'下一科':'看更新後的結果';
  show('deepDetails','deepDetailsTitle');
 }
 function openSubjectInfo(){
  const row=session.detailPlan()[detailPage];
  el('subjectInfoTitle').textContent=subject(row.subject).label+'｜課綱與課程';
  el('subjectInfoContent').innerHTML=row.goals.map((g,i)=>`<section class="subject-source"><h3>${i+1}. ${esc(g.text)}</h3><ul>${g.references.map(key=>{const r=data.curriculum[key],src=data.sources[r.source];return `<li><strong>${esc(r.code)} · ${esc(r.kind)}</strong><p>${esc(r.official)}（條目節錄）</p><a href="${src.url}#page=${r.page}" target="_blank" rel="noopener noreferrer">${esc(src.name)} · PDF 第 ${r.page} 頁 ↗</a></li>`;}).join('')}</ul></section>`).join('')+`<p>本頁參考方向：${esc(data.groups.find(g=>g.id===row.context).name)}。具體題文與配對為本站編輯，不是官方試題。</p>`;
  el('subjectInfoDialog').showModal();
 }

 // ── 結果 ──
 function nextStep(row){
  const collego=data.groups.find(g=>g.id===row.id).collego,courses=(collego.advanced||[]).slice(0,2).join('、');
  if(row.type==='priority')return '下一步：點進學類，比較課程和校系的差別。';
  if(row.type==='develop'){const core=row.subjects.filter(s=>s.weight===3&&typeof s.value==='number'&&s.value<2.75).map(s=>s.label);return `下一步：${core.length?`多投入${core.join('、')}，`:''}${courses?`也可以留意選修「${courses}」。`:'再讀讀學類介紹。'}`;}
  if(row.type==='interest')return `下一步：先從體驗開始，${courses?`例如選修「${courses}」、`:''}營隊或自主學習。`;
  if(row.type==='potential')return '下一步：你的強項用得上，讀讀學類介紹，看看會不會有興趣。';
  return '';
 }
 function reasonHtml(row){
  const parts=[];
  if(row.reason&&row.reason.value>=2&&row.type!=='potential')parts.push(`<li><span>${row.reason.favourite?'你最想知道':'你想知道'}</span>「${esc(row.reason.text)}」</li>`);
  if(row.strengths.length)parts.push(`<li><span>相關強項</span>${esc(row.strengths.join('、'))}</li>`);
  return parts.length?`<ul class="reasons">${parts.join('')}</ul>`:'';
 }
 function card(row){
  const cats=(intros[row.name]||{}).topCategories||[];
  return `<article class="group-card"><h3>${esc(short(row.name))}</h3><p class="group-description">${esc(data.descriptions[row.id])}</p>${reasonHtml(row)}${cats.length?`<div class="category-links"><span>常見學類</span>${cats.map(c=>`<a href="${esc(mainLink(row.name,c.name))}">${esc(c.label.replace(/學類$/,''))}</a>`).join('')}</div>`:''}<p class="next-step">${esc(nextStep(row))}</p><div class="card-actions"><a class="group-link" href="${esc(mainLink(row.name))}">認識這個學群 <span aria-hidden="true">→</span></a><button class="text-button" type="button" data-evidence="${row.id}" aria-haspopup="dialog" aria-controls="evidenceDialog">推薦依據</button></div></article>`;
 }
 const availableTypes=()=>sectionTypes.filter(t=>report.groups.some(g=>g.type===t));
 function renderTabs(focus=false){
  const types=availableTypes();
  el('resultTabs').dataset.count=types.length;
  el('resultTabs').innerHTML=types.map(t=>`<button type="button" role="tab" id="tab-${t}" class="result-tab t-${t}" aria-selected="${t===tab}" aria-controls="resultPanel" tabindex="${t===tab?0:-1}" data-tab="${t}"><span class="tab-name">${esc(data.resultTypes[t].name)}</span><span class="tab-count">${report.groups.filter(g=>g.type===t).length}</span></button>`).join('');
  el('resultPanel').setAttribute('aria-labelledby','tab-'+tab);
  el('panelHint').textContent=data.resultTypes[tab].text;
  el('resultCards').innerHTML=report.groups.filter(g=>g.type===tab).map(card).join('');
  if(focus)el('tab-'+tab).focus();
 }
 function renderResults(){
  report=session.report();
  const types=availableTypes();
  if(!types.includes(tab))tab=types[0]||null;
  el('resultsTitle').textContent=shared?(shared.name?`${shared.name} 的探索方向`:'分享的探索方向'):'你的探索方向';
  el('resultVersion').textContent=report.deep?'已深入確認':'快速探索';
  el('sharedBanner').hidden=!shared;
  el('resultTabs').hidden=!types.length;el('resultPanel').hidden=!types.length;el('emptyResult').hidden=Boolean(types.length);
  document.querySelector('.results>.lead').hidden=!types.length;
  if(types.length)renderTabs();
  const others=report.groups.filter(g=>g.type==='other');
  el('otherGroups').hidden=!others.length;
  el('otherGroupsTitle').textContent=`其他學群（${others.length}）`;
  el('otherGroupList').innerHTML=others.map(g=>`<li><a href="${esc(mainLink(g.name))}">${esc(short(g.name))}</a></li>`).join('');
  el('favouriteSummary').hidden=!report.favourites.length;
  el('favouriteSummaryTitle').textContent=shared?'最想知道的問題':'你最想知道的問題';
  el('favouriteList').innerHTML=report.favourites.map(f=>`<li>${esc(f.text)}</li>`).join('');
  el('deepPanel').hidden=Boolean(shared)||report.deep;
  if(!report.deep&&!shared){
   const preview=engine.createSession();preview.load(session.snapshot());preview.startDeep();
   const q=preview.deepQuestions().length,subjects=preview.detailPlan().length;
   el('deepPanelText').textContent=`針對你的前幾個方向，再回答 ${q} 題相關問題${subjects?`，並檢查 ${subjects} 科的具體內容`:''}，大約 3 分鐘。完成後結果會更新。`;
  }
  el('sharePanel').hidden=Boolean(shared);el('resultTools').hidden=Boolean(shared);
  el('shareStatus').textContent='';el('shareUrl').hidden=true;
  show('results','resultsTitle');
 }
 function evidence(id){
  const row=report.groups.find(g=>g.id===id);
  el('evidenceTitle').textContent=short(row.name)+'｜推薦依據';
  const answered=row.subjects.filter(s=>s.answer!==null);
  el('evidenceContent').innerHTML=`<p>${esc(data.resultTypes[row.type].text)}</p>
   <h3>好奇心</h3>${row.evidence.length?`<ul>${row.evidence.map(e=>`<li>${esc(e.text)}<small class="evidence-value">${interestLabel[e.value]}${e.primary?'・本學群的題目':''}</small></li>`).join('')}</ul><p>興趣平均 ${row.interest.toFixed(1)}（達 ${engine.THRESHOLD} 視為有興趣）。</p>`:'<p>這次的題目沒有直接連到這個方向。</p>'}
   <h3>學科</h3>${answered.length?`<ul>${row.subjects.map(s=>`<li>${esc(s.label)}：${esc(subjectLabel(s.answer))}${typeof s.value==='number'&&report.deep&&s.value!==s.answer?`（深入確認 ${s.value.toFixed(1)}）`:''}<small class="evidence-value">本站權重 ${s.weight}</small></li>`).join('')}</ul>${row.score!==null?`<p>加權平均 ${row.score.toFixed(1)} / 4，已評估的科目占參考權重的 ${Math.round(row.coverage*100)}%。</p>`:''}`:'<p>相關科目都沒填，這次不判斷基礎。</p>'}
   <p>權重、門檻與題目連結是本站編輯規則，不是錄取條件或適合率。</p><a href="${row.source}" target="_blank" rel="noopener noreferrer">ColleGo! 學群參考 ↗</a>`;
  el('evidenceDialog').showModal();
 }
 async function copyLink(){
  const url=new URL(location.href);url.search='';url.hash='r='+engine.encodeShare(session.snapshot(),el('shareName').value);
  el('shareUrl').value=url.href;
  try{await navigator.clipboard.writeText(url.href);el('shareStatus').textContent='已複製結果連結，可以貼到 LINE 或作業繳交區。';el('shareUrl').hidden=true;}
  catch{el('shareUrl').hidden=false;el('shareUrl').select();el('shareStatus').textContent='瀏覽器不允許自動複製，請直接複製上面的連結。';}
 }

 // ── 事件 ──
 el('start').addEventListener('click',()=>{qMode='quick';qIndex=0;renderQuestion();});
 el('resume').addEventListener('click',resumeView);
 document.querySelectorAll('[data-restart]').forEach(b=>b.addEventListener('click',()=>restart(b)));
 document.querySelectorAll('[data-about]').forEach(b=>b.addEventListener('click',()=>el('aboutDialog').showModal()));
 el('toIntro').addEventListener('click',renderIntro);

 el('qAnswers').addEventListener('click',e=>{const b=e.target.closest('[data-value]');if(b)choose(Number(b.dataset.value));});
 el('qPrevious').addEventListener('click',()=>{if(advancing)return;if(qIndex){qIndex--;renderQuestion();}else if(qMode==='quick')renderIntro();else renderResults();});
 document.addEventListener('keydown',e=>{
  if(view!=='question'||e.repeat||e.altKey||e.ctrlKey||e.metaKey||document.querySelector('dialog[open]')||e.target.closest('input,textarea,select'))return;
  const i=['1','2','3'].indexOf(e.key);if(i>=0){e.preventDefault();choose(data.interestOptions[i].value);}
 });

 el('favouriteCards').addEventListener('change',e=>{
  const box=e.target.closest('input[data-favourite]');if(!box)return;
  const current=session.snapshot().favourites;
  const next=box.checked?current.concat(box.value):current.filter(id=>id!==box.value);
  if(next.length>3){box.checked=false;el('favouritesError').textContent='最多挑 3 題，先取消一題再換。';return;}
  el('favouritesError').textContent='';
  session.setFavourites(next);
  box.closest('.pick-card').classList.toggle('is-picked',box.checked);
  updateFavouriteCount();save();
 });
 el('favouritesPrevious').addEventListener('click',()=>{qMode='quick';qIndex=data.quickSet.length-1;renderQuestion();});
 el('favouritesNext').addEventListener('click',()=>{
  const picked=session.snapshot().favourites.length;
  if(picked!==3){el('favouritesError').textContent=`還要再挑 ${3-picked} 題。`;return;}
  renderSubjects();
 });

 el('subjectRows').addEventListener('change',e=>{
  const input=e.target.closest('input[data-subject]');if(!input)return;
  session.setSubject(input.dataset.subject,Number(input.value));
  el('subjectsError').textContent='';updateSubjectCount();save();
 });
 el('subjectsPrevious').addEventListener('click',()=>{if(session.favouritesNeeded())renderFavourites();else{qMode='quick';qIndex=data.quickSet.length-1;renderQuestion();}});
 el('subjectsNext').addEventListener('click',()=>{
  const v=session.snapshot().subjects,missing=data.subjects.filter(s=>s.required&&v[s.id]===undefined).map(s=>s.label);
  if(missing.length){el('subjectsError').textContent=`還沒選：${missing.join('、')}。`;return;}
  renderResults();
 });

 el('startDeep').addEventListener('click',()=>{session.startDeep();save();detailPage=0;if(session.deepQuestions().length){qMode='deep';qIndex=0;renderQuestion();}else renderDeepDetails();});
 el('goalRows').addEventListener('change',e=>{
  const input=e.target.closest('input[data-goal]');if(!input)return;
  session.goal(input.dataset.goal,Number(input.value));
  const row=session.detailPlan()[detailPage],goals=session.snapshot().deep.goals;
  el('deepDetailsCount').textContent=`${row.goals.filter(g=>goals[g.id]!==undefined).length} / ${row.goals.length} 項`;
  el('deepDetailsError').textContent='';save();
 });
 el('deepDetailsPrevious').addEventListener('click',()=>{if(detailPage){detailPage--;renderDeepDetails();}else if(session.deepQuestions().length){qMode='deep';qIndex=session.deepQuestions().length-1;renderQuestion();}else renderResults();});
 el('deepDetailsNext').addEventListener('click',()=>{
  const row=session.detailPlan()[detailPage],goals=session.snapshot().deep.goals,missing=row.goals.filter(g=>goals[g.id]===undefined).length;
  if(missing){el('deepDetailsError').textContent=`還有 ${missing} 項沒選。`;return;}
  if(detailPage<session.detailPlan().length-1){detailPage++;renderDeepDetails();}else renderResults();
 });
 el('openSubjectInfo').addEventListener('click',openSubjectInfo);

 el('resultTabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b||b.dataset.tab===tab)return;tab=b.dataset.tab;renderTabs(true);});
 el('resultTabs').addEventListener('keydown',e=>{
  const types=availableTypes(),i=types.indexOf(tab);
  const next={ArrowRight:i+1,ArrowLeft:i-1,Home:0,End:types.length-1}[e.key];
  if(next===undefined)return;e.preventDefault();tab=types[(next+types.length)%types.length];renderTabs(true);
 });
 el('resultCards').addEventListener('click',e=>{const b=e.target.closest('[data-evidence]');if(b)evidence(b.dataset.evidence);});
 el('copyLink').addEventListener('click',copyLink);
 el('editCuriosity').addEventListener('click',()=>{qMode='quick';qIndex=0;renderQuestion();});
 el('editSubjects').addEventListener('click',renderSubjects);
 el('startOwn').addEventListener('click',()=>{shared=null;session=engine.createSession();restore();tab=null;history.replaceState(null,'',location.pathname);renderIntro();});
 document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}));
 el('sources').innerHTML='<li><a href="https://collego.edu.tw/Highschool/CollegeList" target="_blank" rel="noopener noreferrer">ColleGo! 十八學群 ↗</a></li>'+Object.values(data.sources).map(s=>`<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a></li>`).join('');

 // ── 開啟頁面 ──
 function boot(){
  const hash=location.hash.slice(1);
  if(hash.startsWith('r=')){
   try{const result=engine.decodeShare(hash.slice(2));session=result.session;shared={name:result.name};tab=null;renderResults();return;}
   catch(err){shared=null;session=engine.createSession();restore();history.replaceState(null,'',location.pathname);renderIntro();el('introError').textContent=err.message;return;}
  }
  restore();
  if(hash==='results'&&session.complete())return renderResults();
  renderIntro();
 }
 // 在同一個分頁貼上另一個結果連結時，網址只換 # 後面，也要重新讀取。
 window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#r='))boot();});
 boot();
})();
