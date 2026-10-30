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
  let picks={login:'',exam:'',tag:''},sort={key:'',direction:'asc'};
  let detailEpoch=0,selectedStudent=null,resultOffset=0,loadedResults=0;
  const date=value=>new Intl.DateTimeFormat('zh-TW',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Taipei'}).format(new Date(value));
  function text(tag,value,className){const node=document.createElement(tag);node.textContent=value;if(className)node.className=className;return node;}
  function clearDetail(){detailEpoch++;selectedStudent=null;$('detailTracking').replaceChildren();$('detailResults').replaceChildren();$('detailIdentity').textContent='';$('detailTitle').textContent='';$('detailCount').textContent='';$('tabTrackingCount').textContent='';message('detailStatus','');$('moreResults').hidden=true;}
  function closeDialog(){if(dialog.open)dialog.close();}
  function renderResult(row){
    const data=window.YuhsinCuriosityData,report=row.report,snapshot=row.answers;
    const stage={quick:'初次探索',extra:'重新測驗補充',deep:'深入探索',revision:'修改後的成果'}[row.stage]||row.stage;
    const item=document.createElement('details');item.className='result-history';
    item.append(text('summary',date(row.completed_at)+' · '+stage+(row.round_number?' · 補充第 '+row.round_number+' 批':'')));
    if(row.attempt?.source==='browser_import')item.append(text('p','由學生自行匯入的瀏覽器紀錄；上方時間為儲存時間。','muted'));
    const cards=document.createElement('div');cards.className='result-groups';
    for(const type of ['priority','develop','interest','potential']){
      const groups=report.groups.filter(g=>g.type===type);if(!groups.length)continue;
      const box=document.createElement('section');box.append(text('h4',groups[0].typeName));
      const list=document.createElement('ul');for(const g of groups)list.append(text('li',g.name+(g.strengths?.length?'（拿手科目：'+g.strengths.join('、')+'）':'')));box.append(list);cards.append(box);
    }
    item.append(cards);
    if(report.undeclared)item.append(text('p','亦可探索不分系方向。'));
    const other=report.groups.filter(g=>g.type==='other');if(other.length)item.append(text('p','其他學群：'+other.map(g=>g.name).join('、'),'muted'));
    const answers=document.createElement('details');answers.append(text('summary','查看作答與學科自評'));
    const level={high:'前段',mid:'中間',low:'後段'}[snapshot.profile.level];
    const subject=id=>data.subjects.find(s=>s.id===id)?.label||id;
    answers.append(text('p','整體程度：'+level+'；最拿手：'+snapshot.profile.strong.map(subject).join('、')+'；比較吃力：'+snapshot.profile.weak.map(subject).join('、')));
    const list=document.createElement('ol');
    for(const [id,value] of Object.entries(snapshot.answers)){
      const q=data.items.find(q=>q.id===id);list.append(text('li',(q?.text||id)+'：'+(snapshot.favourites.includes(id)?'最想知道':{0:'沒興趣',1:'還好',2:'想知道'}[value])));
    }
    if(snapshot.deep)for(const plan of snapshot.deep.plan){
      for(const goal of data.detailGoals(plan.subject,plan.context,plan.goalVersion)){
        const value=snapshot.deep.goals[goal.id];if(value!==undefined)list.append(text('li',subject(plan.subject)+'｜'+(goal.text||goal.label||goal.id)+'：'+(data.masteryOptions.find(o=>o.value===value)?.label||String(value))));
      }
    }
    answers.append(list);item.append(answers);
    item.append(text('p',report.limits?.[0]||'自評探索結果供輔導討論使用。','muted'));
    if(row.attempt)answers.append(text('p','題庫：'+row.attempt.bank_version+'；計分版本：'+row.attempt.scoring_version,'version-info'));
    return item;
  }
  async function moreResults(){
    if(!selectedStudent)return;
    const version=detailEpoch,id=selectedStudent.id;$('moreResults').disabled=true;
    try{
      const rows=await client.readResults(id,100,resultOffset);if(version!==detailEpoch)return;
      appendResultRows(rows);
      message('detailStatus','');
    }catch(error){if(version===detailEpoch)message('detailStatus',error.message);}
    finally{$('moreResults').disabled=false;}
  }
  $('moreResults').addEventListener('click',moreResults);
  function appendResultRows(rows){
    for(const row of rows){const item=renderResult(row);item.open=loadedResults===0;$('detailResults').append(item);loadedResults++;}
    resultOffset+=rows.length;$('moreResults').hidden=rows.length<100;
    if(!loadedResults)$('detailResults').append(text('p','尚無探索成果。','muted'));
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
  function updateNav(){
    const index=filtered.findIndex(s=>s.id===selectedStudent?.id);
    $('prevStudent').disabled=index<=0;$('nextStudent').disabled=index<0||index>=filtered.length-1;
  }
  async function openStudent(student,tab='tracking'){
    clearDetail();selectedStudent=student;resultOffset=0;loadedResults=0;const version=detailEpoch;
    $('detailTitle').textContent=student.name;$('detailIdentity').textContent=student.student_id+' · '+model.grade(student)+' · '+student.original_class+' 班 '+student.original_seat_number+' 號 · '+model.group(student);
    selectTab(tab);updateNav();
    if(!dialog.open)dialog.showModal();
    message('detailStatus','載入中…');
    try{
      const [tracking,attempts,results]=await Promise.all([client.readTracking(student.id),client.readAttempts(student.id),client.readResults(student.id,100,0)]);if(version!==detailEpoch)return;
      const active=tracking.filter(r=>!r.removed_at);
      $('tabTrackingCount').textContent=String(active.length);
      if(!active.length)$('detailTracking').append(text('p','尚無追蹤校系。','muted'));
      else {const list=document.createElement('ol');list.className='tracking-list';for(const row of active){const item=document.createElement('li');item.append(text('strong',row.school_name+' '+row.department_name),text('span',row.admission_year+' 學年度・'+row.admission_channel,'muted'));list.append(item);}$('detailTracking').append(list);}
      const done=attempts.filter(a=>a.status==='complete').length,open=attempts.filter(a=>a.status==='in_progress').length;
      $('detailCount').textContent='完成 '+done+' 次探索'+(open?' · 進行中 '+open+' 次':'');
      appendResultRows(results);message('detailStatus','');
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
    if(reset){for(const id of ['search','grade','group'])$(id).value='';fillGroups();picks={login:'',exam:'',tag:''};sort={key:'',direction:'asc'};}
    $('workspace').hidden=true;$('logout').hidden=true;$('count').textContent='';$('empty').hidden=true;message('summaryStatus','');
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
        button.append(text('span',option.label),text('b',String(count)));
        button.addEventListener('click',()=>{picks[kind]=picks[kind]===option.value?'':option.value;render();});
        fragment.append(button);
      }
      box.replaceChildren(fragment);
    };
    make('login',model.loginOptions,s=>model.login(summaries.get(s.id)?.last_sign_in_at,now));
    make('exam',model.examOptions,s=>summaries.get(s.id)?.exam_status||'none');
  }
  function renderTagFilter(){
    const box=$('tagFilter');box.replaceChildren();box.hidden=!picks.tag;if(!picks.tag)return;
    box.append(text('span','優先探索：'));
    const clear=text('button',picks.tag+' ×','chip chip-active');clear.type='button';clear.setAttribute('aria-label','取消篩選 '+picks.tag);
    clear.addEventListener('click',()=>{picks.tag='';render();});box.append(clear);
  }
  function render() {
    const now=Date.now(),base={search:$('search').value,grade:$('grade').value,group:$('group').value};
    const baseList=students.filter(student=>model.matches(student,base,summaries.get(student.id),now));
    filtered=summaryReady?baseList.filter(student=>model.matches(student,{login:picks.login,exam:picks.exam,tag:picks.tag},summaries.get(student.id),now)):baseList;
    if(sort.key)filtered=filtered.map((s,i)=>[s,i]).sort((x,y)=>model.compare(sort.key,sort.direction,summaries.get(x[0].id),summaries.get(y[0].id))||x[1]-y[1]).map(x=>x[0]);
    $('overviewRows').hidden=!summaryReady;
    if(summaryReady)renderPills(baseList,now);
    renderTagFilter();
    const showGroup=!$('group').value;$('groupHead').hidden=!showGroup;
    for(const th of document.querySelectorAll('th[data-sort]'))th.setAttribute('aria-sort',sort.key===th.dataset.sort?(sort.direction==='asc'?'ascending':'descending'):'none');
    const fragment = document.createDocumentFragment();
    for (const s of filtered) {
      const summary=summaries.get(s.id),row = document.createElement('tr');row.addEventListener('click',()=>openStudent(s,'tracking'));
      const name=document.createElement('td'),button=text('button',s.name,'student-select');button.type='button';button.dataset.studentId=s.id;button.setAttribute('aria-label','查看 '+s.name+' 的詳細資料');button.addEventListener('click',event=>{event.stopPropagation();openStudent(s,'tracking');});
      name.append(button);if(!s.active)name.append(text('span','停用','inactive'));name.append(text('span',s.original_class+'・'+s.original_seat_number+' 號','sub'));row.append(name);
      if(showGroup)row.append(text('td',model.group(s),'nowrap'));
      const loginCell=document.createElement('td'),trackCell=document.createElement('td'),examCell=document.createElement('td');trackCell.className='num';
      if(!summaryReady){for(const cell of [loginCell,trackCell,examCell])cell.append(text('span','—','muted'));}
      else{
        const light=model.login(summary?.last_sign_in_at,now),label=model.loginOptions.find(o=>o.value===light).label;
        const wrap=text('span','','login-state');wrap.title=summary?.last_sign_in_at?'最後登入：'+date(summary.last_sign_in_at):label;
        const dot=text('span','','light light-'+light);dot.setAttribute('aria-hidden','true');
        wrap.append(dot,text('span',model.loginDate(summary?.last_sign_in_at)));if(summary?.last_sign_in_at)wrap.append(text('span','（'+label+'）','visually-hidden'));loginCell.append(wrap);
        const count=summary?.tracking_count||0;trackCell.append(count?text('span',String(count)):text('span','—','muted'));
        const result=model.exam(summary);
        if(result.groups.length){
          const chips=text('span','','chips');
          for(const g of result.groups){const chip=text('button',g,'chip'+(picks.tag===g?' chip-active':''));chip.type='button';chip.title='只看優先探索「'+g+'」的學生';chip.addEventListener('click',event=>{event.stopPropagation();picks.tag=picks.tag===g?'':g;render();});chips.append(chip);}
          examCell.append(chips);
        } else examCell.append(text('span',result.label,'state'));
      }
      row.append(loginCell,trackCell,examCell,text('td','›','chev'));
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
    render();message('status','');$('workspace').hidden=false;$('logout').hidden=false;
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
    const all=document.createElement('option');all.value='';all.textContent='全部班群';
    $('group').replaceChildren(all,...options.map(value=>{const option=document.createElement('option');option.value=option.textContent=value;return option;}));
    $('group').value=options.includes(current)?current:'';
  }
  fillGroups();$('grade').addEventListener('change',fillGroups);
  for (const id of ['search','group','grade']) $(id).addEventListener(id === 'search' ? 'input' : 'change',render);
  // Returning to a backgrounded teacher page revalidates authorization before displaying records.
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) { clearWorkspace(false); return; }
    try { if (await client.session()) await workspace(); else { showLogin(); message('status','請登入教師帳號。'); } }
    catch (error) { showLogin(); message('status',error.message); }
  });
  (async () => { try { if (await client.session()) await workspace(); else { showLogin(); message('status',''); } } catch(error) { showLogin(); message('status',error.message); } })();
})();
