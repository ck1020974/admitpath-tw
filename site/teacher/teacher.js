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
    if(reset){for(const id of ['search','grade','group','loginFilter','examFilter'])$(id).value='';}
    $('workspace').hidden=true;$('logout').hidden=true;$('count').textContent='';$('empty').hidden=true;message('summaryStatus','');
  }
  function showLogin() { clearWorkspace(); $('login').hidden = false; }
  function cellButton(label,student,tab,title){const button=text('button',label,'cell-link');button.type='button';button.dataset.studentId=student.id;if(title)button.title=title;button.setAttribute('aria-label',student.name+'：'+(title||label));button.addEventListener('click',()=>openStudent(student,tab));return button;}
  function render() {
    const now=Date.now(),filters={search:$('search').value,grade:$('grade').value,group:$('group').value,login:summaryReady?$('loginFilter').value:'',exam:summaryReady?$('examFilter').value:''};
    filtered=students.filter(student=>model.matches(student,filters,summaries.get(student.id),now));
    const fragment = document.createDocumentFragment();
    for (const s of filtered) {
      const summary=summaries.get(s.id),row = document.createElement('tr');
      const name=document.createElement('td'),button=text('button',s.name,'student-select');button.type='button';button.dataset.studentId=s.id;button.setAttribute('aria-label','查看學生 '+s.name);button.addEventListener('click',()=>openStudent(s,'tracking'));name.append(button);if(!s.active)name.append(text('span','停用','inactive'));row.append(name);
      for(const value of [s.student_id,s.original_class,model.group(s)])row.append(text('td',value));
      const loginCell=document.createElement('td'),trackCell=document.createElement('td'),examCell=document.createElement('td');trackCell.className='num';
      if(!summaryReady){for(const cell of [loginCell,trackCell,examCell])cell.append(text('span','—','muted'));}
      else{
        const light=model.login(summary?.last_sign_in_at,now),label=model.loginOptions.find(o=>o.value===light).label;
        const wrap=text('span','','login-state');wrap.title=summary?.last_sign_in_at?'最後登入：'+date(summary.last_sign_in_at)+'（'+label+'）':label;
        const dot=text('span','','light light-'+light);dot.setAttribute('aria-hidden','true');
        wrap.append(dot,text('span',model.loginDate(summary?.last_sign_in_at,now)),text('span','（'+label+'）','visually-hidden'));loginCell.append(wrap);
        const count=summary?.tracking_count||0;
        if(count)trackCell.append(cellButton(String(count),s,'tracking','追蹤 '+count+' 個校系'));else trackCell.append(text('span','—','muted'));
        const result=model.exam(summary);examCell.className='exam exam-'+result.status;
        if(result.status==='deep'&&result.groups.length>2){const shown='已作答：'+result.groups.slice(0,2).join('、')+' +'+(result.groups.length-2);examCell.append(cellButton(shown,s,'results',result.label));}
        else if(result.status==='deep'||result.status==='quick')examCell.append(cellButton(result.label,s,'results'));
        else examCell.append(text('span',result.label));
      }
      row.append(loginCell,trackCell,examCell);
      fragment.append(row);
    }
    $('students').replaceChildren(fragment);$('count').textContent=filtered.length+' / '+students.length+' 位';$('empty').hidden=filtered.length!==0;
    if(dialog.open)updateNav();
  }
  async function workspace() {
    const version = ++epoch;
    $('login').hidden = true; $('workspace').hidden = true; message('status', '正在載入學生名單…');
    const [rows,summary] = await Promise.all([client.listStudents(),client.rosterSummary().then(value=>({value}),error=>({error}))]);
    if (version !== epoch) return;
    students = rows;
    summaryReady=!summary.error;summaries=new Map(summaryReady?summary.value.map(r=>[r.student,r]):[]);
    for(const id of ['loginFilter','examFilter'])$(id).disabled=!summaryReady;
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
  let gradeGroup;
  for(const value of model.gradeOptions){
    if(value.startsWith('G')){gradeGroup=document.createElement('optgroup');gradeGroup.label=value;$('grade').append(gradeGroup);}
    const option=document.createElement('option');option.value=option.textContent=value;gradeGroup.append(option);
  }
  for(const value of model.groupOptions){const option=document.createElement('option');option.value=option.textContent=value;$('group').append(option);}
  for(const [id,options] of [['loginFilter',model.loginOptions],['examFilter',model.examOptions]])for(const item of options){const option=document.createElement('option');option.value=item.value;option.textContent=item.label;$(id).append(option);}
  for (const id of ['search','group','grade','loginFilter','examFilter']) $(id).addEventListener(id === 'search' ? 'input' : 'change',render);
  // Returning to a backgrounded teacher page revalidates authorization before displaying records.
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) { clearWorkspace(false); return; }
    try { if (await client.session()) await workspace(); else { showLogin(); message('status','請登入教師帳號。'); } }
    catch (error) { showLogin(); message('status',error.message); }
  });
  (async () => { try { if (await client.session()) await workspace(); else { showLogin(); message('status',''); } } catch(error) { showLogin(); message('status',error.message); } })();
})();
