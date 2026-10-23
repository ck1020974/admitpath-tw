/* 學群探索：一個入口、一題一題作答、一頁結果，進度存在這台電腦的瀏覽器。 */
(() => {
 'use strict';
 const data=window.YuhsinCuriosityData,engine=window.YuhsinCuriosityEngine,intros=window.YuhsinGroupIntroductions||{};
 if(!data||!engine)return;
 const STORAGE_KEY='yuhsin-curiosity:v4';
 const el=id=>document.getElementById(id);
 const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const subject=id=>data.subjects.find(s=>s.id===id);
 const short=name=>name.replace(/學群$/,'');
 const interestLabel={3:'最想知道',2:'想知道',1:'還好',0:'沒興趣'};
 const pickLabel={strong:'最拿手',weak:'比較吃力',base:'跟整體程度一樣',null:'沒勾選'};
 const sectionTypes=['priority','develop','interest','potential'];
 const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

 let session=engine.createSession();
 let lastSavedView=null,view='intro',qMode='quick',qPage=0,detailPage=0,report=null,shared=null,restartArmed=null,tab=null;

 // ── 存檔 ──
 function save(){
  if(shared)return;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify({snapshot:session.snapshot(),view:view==='intro'?lastSavedView:view,savedAt:Date.now()}));}catch{}
 }
 function restore(){
  try{const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!raw)return null;session.load(raw.snapshot);lastSavedView=raw.view||null;return raw;}
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
 function setBar(step,count,progress,dots){
  el('quizStep').textContent=step;el('quizCount').textContent=count;
  el('quizProgress').style.width=`${Math.round(Math.min(1,Math.max(0,progress))*100)}%`;
  // 第 1 步用 18 個圓點顯示進度，和開始畫面的圓點呼應；其他步驟用進度條。
  el('quizDots').hidden=!dots;el('quizProgressTrack').hidden=Boolean(dots);
  if(dots)renderDots('quizDots',dots.on,dots.current);
 }
 // 18 個圓點，3 列各 6 個：亮起＝已回答，外框＝目前這一頁。
 function renderDots(id,on=[],current=[]){
  const box=el(id),n=session.questions().length;
  if(box.children.length!==n)box.innerHTML='<span></span>'.repeat(n);
  [...box.children].forEach((dot,i)=>{dot.classList.toggle('is-on',Boolean(on[i]));dot.classList.toggle('is-current',Boolean(current[i]));});
 }
 const answeredFlags=()=>{const a=session.snapshot().answers;return session.questions().map(q=>a[q.id]!==undefined);};
 function show(name,focusId){
  view=name;document.body.dataset.view=name;if(name!=='intro')lastSavedView=name;
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
  if(!session.interestComplete()){qMode='quick';qPage=firstUnansweredPage();return renderQuestion();}
  if(!session.favouritesComplete())return renderFavourites();
  // 第 3 步做到一半（已選整體程度、還在勾科目）時，回到同一頁繼續勾。
  if(!session.subjectsComplete()||lastSavedView==='subjects')return renderSubjects();
  if(!session.extraComplete()){qMode='extra';qPage=firstUnansweredPage();return renderQuestion();}
  if(snap.deep&&!session.deepComplete()){
   const missing=session.deepQuestions().findIndex(q=>snap.answers[q.id]===undefined);
   if(missing>=0){qMode='deep';qPage=firstUnansweredPage();return renderQuestion();}
   const plan=session.detailPlan();detailPage=Math.max(0,plan.findIndex(row=>row.goals.some(g=>snap.deep.goals[g.id]===undefined)));return renderDeepDetails();
  }
  renderResults();
 }

 // ── 入口 ──
 function renderIntro(){
  const resume=hasProgress();
  renderDots('introDots');
  el('introFirst').hidden=resume;el('introResume').hidden=!resume;
  disarmRestart();el('introError').textContent='';
  if(resume){
   const p=session.progress();
   el('resumeText').textContent=session.complete()?'上次已經完成，可以直接看結果。':p.step===1?`上次做到第 1 步，已回答 ${p.answered} / ${p.total} 題。`:`上次做到第 ${p.step} 步。`;
   renderDots('resumeDots',answeredFlags());
   el('resume').textContent=session.complete()?'看我的探索結果':'繼續上次的探索';
  }
  show('intro',resume?'resumeTitle':'introTitle');
 }
 function disarmRestart(){restartArmed=null;document.querySelectorAll('[data-restart]').forEach(b=>{b.textContent='重新開始';});}
 // 使用次數統計：只記錄做到哪一步、用了哪些功能，不記錄作答、科目或名字（主站 usage.js；沒有載入時略過）。
 const track=(name,title,options)=>{try{window.YuhsinUsage&&window.YuhsinUsage.event(name,title,options);}catch{}};
 function restart(button){
  if(restartArmed!==button){disarmRestart();restartArmed=button;button.textContent='確定清除作答？再按一次';return;}
  track('curiosity-restart','重新開始');
  clearSaved();session.reset();qPage=0;detailPage=0;report=null;tab=null;disarmRestart();renderIntro();
 }

 // ── 作答：一頁 6 題（好奇心、深入確認、換一批題目都一樣） ──
 const PAGE_SIZE=6;
 const questionList=()=>qMode==='quick'?session.questions():qMode==='extra'?session.extraQuestions():session.deepQuestions();
 const pageSize=()=>PAGE_SIZE;
 const pageCount=()=>Math.ceil(questionList().length/pageSize());
 const pageRows=()=>questionList().slice(qPage*pageSize(),(qPage+1)*pageSize());
 function updateQuestionProgress(){
  const list=questionList(),a=session.snapshot().answers,done=list.filter(q=>a[q.id]!==undefined).length;
  const pages=pageCount(),pageText=pages>1?`第 ${qPage+1} / ${pages} 頁　`:'';
  if(qMode==='quick')setBar('第 1 / 3 步・好奇心',`${pageText}已答 ${done} / ${list.length}`,done/list.length*0.6,{on:answeredFlags(),current:list.map((q,i)=>Math.floor(i/PAGE_SIZE)===qPage)});
  else if(qMode==='extra')setBar('換一批題目',`${pageText}已答 ${done} / ${list.length}`,done/list.length);
  else setBar('深入確認・補充問題',`${pageText}已答 ${done} / ${list.length}`,done/list.length*0.5);
 }
 function renderQuestion(){
  qPage=Math.min(Math.max(qPage,0),pageCount()-1);
  const a=session.snapshot().answers,offset=qPage*pageSize();
  el('qTitle').textContent=qMode==='quick'?'你想知道這些問題的答案嗎？':qMode==='extra'?'再看一批新的問題':'再看幾題和你的方向有關的問題';
  el('qHint').textContent=qMode==='quick'?'憑直覺選就好。':qMode==='extra'?'每個學群一題，都是還沒看過的。':`這些題目來自你的前幾個方向：${session.snapshot().deep.focus.map(g=>short(data.groups.find(x=>x.id===g).name)).join('、')}。`;
  el('qCards').innerHTML=pageRows().map((q,i)=>{const v=a[q.id];return `<fieldset class="q-card ${v!==undefined?'is-answered':''}" data-card="${q.id}"><legend><span class="q-no" aria-hidden="true">${String(offset+i+1).padStart(2,'0')}</span><span class="q-text">${esc(q.text)}</span></legend><div class="q-options" role="radiogroup" aria-label="${esc(q.text)}">${data.interestOptions.map(o=>`<button type="button" class="q-answer v${o.value}" role="radio" aria-checked="${v===o.value}" data-question="${q.id}" data-value="${o.value}">${esc(o.label)}</button>`).join('')}</div></fieldset>`;}).join('');
  el('qError').textContent='';
  const last=qPage>=pageCount()-1;
  el('qPrevious').textContent=qPage?'上一頁':qMode==='quick'?'回到開始':'回到結果';
  el('qNext').textContent=!last?'下一頁':qMode==='quick'?'下一步':qMode==='deep'&&session.detailPlan().length?'下一步':'看更新後的結果';
  updateQuestionProgress();
  show('question','qTitle');
 }
 function choose(button){
  const id=button.dataset.question,value=Number(button.dataset.value);
  session.answer(id,value);save();
  const cardEl=button.closest('.q-card');
  cardEl.classList.add('is-answered');
  cardEl.querySelectorAll('.q-answer').forEach(b=>b.setAttribute('aria-checked',String(b===button)));
  el('qError').textContent='';
  updateQuestionProgress();
  // 手機一次看不到整頁時，自動捲到下一題沒答的題目。
  const next=[...el('qCards').querySelectorAll('.q-card:not(.is-answered)')][0];
  const target=next||el('qNext');
  const rect=target.getBoundingClientRect();
  if(rect.bottom>innerHeight||rect.top<0)target.scrollIntoView({block:'center',behavior:reduceMotion?'auto':'smooth'});
 }
 function nextQuestionPage(){
  const missing=[...el('qCards').querySelectorAll('.q-card:not(.is-answered)')];
  if(missing.length){el('qError').textContent=`這一頁還有 ${missing.length} 題沒選。`;missing[0].scrollIntoView({block:'center',behavior:reduceMotion?'auto':'smooth'});return;}
  if(qPage<pageCount()-1){qPage++;renderQuestion();return;}
  if(qMode==='quick'){track('curiosity-step1-done','完成第 1 步',{once:true});if(session.favouritesNeeded())renderFavourites();else renderSubjects();}
  else if(qMode==='deep'&&session.detailPlan().length){detailPage=0;renderDeepDetails();}
  else{if(qMode==='extra')track('curiosity-extra-done','答完一批新題目');else track('curiosity-deep-done','完成深入確認');renderResults();}
 }
 const pageCountFor=mode=>mode==='quick'?Math.ceil(data.quickSet.length/PAGE_SIZE):1;
 const firstUnansweredPage=()=>{const a=session.snapshot().answers,i=questionList().findIndex(q=>a[q.id]===undefined);return Math.floor(Math.max(0,i)/pageSize());};

 // ── 最想知道 ──
 function renderFavourites(){
  const wanted=session.wanted(),chosen=session.snapshot().favourites;
  setBar('第 2 / 3 步・最想知道','',0.62);
  el('favouritesHint').textContent=`從你想知道的 ${wanted.length} 題中挑選。`;
  el('favouriteCards').innerHTML=wanted.map(id=>{const q=data.items.find(x=>x.id===id),on=chosen.includes(id);return `<label class="pick-card ${on?'is-picked':''}"><input type="checkbox" value="${id}" data-favourite ${on?'checked':''}><span class="pick-mark" aria-hidden="true"></span><span>${esc(q.text)}</span></label>`;}).join('');
  el('favouritesError').textContent='';
  updateFavouriteCount();
  show('favourites','favouritesTitle');
 }
 function updateFavouriteCount(){el('favouritesCount').textContent=`已挑 ${session.snapshot().favourites.length} / 3 題`;}

 // ── 學科：整體程度＋勾選強項與吃力科目 ──
 function renderSubjects(){
  setBar('第 3 / 3 步・學科表現','',0.78);
  el('levelOptions').innerHTML=data.levelOptions.map(o=>`<label class="level-option"><input type="radio" name="level" value="${o.value}" data-level><span>${esc(o.label)}</span></label>`).join('');
  const chips=kind=>data.subjects.map(s=>`<label class="subject-chip"><input type="checkbox" value="${s.id}" data-pick="${kind}"><span>${esc(s.label)}</span></label>`).join('');
  el('strongChips').innerHTML=chips('strong');el('weakChips').innerHTML=chips('weak');
  el('subjectsError').textContent='';
  syncProfile();
  show('subjects','subjectsTitle');
 }
 // 依目前作答更新勾選狀態；已勾成強項的科目在「吃力」裡停用，反之亦然。
 function syncProfile(){
  const p=session.snapshot().profile;
  el('levelOptions').querySelectorAll('input').forEach(i=>{i.checked=i.value===p.level;});
  ['strong','weak'].forEach(kind=>{
   const other=p[kind==='strong'?'weak':'strong'];
   el(kind+'Chips').querySelectorAll('input').forEach(i=>{i.checked=p[kind].includes(i.value);i.disabled=other.includes(i.value);i.closest('.subject-chip').classList.toggle('is-other',other.includes(i.value));});
  });
  el('subjectsCount').textContent=`強項 ${p.strong.length} / ${data.strongLimit}・吃力 ${p.weak.length} / ${data.weakLimit}`;
 }

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
 // 分頁下方的白話說明，學生不用先學分類名詞。
 const infoIcon='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 11v5M12 8h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
 // 卡片放學群簡介；學生想知道的題目改放在 ⓘ 推薦依據裡。
 function cardWhy(row){return `<p class="card-about">${esc(data.descriptions[row.id])}</p>`;}
 // 卡片底部：一句話說明基礎。
 function cardMeta(row){
  if(row.type==='develop'){const weak=row.subjects.filter(s=>s.weight===3&&typeof s.value==='number'&&s.value<2.75).map(s=>s.label);if(weak.length)return ['可加強',weak.join('、')];}
  if(row.type==='interest')return ['建議','先從選修、營隊接觸'];
  return row.strengths.length?['強項',row.strengths.join('、')]:null;
 }
 function cardFoot(meta,go){
  return `<div class="card-foot">${meta?`<span class="card-meta"><b>${esc(meta[0])}</b>${esc(meta[1])}</span>`:'<span></span>'}<span class="card-go" aria-hidden="true">${esc(go)}</span></div>`;
 }
 function card(row){
  const cats=((intros[row.name]||{}).topCategories||[]).slice(0,3).map(c=>c.label.replace(/學類$/,''));
  const name=short(row.name);
  return `<article class="group-card"><div class="card-head"><h3><a class="group-link" href="${esc(mainLink(row.name))}">${esc(name)}</a></h3><button class="info-button" type="button" data-evidence="${row.id}" aria-haspopup="dialog" aria-controls="evidenceDialog" aria-label="${esc(name)}的推薦依據" title="推薦依據">${infoIcon}</button></div>${cats.length?`<p class="card-cats">${cats.map(esc).join('、')}</p>`:''}${cardWhy(row)}${cardFoot(cardMeta(row),'看學群介紹')}</article>`;
 }
 // 不分系：不屬於任何一種方向，只在第一個分頁的最後放一張，用虛線框和其他學群區分。
 function undeclaredCard(){
  const und=report&&report.undeclared;if(!und)return '';
  const text=und.reason==='broad'?`你想知道的問題橫跨${und.domains.join('、')}，可以先入學，大一大二多修課再選主修。`:'還沒有明確的方向也沒關係，可以先入學，大一大二多修課再選主修。';
  return `<article class="group-card undeclared-card"><div class="card-head"><h3><a class="group-link" href="${esc(mainLink(und.group,'不分系學類'))}">不分系</a></h3></div><p class="card-cats">也可以考慮</p><p class="card-about">${esc(text)}</p>${cardFoot(null,'看不分系校系')}</article>`;
 }
 const availableTypes=()=>sectionTypes.filter(t=>report.groups.some(g=>g.type===t));
 function renderTabs(focus=false){
  const types=availableTypes();
  el('resultTabs').dataset.count=types.length;
  el('resultTabs').innerHTML=types.map(t=>`<button type="button" role="tab" id="tab-${t}" class="result-tab t-${t}" aria-selected="${t===tab}" aria-controls="resultPanel" tabindex="${t===tab?0:-1}" data-tab="${t}"><span class="tab-name">${esc(data.resultTypes[t].name)}</span><span class="tab-count">${report.groups.filter(g=>g.type===t).length}</span></button>`).join('');
  el('resultPanel').setAttribute('aria-labelledby','tab-'+tab);
  // 整張底紙的顏色跟著目前的分頁（見 styles.css 的 [data-type]）。
  el('sheet').dataset.type=tab;
  el('panelHint').textContent=data.resultTypes[tab].text;
  el('resultCards').innerHTML=report.groups.filter(g=>g.type===tab).map(card).join('')+(tab===types[0]?undeclaredCard():'');
  if(focus)el('tab-'+tab).focus();
 }
 function renderResults(){
  report=session.report();
  // 只統計「看到結果」與最前面的方向（學群名稱），作為整體趨勢；分享的結果不算。
  if(!shared){
   track('curiosity-result','看到探索結果',{once:true});
   const top=report.groups.find(g=>g.type!=='other');if(top)track('curiosity-top/'+top.name,'最前面的方向',{once:true});
   if(report.undeclared)track('curiosity-undeclared','建議不分系',{once:true});
  }
  const types=availableTypes();
  if(!types.includes(tab))tab=types[0]||null;
  el('resultsTitle').textContent=shared?(shared.name?`${shared.name} 的探索方向`:'分享的探索方向'):'你的探索方向';
  el('resultVersion').textContent=[report.deep?'已深入確認':'快速探索',report.extraRounds?`再探索 ${report.extraRounds} 批`:''].filter(Boolean).join('・');
  // 自己的結果在底紙下緣已說明是快速探索或已深入確認；只有分享的結果才在標題旁標示。
  el('resultVersion').hidden=!shared;
  el('sharedBanner').hidden=!shared;
  el('resultTabs').hidden=!types.length;el('resultPanel').hidden=!types.length;el('emptyResult').hidden=Boolean(types.length);
  if(types.length)renderTabs();
  else{el('sheet').dataset.type='none';el('emptyCards').innerHTML=undeclaredCard();}
  const others=report.groups.filter(g=>g.type==='other');
  el('otherGroups').hidden=!others.length;
  el('otherGroupsTitle').textContent=`其他學群（${others.length}）`;
  el('otherGroupList').innerHTML=others.map(g=>`<a href="${esc(mainLink(g.name))}">${esc(short(g.name))}</a>`).join('');
  el('resultActions').hidden=Boolean(shared);
  el('startDeep').hidden=report.deep;
  // 換一批題目：每個學群再問 1 題沒看過的題目；上一批沒答完時改成「繼續」。
  const extraPending=!session.extraComplete();
  el('startExtra').hidden=Boolean(shared)||!(report.canExplore||extraPending);
  el('startExtra').textContent=extraPending?'繼續答這批題目':'換一批題目';
  const extraNote=report.extraRounds?`，也換過 ${report.extraRounds} 批題目`:'';
  if(report.deep)el('deepPanelText').innerHTML=`<b>已完成深入確認${esc(extraNote)}</b>這是補答後更新的結果。`;
  else if(!shared){
   const preview=engine.createSession();preview.load(session.snapshot());preview.startDeep();
   const q=preview.deepQuestions().length,subjects=preview.detailPlan().length;
   el('deepPanelText').innerHTML=`<b>這是快速探索的結果${esc(extraNote)}</b>深入確認再答 ${q} 題${subjects?`、檢查 ${subjects} 科`:''}，方向會更準；也可以換一批新題目。`;
  }
  el('sharePanel').hidden=true;el('toggleShare').setAttribute('aria-expanded','false');el('resultTools').hidden=Boolean(shared);
  el('shareStatus').textContent='';el('shareUrl').hidden=true;
  show('results','resultsTitle');
 }
 function evidence(id){
  const row=report.groups.find(g=>g.id===id);
  el('evidenceTitle').textContent=short(row.name)+'｜推薦依據';
  const answered=row.subjects.filter(s=>s.pick!==null);
  el('evidenceContent').innerHTML=`<p>${esc(data.resultTypes[row.type].text)}</p>
   <h3>好奇心</h3>${row.evidence.length?`<ul>${row.evidence.map(e=>`<li>${esc(e.text)}<small class="evidence-value">${interestLabel[e.value]}${e.primary?'・本學群的題目':''}</small></li>`).join('')}</ul><p>興趣平均 ${row.interest.toFixed(1)}（達 ${engine.THRESHOLD} 視為有興趣）。</p>`:'<p>這次的題目沒有直接連到這個方向。</p>'}
   <h3>學科</h3>${answered.length?`<ul>${row.subjects.map(s=>`<li>${esc(s.label)}：${esc(pickLabel[s.pick])}${typeof s.value==='number'?`（${s.value%1?s.value.toFixed(1):s.value} / 4）`:''}<small class="evidence-value">本站權重 ${s.weight}</small></li>`).join('')}</ul>${row.score!==null?`<p>加權平均 ${row.score.toFixed(1)} / 4，已評估的科目占參考權重的 ${Math.round(row.coverage*100)}%。</p>`:''}`:'<p>相關科目都沒有資料，這次不判斷基礎。</p>'}
   <p>權重、門檻與題目連結是本站編輯規則，不是錄取條件或適合率。</p><a href="${row.source}" target="_blank" rel="noopener noreferrer">ColleGo! 學群參考 ↗</a>`;
  el('evidenceDialog').showModal();
 }
 async function copyLink(){
  const url=new URL(location.href);url.search='';url.hash='r='+engine.encodeShare(session.snapshot(),el('shareName').value);
  el('shareUrl').value=url.href;
  try{await navigator.clipboard.writeText(url.href);el('shareStatus').textContent='已複製結果連結，可以貼到 LINE 或作業繳交區。';track('curiosity-share-copy','複製結果連結',{once:true});el('shareUrl').hidden=true;}
  catch{el('shareUrl').hidden=false;el('shareUrl').select();el('shareStatus').textContent='瀏覽器不允許自動複製，請直接複製上面的連結。';}
 }

 // ── 事件 ──
 el('start').addEventListener('click',()=>{track('curiosity-start','開始學群探索');qMode='quick';qPage=0;renderQuestion();});
 el('resume').addEventListener('click',()=>{track('curiosity-resume','繼續上次的探索');resumeView();});
 document.querySelectorAll('[data-restart]').forEach(b=>b.addEventListener('click',()=>restart(b)));
 document.querySelectorAll('[data-about]').forEach(b=>b.addEventListener('click',()=>el('aboutDialog').showModal()));
 el('toIntro').addEventListener('click',renderIntro);

 el('qCards').addEventListener('click',e=>{const b=e.target.closest('[data-question]');if(b)choose(b);});
 el('qNext').addEventListener('click',nextQuestionPage);
 el('qPrevious').addEventListener('click',()=>{if(qPage){qPage--;renderQuestion();}else if(qMode==='quick')renderIntro();else renderResults();});

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
 el('favouritesPrevious').addEventListener('click',()=>{qMode='quick';qPage=pageCountFor('quick')-1;renderQuestion();});
 el('favouritesNext').addEventListener('click',()=>{
  const picked=session.snapshot().favourites.length;
  if(picked!==3){el('favouritesError').textContent=`還要再挑 ${3-picked} 題。`;return;}
  track('curiosity-step2-done','完成第 2 步',{once:true});
  renderSubjects();
 });

 el('levelOptions').addEventListener('change',e=>{const i=e.target.closest('input[data-level]');if(!i)return;session.setLevel(i.value);el('subjectsError').textContent='';syncProfile();save();});
 ['strongChips','weakChips'].forEach(id=>el(id).addEventListener('change',e=>{
  const box=e.target.closest('input[data-pick]');if(!box)return;
  const kind=box.dataset.pick,current=session.snapshot().profile[kind];
  const next=box.checked?current.concat(box.value):current.filter(x=>x!==box.value);
  try{session.setPicks(kind,next);el('subjectsError').textContent='';}
  catch(err){box.checked=false;el('subjectsError').textContent=err.message;}
  syncProfile();save();
 }));
 el('subjectsPrevious').addEventListener('click',()=>{if(session.favouritesNeeded())renderFavourites();else{qMode='quick';qPage=pageCountFor('quick')-1;renderQuestion();}});
 el('subjectsNext').addEventListener('click',()=>{
  const p=session.snapshot().profile;
  const missing=!p.level?['levelBlock','請選整體成績。']:p.strong.length<data.pickMin?['strongBlock','最拿手的科目請選 2–3 科。']:p.weak.length<data.pickMin?['weakBlock','比較吃力的科目請選 2–3 科。']:null;
  if(missing){el('subjectsError').textContent=missing[1];el(missing[0]).scrollIntoView({block:'center',behavior:reduceMotion?'auto':'smooth'});return;}
  track('curiosity-step3-done','完成第 3 步',{once:true});
  renderResults();
 });

 el('startDeep').addEventListener('click',()=>{track('curiosity-deep-start','開始深入確認');session.startDeep();save();detailPage=0;if(session.deepQuestions().length){qMode='deep';qPage=0;renderQuestion();}else renderDeepDetails();});
 el('startExtra').addEventListener('click',()=>{if(session.extraComplete())track('curiosity-extra-start','換一批題目');session.startExtra();save();qMode='extra';qPage=firstUnansweredPage();renderQuestion();});
 el('goalRows').addEventListener('change',e=>{
  const input=e.target.closest('input[data-goal]');if(!input)return;
  session.goal(input.dataset.goal,Number(input.value));
  const row=session.detailPlan()[detailPage],goals=session.snapshot().deep.goals;
  el('deepDetailsCount').textContent=`${row.goals.filter(g=>goals[g.id]!==undefined).length} / ${row.goals.length} 項`;
  el('deepDetailsError').textContent='';save();
 });
 el('deepDetailsPrevious').addEventListener('click',()=>{if(detailPage){detailPage--;renderDeepDetails();}else if(session.deepQuestions().length){qMode='deep';qPage=pageCount()-1;renderQuestion();}else renderResults();});
 el('deepDetailsNext').addEventListener('click',()=>{
  const row=session.detailPlan()[detailPage],goals=session.snapshot().deep.goals,missing=row.goals.filter(g=>goals[g.id]===undefined).length;
  if(missing){el('deepDetailsError').textContent=`還有 ${missing} 項沒選。`;return;}
  if(detailPage<session.detailPlan().length-1){detailPage++;renderDeepDetails();}else{track('curiosity-deep-done','完成深入確認');renderResults();}
 });
 el('openSubjectInfo').addEventListener('click',openSubjectInfo);

 el('resultTabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b||b.dataset.tab===tab)return;tab=b.dataset.tab;renderTabs(true);});
 el('resultTabs').addEventListener('keydown',e=>{
  const types=availableTypes(),i=types.indexOf(tab);
  const next={ArrowRight:i+1,ArrowLeft:i-1,Home:0,End:types.length-1}[e.key];
  if(next===undefined)return;e.preventDefault();tab=types[(next+types.length)%types.length];renderTabs(true);
 });
 el('resultCards').addEventListener('click',e=>{const b=e.target.closest('[data-evidence]');if(b)evidence(b.dataset.evidence);else if(e.target.closest('a[href]'))track('curiosity-to-main','從結果連到主站');});
 el('copyLink').addEventListener('click',copyLink);
 el('toggleShare').addEventListener('click',()=>{const open=el('sharePanel').hidden;el('sharePanel').hidden=!open;el('toggleShare').setAttribute('aria-expanded',String(open));if(open)el('shareName').focus();});
 el('editCuriosity').addEventListener('click',()=>{qMode='quick';qPage=0;renderQuestion();});
 el('editSubjects').addEventListener('click',renderSubjects);
 el('startOwn').addEventListener('click',()=>{shared=null;session=engine.createSession();restore();tab=null;history.replaceState(null,'',location.pathname);renderIntro();});
 document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}));
 el('sources').innerHTML='<li><a href="https://collego.edu.tw/Highschool/CollegeList" target="_blank" rel="noopener noreferrer">ColleGo! 十八學群 ↗</a></li>'+Object.values(data.sources).map(s=>`<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a></li>`).join('');

 // ── 開啟頁面 ──
 function boot(){
  try{window.YuhsinUsage&&window.YuhsinUsage.page('curiosity','學群探索');}catch{}
  const hash=location.hash.slice(1);
  if(hash.startsWith('r=')){
   try{const result=engine.decodeShare(hash.slice(2));session=result.session;shared={name:result.name};tab=null;track('curiosity-share-open','打開分享的結果');renderResults();return;}
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
