/* Teacher records are fetched with the teacher's token and enforced by RLS. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const model=window.YuhsinTeacherModel;
  let storage; try { storage = window.sessionStorage; } catch {}
  const client = window.YuhsinSupabaseAuth.createClient({ config: { ...window.YUHSIN_STUDENT_AUTH_CONFIG, accountType: 'teacher' }, fetcher: window.fetch.bind(window), storage });
  const form = $('login').querySelector('form'), submit = form.querySelector('button');
  const dialog=$('studentDialog');
  let students = [], filtered = [], summaries = new Map(), summaryReady = false, epoch = 0;
  let picks={login:'',exam:''},sort={key:'',direction:'asc'};
  let detailEpoch=0,selectedStudent=null;
  const dateOnly=value=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)).map(x=>[x.type,x.value]));return p.year+'/'+p.month+'/'+p.day;};
  const date=value=>new Intl.DateTimeFormat('zh-TW',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Taipei'}).format(new Date(value));
  function text(tag,value,className){const node=document.createElement(tag);node.textContent=value;if(className)node.className=className;return node;}
  function clearDetail(){detailEpoch++;selectedStudent=null;$('detailTracking').replaceChildren();$('detailResults').replaceChildren();$('detailIdentity').textContent='';$('detailTitle').textContent='';$('tabResultsCount').textContent='';$('tabTrackingCount').textContent='';message('detailStatus','');attemptResults=[];attemptIndex=0;}
  function closeDialog(){if(dialog.open)dialog.close();}
  function chipList(values,className){const box=text('span','','chips');for(const v of values)box.append(text('span',v,'chip '+(className||'')));if(!values.length)box.append(text('span','—','muted'));return box;}
  function renderResult(row){
    const data=window.YuhsinCuriosityData,report=row.report||{groups:[]},snapshot=row.answers||{};
    const profile=snapshot.profile||{strong:[],weak:[]},subject=id=>data.subjects.find(s=>s.id===id)?.label||id;
    const item=document.createElement('div');item.className='result-view';
    // 1. 學科自評
    const evalBox=document.createElement('section');evalBox.className='self-eval';evalBox.append(text('h4','學科自評'));
    const grid=document.createElement('dl');grid.className='eval-grid';
    const level=data.levelOptions?.find(o=>o.value===profile.level)?.label||{high:'前段',mid:'中間',low:'後段'}[profile.level]||'—';
    for(const [label,node] of [['整體程度',text('span',level,'level-badge')],['最拿手',chipList((profile.strong||[]).map(subject),'chip-strong')],['比較吃力',chipList((profile.weak||[]).map(subject),'chip-weak')]]){
      const cell=document.createElement('div');const dd=document.createElement('dd');dd.append(node);cell.append(text('dt',label),dd);grid.append(cell);
    }
    evalBox.append(grid);item.append(evalBox);
    // 2. 探索結果（依類型分卡片）
    const cards=document.createElement('div');cards.className='result-types';
    for(const type of ['priority','develop','potential','interest']){
      const groups=report.groups.filter(g=>g.type===type);if(!groups.length)continue;
      const card=document.createElement('section');card.className='type-card type-'+type;
      card.append(text('h4',groups[0].typeName||data.resultTypes?.[type]?.name||type));
      const list=document.createElement('ul');
      for(const g of groups){const li=document.createElement('li');li.append(text('span',g.name.replace(/學群$/,''),'group-name'));if(g.strengths?.length)li.append(text('span','拿手 '+g.strengths.join('、'),'group-note'));list.append(li);}
      card.append(list);cards.append(card);
    }
    if(!cards.children.length)cards.append(text('p','這次沒有歸類出的學群。','muted'));
    item.append(cards);
    // 3. 查看作答
    const answers=document.createElement('details');answers.className='answer-details';answers.append(text('summary','查看作答'));
    const interest={0:['沒興趣','a0'],1:['還好','a1'],2:['想知道','a2']};
    const qlist=document.createElement('ul');qlist.className='answer-list';
    for(const [id,value] of Object.entries(snapshot.answers||{})){
      const q=data.items.find(q=>q.id===id),[label,cls]=(snapshot.favourites||[]).includes(id)?['最想知道','a3']:(interest[value]||[String(value),'a1']);
      const li=document.createElement('li');li.append(text('span',q?.text||id,'answer-q'),text('span',label,'answer-badge '+cls));qlist.append(li);
    }
    if(qlist.children.length){answers.append(text('h5','興趣問題'),qlist);}
    if(snapshot.deep)for(const plan of snapshot.deep.plan||[]){
      const glist=document.createElement('ul');glist.className='answer-list';
      for(const goal of data.detailGoals(plan.subject,plan.context,plan.goalVersion)){
        const value=snapshot.deep.goals?.[goal.id];if(value===undefined)continue;
        const li=document.createElement('li');li.append(text('span',goal.text||goal.label||goal.id,'answer-q'),text('span',data.masteryOptions.find(o=>o.value===value)?.label||String(value),'answer-badge m'+value));glist.append(li);
      }
      if(glist.children.length)answers.append(text('h5','深入探索｜'+subject(plan.subject)),glist);
    }
    if(row.attempt)answers.append(text('p','題庫 '+row.attempt.bank_version+'｜計分 '+row.attempt.scoring_version,'version-info'));
    item.append(answers);
    return item;
  }
  // One attempt can save several snapshots (quick, extra, deep, revision); show each attempt's final one.
  function latestPerAttempt(rows){
    const seen=new Map();
    for(const row of rows){const key=row.attempt_id||row.id,current=seen.get(key);if(!current||new Date(row.completed_at)>new Date(current.completed_at))seen.set(key,row);}
    return [...seen.values()].sort((a,b)=>new Date(a.completed_at)-new Date(b.completed_at));
  }
  let attemptResults=[],attemptIndex=0;
  function showAttempt(index){
    attemptIndex=index;const box=$('detailResults');box.replaceChildren();
    if(!attemptResults.length){box.append(text('p','尚無探索成果。','muted'));return;}
    const row=attemptResults[index];box.append(renderResult(row));
    const foot=document.createElement('div');foot.className='result-foot';
    const meta=text('span',dateOnly(row.completed_at)+' 測驗 · '+(row.report?.deep?'深入探索':'初次探索')+(row.attempt?.source==='browser_import'?' · 學生匯入的瀏覽器紀錄':''),'muted');
    foot.append(meta);
    if(attemptResults.length>1){
      const pager=document.createElement('div');pager.className='result-pager';
      const prev=text('button','‹','round-button');prev.type='button';prev.setAttribute('aria-label','上一次測驗');prev.disabled=index===0;prev.addEventListener('click',()=>showAttempt(index-1));
      const next=text('button','›','round-button');next.type='button';next.setAttribute('aria-label','下一次測驗');next.disabled=index===attemptResults.length-1;next.addEventListener('click',()=>showAttempt(index+1));
      const label=text('span',(index+1)+' / '+attemptResults.length,'pager-label');label.setAttribute('aria-live','polite');
      pager.append(prev,label,next);foot.append(pager);
    }
    box.append(foot);
  }
  function selectTab(name,focus=false){
    for(const [tab,panel,key] of [['tabTracking','panelTracking','tracking'],['tabResults','panelResults','results']]){
      const active=key===name;$(tab).setAttribute('aria-selected',String(active));$(tab).tabIndex=active?0:-1;$(panel).hidden=!active;
      if(active&&focus)$(tab).focus();
    }
  }
  for(const id of ['tabTracking','tabResults']){
    $(id).addEventListener('click',()=>selectTab(id==='tabTracking'?'tracking':'results'));
    $(id).addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();selectTab(id==='tabTracking'?'results':'tracking',true);});
  }
  async function readAllResults(id){
    const rows=[];
    for(let offset=0;;offset+=100){const page=await client.readResults(id,100,offset);if(!Array.isArray(page))break;rows.push(...page);if(page.length<100)break;}
    return rows;
  }
  function updateNav(){
    const index=filtered.findIndex(s=>s.id===selectedStudent?.id);
    $('prevStudent').disabled=index<=0;$('nextStudent').disabled=index<0||index>=filtered.length-1;
  }
  async function openStudent(student,tab='tracking'){
    clearDetail();selectedStudent=student;const version=detailEpoch;
    $('detailTitle').textContent=student.name;$('detailIdentity').replaceChildren(...[student.original_class+' 班 '+student.original_seat_number+' 號',model.group(student),student.student_id].map(value=>text('span',value)));
    selectTab(tab);updateNav();
    if(!dialog.open)dialog.showModal();
    message('detailStatus','載入中…');
    try{
      const [tracking,results]=await Promise.all([client.readTracking(student.id),readAllResults(student.id)]);if(version!==detailEpoch)return;
      const active=tracking.filter(r=>!r.removed_at);
      $('tabTrackingCount').textContent=String(active.length);
      if(!active.length)$('detailTracking').append(text('p','尚無追蹤校系。','muted'));
      else {const list=document.createElement('ul');list.className='tracking-list';for(const row of active){const item=document.createElement('li');const tag=text('span',row.admission_year+' '+model.channelShort(row.admission_channel),'track-tag');tag.title=row.admission_year+' 學年度・'+row.admission_channel;item.append(tag,text('strong',row.school_name+' '+row.department_name));list.append(item);}$('detailTracking').append(list);}
      attemptResults=latestPerAttempt(results);
      $('tabResultsCount').textContent=attemptResults.length?String(attemptResults.length):'';
      showAttempt(Math.max(0,attemptResults.length-1));message('detailStatus','');
    }catch(error){if(version===detailEpoch)message('detailStatus',error.message);}
  }
  $('prevStudent').addEventListener('click',()=>{const i=filtered.findIndex(s=>s.id===selectedStudent?.id);if(i>0)openStudent(filtered[i-1],$('tabResults').getAttribute('aria-selected')==='true'?'results':'tracking');});
  $('nextStudent').addEventListener('click',()=>{const i=filtered.findIndex(s=>s.id===selectedStudent?.id);if(i>=0&&i<filtered.length-1)openStudent(filtered[i+1],$('tabResults').getAttribute('aria-selected')==='true'?'results':'tracking');});
  $('closeDialog').addEventListener('click',closeDialog);
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const rect=dialog.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeDialog();
  });
  dialog.addEventListener('close',()=>{const id=selectedStudent?.id;clearDetail();const trigger=id&&$('students').querySelector('button[data-student-id="'+id+'"]');if(trigger)trigger.focus();});
  function message(id, text) { $(id).textContent = text; $(id).hidden = !text; }
  function clearWorkspace(reset=true) {
    closeDialog();clearDetail();epoch++;students=[];filtered=[];summaries=new Map();summaryReady=false;$('students').replaceChildren();
    if(reset){for(const id of ['search','grade','group'])$(id).value='';fillGroups();picks={login:'',exam:''};sort={key:'',direction:'asc'};}
    $('workspace').hidden=true;$('filters').hidden=true;$('logout').hidden=true;$('count').textContent='';$('empty').hidden=true;message('summaryStatus','');
  }
  function showLogin() { clearWorkspace(); $('login').hidden = false; }
  function renderPills(base,now){
    const make=(kind,options,valueOf)=>{
      const box=$(kind+'Pills'),fragment=document.createDocumentFragment();
      for(const option of options){
        const count=base.filter(s=>valueOf(s)===option.value).length;
        const button=document.createElement('button');button.type='button';button.className='pill'+((option.value==='off'||option.value==='none')&&count?' alert':'');
        button.setAttribute('aria-pressed',String(picks[kind]===option.value));
        if(kind==='login'){const dot=text('span','','light light-'+option.value);dot.setAttribute('aria-hidden','true');button.append(dot);}
        if(!count)button.classList.add('empty');
        button.append(text('span',option.label),text('b',String(count)));
        if(picks[kind]===option.value){const x=text('span','×','pill-clear');x.setAttribute('aria-hidden','true');button.append(x);button.title='再點一次取消篩選';}
        button.addEventListener('click',()=>{picks[kind]=picks[kind]===option.value?'':option.value;render();});
        fragment.append(button);
      }
      box.replaceChildren(fragment);
    };
    make('login',model.loginOptions,s=>model.login(summaries.get(s.id)?.last_sign_in_at,now));
    make('exam',model.examOptions,s=>summaries.get(s.id)?.exam_status||'none');
  }
  function render() {
    const now=Date.now(),base={search:$('search').value,grade:$('grade').value,group:$('group').value};
    const baseList=students.filter(student=>model.matches(student,base,summaries.get(student.id),now));
    filtered=summaryReady?baseList.filter(student=>model.matches(student,{login:picks.login,exam:picks.exam},summaries.get(student.id),now)):baseList;
    if(sort.key)filtered=filtered.map((s,i)=>[s,i]).sort((x,y)=>model.compare(sort.key,sort.direction,summaries.get(x[0].id),summaries.get(y[0].id))||x[1]-y[1]).map(x=>x[0]);
    $('overviewRows').hidden=!summaryReady;
    if(summaryReady)renderPills(baseList,now);
    const showGroup=!$('group').value;$('groupHead').hidden=!showGroup;
    for(const th of document.querySelectorAll('th[data-sort]'))th.setAttribute('aria-sort',sort.key===th.dataset.sort?(sort.direction==='asc'?'ascending':'descending'):'none');
    const fragment = document.createDocumentFragment();
    for (const s of filtered) {
      const summary=summaries.get(s.id),row = document.createElement('tr');row.addEventListener('click',()=>openStudent(s,'tracking'));
      const name=document.createElement('td'),button=text('button',s.name,'student-select');button.type='button';button.dataset.studentId=s.id;button.setAttribute('aria-label','查看 '+s.name+' 的詳細資料');button.addEventListener('click',event=>{event.stopPropagation();openStudent(s,'tracking');});
      name.append(button);if(!s.active)name.append(text('span','停用','inactive'));name.append(text('span',s.original_class+'・'+s.original_seat_number+' 號','sub'));row.append(name);
      if(showGroup)row.append(text('td',model.group(s),'nowrap'));
      const loginCell=document.createElement('td'),trackCell=document.createElement('td'),examCell=document.createElement('td');trackCell.className='num';loginCell.className='login-cell';
      if(!summaryReady){for(const cell of [loginCell,trackCell,examCell])cell.append(text('span','—','muted'));}
      else{
        const light=model.login(summary?.last_sign_in_at,now),label=model.loginOptions.find(o=>o.value===light).label;
        const wrap=text('span','','login-state');wrap.title=summary?.last_sign_in_at?'最後登入：'+date(summary.last_sign_in_at):'從未登入';
        const dot=text('span','','light light-'+light);dot.setAttribute('aria-hidden','true');
        wrap.append(dot,text('span',model.loginDate(summary?.last_sign_in_at)));if(summary?.last_sign_in_at)wrap.append(text('span','（'+label+'）','visually-hidden'));loginCell.append(wrap);
        const count=summary?.tracking_count||0;trackCell.append(count?text('span',String(count)):text('span','—','muted'));
        const result=model.exam(summary);
        if(result.groups.length){
          const chips=text('span','','chips');
          const query=$('search').value.trim();
          for(const g of result.groups){const active=query===g;const chip=text('button',g,'chip'+(active?' chip-active':''));chip.type='button';chip.title=active?'再點一次清除搜尋':'搜尋優先學群「'+g+'」';chip.addEventListener('click',event=>{event.stopPropagation();$('search').value=active?'':g;render();});chips.append(chip);}
          examCell.append(chips);
        } else examCell.append(text('span',result.label,'state'));
      }
      row.append(examCell,trackCell,loginCell,text('td','›','chev'));
      fragment.append(row);
    }
    $('students').replaceChildren(fragment);$('count').textContent=(filtered.length===baseList.length?'':filtered.length+' / ')+baseList.length;$('count').setAttribute('aria-label','顯示 '+filtered.length+' 位，共 '+baseList.length+' 位學生');$('empty').hidden=filtered.length!==0;
    if(dialog.open)updateNav();
  }
  for(const th of document.querySelectorAll('th[data-sort]'))th.querySelector('button').addEventListener('click',()=>{
    const key=th.dataset.sort;
    if(sort.key!==key)sort={key,direction:'asc'};else if(sort.direction==='asc')sort.direction='desc';else sort={key:'',direction:'asc'};
    render();
  });
  async function workspace() {
    const version = ++epoch;
    $('login').hidden = true; $('workspace').hidden = true; message('status', '正在載入學生名單…');
    const [rows,summary] = await Promise.all([client.listStudents(),client.rosterSummary().then(value=>({value}),error=>({error}))]);
    if (version !== epoch) return;
    students = rows;
    summaryReady=!summary.error;summaries=new Map(summaryReady?summary.value.map(r=>[r.student,r]):[]);
    message('summaryStatus',summaryReady?'':'登入與作答狀況暫時無法載入，請稍後重新整理。');
    render();message('status','');$('workspace').hidden=false;$('filters').hidden=false;$('logout').hidden=false;
  }
  $('showPassword').addEventListener('change', event => { form.elements.password.type = event.target.checked ? 'text' : 'password'; });
  function resetPassword() { form.elements.password.value = ''; form.elements.password.type = 'password'; $('showPassword').checked = false; }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (submit.disabled) return;
    submit.disabled = true; submit.textContent = '正在登入…'; message('loginError','');
    try { await client.login(form.elements.username.value.trim(), form.elements.password.value); resetPassword(); await workspace(); $('rosterTitle').setAttribute('tabindex','-1'); $('rosterTitle').focus(); }
    catch (error) { showLogin(); message('status',''); message('loginError',error.message); resetPassword(); form.elements.password.focus(); }
    finally { submit.disabled = false; submit.textContent = '登入教師後台'; }
  });
  $('logout').addEventListener('click', async () => {
    clearWorkspace(); $('login').hidden = true; message('status','正在結束登入…');
    try { await client.logout(); message('status',''); }
    catch { message('status','本機登入已清除；網路連線中斷，請稍後再試。'); }
    finally { showLogin(); resetPassword(); form.elements.username.value = ''; form.elements.username.focus(); }
  });
  for(const value of model.gradeOptions){
    const option=document.createElement('option');option.value=value;
    if(value.startsWith('G')){option.textContent=value;option.className='grade-all';}else option.textContent=value+' 班';
    $('grade').append(option);
  }
  // Only list 班群 that belong to the chosen 年級, and reset an incompatible choice.
  function fillGroups(){
    const prefix=($('grade').value.match(/^(?:G)?(\d\d)/)||[])[1]||'',current=$('group').value;
    const options=model.groupOptions.filter(value=>!prefix||value.startsWith(prefix));
    const all=document.createElement('option');all.value='';all.textContent='班群';
    $('group').replaceChildren(all,...options.map(value=>{const option=document.createElement('option');option.value=option.textContent=value;return option;}));
    $('group').value=options.includes(current)?current:'';
  }
  fillGroups();$('grade').addEventListener('change',fillGroups);
  for (const id of ['search','group','grade']) $(id).addEventListener(id === 'search' ? 'input' : 'change',render);
  // The roster loads once per login (or page load); switching tabs or windows keeps the current view.
  (async () => { try { if (await client.session()) await workspace(); else { showLogin(); message('status',''); } } catch(error) { showLogin(); message('status',error.message); } })();
})();
